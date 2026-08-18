CREATE OR REPLACE FUNCTION public.measure_cqi_action_plan_v1(
  p_measurement_id uuid,
  p_after_window_start timestamptz,
  p_after_window_end timestamptz,
  p_actor_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_measurement public.cqi_action_plan_measurements;
  v_pattern public.cqi_systemic_patterns;
  v_actor_institution uuid;
  v_post_metric numeric(5,2);
  v_post_sample integer;
  v_delta numeric(5,2);
  v_state text;
BEGIN
  IF p_after_window_start IS NULL OR p_after_window_end IS NULL
    OR p_after_window_end < p_after_window_start THEN
    RAISE EXCEPTION 'A valid after measurement window is required' USING ERRCODE = '22023';
  END IF;

  SELECT profile.institution_id INTO v_actor_institution
  FROM public.profiles profile
  WHERE profile.id = p_actor_id AND profile.role = 'coordinator' AND profile.is_active = true;
  IF v_actor_institution IS NULL THEN
    RAISE EXCEPTION 'Coordinator scope required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_measurement FROM public.cqi_action_plan_measurements
  WHERE id = p_measurement_id FOR UPDATE;
  IF NOT FOUND OR v_measurement.institution_id <> v_actor_institution
    OR NOT EXISTS (
      SELECT 1 FROM public.programs
      WHERE id = v_measurement.program_id
        AND institution_id = v_actor_institution
        AND coordinator_id = p_actor_id
    ) THEN
    RAISE EXCEPTION 'CQI measurement scope is not authorized' USING ERRCODE = '42501';
  END IF;
  IF p_after_window_start <= v_measurement.baseline_window_end THEN
    RAISE EXCEPTION 'After window must follow the baseline window' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO v_pattern FROM public.cqi_systemic_patterns
  WHERE id = v_measurement.systemic_pattern_id FOR UPDATE;
  IF NOT FOUND OR v_pattern.institution_id <> v_measurement.institution_id
    OR v_pattern.program_id <> v_measurement.program_id
    OR v_pattern.outcome_id <> v_measurement.outcome_id
    OR v_pattern.course_id IS DISTINCT FROM v_measurement.course_id
  THEN
    RAISE EXCEPTION 'CQI pattern and measurement are not comparable' USING ERRCODE = '22023';
  END IF;
  IF v_measurement.measurement_method_version IS DISTINCT FROM v_pattern.policy_version
    OR v_measurement.cohort_semantics <> 'unique_students'
    OR v_measurement.denominator_semantics <> 'canonical_outcome_attainment' THEN
    RAISE EXCEPTION 'Measurement contract is not comparable' USING ERRCODE = '22023';
  END IF;

  SELECT
    round(avg(attainment.attainment_percent), 2),
    count(DISTINCT attainment.student_id)::integer
  INTO v_post_metric, v_post_sample
  FROM public.outcome_attainment attainment
  JOIN public.learning_outcomes outcome ON outcome.id = attainment.outcome_id
  JOIN public.programs program ON program.id = outcome.program_id
  WHERE attainment.outcome_id = v_measurement.outcome_id
    AND program.institution_id = v_measurement.institution_id
    AND (v_measurement.course_id IS NULL OR attainment.course_id = v_measurement.course_id)
    AND attainment.student_id IS NOT NULL
    AND attainment.last_calculated_at >= p_after_window_start
    AND attainment.last_calculated_at <= p_after_window_end;

  IF COALESCE(v_post_sample, 0) < v_measurement.baseline_sample_count
    OR COALESCE(v_post_sample, 0) < 2
    OR v_post_metric IS NULL THEN
    v_state := 'INSUFFICIENT_EVIDENCE';
    v_delta := NULL;
  ELSE
    v_delta := round(v_post_metric - v_measurement.baseline_metric, 2);
    IF v_delta >= v_measurement.material_change THEN
      v_state := 'IMPROVED';
    ELSIF v_delta <= -v_measurement.material_change THEN
      v_state := 'DECLINED';
    ELSE
      v_state := 'NO_MATERIAL_CHANGE';
    END IF;
  END IF;

  UPDATE public.cqi_action_plan_measurements
  SET after_window_start = p_after_window_start,
      after_window_end = p_after_window_end,
      post_action_metric = v_post_metric,
      post_action_sample_count = v_post_sample,
      delta = v_delta,
      evaluation_state = v_state,
      measured_at = now(),
      updated_at = now()
  WHERE id = v_measurement.id;

  UPDATE public.cqi_systemic_patterns
  SET last_measurement_state = v_state,
      status = CASE
        WHEN v_state = 'IMPROVED' THEN 'resolved'
        WHEN v_state IN ('DECLINED', 'NO_MATERIAL_CHANGE') THEN 'reopened'
        ELSE status
      END,
      cooldown_until = CASE WHEN v_state = 'IMPROVED' THEN now() + interval '90 days' ELSE cooldown_until END,
      updated_at = now()
  WHERE id = v_measurement.systemic_pattern_id;

  RETURN jsonb_build_object(
    'measurementId', v_measurement.id,
    'evaluationState', v_state,
    'postActionMetric', v_post_metric,
    'postActionSampleCount', v_post_sample,
    'delta', v_delta
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.measure_cqi_action_plan_v1(uuid, timestamptz, timestamptz, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.measure_cqi_action_plan_v1(uuid, timestamptz, timestamptz, uuid)
  TO service_role;
