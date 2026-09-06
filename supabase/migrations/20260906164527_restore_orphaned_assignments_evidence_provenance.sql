-- =============================================================================
-- restore_orphaned_assignments_evidence_provenance
-- Task: continuous-verification 7.1(a) — re-parent orphaned submission/grade/
--       evidence rows onto a restored assignment set.
--       Applied LIVE via MCP as version 20260906164527 (file committed to match).
--
-- ROOT CAUSE (verified live): submissions_assignment_id_fkey and all evidence
-- FKs exist and are convalidated=true, yet 552 submissions referenced 17
-- non-existent assignment UUIDs. A validated FK blocks both orphan INSERTs and
-- referenced-row DELETEs on normal paths — so the orphans were created through
-- a superuser path (session_replication_role = replica bypasses FK triggers).
-- This migration re-parents the data; the superuser-bypass risk is documented
-- in the continuous-verification spec (README session E) with a recommended
-- scheduled orphan-check.
--
-- STRATEGY: restore the 17 missing assignments with their ORIGINAL UUIDs so
-- every submission/grade/evidence row resolves again. Course attribution is
-- recovered from each assignment's own evidence (clo → course), falling back
-- to the submitting student's enrollment. clo_weights are reconstructed from
-- the evidence CLO set (equal weights — evidence rows are already
-- denormalized, so historical attainment is unaffected). trg_new_assignment_notify
-- is disabled during the insert to avoid a one-time notification fan-out.
-- Idempotent: skips when no orphans exist; ON CONFLICT DO NOTHING per row.
-- =============================================================================

ALTER TABLE public.assignments DISABLE TRIGGER trg_new_assignment_notify;

DO $$
DECLARE
  rec        record;
  v_teacher  uuid;
  v_course   uuid;
  v_due      timestamptz;
  v_created  timestamptz;
  v_weights  jsonb;
  v_n        int;
  v_seq      int := 0;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM submissions s
    WHERE NOT EXISTS (SELECT 1 FROM assignments a WHERE a.id = s.assignment_id)
  ) THEN
    RAISE NOTICE 'restore_orphaned_assignments: no orphaned submissions; nothing to do';
    RETURN;
  END IF;

  FOR rec IN
    SELECT s.assignment_id,
           (array_remove(array_agg(DISTINCT lo.course_id), NULL))[1] AS evidence_course,
           min(s.submitted_at) AS first_sub,
           array_agg(DISTINCT e.clo_id) FILTER (WHERE e.clo_id IS NOT NULL) AS clos,
           (SELECT sc.course_id
              FROM student_courses sc
             WHERE sc.student_id = (
                   SELECT s2.student_id FROM submissions s2
                    WHERE s2.assignment_id = s.assignment_id
                    ORDER BY s2.submitted_at
                    LIMIT 1)
             LIMIT 1) AS enrolled_course
    FROM submissions s
    LEFT JOIN evidence e ON e.submission_id = s.id
    LEFT JOIN learning_outcomes lo ON lo.id = e.clo_id
    WHERE NOT EXISTS (SELECT 1 FROM assignments a WHERE a.id = s.assignment_id)
    GROUP BY s.assignment_id
  LOOP
    v_course := COALESCE(rec.evidence_course, rec.enrolled_course);
    IF v_course IS NULL THEN
      RAISE WARNING 'restore_orphaned_assignments: cannot resolve course for % — skipped', rec.assignment_id;
      CONTINUE;
    END IF;

    SELECT c.teacher_id INTO v_teacher FROM public.courses c WHERE c.id = v_course;

    v_due     := rec.first_sub + interval '7 days';
    v_created := rec.first_sub - interval '7 days';

    IF rec.clos IS NOT NULL AND array_length(rec.clos, 1) > 0 THEN
      v_n := array_length(rec.clos, 1);
      SELECT jsonb_agg(jsonb_build_object('clo_id', c, 'weight', 1))
        INTO v_weights
        FROM unnest(rec.clos) AS c;
    ELSE
      v_weights := '[]'::jsonb;
    END IF;

    v_seq := v_seq + 1;

    INSERT INTO public.assignments
      (id, course_id, created_by, title, description, type, total_marks,
       due_date, is_late_allowed, late_window_hours, clo_weights, created_at)
    VALUES
      (rec.assignment_id,
       v_course,
       v_teacher,
       'Restored Assessment ' || v_seq,
       'Historical assessment restored during data-provenance reconciliation (2026-09-06); the original row was orphaned by an out-of-band cleanup.',
       'assignment',
       100,
       v_due,
       true,
       48,
       v_weights,
       v_created)
    ON CONFLICT (id) DO NOTHING;
  END LOOP;

  RAISE NOTICE 'restore_orphaned_assignments: restored % assignment(s)', v_seq;
END $$;

ALTER TABLE public.assignments ENABLE TRIGGER trg_new_assignment_notify;