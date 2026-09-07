-- =============================================================================
-- create_learning_intervention_execution - continuous-verification task 8.9
-- The only path from an approved problem-case proposal to official
-- learning_interventions rows. One row per struggling student; scope is
-- re-validated at execution time (institution, program coordination, active
-- enrollment) - approval never bypasses authorization re-checks.
-- Registry: create_learning_intervention@1.0.0 (write-tools/registry.ts).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.execute_approved_learning_intervention_v1(
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
  v_existing public.agent_action_executions;
  v_execution_id uuid;
  v_course_id uuid;
  v_program_id uuid;
  v_student_ids jsonb;
  v_student_id uuid;
  v_intervention_ids uuid[];
  v_type text;
  v_plan text;
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
    OR v_proposal.action_type <> 'create_learning_intervention'
    OR v_proposal.expires_at IS NOT NULL AND v_proposal.expires_at <= now()
  THEN
    RAISE EXCEPTION 'Approved, unexpired Coordinator proposal required' USING ERRCODE = '42501';
  END IF;
  IF jsonb_typeof(v_proposal.payload) <> 'object'
    OR v_proposal.payload - ARRAY['courseId', 'interventionType', 'plan', 'studentIds', 'recommendedOwner'] <> '{}'::jsonb
    OR jsonb_typeof(v_proposal.payload->'courseId') <> 'string'
    OR jsonb_typeof(v_proposal.payload->'interventionType') <> 'string'
    OR jsonb_typeof(v_proposal.payload->'plan') <> 'string'
    OR jsonb_typeof(v_proposal.payload->'studentIds') <> 'array'
    OR length(v_proposal.evidence_hash) <> 64
  THEN
    RAISE EXCEPTION 'Invalid learning-intervention proposal contract' USING ERRCODE = '22023';
  END IF;

  v_course_id := (v_proposal.payload->>'courseId')::uuid;
  v_type := btrim(v_proposal.payload->>'interventionType');
  v_plan := btrim(v_proposal.payload->>'plan');
  v_owner := btrim(v_proposal.payload->>'recommendedOwner');
  v_student_ids := v_proposal.payload->'studentIds';
  IF v_proposal.course_id IS DISTINCT FROM v_course_id
    OR length(v_type) NOT BETWEEN 1 AND 100
    OR length(v_plan) NOT BETWEEN 1 AND 4000
    OR jsonb_array_length(v_student_ids) NOT BETWEEN 1 AND 50
  THEN
    RAISE EXCEPTION 'Learning-intervention payload values are invalid' USING ERRCODE = '22023';
  END IF;

  -- Scope re-check: the course must belong to the actor's institution and
  -- the actor must still coordinate its program.
  SELECT c.program_id INTO v_program_id
  FROM public.courses c
  JOIN public.programs p ON p.id = c.program_id
  WHERE c.id = v_course_id
    AND p.institution_id = v_actor_institution_id
    AND p.coordinator_id = p_actor_id;
  IF v_program_id IS NULL THEN
    RAISE EXCEPTION 'Course scope is no longer authorized' USING ERRCODE = '42501';
  END IF;

  v_intervention_ids := ARRAY[]::uuid[];
  FOR v_student_id IN
    SELECT (s.value)::uuid AS sid FROM jsonb_array_elements(v_student_ids) AS s
  LOOP
    -- Every student must still be actively enrolled in the course.
    IF NOT EXISTS (
      SELECT 1 FROM public.student_courses sc
      WHERE sc.student_id = v_student_id
        AND sc.course_id = v_course_id
        AND sc.status = 'active'
    ) THEN
      RAISE EXCEPTION 'Student % is no longer actively enrolled', v_student_id USING ERRCODE = '42501';
    END IF;

    INSERT INTO public.learning_interventions (
      institution_id, student_id, course_id, program_id,
      intervention_type, payload, source, status,
      proposal_id, created_by, approved_by
    ) VALUES (
      v_proposal.institution_id, v_student_id, v_course_id, v_program_id,
      v_type,
      jsonb_build_object('plan', v_plan, 'recommendedOwner', v_owner),
      'agent', 'approved',
      v_proposal.id, v_proposal.actor_user_id, p_actor_id
    ) RETURNING id INTO v_student_id;
    v_intervention_ids := array_append(v_intervention_ids, v_student_id);
  END LOOP;

  INSERT INTO public.agent_action_executions (
    proposal_id, run_id, institution_id, executed_by, tool_name, tool_version, idempotency_key, result
  ) VALUES (
    v_proposal.id, v_proposal.run_id, v_proposal.institution_id, p_actor_id,
    v_proposal.action_type, COALESCE(v_proposal.tool_version, '1.0.0'), v_proposal.idempotency_key,
    jsonb_build_object(
      'interventionIds', to_jsonb(v_intervention_ids),
      'count', array_length(v_intervention_ids, 1),
      'targetType', 'learning_intervention'
    )
  ) RETURNING id INTO v_execution_id;

  UPDATE public.agent_action_proposals SET status = 'executed', executed_at = now()
  WHERE id = v_proposal.id AND status = 'approved';
  IF NOT FOUND THEN RAISE EXCEPTION 'Proposal execution race rejected' USING ERRCODE = '40001'; END IF;

  RETURN jsonb_build_object(
    'executionId', v_execution_id,
    'interventionIds', to_jsonb(v_intervention_ids),
    'count', array_length(v_intervention_ids, 1),
    'alreadyExecuted', false
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.execute_approved_learning_intervention_v1(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.execute_approved_learning_intervention_v1(uuid, uuid) TO service_role;

COMMENT ON FUNCTION public.execute_approved_learning_intervention_v1(uuid, uuid) IS
  '8.9: executes an approved create_learning_intervention proposal - one official learning_interventions row per enrolled struggling student. Coordinator-only; scope re-validated at execution time.';
