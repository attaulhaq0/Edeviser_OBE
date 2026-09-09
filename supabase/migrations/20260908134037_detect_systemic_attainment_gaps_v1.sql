-- =============================================================================
-- detect_systemic_attainment_gaps_v1 - continuous-verification task 7.4(c)
-- Deterministic CQI systemic-pattern detector. Scans canonical
-- outcome_attainment (scope='course' → PLO rows) for the coordinator's
-- program, finds outcomes whose average attainment is below the 70% success
-- threshold with >= 2 students sampled, and upserts a
-- cqi_systemic_patterns row (pattern_kind='systemic_outcome_attainment_gap').
-- Same "no AI invents the trigger" principle as the 8.9 classifier: the
-- pattern is derived ONLY from canonical evidence; the AI (coordinator
-- draft) explains/plans from these cited patterns afterwards.
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
  v_baseline numeric(5,2);
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
    WITH per_course AS (
      SELECT
        oa.outcome_id,
        oa.course_id,
        count(DISTINCT oa.student_id)::int AS n_students,
        round(avg(oa.attainment_percent), 2) AS course_avg,
        count(*) FILTER (WHERE oa.attainment_percent < 70)::int AS below_target,
        min(oa.last_calculated_at) AS first_seen,
        max(oa.last_calculated_at) AS last_seen,
        jsonb_agg(jsonb_build_object('source', 'outcome_attainment',
                                     'id', oa.id,
                                     'attainment', round(oa.attainment_percent, 1)))
          AS evidence_rows
      FROM public.outcome_attainment oa
      JOIN public.courses c ON c.id = oa.course_id
      WHERE oa.scope = 'course'
        AND c.program_id = p_program_id
      GROUP BY oa.outcome_id, oa.course_id
      HAVING count(DISTINCT oa.student_id) >= 2
    )
    SELECT outcome_id, course_id, n_students,
           round(avg(course_avg), 2) AS program_avg,
           sum(below_target)::int AS affected,
           min(first_seen) AS win_start,
           max(last_seen) AS win_end,
           min(course_avg) AS baseline,
           max(course_avg) AS current,
           jsonb_agg(evidence_rows) AS evidence
    FROM per_course
    WHERE avg(course_avg) < 70
    GROUP BY outcome_id, course_id, n_students
  LOOP
    v_window_start := v_pattern.win_start;
    v_window_end := v_pattern.win_end;
    v_baseline := round(v_pattern.baseline, 2);
    v_current := round(v_pattern.current, 2);
    v_samples := v_pattern.n_students;
    v_affected := LEAST(v_pattern.affected, v_samples);
    v_evidence := COALESCE(v_pattern.evidence, '[]'::jsonb);

    -- Refresh an existing open/linked/reopened pattern if present (the
    -- partial unique index forbids duplicate live rows).
    UPDATE public.cqi_systemic_patterns SET
      current_attainment = v_current,
      sample_count = v_samples,
      affected_population = v_affected,
      evidence_references = v_evidence,
      window_start = v_window_start,
      window_end = v_window_end,
      occurrence_version = 'v1:' || to_char(v_window_end, 'YYYY-MM-DD'),
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
        v_institution, p_program_id, v_pattern.course_id, v_pattern.outcome_id, 'PLO',
        'systemic_outcome_attainment_gap',
        'continuous-verification:7.4c-detector:v1',
        v_window_start, v_window_end,
        'gap:' || v_pattern.outcome_id::text,
        'v1:' || to_char(v_window_end, 'YYYY-MM-DD'),
        v_baseline, v_current, 70,
        v_samples, v_affected, v_evidence
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
  '7.4(c): deterministic systemic pattern detector - scans canonical outcome_attainment (course scope) for outcomes below the 70% threshold with >= 2 sampled students and upserts cqi_systemic_patterns rows. Coordinator-scoped; evidence-cited; no AI invents the trigger.';