-- The only path from an approved CQI proposal to the canonical plan.
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
    baseline_window_start, baseline_window_end, baseline_metric, baseline_sample_count
  ) VALUES (
    v_plan_id, v_pattern.id, v_pattern.institution_id, v_pattern.program_id, v_pattern.course_id,
    v_pattern.outcome_id, v_pattern.policy_version, 'unique_students', 'canonical_outcome_attainment',
    v_pattern.window_start, v_pattern.window_end, v_pattern.current_attainment, v_pattern.sample_count
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

REVOKE ALL ON FUNCTION public.execute_approved_cqi_action_v1(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.execute_approved_cqi_action_v1(uuid, uuid) TO service_role;
