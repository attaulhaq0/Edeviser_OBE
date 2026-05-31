-- Option B: Pure SQL attainment rollup trigger (no HTTP call)
-- Replaces the pg_net-based trigger with direct SQL computation
CREATE OR REPLACE FUNCTION public.trigger_attainment_rollup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  v_student_id uuid;
  v_course_id uuid;
  v_assignment_id uuid;
  v_clo_weight record;
  v_avg_percent numeric;
  v_sample_count integer;
  v_plo_id uuid;
  v_ilo_id uuid;
  v_plo_percent numeric;
  v_plo_samples integer;
  v_ilo_percent numeric;
  v_ilo_samples integer;
  v_weighted_sum numeric;
  v_total_weight numeric;
  v_mapping record;
  v_att record;
BEGIN
  -- Step 0: Get context from submission and assignment
  SELECT s.student_id, s.assignment_id INTO v_student_id, v_assignment_id
  FROM submissions s WHERE s.id = NEW.submission_id;

  IF v_student_id IS NULL THEN RETURN NEW; END IF;

  SELECT a.course_id INTO v_course_id
  FROM assignments a WHERE a.id = v_assignment_id;

  IF v_course_id IS NULL THEN RETURN NEW; END IF;

  -- Step 1: Insert evidence rows (one per CLO weight on the assignment)
  -- clo_weights is jsonb array: [{"clo_id": "...", "weight": N}, ...]
  FOR v_clo_weight IN
    SELECT (elem->>'clo_id')::uuid AS clo_id, (elem->>'weight')::numeric AS weight
    FROM assignments a, jsonb_array_elements(a.clo_weights) AS elem
    WHERE a.id = v_assignment_id
      AND jsonb_array_length(a.clo_weights) > 0
  LOOP
    -- Insert evidence (skip if duplicate)
    INSERT INTO evidence (student_id, submission_id, grade_id, clo_id, score_percent, attainment_level)
    VALUES (
      v_student_id, NEW.submission_id, NEW.id, v_clo_weight.clo_id, NEW.score_percent,
      CASE
        WHEN NEW.score_percent >= 85 THEN 'excellent'::attainment_level
        WHEN NEW.score_percent >= 70 THEN 'satisfactory'::attainment_level
        WHEN NEW.score_percent >= 50 THEN 'developing'::attainment_level
        ELSE 'not_yet'::attainment_level
      END
    )
    ON CONFLICT DO NOTHING;

    -- Step 2: Recalculate CLO attainment for this student+CLO
    SELECT AVG(e.score_percent), COUNT(*)
    INTO v_avg_percent, v_sample_count
    FROM evidence e
    WHERE e.student_id = v_student_id AND e.clo_id = v_clo_weight.clo_id;

    IF v_avg_percent IS NOT NULL THEN
      INSERT INTO outcome_attainment (outcome_id, student_id, course_id, scope, attainment_percent, sample_count, last_calculated_at)
      VALUES (v_clo_weight.clo_id, v_student_id, v_course_id, 'student_course', ROUND(v_avg_percent, 2), v_sample_count, now())
      ON CONFLICT (outcome_id, COALESCE(student_id, '00000000-0000-0000-0000-000000000000'::uuid), COALESCE(course_id, '00000000-0000-0000-0000-000000000000'::uuid), scope)
      DO UPDATE SET attainment_percent = ROUND(v_avg_percent, 2), sample_count = v_sample_count, last_calculated_at = now();
    END IF;

    -- Step 3: Cascade to PLO (find PLO mappings for this CLO)
    FOR v_mapping IN
      SELECT target_outcome_id, weight FROM outcome_mappings WHERE source_outcome_id = v_clo_weight.clo_id
    LOOP
      v_plo_id := v_mapping.target_outcome_id;

      -- Weighted average of all CLO attainments mapped to this PLO
      SELECT SUM(oa.attainment_percent * om.weight) / NULLIF(SUM(om.weight), 0),
             SUM(oa.sample_count)
      INTO v_plo_percent, v_plo_samples
      FROM outcome_mappings om
      JOIN outcome_attainment oa ON oa.outcome_id = om.source_outcome_id
        AND oa.student_id = v_student_id AND oa.scope = 'student_course'
      WHERE om.target_outcome_id = v_plo_id;

      IF v_plo_percent IS NOT NULL THEN
        INSERT INTO outcome_attainment (outcome_id, student_id, course_id, scope, attainment_percent, sample_count, last_calculated_at)
        VALUES (v_plo_id, v_student_id, v_course_id, 'course', ROUND(v_plo_percent, 2), COALESCE(v_plo_samples, 0), now())
        ON CONFLICT (outcome_id, COALESCE(student_id, '00000000-0000-0000-0000-000000000000'::uuid), COALESCE(course_id, '00000000-0000-0000-0000-000000000000'::uuid), scope)
        DO UPDATE SET attainment_percent = ROUND(v_plo_percent, 2), sample_count = COALESCE(v_plo_samples, 0), last_calculated_at = now();
      END IF;

      -- Step 4: Cascade to ILO
      FOR v_att IN
        SELECT target_outcome_id FROM outcome_mappings WHERE source_outcome_id = v_plo_id
      LOOP
        v_ilo_id := v_att.target_outcome_id;

        SELECT SUM(oa.attainment_percent * om.weight) / NULLIF(SUM(om.weight), 0),
               SUM(oa.sample_count)
        INTO v_ilo_percent, v_ilo_samples
        FROM outcome_mappings om
        JOIN outcome_attainment oa ON oa.outcome_id = om.source_outcome_id
          AND oa.student_id = v_student_id AND oa.scope = 'course'
        WHERE om.target_outcome_id = v_ilo_id;

        IF v_ilo_percent IS NOT NULL THEN
          INSERT INTO outcome_attainment (outcome_id, student_id, course_id, scope, attainment_percent, sample_count, last_calculated_at)
          VALUES (v_ilo_id, v_student_id, v_course_id, 'program', ROUND(v_ilo_percent, 2), COALESCE(v_ilo_samples, 0), now())
          ON CONFLICT (outcome_id, COALESCE(student_id, '00000000-0000-0000-0000-000000000000'::uuid), COALESCE(course_id, '00000000-0000-0000-0000-000000000000'::uuid), scope)
          DO UPDATE SET attainment_percent = ROUND(v_ilo_percent, 2), sample_count = COALESCE(v_ilo_samples, 0), last_calculated_at = now();
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;

  -- Step 5: Award 15 XP (source: grade, idempotent via reference_id)
  INSERT INTO xp_transactions (student_id, xp_amount, source, reference_id, scope, base_xp, final_xp, multipliers, note)
  VALUES (v_student_id, 15, 'grade', NEW.id::text, 'individual', 15, 15, '{}'::jsonb, 'Grade released XP')
  ON CONFLICT DO NOTHING;

  -- Step 6: Update student_gamification xp_total
  UPDATE student_gamification
  SET xp_total = COALESCE(xp_total, 0) + 15
  WHERE student_id = v_student_id;

  -- Step 7: Insert notification (dedup via emit_notification if available)
  BEGIN
    PERFORM emit_notification(
      v_student_id,
      'grade_released',
      'Grade Released',
      'Your assignment has been graded',
      jsonb_build_object('grade_id', NEW.id, 'submission_id', NEW.submission_id, 'score_percent', NEW.score_percent),
      'grade_rollup:' || NEW.id::text
    );
  EXCEPTION WHEN OTHERS THEN
    -- If emit_notification fails, insert directly
    INSERT INTO notifications (user_id, type, title, body, metadata, is_read)
    VALUES (v_student_id, 'grade_released', 'Grade Released', 'Your assignment has been graded',
            jsonb_build_object('grade_id', NEW.id, 'score_percent', NEW.score_percent), false);
  END;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block the grade operation
  RAISE WARNING 'trigger_attainment_rollup failed: %', SQLERRM;
  RETURN NEW;
END;
$func$;

COMMENT ON FUNCTION public.trigger_attainment_rollup() IS
  'Pure SQL attainment rollup. On grade INSERT/UPDATE: inserts evidence, '
  'calculates CLO->PLO->ILO attainment cascade, awards 15 XP, sends notification. '
  'No HTTP calls. Fixed: L2-1 Option B - 2026-05-20.';;
