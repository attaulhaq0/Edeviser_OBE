-- =============================================================================
-- create_learning_intervention_proposal — certification remediation
-- 
-- This RPC creates an agent_action_proposals row for a coordinator to review
-- and approve. It bridges the gap between the DecisionIntelligenceSection UI
-- (which builds a deterministic draft plan) and the existing
-- execute_approved_learning_intervention_v1 RPC (which creates interventions
-- from approved proposals).
--
-- Called from: DecisionIntelligenceSection "Submit for Approval" button
-- Requires: authenticated coordinator role
-- Security: SECURITY DEFINER, re-validates institution scope
-- =============================================================================

CREATE OR REPLACE FUNCTION public.create_learning_intervention_proposal_v1(
  p_course_id uuid,
  p_clo_id uuid,
  p_student_ids uuid[],
  p_intervention_type text,
  p_plan text,
  p_recommended_owner text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $fn$
DECLARE
  v_actor_id uuid;
  v_actor_role text;
  v_actor_institution_id uuid;
  v_program_id uuid;
  v_institution_id uuid;
  v_proposal_id uuid;
  v_evidence_hash text;
  v_context jsonb;
  v_payload jsonb;
BEGIN
  -- ── Auth identity ──
  v_actor_id := auth.uid();
  SELECT role::text, institution_id INTO v_actor_role, v_actor_institution_id
  FROM public.profiles WHERE id = v_actor_id AND is_active = true;
  
  IF v_actor_role NOT IN ('coordinator', 'teacher', 'admin') THEN
    RAISE EXCEPTION 'Coordinator, teacher, or admin role required' USING ERRCODE = '42501';
  END IF;

  -- ── Scope validation: course must belong to actor's institution ──
  SELECT c.program_id, p.institution_id
  INTO v_program_id, v_institution_id
  FROM public.courses c
  JOIN public.programs p ON p.id = c.program_id
  WHERE c.id = p_course_id AND p.institution_id = v_actor_institution_id;
  
  IF v_program_id IS NULL THEN
    RAISE EXCEPTION 'Course not found or not in your institution' USING ERRCODE = 'P0002';
  END IF;

  -- ── Validate student enrollment ──
  IF array_length(p_student_ids, 1) IS NULL OR array_length(p_student_ids, 1) = 0 THEN
    RAISE EXCEPTION 'At least one student ID is required' USING ERRCODE = '22023';
  END IF;
  
  IF array_length(p_student_ids, 1) > 50 THEN
    RAISE EXCEPTION 'Maximum 50 students per proposal' USING ERRCODE = '22023';
  END IF;

  -- ── Build payload and context ──
  v_payload := jsonb_build_object(
    'courseId', p_course_id,
    'cloId', p_clo_id,
    'studentIds', to_jsonb(p_student_ids),
    'interventionType', btrim(p_intervention_type),
    'plan', btrim(p_plan),
    'recommendedOwner', btrim(p_recommended_owner)
  );

  -- ── Evidence context for audit trail ──
  SELECT jsonb_agg(
    jsonb_build_object(
      'outcomeId', lo.id,
      'attainmentPercent', oa.attainment_percent,
      'sampleCount', oa.sample_count
    )
  ) INTO v_context
  FROM public.outcome_attainment oa
  JOIN public.learning_outcomes lo ON lo.id = oa.clo_id
  WHERE oa.clo_id = p_clo_id
    AND oa.student_id = ANY(p_student_ids)
    AND oa.scope = 'student_course';

  -- ── Evidence hash for integrity ──
  v_evidence_hash := encode(
    digest(
      COALESCE(v_context::text, '') || v_payload::text,
      'sha256'
    ),
    'hex'
  );

  -- ── Create proposal ──
  INSERT INTO public.agent_action_proposals (
    institution_id, course_id, program_id,
    actor_user_id, action_type, tool_version,
    payload, context, evidence_hash,
    status, required_approver_role,
    expires_at
  ) VALUES (
    v_institution_id, p_course_id, v_program_id,
    v_actor_id, 'create_learning_intervention', '1.0.0',
    v_payload, v_context, v_evidence_hash,
    'pending', 'coordinator',
    now() + INTERVAL '30 days'
  ) RETURNING id INTO v_proposal_id;

  RETURN jsonb_build_object(
    'proposalId', v_proposal_id,
    'status', 'pending',
    'approvalRequired', true,
    'approverRole', 'coordinator',
    'studentCount', array_length(p_student_ids, 1)
  );
END;
$fn$;

REVOKE ALL ON FUNCTION public.create_learning_intervention_proposal_v1(uuid, uuid, uuid[], text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_learning_intervention_proposal_v1(uuid, uuid, uuid[], text, text, text) TO authenticated;

COMMENT ON FUNCTION public.create_learning_intervention_proposal_v1(uuid, uuid, uuid[], text, text, text) IS
  'Certification remediation: creates a pending create_learning_intervention proposal for coordinator approval. Called from DecisionIntelligenceSection UI.';