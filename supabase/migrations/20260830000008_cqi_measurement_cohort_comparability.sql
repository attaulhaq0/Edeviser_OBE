-- CQI measurements are longitudinal: a later metric is valid only for the
-- deterministic student population that generated the baseline pattern.
-- A matching sample count alone is not proof of comparability.

ALTER TABLE public.cqi_action_plan_measurements
  ADD COLUMN cohort_member_ids uuid[],
  ADD COLUMN cohort_fingerprint text;

ALTER TABLE public.cqi_action_plan_measurements
  ADD CONSTRAINT cqi_action_plan_measurements_cohort_contract_check
  CHECK (
    (cohort_member_ids IS NULL AND cohort_fingerprint IS NULL)
    OR (
      cardinality(cohort_member_ids) >= 2
      AND cohort_fingerprint ~ '^[0-9a-f]{64}$'
    )
  );

CREATE OR REPLACE FUNCTION public.execute_approved_cqi_action_v1(
  p_proposal_id uuid,
  p_actor_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_actor_role text;
  v_actor_institution_id uuid;
  v_proposal public.agent_action_proposals;
  v_pattern public.cqi_systemic_patterns;
  v_existing public.agent_action_executions;
  v_plan_id uuid;
  v_execution_id uuid;
  v_semester_id uuid;
  v_target numeric;
  v_action text;
  v_owner text;
  v_cohort_member_ids uuid[];
  v_cohort_fingerprint text;
  v_cohort_count integer;
BEGIN
  SELECT role::text, institution_id INTO v_actor_role, v_actor_institution_id
  FROM public.profiles WHERE id = p_actor_id AND is_active = true;
  IF v_actor_role IS DISTINCT FROM 'coordinator' THEN
    RAISE EXCEPTION 'Coordinator scope required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_proposal FROM public.agent_action_proposals
  WHERE id = p_proposal_id FOR UPDATE;
  IF NOT FOUND OR v_proposal.institution_id <> v_actor_institution_id THEN
    RAISE EXCEPTION 'Proposal not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_proposal.status = 'executed' THEN
    SELECT * INTO v_existing FROM public.agent_action_executions WHERE proposal_id = v_proposal.id;
    IF FOUND AND v_existing.executed_by = p_actor_id THEN
      RETURN v_existing.result || jsonb_build_object('executionId', v_existing.id, 'alreadyExecuted', true);
    END IF;
    RAISE EXCEPTION 'Proposal already executed' USING ERRCODE = '23505';
  END IF;
  IF v_proposal.status <> 'approved'
    OR v_proposal.decided_by IS DISTINCT FROM p_actor_id
    OR v_proposal.required_approver_user_id IS DISTINCT FROM p_actor_id
    OR v_proposal.required_approver_role <> 'coordinator'
    OR v_proposal.action_type <> 'create_cqi_action'
    OR v_proposal.expires_at IS NOT NULL AND v_proposal.expires_at <= now()
  THEN
    RAISE EXCEPTION 'Approved, unexpired Coordinator proposal required' USING ERRCODE = '42501';
  END IF;
  IF jsonb_typeof(v_proposal.payload) <> 'object'
    OR v_proposal.payload - ARRAY['systemicPatternId', 'semesterId', 'targetAttainment', 'actionDescription', 'responsiblePerson'] <> '{}'::jsonb
    OR jsonb_typeof(v_proposal.payload->'systemicPatternId') <> 'string'
    OR jsonb_typeof(v_proposal.payload->'semesterId') <> 'string'
    OR jsonb_typeof(v_proposal.payload->'targetAttainment') <> 'number'
    OR jsonb_typeof(v_proposal.payload->'actionDescription') <> 'string'
    OR jsonb_typeof(v_proposal.payload->'responsiblePerson') <> 'string'
    OR length(v_proposal.evidence_hash) <> 64
  THEN
    RAISE EXCEPTION 'Invalid CQI proposal contract' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_pattern FROM public.cqi_systemic_patterns
  WHERE id = (v_proposal.payload->>'systemicPatternId')::uuid FOR UPDATE;
  IF NOT FOUND OR v_pattern.institution_id <> v_actor_institution_id
    OR v_pattern.program_id IS DISTINCT FROM v_proposal.program_id
    OR v_pattern.status NOT IN ('open', 'reopened')
    OR NOT EXISTS (SELECT 1 FROM public.programs WHERE id = v_pattern.program_id AND coordinator_id = p_actor_id AND institution_id = v_actor_institution_id)
  THEN
    RAISE EXCEPTION 'CQI pattern scope is no longer authorized' USING ERRCODE = '42501';
  END IF;

  v_semester_id := (v_proposal.payload->>'semesterId')::uuid;
  v_target := (v_proposal.payload->>'targetAttainment')::numeric;
  v_action := btrim(v_proposal.payload->>'actionDescription');
  v_owner := btrim(v_proposal.payload->>'responsiblePerson');
  IF v_target < v_pattern.current_attainment OR v_target > 100
    OR length(v_action) NOT BETWEEN 1 AND 4000 OR length(v_owner) NOT BETWEEN 1 AND 500
  THEN
    RAISE EXCEPTION 'CQI payload values are invalid' USING ERRCODE = '22023';
  END IF;

  SELECT
    array_agg(member.student_id ORDER BY member.student_id),
    encode(extensions.digest(string_agg(member.student_id::text, ',' ORDER BY member.student_id), 'sha256'), 'hex'),
    count(*)::integer
  INTO v_cohort_member_ids, v_cohort_fingerprint, v_cohort_count
  FROM (
    SELECT DISTINCT attainment.student_id
    FROM public.outcome_attainment attainment
    JOIN public.learning_outcomes outcome ON outcome.id = attainment.outcome_id
    JOIN public.programs program ON program.id = outcome.program_id
    WHERE attainment.outcome_id = v_pattern.outcome_id
      AND program.institution_id = v_pattern.institution_id
      AND (v_pattern.course_id IS NULL OR attainment.course_id = v_pattern.course_id)
      AND attainment.student_id IS NOT NULL
      AND attainment.last_calculated_at >= v_pattern.window_start
      AND attainment.last_calculated_at <= v_pattern.window_end
  ) member;
  IF COALESCE(v_cohort_count, 0) < 2 OR v_cohort_count <> v_pattern.sample_count THEN
    RAISE EXCEPTION 'Canonical baseline cohort does not match the CQI pattern' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.cqi_action_plans (
    program_id, semester_id, outcome_id, outcome_type, baseline_attainment,
    target_attainment, action_description, responsible_person, status,
    source_proposal_id, systemic_pattern_id
  ) VALUES (
    v_pattern.program_id, v_semester_id, v_pattern.outcome_id, v_pattern.outcome_type,
    v_pattern.current_attainment, v_target, v_action, v_owner, 'planned',
    v_proposal.id, v_pattern.id
  ) RETURNING id INTO v_plan_id;

  INSERT INTO public.cqi_action_plan_measurements (
    cqi_action_plan_id, systemic_pattern_id, institution_id, program_id, course_id,
    outcome_id, measurement_method_version, cohort_semantics, denominator_semantics,
    baseline_window_start, baseline_window_end, baseline_metric, baseline_sample_count,
    cohort_member_ids, cohort_fingerprint
  ) VALUES (
    v_plan_id, v_pattern.id, v_pattern.institution_id, v_pattern.program_id, v_pattern.course_id,
    v_pattern.outcome_id, v_pattern.policy_version, 'same_students', 'canonical_outcome_attainment',
    v_pattern.window_start, v_pattern.window_end, v_pattern.current_attainment, v_pattern.sample_count,
    v_cohort_member_ids, v_cohort_fingerprint
  );

  INSERT INTO public.agent_action_executions (
    proposal_id, run_id, institution_id, executed_by, tool_name, tool_version, idempotency_key, result
  ) VALUES (
    v_proposal.id, v_proposal.run_id, v_proposal.institution_id, p_actor_id,
    v_proposal.action_type, COALESCE(v_proposal.tool_version, '1.0.0'), v_proposal.idempotency_key,
    jsonb_build_object('targetId', v_plan_id, 'targetType', 'cqi_action_plan')
  ) RETURNING id INTO v_execution_id;

  UPDATE public.cqi_systemic_patterns SET status = 'linked', updated_at = now() WHERE id = v_pattern.id;
  UPDATE public.agent_action_proposals SET status = 'executed', executed_at = now()
  WHERE id = v_proposal.id AND status = 'approved';
  IF NOT FOUND THEN RAISE EXCEPTION 'Proposal execution race rejected' USING ERRCODE = '40001'; END IF;

  RETURN jsonb_build_object('executionId', v_execution_id, 'targetId', v_plan_id, 'alreadyExecuted', false);
END;
$function$;

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
  v_post_fingerprint text;
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
    OR NOT EXISTS (SELECT 1 FROM public.programs WHERE id = v_measurement.program_id AND institution_id = v_actor_institution AND coordinator_id = p_actor_id) THEN
    RAISE EXCEPTION 'CQI measurement scope is not authorized' USING ERRCODE = '42501';
  END IF;
  IF p_after_window_start <= v_measurement.baseline_window_end THEN
    RAISE EXCEPTION 'After window must follow the baseline window' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO v_pattern FROM public.cqi_systemic_patterns WHERE id = v_measurement.systemic_pattern_id FOR UPDATE;
  IF NOT FOUND OR v_pattern.institution_id <> v_measurement.institution_id
    OR v_pattern.program_id <> v_measurement.program_id OR v_pattern.outcome_id <> v_measurement.outcome_id
    OR v_pattern.course_id IS DISTINCT FROM v_measurement.course_id THEN
    RAISE EXCEPTION 'CQI pattern and measurement are not comparable' USING ERRCODE = '22023';
  END IF;
  IF v_measurement.measurement_method_version IS DISTINCT FROM v_pattern.policy_version
    OR v_measurement.cohort_semantics <> 'same_students'
    OR v_measurement.denominator_semantics <> 'canonical_outcome_attainment' THEN
    RAISE EXCEPTION 'Measurement contract is not comparable' USING ERRCODE = '22023';
  END IF;

  SELECT round(avg(attainment.attainment_percent), 2), count(DISTINCT attainment.student_id)::integer
  INTO v_post_metric, v_post_sample
  FROM public.outcome_attainment attainment
  JOIN public.learning_outcomes outcome ON outcome.id = attainment.outcome_id
  JOIN public.programs program ON program.id = outcome.program_id
  WHERE attainment.outcome_id = v_measurement.outcome_id
    AND program.institution_id = v_measurement.institution_id
    AND (v_measurement.course_id IS NULL OR attainment.course_id = v_measurement.course_id)
    AND attainment.student_id = ANY(v_measurement.cohort_member_ids)
    AND attainment.last_calculated_at >= p_after_window_start
    AND attainment.last_calculated_at <= p_after_window_end;
  SELECT encode(extensions.digest(string_agg(member.student_id::text, ',' ORDER BY member.student_id), 'sha256'), 'hex')
  INTO v_post_fingerprint
  FROM (
    SELECT DISTINCT attainment.student_id
    FROM public.outcome_attainment attainment
    JOIN public.learning_outcomes outcome ON outcome.id = attainment.outcome_id
    JOIN public.programs program ON program.id = outcome.program_id
    WHERE attainment.outcome_id = v_measurement.outcome_id
      AND program.institution_id = v_measurement.institution_id
      AND (v_measurement.course_id IS NULL OR attainment.course_id = v_measurement.course_id)
      AND attainment.student_id = ANY(v_measurement.cohort_member_ids)
      AND attainment.last_calculated_at >= p_after_window_start
      AND attainment.last_calculated_at <= p_after_window_end
  ) member;

  IF v_measurement.cohort_member_ids IS NULL OR v_measurement.cohort_fingerprint IS NULL
    OR COALESCE(v_post_sample, 0) <> v_measurement.baseline_sample_count
    OR v_post_fingerprint IS DISTINCT FROM v_measurement.cohort_fingerprint
    OR v_post_metric IS NULL THEN
    v_state := 'INSUFFICIENT_EVIDENCE'; v_delta := NULL;
  ELSE
    v_delta := round(v_post_metric - v_measurement.baseline_metric, 2);
    IF v_delta >= v_measurement.material_change THEN v_state := 'IMPROVED';
    ELSIF v_delta <= -v_measurement.material_change THEN v_state := 'DECLINED';
    ELSE v_state := 'NO_MATERIAL_CHANGE'; END IF;
  END IF;

  UPDATE public.cqi_action_plan_measurements
  SET after_window_start = p_after_window_start, after_window_end = p_after_window_end,
      post_action_metric = v_post_metric, post_action_sample_count = v_post_sample,
      delta = v_delta, evaluation_state = v_state, measured_at = now(), updated_at = now()
  WHERE id = v_measurement.id;
  UPDATE public.cqi_systemic_patterns
  SET last_measurement_state = v_state,
      status = CASE WHEN v_state = 'IMPROVED' THEN 'resolved' WHEN v_state IN ('DECLINED', 'NO_MATERIAL_CHANGE') THEN 'reopened' ELSE status END,
      cooldown_until = CASE WHEN v_state = 'IMPROVED' THEN now() + interval '90 days' ELSE cooldown_until END,
      updated_at = now()
  WHERE id = v_measurement.systemic_pattern_id;
  RETURN jsonb_build_object('measurementId', v_measurement.id, 'evaluationState', v_state,
    'postActionMetric', v_post_metric, 'postActionSampleCount', v_post_sample, 'delta', v_delta);
END;
$function$;
