-- =============================================================================
-- fix_problem_case_section_spread_alias — continuous-verification task 8.9
-- Forward fix: the section-spread subquery in classify_problem_cases_v1
-- referenced a nonexistent alias (`en.section_id` where the FROM clause
-- aliases student_courses as `sc`) — a latent 42P01 runtime error that would
-- also break a fresh replay. Corrects the alias and re-asserts the full
-- function INCLUDING the ownership routing from
-- problem_case_ownership_routing (this migration is the canonical definition).
-- SECURITY INVOKER: the caller's RLS scopes every row.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.classify_problem_cases_v1(p_course_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $fn$
DECLARE
  v_result jsonb;
  v_case record;
  v_cases jsonb := '[]'::jsonb;
  v_course_avg numeric;
  v_section_count int;
  v_section_spread numeric;
BEGIN
  -- Course-level aggregates
  SELECT avg(oa.attainment_percent), count(DISTINCT sc.section_id)
  INTO v_course_avg, v_section_count
  FROM public.outcome_attainment oa
  JOIN public.student_courses sc ON sc.student_id = oa.student_id AND sc.course_id = oa.course_id
  WHERE oa.course_id = p_course_id AND oa.scope = 'student_course';

  IF v_course_avg IS NULL THEN
    RETURN jsonb_build_object('course_id', p_course_id, 'cases', '[]'::jsonb, 'message', 'No attainment data for this course');
  END IF;

  -- Section spread (max avg - min avg across sections)
  SELECT max(sec_avg) - min(sec_avg) INTO v_section_spread
  FROM (
    SELECT sc.section_id, avg(oa.attainment_percent) AS sec_avg
    FROM public.outcome_attainment oa
    JOIN public.student_courses sc ON sc.student_id = oa.student_id AND sc.course_id = oa.course_id
    WHERE oa.course_id = p_course_id AND oa.scope = 'student_course'
    GROUP BY sc.section_id
  ) secs;

  -- ── Classify each CLO ──────────────────────────────────────────────────────
  FOR v_case IN
    WITH clo_att AS (
      SELECT
        lo.id AS clo_id,
        lo.title AS clo_title,
        lo.blooms_level::text AS blooms_level,
        round(avg(oa.attainment_percent), 1) AS clo_avg,
        count(DISTINCT oa.student_id)::int AS students_assessed,
        count(*)::int AS evidence_count,
        -- per-section averages for variance detection
        (SELECT max(sec_avg) FROM (
          SELECT avg(oa2.attainment_percent) AS sec_avg
          FROM public.outcome_attainment oa2
          JOIN public.student_courses sc2 ON sc2.student_id = oa2.student_id AND sc2.course_id = oa2.course_id
          JOIN public.course_sections cs2 ON cs2.id = sc2.section_id
          WHERE oa2.course_id = p_course_id AND oa2.outcome_id = lo.id AND oa2.scope = 'student_course'
          GROUP BY sc2.section_id
        ) s) AS max_section_avg,
        (SELECT min(sec_avg) FROM (
          SELECT avg(oa2.attainment_percent) AS sec_avg
          FROM public.outcome_attainment oa2
          JOIN public.student_courses sc2 ON sc2.student_id = oa2.student_id AND sc2.course_id = oa2.course_id
          JOIN public.course_sections cs2 ON cs2.id = sc2.section_id
          WHERE oa2.course_id = p_course_id AND oa2.outcome_id = lo.id AND oa2.scope = 'student_course'
          GROUP BY sc2.section_id
        -- has assessment coverage
        EXISTS (
          SELECT 1 FROM public.assignments a
          WHERE a.course_id = p_course_id
            AND jsonb_typeof(a.clo_weights) = 'array'
            AND EXISTS (SELECT 1 FROM jsonb_array_elements(a.clo_weights) el WHERE el.value->>'clo_id' = lo.id::text)
        ) OR EXISTS (
          SELECT 1 FROM public.quizzes q
          WHERE q.course_id = p_course_id
            AND (EXISTS (SELECT 1 FROM public.quiz_clos qc WHERE qc.quiz_id = q.id AND qc.clo_id = lo.id)
             OR (jsonb_typeof(q.clo_ids) = 'array' AND EXISTS (SELECT 1 FROM jsonb_array_elements(q.clo_ids) el WHERE el.value::text = lo.id::text)))
        ) AS has_assessment,
        -- struggling students (below 70 on this CLO)
        (SELECT jsonb_agg(jsonb_build_object(
          'student_id', oa.student_id,
          'attainment', round(oa.attainment_percent, 1)
        )) FROM public.outcome_attainment oa
         WHERE oa.outcome_id = lo.id AND oa.scope = 'student_course' AND oa.attainment_percent < 70
        ) AS struggling_students,
        -- sub-CLO prerequisite gap detection
        (SELECT min(sub_att) FROM (
          SELECT avg(oa3.attainment_percent) AS sub_att
          FROM public.learning_outcomes sub
          JOIN public.outcome_mappings m ON m.target_outcome_id = sub.id
          JOIN public.outcome_attainment oa3 ON oa3.outcome_id = sub.id AND oa3.scope = 'student_course'
          WHERE m.source_outcome_id = lo.id AND sub.type = 'SUB_CLO'
        ) s2) AS min_sub_clo_att
      FROM public.learning_outcomes lo
      JOIN public.outcome_attainment oa ON oa.outcome_id = lo.id AND oa.scope = 'student_course'
      WHERE lo.course_id = p_course_id AND lo.type = 'CLO'
      GROUP BY lo.id, lo.title, lo.blooms_level
    )
    SELECT * FROM clo_att
  LOOP
    DECLARE
      v_problem_types text[] := ARRAY[]::text[];
      v_confidence numeric := 0.5;
      v_evidence jsonb := jsonb_build_array(
        jsonb_build_object('source', 'outcome_attainment', 'clo_id', v_case.clo_id, 'course_avg', v_case.clo_avg)
      );
      v_dominant text := NULL;
      v_owner text := NULL;
    BEGIN
      -- Skip CLOs with no assessment (can't classify without data)
      IF NOT v_case.has_assessment THEN
        v_problem_types := array_append(v_problem_types, 'assessment-signal');
        v_confidence := 0.9;
        v_dominant := 'assessment-signal';
      ELSIF v_case.clo_avg < 50 THEN
        -- Whole cohort failing = curriculum-design problem
        v_problem_types := array_append(v_problem_types, 'curriculum-design-signal');
        v_confidence := 0.8;
        v_dominant := 'curriculum-design-signal';
      ELSIF v_case.clo_avg < 70 THEN
        -- Below satisfactory: check the sub-signals
        IF v_case.min_section_avg IS NOT NULL AND v_case.max_section_avg IS NOT NULL
           AND (v_case.max_section_avg - v_case.min_section_avg) > 20 THEN
          v_problem_types := array_append(v_problem_types, 'teacher-signal');
          v_confidence := 0.7;
        END IF;
        IF v_case.min_sub_clo_att IS NOT NULL AND v_case.min_sub_clo_att < v_case.clo_avg - 20 THEN
          v_problem_types := array_append(v_problem_types, 'prerequisite-signal');
          v_confidence := GREATEST(v_confidence, 0.7);
        END IF;
        IF v_case.struggling_students IS NOT NULL AND jsonb_array_length(v_case.struggling_students) > 0 THEN
          v_problem_types := array_append(v_problem_types, 'student-signal');
          v_confidence := GREATEST(v_confidence, 0.6);
        END IF;
        IF array_length(v_problem_types, 1) = 0 THEN
          v_problem_types := array_append(v_problem_types, 'assessment-signal');
          v_confidence := 0.5;
        END IF;
        v_dominant := v_problem_types[1];
      ELSE
        -- CLO performing well — check for struggling students (early warning)
        IF v_case.struggling_students IS NOT NULL AND jsonb_array_length(v_case.struggling_students) > 0 THEN
          v_problem_types := array_append(v_problem_types, 'student-signal');
          v_confidence := 0.5;
          v_dominant := 'student-signal';
        END IF;
      END IF;

      -- ── Ownership routing (8.9 Q5 "who performs it") — deterministic ────────
      -- Routed from the DOMINANT cause only; never from AI output.
      IF v_dominant IS NOT NULL THEN
        v_owner := CASE v_dominant
          WHEN 'student-signal' THEN 'student_support'
          WHEN 'teacher-signal' THEN 'coordinator'
          WHEN 'assessment-signal' THEN 'teacher'
          WHEN 'prerequisite-signal' THEN 'teacher'
          WHEN 'curriculum-design-signal' THEN 'coordinator'
          ELSE 'teacher'
        END;
      END IF;

      IF array_length(v_problem_types, 1) > 0 THEN
        v_cases := v_cases || jsonb_build_array(jsonb_build_object(
          'clo_id', v_case.clo_id,
          'clo_title', v_case.clo_title,
          'blooms_level', v_case.blooms_level,
          'course_avg', v_case.clo_avg,
          'students_assessed', v_case.students_assessed,
          'problem_types', to_jsonb(v_problem_types),
          'dominant_cause', v_dominant,
          'confidence', v_confidence,
          'evidence', v_evidence,
          'struggling_students', COALESCE(v_case.struggling_students, '[]'::jsonb),
          'recommended_owner', v_owner
        ));
      END IF;
    END;
  END LOOP;

  v_result := jsonb_build_object(
    'course_id', p_course_id,
    'course_avg', round(v_course_avg, 1),
    'section_spread', round(COALESCE(v_section_spread, 0), 1),
    'cases', v_cases,
    'classified_at', now()
  );
  RETURN v_result;
END;
$fn$;

REVOKE ALL ON FUNCTION public.classify_problem_cases_v1(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.classify_problem_cases_v1(uuid) TO authenticated, service_role;

COMMENT ON FUNCTION public.classify_problem_cases_v1(uuid) IS
  '8.9: deterministic problem-classification engine. Classifies CLOs into typed problem cases (student/teacher/assessment/prerequisite/curriculum-design) with confidence + cited evidence + recommended_owner routing (student_support/coordinator/teacher). No AI — pure SQL over canonical outcome_attainment.';