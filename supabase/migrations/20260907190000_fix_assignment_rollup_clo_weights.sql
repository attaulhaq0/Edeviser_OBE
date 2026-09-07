
-- =============================================================================
-- fix_assignment_rollup_clo_weights - continuous-verification hotfix
-- ROOT CAUSE (caught by the outcomeCascade RLS smoke on a fresh replay): the
-- assignment branch of trigger_attainment_rollup referenced w.clo_id, but the
-- LATERAL alias is w(item, ord) - the column does not exist. The body is
-- wrapped in EXCEPTION WHEN OTHERS THEN RAISE WARNING, so every assignment-
-- grade rollup has been SILENTLY skipped since 20260906165847 (production
-- included): no evidence, no attainment, no CLO-PLO-ILO rollup.
-- FIX: extract the CLO id from the jsonb item: (w.item->>'clo_id')::uuid.
-- Verified: full local docker replay (484+1 migrations) + outcomeCascade 9/9.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.trigger_attainment_rollup()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $fn$
DECLARE
  v_student_id uuid;
  v_course_id uuid;
  v_assignment_id uuid;
  v_quiz_attempt_id uuid;
  v_quiz_id uuid;
  v_clo_ids uuid[];
  v_clo_id uuid;
  v_avg_percent numeric;
  v_sample_count integer;
  v_plo_id uuid;
  v_ilo_id uuid;
  v_plo_percent numeric;
  v_plo_samples integer;
  v_ilo_percent numeric;
  v_ilo_samples integer;
  v_mapping record;
  v_att record;
  v_xp_rows integer := 0;
BEGIN
  SELECT s.student_id, s.assignment_id, s.quiz_attempt_id
  INTO v_student_id, v_assignment_id, v_quiz_attempt_id
  FROM public.submissions AS s
  WHERE s.id = NEW.submission_id;

  IF v_student_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF v_assignment_id IS NOT NULL THEN
    SELECT a.course_id
    INTO v_course_id
    FROM public.assignments AS a
    WHERE a.id = v_assignment_id;

    IF v_course_id IS NULL THEN
      RETURN NEW;
    END IF;

    SELECT array_agg((w.item->>'clo_id')::uuid ORDER BY w.ord)
    INTO v_clo_ids
    FROM public.assignments AS a
    CROSS JOIN LATERAL jsonb_array_elements(a.clo_weights) WITH ORDINALITY AS w(item, ord)
    WHERE a.id = v_assignment_id
      AND jsonb_array_length(a.clo_weights) > 0;

  ELSIF v_quiz_attempt_id IS NOT NULL THEN
    SELECT qa.quiz_id, q.course_id
    INTO v_quiz_id, v_course_id
    FROM public.quiz_attempts AS qa
    JOIN public.quizzes AS q ON q.id = qa.quiz_id
    WHERE qa.id = v_quiz_attempt_id;

    IF v_course_id IS NULL THEN
      RETURN NEW;
    END IF;

    SELECT array_agg(qc.clo_id ORDER BY qc.created_at, qc.clo_id)
    INTO v_clo_ids
    FROM public.quiz_clos AS qc
    WHERE qc.quiz_id = v_quiz_id;

    IF v_clo_ids IS NULL OR array_length(v_clo_ids, 1) = 0 THEN
      SELECT array_agg((element.value)::uuid ORDER BY element.ord)
      INTO v_clo_ids
      FROM public.quizzes AS q
      CROSS JOIN LATERAL jsonb_array_elements(q.clo_ids) WITH ORDINALITY AS element(value, ord)
      WHERE q.id = v_quiz_id
        AND jsonb_typeof(q.clo_ids) = 'array';
    END IF;

  ELSE
    RETURN NEW;
  END IF;

  IF v_clo_ids IS NULL OR array_length(v_clo_ids, 1) = 0 THEN
    RETURN NEW;
  END IF;

  FOREACH v_clo_id IN ARRAY v_clo_ids LOOP
    v_plo_id := NULL;
    v_ilo_id := NULL;

    -- Evidence currently stores one denormalized PLO/ILO path. Choose the
    -- highest-weight parent deterministically while attainment still rolls up
    -- through every valid parent edge below.
    SELECT m.source_outcome_id
    INTO v_plo_id
    FROM public.outcome_mappings AS m
    JOIN public.learning_outcomes AS parent_plo
      ON parent_plo.id = m.source_outcome_id
     AND parent_plo.type = 'PLO'
    WHERE m.target_outcome_id = v_clo_id
    ORDER BY m.weight DESC, m.source_outcome_id
    LIMIT 1;

    IF v_plo_id IS NOT NULL THEN
      SELECT m.source_outcome_id
      INTO v_ilo_id
      FROM public.outcome_mappings AS m
      JOIN public.learning_outcomes AS parent_ilo
        ON parent_ilo.id = m.source_outcome_id
       AND parent_ilo.type = 'ILO'
      WHERE m.target_outcome_id = v_plo_id
      ORDER BY m.weight DESC, m.source_outcome_id
      LIMIT 1;
    END IF;

    IF v_plo_id IS NULL OR v_ilo_id IS NULL THEN
      RAISE WARNING
        'Skipping attainment for unmapped CLO %: canonical PLO/ILO path is incomplete',
        v_clo_id;
      CONTINUE;
    END IF;

    INSERT INTO public.evidence (
      student_id, submission_id, grade_id, clo_id, plo_id, ilo_id,
      score_percent, attainment_level
    ) VALUES (
      v_student_id, NEW.submission_id, NEW.id, v_clo_id, v_plo_id, v_ilo_id,
      NEW.score_percent,
      CASE
        WHEN NEW.score_percent >= 85 THEN 'excellent'::public.attainment_level
        WHEN NEW.score_percent >= 70 THEN 'satisfactory'::public.attainment_level
        WHEN NEW.score_percent >= 50 THEN 'developing'::public.attainment_level
        ELSE 'not_yet'::public.attainment_level
      END
    ) ON CONFLICT DO NOTHING;

    SELECT avg(e.score_percent), count(*)
    INTO v_avg_percent, v_sample_count
    FROM public.evidence AS e
    WHERE e.student_id = v_student_id
      AND e.clo_id = v_clo_id;

    IF v_avg_percent IS NOT NULL THEN
      INSERT INTO public.outcome_attainment (
        outcome_id, student_id, course_id, scope,
        attainment_percent, sample_count, last_calculated_at
      ) VALUES (
        v_clo_id, v_student_id, v_course_id, 'student_course',
        round(v_avg_percent, 2), v_sample_count, now()
      )
      ON CONFLICT (
        outcome_id,
        COALESCE(student_id, '00000000-0000-0000-0000-000000000000'::uuid),
        COALESCE(course_id, '00000000-0000-0000-0000-000000000000'::uuid),
        scope
      ) DO UPDATE SET
        attainment_percent = round(v_avg_percent, 2),
        sample_count = v_sample_count,
        last_calculated_at = now();
    END IF;

    FOR v_mapping IN
      SELECT m.source_outcome_id
      FROM public.outcome_mappings AS m
      WHERE m.target_outcome_id = v_clo_id
    LOOP
      v_plo_id := v_mapping.source_outcome_id;

      SELECT
        sum(oa.attainment_percent * m.weight) / nullif(sum(m.weight), 0),
        sum(oa.sample_count)
      INTO v_plo_percent, v_plo_samples
      FROM public.outcome_mappings AS m
      JOIN public.outcome_attainment AS oa
        ON oa.outcome_id = m.target_outcome_id
       AND oa.student_id = v_student_id
       AND oa.scope = 'student_course'
      WHERE m.source_outcome_id = v_plo_id;

      IF v_plo_percent IS NOT NULL THEN
        INSERT INTO public.outcome_attainment (
          outcome_id, student_id, course_id, scope,
          attainment_percent, sample_count, last_calculated_at
        ) VALUES (
          v_plo_id, v_student_id, v_course_id, 'course',
          round(v_plo_percent, 2), COALESCE(v_plo_samples, 0), now()
        )
        ON CONFLICT (
          outcome_id,
          COALESCE(student_id, '00000000-0000-0000-0000-000000000000'::uuid),
          COALESCE(course_id, '00000000-0000-0000-0000-000000000000'::uuid),
          scope
        ) DO UPDATE SET
          attainment_percent = round(v_plo_percent, 2),
          sample_count = COALESCE(v_plo_samples, 0),
          last_calculated_at = now();
      END IF;

      FOR v_att IN
        SELECT m.source_outcome_id
        FROM public.outcome_mappings AS m
        WHERE m.target_outcome_id = v_plo_id
      LOOP
        v_ilo_id := v_att.source_outcome_id;

        SELECT
          sum(oa.attainment_percent * m.weight) / nullif(sum(m.weight), 0),
          sum(oa.sample_count)
        INTO v_ilo_percent, v_ilo_samples
        FROM public.outcome_mappings AS m
        JOIN public.outcome_attainment AS oa
          ON oa.outcome_id = m.target_outcome_id
         AND oa.student_id = v_student_id
         AND oa.scope = 'course'
        WHERE m.source_outcome_id = v_ilo_id;

        IF v_ilo_percent IS NOT NULL THEN
          INSERT INTO public.outcome_attainment (
            outcome_id, student_id, course_id, scope,
            attainment_percent, sample_count, last_calculated_at
          ) VALUES (
            v_ilo_id, v_student_id, v_course_id, 'program',
            round(v_ilo_percent, 2), COALESCE(v_ilo_samples, 0), now()
          )
          ON CONFLICT (
            outcome_id,
            COALESCE(student_id, '00000000-0000-0000-0000-000000000000'::uuid),
            COALESCE(course_id, '00000000-0000-0000-0000-000000000000'::uuid),
            scope
          ) DO UPDATE SET
            attainment_percent = round(v_ilo_percent, 2),
            sample_count = COALESCE(v_ilo_samples, 0),
            last_calculated_at = now();
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;

  -- XP + submission status: assignment path only. Quiz XP stays in the
  -- client-side award-xp 'quiz_completion' economy (no double award).
  IF v_quiz_attempt_id IS NULL THEN
    INSERT INTO public.xp_transactions (
      student_id, xp_amount, source, reference_id, scope, base_xp, final_xp,
      multipliers, note
    ) VALUES (
      v_student_id, 15, 'grade', NEW.id::text, 'individual', 15, 15,
      '{}'::jsonb, 'Grade released XP'
    ) ON CONFLICT DO NOTHING;

    GET DIAGNOSTICS v_xp_rows = ROW_COUNT;

    IF v_xp_rows > 0 THEN
      UPDATE public.student_gamification
      SET
        xp_total = COALESCE(xp_total, 0) + 15,
        level = public.calculate_level_from_xp(
          (COALESCE(xp_total, 0) + 15)::bigint
        )
      WHERE student_id = v_student_id;

      UPDATE public.submissions
      SET status = 'graded'
      WHERE id = NEW.submission_id;
    END IF;
  END IF;

  BEGIN
    PERFORM public.emit_notification(
      v_student_id,
      'grade_released',
      'Grade Released',
      CASE
        WHEN v_quiz_attempt_id IS NULL THEN 'Your assignment has been graded'
        ELSE 'Your quiz has been graded'
      END,
      jsonb_build_object(
        'grade_id', NEW.id,
        'score_percent', NEW.score_percent
      ),
      'grade_rollup:' || NEW.id::text
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'trigger_attainment_rollup: %', SQLERRM;
  RETURN NEW;
END;
$fn$;

