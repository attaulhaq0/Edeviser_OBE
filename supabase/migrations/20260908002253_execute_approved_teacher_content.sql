-- =============================================================================
-- execute_approved_teacher_content - continuous-verification task 7.10
-- The only path from an approved AI question-draft proposal to official
-- question_bank rows. Assigned-teacher-only; scope re-validated at execution
-- time (course + teacher assignment). Registry:
-- publish_official_content@1.0.0 (write-tools/registry.ts).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.execute_approved_teacher_content_v1(
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
  v_questions jsonb;
  v_question jsonb;
  v_question_id uuid;
  v_question_ids uuid[];
BEGIN
  SELECT role::text, institution_id INTO v_actor_role, v_actor_institution_id
  FROM public.profiles WHERE id = p_actor_id AND is_active = true;
  IF v_actor_role IS DISTINCT FROM 'teacher' THEN
    RAISE EXCEPTION 'Teacher scope required' USING ERRCODE = '42501';
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
    OR v_proposal.required_approver_role <> 'teacher'
    OR v_proposal.action_type <> 'publish_official_content'
    OR v_proposal.expires_at IS NOT NULL AND v_proposal.expires_at <= now()
  THEN
    RAISE EXCEPTION 'Approved, unexpired teacher proposal required' USING ERRCODE = '42501';
  END IF;
  IF jsonb_typeof(v_proposal.payload) <> 'object'
    OR v_proposal.payload - ARRAY['kind', 'questions'] <> '{}'::jsonb
    OR v_proposal.payload->>'kind' <> 'quiz_question_drafts'
    OR jsonb_typeof(v_proposal.payload->'questions') <> 'array'
    OR length(v_proposal.evidence_hash) <> 64
  THEN
    RAISE EXCEPTION 'Invalid question-draft proposal contract' USING ERRCODE = '22023';
  END IF;

  v_course_id := v_proposal.course_id;
  v_questions := v_proposal.payload->'questions';
  IF v_course_id IS NULL
    OR jsonb_array_length(v_questions) NOT BETWEEN 1 AND 50
  THEN
    RAISE EXCEPTION 'Question-draft payload values are invalid' USING ERRCODE = '22023';
  END IF;

  -- Scope re-check: the actor must still be the assigned teacher of the course.
  IF NOT EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = v_course_id
      AND c.teacher_id = p_actor_id
  ) THEN
    RAISE EXCEPTION 'Course scope is no longer authorized' USING ERRCODE = '42501';
  END IF;

  v_question_ids := ARRAY[]::uuid[];
  FOR v_question IN SELECT * FROM jsonb_array_elements(v_questions) LOOP
    -- Per-draft contract: mirrors the generator's ValidatedQuestion shape.
    IF jsonb_typeof(v_question) <> 'object'
      OR jsonb_typeof(v_question->'clo_id') <> 'string'
      OR jsonb_typeof(v_question->'bloom_level') <> 'number'
      OR jsonb_typeof(v_question->'question_type') <> 'string'
      OR jsonb_typeof(v_question->'question_text') <> 'string'
      OR (v_question->>'question_text') = ''
      OR length(v_question->>'question_text') > 2000
      OR jsonb_typeof(v_question->'difficulty_rating') <> 'number'
      OR (v_question->>'difficulty_rating')::numeric NOT BETWEEN 0 AND 5
      OR jsonb_typeof(v_question->'correct_answer') <> 'object'
      OR (v_question->'options') IS NOT NULL AND jsonb_typeof(v_question->'options') <> 'array'
      OR NOT EXISTS (SELECT 1 FROM public.learning_outcomes lo
                     WHERE lo.id = (v_question->>'clo_id')::uuid
                       AND lo.course_id = v_course_id)
    THEN
      RAISE EXCEPTION 'Invalid question draft in payload' USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.question_bank (
      id, institution_id, course_id, clo_id, bloom_level, question_type,
      question_text, options, correct_answer, explanation, difficulty_rating,
      status, generation_source, source_chunks, generation_request_id, created_by
    ) VALUES (
      (v_question->>'id')::uuid,
      v_proposal.institution_id,
      v_course_id,
      (v_question->>'clo_id')::uuid,
      (v_question->>'bloom_level')::smallint,
      v_question->>'question_type',
      v_question->>'question_text',
      v_question->'options',
      v_question->'correct_answer',
      v_question->>'explanation',
      (v_question->>'difficulty_rating')::numeric,
      'approved',
      'ai',
      COALESCE(v_question->'source_chunks', '[]'::jsonb),
      (v_proposal.run_id)::uuid,
      p_actor_id
    )
    ON CONFLICT (id) DO UPDATE SET
      status = 'approved',
      updated_at = now()
    RETURNING id INTO v_question_id;
    v_question_ids := array_append(v_question_ids, v_question_id);
  END LOOP;

  INSERT INTO public.agent_action_executions (
    proposal_id, run_id, institution_id, executed_by, tool_name, tool_version, idempotency_key, result
  ) VALUES (
    v_proposal.id, v_proposal.run_id, v_proposal.institution_id, p_actor_id,
    v_proposal.action_type, COALESCE(v_proposal.tool_version, '1.0.0'), v_proposal.idempotency_key,
    jsonb_build_object(
      'questionIds', to_jsonb(v_question_ids),
      'count', array_length(v_question_ids, 1),
      'targetType', 'question_bank'
    )
  ) RETURNING id INTO v_execution_id;

  UPDATE public.agent_action_proposals SET status = 'executed', executed_at = now()
  WHERE id = v_proposal.id AND status = 'approved';
  IF NOT FOUND THEN RAISE EXCEPTION 'Proposal execution race rejected' USING ERRCODE = '40001'; END IF;

  RETURN jsonb_build_object(
    'executionId', v_execution_id,
    'questionIds', to_jsonb(v_question_ids),
    'count', array_length(v_question_ids, 1),
    'alreadyExecuted', false
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.execute_approved_teacher_content_v1(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.execute_approved_teacher_content_v1(uuid, uuid) TO service_role;

COMMENT ON FUNCTION public.execute_approved_teacher_content_v1(uuid, uuid) IS
  '7.10: executes an approved publish_official_content proposal - inserts approved AI question drafts into question_bank. Assigned-teacher-only; scope re-validated at execution time.';
