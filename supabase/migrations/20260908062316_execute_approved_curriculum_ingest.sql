-- =============================================================================
-- execute_approved_curriculum_ingest - continuous-verification task 7.8
-- The only path from an approved curriculum-ingest proposal to official
-- learning_outcomes + outcome_mappings rows. Coordinator-only; scope
-- re-validated at execution time (program coordination); per-draft contract
-- validation; mappings written through the existing hierarchy/weight-sum
-- constraints (deferred triggers still guard the commit).
-- Registry: ingest_curriculum@1.0.0 (write-tools/registry.ts).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.execute_approved_curriculum_ingest_v1(
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
  v_clos jsonb;
  v_clo jsonb;
  v_clo_id uuid;
  v_clo_ids uuid[];
  v_mapping_ids uuid[];
  v_mapping_id uuid;
  v_blooms public.blooms_level;
  v_sort_order integer;
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
    OR v_proposal.action_type <> 'ingest_curriculum'
    OR v_proposal.expires_at IS NOT NULL AND v_proposal.expires_at <= now()
  THEN
    RAISE EXCEPTION 'Approved, unexpired Coordinator proposal required' USING ERRCODE = '42501';
  END IF;
  IF jsonb_typeof(v_proposal.payload) <> 'object'
    OR v_proposal.payload - ARRAY['kind', 'course_id', 'program_id', 'syllabus_name', 'clos'] <> '{}'::jsonb
    OR v_proposal.payload->>'kind' <> 'curriculum_ingest'
    OR jsonb_typeof(v_proposal.payload->'clos') <> 'array'
    OR length(v_proposal.evidence_hash) <> 64
  THEN
    RAISE EXCEPTION 'Invalid curriculum-ingest proposal contract' USING ERRCODE = '22023';
  END IF;

  v_course_id := v_proposal.course_id;
  v_program_id := v_proposal.program_id;
  v_clos := v_proposal.payload->'clos';
  IF v_course_id IS NULL OR v_program_id IS NULL
    OR jsonb_array_length(v_clos) NOT BETWEEN 1 AND 30
  THEN
    RAISE EXCEPTION 'Curriculum-ingest payload values are invalid' USING ERRCODE = '22023';
  END IF;

  -- Scope re-check: the actor must still coordinate the course's program.
  IF NOT EXISTS (
    SELECT 1 FROM public.programs pr
    WHERE pr.id = v_program_id
      AND pr.institution_id = v_actor_institution_id
      AND pr.coordinator_id = p_actor_id
  ) THEN
    RAISE EXCEPTION 'Program scope is no longer authorized' USING ERRCODE = '42501';
  END IF;

  -- Bloom's integer (1-6) → canonical enum label.
  v_sort_order := 1000;
  v_clo_ids := ARRAY[]::uuid[];
  v_mapping_ids := ARRAY[]::uuid[];

  FOR v_clo IN SELECT * FROM jsonb_array_elements(v_clos) LOOP
    -- Per-draft contract.
    IF jsonb_typeof(v_clo) <> 'object'
      OR jsonb_typeof(v_clo->'title_en') <> 'string'
      OR length(v_clo->>'title_en') NOT BETWEEN 1 AND 300
      OR jsonb_typeof(v_clo->'blooms') <> 'number'
      OR (v_clo->>'blooms')::int NOT BETWEEN 1 AND 6
    THEN
      RAISE EXCEPTION 'Invalid CLO candidate in payload' USING ERRCODE = '22023';
    END IF;

    v_blooms := CASE (v_clo->>'blooms')::int
      WHEN 1 THEN 'remembering'::public.blooms_level
      WHEN 2 THEN 'understanding'::public.blooms_level
      WHEN 3 THEN 'applying'::public.blooms_level
      WHEN 4 THEN 'analyzing'::public.blooms_level
      WHEN 5 THEN 'evaluating'::public.blooms_level
      ELSE 'creating'::public.blooms_level
    END;

    -- Tentative PLO mapping (optional): the PLO must exist in this program.
    IF v_clo->>'plo_id' IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.learning_outcomes plo
      WHERE plo.id = (v_clo->>'plo_id')::uuid
        AND plo.type = 'PLO'
        AND plo.program_id = v_program_id
    ) THEN
      RAISE EXCEPTION 'Tentative PLO % is not in this program', v_clo->>'plo_id' USING ERRCODE = '22023';
    END IF;
    -- Tentative ILO mapping (optional): the ILO must exist in this institution.
    IF v_clo->>'ilo_id' IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.learning_outcomes ilo
      WHERE ilo.id = (v_clo->>'ilo_id')::uuid
        AND ilo.type = 'ILO'
        AND ilo.institution_id = v_actor_institution_id
    ) THEN
      RAISE EXCEPTION 'Tentative ILO % is not in this institution', v_clo->>'ilo_id' USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.learning_outcomes (
      institution_id, program_id, course_id, created_by, type,
      title, description, blooms_level, title_ar, sort_order
    ) VALUES (
      v_actor_institution_id, v_program_id, v_course_id, p_actor_id, 'CLO',
      v_clo->>'title_en',
      NULLIF(v_clo->>'description_en', ''),
      v_blooms,
      NULLIF(v_clo->>'title_ar', ''),
      v_sort_order
    ) RETURNING id INTO v_clo_id;
    v_sort_order := v_sort_order + 10;
    v_clo_ids := array_append(v_clo_ids, v_clo_id);

    -- PLO → CLO mapping (tentative, weight must be 1.0 for a fresh CLO so the
    -- deferred weight-sum trigger passes: this CLO has a single parent).
    IF v_clo->>'plo_id' IS NOT NULL THEN
      IF (v_clo->>'plo_weight')::numeric IS DISTINCT FROM 1.0 THEN
        RAISE EXCEPTION 'A newly ingested CLO requires a single PLO mapping with weight 1.0' USING ERRCODE = '22023';
      END IF;
      INSERT INTO public.outcome_mappings (source_outcome_id, target_outcome_id, weight)
      VALUES ((v_clo->>'plo_id')::uuid, v_clo_id, 1.0)
      RETURNING id INTO v_mapping_id;
      v_mapping_ids := array_append(v_mapping_ids, v_mapping_id);

      -- ILO → PLO tentative mapping: the PLO's incoming ILO weights (existing
      -- + new) must sum to 1.0 for the deferred weight-sum trigger.
      IF v_clo->>'ilo_id' IS NOT NULL THEN
        IF EXISTS (
          SELECT 1 FROM public.outcome_mappings om
          JOIN public.learning_outcomes src ON src.id = om.source_outcome_id
          WHERE om.target_outcome_id = (v_clo->>'plo_id')::uuid
            AND src.type = 'ILO'
        ) THEN
          RAISE EXCEPTION 'PLO % already has ILO mappings; tentative ILO mapping rejected', v_clo->>'plo_id' USING ERRCODE = '22023';
        END IF;
        IF (v_clo->>'ilo_weight')::numeric IS DISTINCT FROM 1.0 THEN
          RAISE EXCEPTION 'The first ILO mapping on a PLO requires weight 1.0' USING ERRCODE = '22023';
        END IF;
        INSERT INTO public.outcome_mappings (source_outcome_id, target_outcome_id, weight)
        VALUES ((v_clo->>'ilo_id')::uuid, (v_clo->>'plo_id')::uuid, (v_clo->>'ilo_weight')::numeric)
        RETURNING id INTO v_mapping_id;
        v_mapping_ids := array_append(v_mapping_ids, v_mapping_id);
      END IF;
    END IF;
  END LOOP;

  INSERT INTO public.agent_action_executions (
    proposal_id, run_id, institution_id, executed_by, tool_name, tool_version, idempotency_key, result
  ) VALUES (
    v_proposal.id, v_proposal.run_id, v_proposal.institution_id, p_actor_id,
    v_proposal.action_type, COALESCE(v_proposal.tool_version, '1.0.0'), v_proposal.idempotency_key,
    jsonb_build_object(
      'cloIds', to_jsonb(v_clo_ids),
      'mappingIds', to_jsonb(v_mapping_ids),
      'count', array_length(v_clo_ids, 1),
      'targetType', 'learning_outcomes'
    )
  ) RETURNING id INTO v_execution_id;

  UPDATE public.agent_action_proposals SET status = 'executed', executed_at = now()
  WHERE id = v_proposal.id AND status = 'approved';
  IF NOT FOUND THEN RAISE EXCEPTION 'Proposal execution race rejected' USING ERRCODE = '40001'; END IF;

  RETURN jsonb_build_object(
    'executionId', v_execution_id,
    'cloIds', to_jsonb(v_clo_ids),
    'mappingIds', to_jsonb(v_mapping_ids),
    'count', array_length(v_clo_ids, 1),
    'alreadyExecuted', false
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.execute_approved_curriculum_ingest_v1(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.execute_approved_curriculum_ingest_v1(uuid, uuid) TO service_role;

COMMENT ON FUNCTION public.execute_approved_curriculum_ingest_v1(uuid, uuid) IS
  '7.8: executes an approved ingest_curriculum proposal - inserts candidate CLOs (bilingual, Bloom-typed) + tentative PLO/ILO mappings through the existing validated outcome constraints. Coordinator-only; scope re-validated at execution time.';
