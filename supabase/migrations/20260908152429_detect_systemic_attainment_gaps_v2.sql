-- =============================================================================
-- detect_systemic_attainment_gaps_v1 (v2) - continuous-verification task 7.4(c)
-- Improved detector: combines course-scope (PLO rows) AND student_course-scope
-- canonical evidence to catch BOTH program-wide PLO shortfalls AND systemic
-- student-level gaps. The v1 only checked course-scope (missed the 63.1%
-- student_course gap on Mathematics 6's CLO ce709c48).
-- SECURITY DEFINER: the caller must coordinate the program.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.detect_systemic_attainment_gaps_v1(
  p_program_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_institution uuid;
  v_pattern record;
  v_inserted integer := 0;
  v_window_start timestamptz;
  v_window_end timestamptz;
  v_current numeric(5,2);
  v_samples integer;
  v_affected integer;
  v_evidence jsonb;
BEGIN
  SELECT p.institution_id INTO v_institution
  FROM public.programs p
  WHERE p.id = p_program_id AND p.coordinator_id = v_actor;
  IF v_institution IS NULL THEN
    RAISE EXCEPTION 'Coordinator scope required' USING ERRCODE = '42501';
  END IF;

  FOR v_pattern IN
    WITH course_scope AS (
      SELECT oa.outcome_id, oa.course_id,
        round(avg(oa.attainment_percent), 2) AS course_avg,
        count(DISTINCT oa.student_id)::int AS n_students
      FROM public.outcome_attainment oa
      JOIN public.courses c ON c.id = oa.course_id
      WHERE oa.scope = 'course' AND c.program_id = p_program_id
      GROUP BY oa.outcome_id, oa.course_id
    ),
    student_scope AS (
      SELECT oa.outcome_id, oa.course_id,
        round(avg(oa.attainment_percent), 2) AS student_avg,
        count(DISTINCT oa.student_id)::int AS n_students
      FROM public.outcome_attainment oa
      JOIN public.courses c ON c.id = oa.course_id
      WHERE oa.scope = 'student_course' AND c.program_id = p_program_id
      GROUP BY oa.outcome_id, oa.course_id
    ),
    combined AS (
      SELECT outcome_id, course_id, n_students,
        LEAST(COALESCE(course_avg, student_avg), COALESCE(student_avg, course_avg)) AS eff_avg
      FROM course_scope FULL OUTER JOIN student_scope USING (outcome_id, course_id, n_students)
    ),
    outcome AS (
      SELECT outcome_id, course_id, MAX(n_students)::int AS n_students,
        round(avg(eff_avg), 2) AS outcome_avg,
        min(eff_avg) AS baseline_avg,
        count(*)::int AS n_signals
      FROM combined WHERE eff_avg IS NOT NULL
      GROUP BY outcome_id, course_id
      HAVING MAX(n_students) >= 2 AND round(avg(eff_avg), 2) < 70
    )
    SELECT * FROM outcome
  LOOP
    v_current := v_pattern.outcome_avg;
    v_samples := v_pattern.n_students;
    v_affected := v_pattern.n_signals;
    SELECT min(oa.last_calculated_at), max(oa.last_calculated_at),
           jsonb_agg(jsonb_build_object('source', 'outcome_attainment',
                                        'id', oa.id,
                                        'scope', oa.scope,
                                        'attainment', round(oa.attainment_percent, 1)))
      INTO v_window_start, v_window_end, v_evidence
    FROM public.outcome_attainment oa
    WHERE oa.outcome_id = v_pattern.outcome_id AND oa.course_id = v_pattern.course_id;

    UPDATE public.cqi_systemic_patterns SET
      current_attainment = v_current,
      sample_count = v_samples,
      affected_population = v_affected,
      evidence_references = COALESCE(v_evidence, '[]'::jsonb),
      window_start = v_window_start,
      window_end = v_window_end,
      occurrence_version = 'v1:' || to_char(COALESCE(v_window_end, now()), 'YYYY-MM-DD'),
      updated_at = now()
    WHERE institution_id = v_institution
      AND program_id = p_program_id
      AND outcome_id = v_pattern.outcome_id
      AND pattern_identity = 'gap:' || v_pattern.outcome_id::text
      AND status IN ('open', 'linked', 'reopened');
    IF NOT FOUND THEN
      INSERT INTO public.cqi_systemic_patterns (
        institution_id, program_id, course_id, outcome_id, outcome_type,
        pattern_kind, policy_version, window_start, window_end,
        pattern_identity, occurrence_version,
        baseline_attainment, current_attainment, target_threshold,
        sample_count, affected_population, evidence_references
      ) VALUES (
        v_institution, p_program_id, v_pattern.course_id, v_pattern.outcome_id, 'CLO',
        'systemic_outcome_attainment_gap',
        'continuous-verification:7.4c-detector:v1',
        v_window_start, v_window_end,
        'gap:' || v_pattern.outcome_id::text,
        'v1:' || to_char(COALESCE(v_window_end, now()), 'YYYY-MM-DD'),
        v_pattern.baseline_avg, v_current, 70,
        v_samples, v_affected, COALESCE(v_evidence, '[]'::jsonb)
      );
    END IF;
    v_inserted := v_inserted + 1;
  END LOOP;

  RETURN v_inserted;
END;
$function$;

REVOKE ALL ON FUNCTION public.detect_systemic_attainment_gaps_v1(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.detect_systemic_attainment_gaps_v1(uuid) TO authenticated, service_role;

COMMENT ON FUNCTION public.detect_systemic_attainment_gaps_v1(uuid) IS
  '7.4(c): deterministic systemic pattern detector - scans canonical outcome_attainment (course + student_course scope) for outcomes below the 70% threshold with >= 2 distinct students and upserts cqi_systemic_patterns rows. Coordinator-scoped; evidence-cited; no AI invents the trigger.';