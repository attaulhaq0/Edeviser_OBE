-- =============================================================================
-- learning_state_server_path — continuous-verification task 7.4 (defect fix)
-- ROOT CAUSE: the proactive worker calls `get_student_learning_state_v1` via
-- the service-role client (no user JWT); the function raised
-- 'Authentication required' (auth.uid() IS NULL) — killing every proactive
-- intervention run pre-LLM (classified `proactive_job_failed`).
-- FIX: trusted server path (postgres/service_role) returns the full canonical
-- state — the job's scope was already authorized at claim time by
-- enqueue_intervention_generation_jobs_v1. User-facing role branches
-- (student/parent/teacher/coordinator/admin) are unchanged; anon and
-- authenticated callers without a JWT still fail closed.
-- Applied LIVE via MCP as an exact-text pg_get_functiondef patch (DO block,
-- anchor-guarded); this file is the forward-only replay equivalent.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_student_learning_state_v1(p_student_id uuid, p_course_id uuid DEFAULT NULL::uuid, p_program_id uuid DEFAULT NULL::uuid)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $fn$
DECLARE
  v_actor_id uuid := auth.uid();
  v_actor_role text;
  v_actor_institution_id uuid;
  v_state public.student_learning_states;
  v_result jsonb;
  v_filter_course boolean := false;
BEGIN
  IF v_actor_id IS NULL THEN
    IF current_user IN ('postgres', 'service_role') THEN
      -- Trusted server path (7.4): proactive worker / system jobs. The
      -- job scope was authorized at claim time; return the full state.
      SELECT * INTO v_state
      FROM public.student_learning_states s
      WHERE s.student_id = p_student_id;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Learning State not found' USING ERRCODE = 'P0002';
      END IF;
      RETURN to_jsonb(v_state);
    END IF;
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT p.role::text, p.institution_id
    INTO v_actor_role, v_actor_institution_id
  FROM public.profiles p
  WHERE p.id = v_actor_id AND p.is_active = true;

  SELECT * INTO v_state
  FROM public.student_learning_states s
  WHERE s.student_id = p_student_id
    AND s.institution_id = v_actor_institution_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Learning State not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_actor_role = 'student' THEN
    IF p_student_id <> v_actor_id THEN
      RAISE EXCEPTION 'Learning State scope denied' USING ERRCODE = '42501';
    END IF;
    RETURN to_jsonb(v_state);
  ELSIF v_actor_role = 'parent' THEN
    IF NOT public.parent_has_verified_link(p_student_id) THEN
      RAISE EXCEPTION 'Learning State scope denied' USING ERRCODE = '42501';
    END IF;
    RETURN to_jsonb(v_state);
  ELSIF v_actor_role = 'admin' THEN
    RETURN to_jsonb(v_state);
  ELSIF v_actor_role = 'teacher' THEN
    IF p_course_id IS NULL OR NOT EXISTS (
      SELECT 1
      FROM public.student_courses sc
      JOIN public.courses c ON c.id = sc.course_id
      JOIN public.programs p ON p.id = c.program_id
      WHERE sc.student_id = p_student_id
        AND sc.course_id = p_course_id
        AND sc.status = 'active'
        AND c.teacher_id = v_actor_id
        AND p.institution_id = v_actor_institution_id
    ) THEN
      RAISE EXCEPTION 'Learning State course scope denied' USING ERRCODE = '42501';
    END IF;
    v_filter_course := true;
  ELSIF v_actor_role = 'coordinator' THEN
    IF p_program_id IS NULL OR NOT EXISTS (
      SELECT 1
      FROM public.student_courses sc
      JOIN public.courses c ON c.id = sc.course_id
      JOIN public.programs p ON p.id = c.program_id
      WHERE sc.student_id = p_student_id
        AND sc.status = 'active'
        AND p.id = p_program_id
        AND p.coordinator_id = v_actor_id
        AND p.institution_id = v_actor_institution_id
    ) THEN
      RAISE EXCEPTION 'Learning State program scope denied' USING ERRCODE = '42501';
    END IF;
  ELSE
    RAISE EXCEPTION 'Learning State role denied' USING ERRCODE = '42501';
  END IF;

  v_result := to_jsonb(v_state);
  v_result := jsonb_set(v_result, '{habits}', '{}'::jsonb);
  v_result := jsonb_set(v_result, '{goals}', '[]'::jsonb);

  v_result := jsonb_set(
    v_result,
    '{mastery,outcomes}',
    COALESCE((
      SELECT jsonb_agg(item)
      FROM jsonb_array_elements(v_state.mastery->'outcomes') item
      WHERE CASE WHEN v_filter_course
        THEN item->>'courseId' = p_course_id::text
        ELSE item->>'programId' = p_program_id::text END
    ), '[]'::jsonb)
  );
  v_result := jsonb_set(
    v_result,
    '{mastery,subClos}',
    COALESCE((
      SELECT jsonb_agg(item)
      FROM jsonb_array_elements(v_state.mastery->'subClos') item
      WHERE CASE WHEN v_filter_course
        THEN item->>'courseId' = p_course_id::text
        ELSE item->>'programId' = p_program_id::text END
    ), '[]'::jsonb)
  );

  v_result := jsonb_set(v_result, '{risk_signals}', COALESCE((
    SELECT jsonb_agg(item) FROM jsonb_array_elements(v_state.risk_signals) item
    WHERE CASE WHEN v_filter_course
      THEN item->>'courseId' = p_course_id::text
      ELSE item->>'programId' = p_program_id::text END
  ), '[]'::jsonb));
  v_result := jsonb_set(v_result, '{strengths}', COALESCE((
    SELECT jsonb_agg(item) FROM jsonb_array_elements(v_state.strengths) item
    WHERE CASE WHEN v_filter_course
      THEN item->>'courseId' = p_course_id::text
      ELSE item->>'programId' = p_program_id::text END
  ), '[]'::jsonb));
  v_result := jsonb_set(v_result, '{opportunities}', COALESCE((
    SELECT jsonb_agg(item) FROM jsonb_array_elements(v_state.opportunities) item
    WHERE CASE WHEN v_filter_course
      THEN item->>'courseId' = p_course_id::text
      ELSE item->>'programId' = p_program_id::text END
  ), '[]'::jsonb));
  v_result := jsonb_set(v_result, '{active_interventions}', COALESCE((
    SELECT jsonb_agg(item)
    FROM jsonb_array_elements(v_state.active_interventions) item
    WHERE CASE WHEN v_filter_course
      THEN item->>'courseId' = p_course_id::text
      ELSE item->>'programId' = p_program_id::text END
  ), '[]'::jsonb));
  v_result := jsonb_set(v_result, '{recommendation_history}', COALESCE((
    SELECT jsonb_agg(item)
    FROM jsonb_array_elements(v_state.recommendation_history) item
    WHERE CASE WHEN v_filter_course
      THEN item->>'courseId' = p_course_id::text
      ELSE item->>'programId' = p_program_id::text END
  ), '[]'::jsonb));
  v_result := jsonb_set(v_result, '{recent_evidence}', COALESCE((
    SELECT jsonb_agg(item)
    FROM jsonb_array_elements(v_state.recent_evidence) item
    WHERE EXISTS (
      SELECT 1 FROM public.learning_outcomes lo
      WHERE lo.id = (item->>'cloId')::uuid
        AND CASE WHEN v_filter_course
          THEN lo.course_id = p_course_id
          ELSE lo.program_id = p_program_id END
    )
  ), '[]'::jsonb));
  v_result := jsonb_set(v_result, '{approved_executed_actions}', COALESCE((
    SELECT jsonb_agg(item)
    FROM jsonb_array_elements(v_state.approved_executed_actions) item
    WHERE CASE WHEN v_filter_course
      THEN item->>'courseId' = p_course_id::text
      ELSE item->>'programId' = p_program_id::text END
  ), '[]'::jsonb));
  v_result := jsonb_set(
    v_result, '{measured_intervention_effects}', '[]'::jsonb
  );

  RETURN v_result;
END;
$fn$;