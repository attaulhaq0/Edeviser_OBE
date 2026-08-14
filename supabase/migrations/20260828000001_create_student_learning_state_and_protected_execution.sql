-- Canonical deterministic Student Learning State and the first protected
-- write executor. The state is a materialized, auditable projection of
-- authoritative records; it is never accepted from an LLM or browser payload.

ALTER TABLE public.agent_action_proposals
  ADD COLUMN tool_version text;

COMMENT ON COLUMN public.agent_action_proposals.tool_version IS
  'Exact protected-write registry version bound into approval and execution; NULL for proposal-only actions.';

CREATE TABLE public.student_learning_states (
  student_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  calculated_at timestamptz NOT NULL,
  fresh_until timestamptz NOT NULL,
  freshness jsonb NOT NULL CHECK (jsonb_typeof(freshness) = 'object'),
  mastery jsonb NOT NULL CHECK (jsonb_typeof(mastery) = 'object'),
  habits jsonb NOT NULL CHECK (jsonb_typeof(habits) = 'object'),
  risk_signals jsonb NOT NULL CHECK (jsonb_typeof(risk_signals) = 'array'),
  strengths jsonb NOT NULL CHECK (jsonb_typeof(strengths) = 'array'),
  opportunities jsonb NOT NULL CHECK (jsonb_typeof(opportunities) = 'array'),
  goals jsonb NOT NULL CHECK (jsonb_typeof(goals) = 'array'),
  active_interventions jsonb NOT NULL CHECK (jsonb_typeof(active_interventions) = 'array'),
  recent_evidence jsonb NOT NULL CHECK (jsonb_typeof(recent_evidence) = 'array'),
  recommendation_history jsonb NOT NULL CHECK (jsonb_typeof(recommendation_history) = 'array'),
  approved_executed_actions jsonb NOT NULL CHECK (jsonb_typeof(approved_executed_actions) = 'array'),
  measured_intervention_effects jsonb NOT NULL CHECK (jsonb_typeof(measured_intervention_effects) = 'array'),
  state_hash text NOT NULL CHECK (length(state_hash) = 32),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.student_learning_states IS
  'Deterministic, versioned projection of authoritative learning evidence. No freeform model-authored state is stored here.';

CREATE INDEX student_learning_states_institution_freshness_idx
  ON public.student_learning_states (institution_id, fresh_until);

ALTER TABLE public.student_learning_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "student_learning_states_student_read"
  ON public.student_learning_states FOR SELECT TO authenticated
  USING (
    student_id = (SELECT auth.uid())
    AND institution_id = (SELECT public.auth_institution_id())
  );

CREATE POLICY "student_learning_states_parent_read"
  ON public.student_learning_states FOR SELECT TO authenticated
  USING (
    institution_id = (SELECT public.auth_institution_id())
    AND (SELECT public.auth_user_role()) = 'parent'
    AND public.parent_has_verified_link(student_id)
  );

CREATE POLICY "student_learning_states_admin_read"
  ON public.student_learning_states FOR SELECT TO authenticated
  USING (
    institution_id = (SELECT public.auth_institution_id())
    AND (SELECT public.auth_user_role()) = 'admin'
  );

REVOKE ALL ON TABLE public.student_learning_states FROM PUBLIC, anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.student_learning_states FROM authenticated;
GRANT SELECT ON TABLE public.student_learning_states TO authenticated;
GRANT ALL ON TABLE public.student_learning_states TO service_role;

CREATE TABLE public.agent_action_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES public.agent_action_proposals(id) ON DELETE RESTRICT,
  run_id uuid NOT NULL REFERENCES public.agent_runs(id) ON DELETE RESTRICT,
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  student_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  executed_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  tool_name text NOT NULL CHECK (tool_name IN ('create_goal', 'create_planner_session')),
  tool_version text NOT NULL CHECK (tool_version = '1.0.0'),
  idempotency_key text NOT NULL,
  result jsonb NOT NULL CHECK (jsonb_typeof(result) = 'object'),
  learning_state_version bigint CHECK (learning_state_version IS NULL OR learning_state_version > 0),
  executed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (proposal_id),
  UNIQUE (institution_id, idempotency_key)
);

COMMENT ON TABLE public.agent_action_executions IS
  'Exactly-once receipts for registered protected write tools. Inserted atomically with the typed side effect and audit record.';

CREATE INDEX agent_action_executions_student_time_idx
  ON public.agent_action_executions (student_id, executed_at DESC)
  WHERE student_id IS NOT NULL;

ALTER TABLE public.agent_action_executions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.agent_action_executions FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.agent_action_executions TO service_role;

CREATE OR REPLACE FUNCTION public.refresh_student_learning_state_v1(
  p_student_id uuid
)
RETURNS public.student_learning_states
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_institution_id uuid;
  v_now timestamptz := clock_timestamp();
  v_latest_source timestamptz;
  v_mastery jsonb;
  v_sub_clos jsonb;
  v_habits jsonb;
  v_risk jsonb;
  v_strengths jsonb;
  v_opportunities jsonb;
  v_goals jsonb;
  v_interventions jsonb;
  v_evidence jsonb;
  v_recommendations jsonb;
  v_actions jsonb;
  v_document jsonb;
  v_state public.student_learning_states;
  v_success_threshold numeric := 70;
  v_excellent_threshold numeric := 85;
  v_satisfactory_threshold numeric := 70;
  v_developing_threshold numeric := 50;
BEGIN
  SELECT p.institution_id
    INTO v_institution_id
  FROM public.profiles p
  WHERE p.id = p_student_id
    AND p.role = 'student'
    AND p.is_active = true;

  IF v_institution_id IS NULL THEN
    RAISE EXCEPTION 'Active student not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT
    LEAST(100, GREATEST(0, s.success_threshold::numeric)),
    CASE WHEN jsonb_typeof(s.attainment_thresholds->'excellent') = 'number'
      THEN LEAST(100, GREATEST(0, (s.attainment_thresholds->>'excellent')::numeric))
      ELSE 85 END,
    CASE WHEN jsonb_typeof(s.attainment_thresholds->'satisfactory') = 'number'
      THEN LEAST(100, GREATEST(0, (s.attainment_thresholds->>'satisfactory')::numeric))
      ELSE 70 END,
    CASE WHEN jsonb_typeof(s.attainment_thresholds->'developing') = 'number'
      THEN LEAST(100, GREATEST(0, (s.attainment_thresholds->>'developing')::numeric))
      ELSE 50 END
  INTO v_success_threshold, v_excellent_threshold,
    v_satisfactory_threshold, v_developing_threshold
  FROM public.institution_settings s
  WHERE s.institution_id = v_institution_id;

  v_success_threshold := COALESCE(v_success_threshold, 70);
  v_excellent_threshold := COALESCE(v_excellent_threshold, 85);
  v_satisfactory_threshold := COALESCE(v_satisfactory_threshold, 70);
  v_developing_threshold := COALESCE(v_developing_threshold, 50);

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'outcomeId', ranked.outcome_id,
      'outcomeType', ranked.outcome_type,
      'courseId', ranked.course_id,
      'programId', ranked.program_id,
      'attainmentPercent', ranked.attainment_percent,
      'sampleCount', ranked.sample_count,
      'confidence', LEAST(1.0, ranked.sample_count::numeric / 5.0),
      'observedAt', ranked.last_calculated_at
    ) ORDER BY ranked.outcome_type, ranked.course_id NULLS LAST, ranked.outcome_id), '[]'::jsonb)
    INTO v_mastery
  FROM (
    SELECT oa.outcome_id, lo.type::text AS outcome_type, oa.course_id,
      lo.program_id, oa.attainment_percent, oa.sample_count,
      oa.last_calculated_at
    FROM public.outcome_attainment oa
    JOIN public.learning_outcomes lo ON lo.id = oa.outcome_id
    WHERE oa.student_id = p_student_id
      AND lo.institution_id = v_institution_id
    ORDER BY oa.last_calculated_at DESC, oa.outcome_id
    LIMIT 250
  ) ranked;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'subCloId', scoped.id,
      'cloId', scoped.clo_id,
      'courseId', scoped.course_id,
      'programId', scoped.program_id,
      'attainmentPercent', NULL,
      'confidence', 0,
      'status', 'awaiting_direct_evidence'
    ) ORDER BY scoped.course_id, scoped.clo_id, scoped.sort_order, scoped.id), '[]'::jsonb)
    INTO v_sub_clos
  FROM (
    SELECT sc.id, sc.clo_id, lo.course_id, lo.program_id, sc.sort_order
    FROM public.sub_clos sc
    JOIN public.learning_outcomes lo ON lo.id = sc.clo_id
    JOIN public.student_courses enrollment
      ON enrollment.course_id = lo.course_id
     AND enrollment.student_id = p_student_id
     AND enrollment.status = 'active'
    WHERE lo.institution_id = v_institution_id
    ORDER BY lo.course_id, sc.clo_id, sc.sort_order, sc.id
    LIMIT 250
  ) scoped;

  SELECT COALESCE(jsonb_object_agg(summary.habit_type, jsonb_build_object(
      'completedDays', summary.completed_days,
      'lastCompletedAt', summary.last_completed_at,
      'windowDays', 28
    )), '{}'::jsonb)
    INTO v_habits
  FROM (
    SELECT h.habit_type, count(DISTINCT h.date)::integer AS completed_days,
      max(h.completed_at) AS last_completed_at
    FROM public.habit_logs h
    WHERE h.student_id = p_student_id
      AND h.date >= (v_now AT TIME ZONE 'UTC')::date - 27
    GROUP BY h.habit_type
  ) summary;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'kind', 'low_mastery',
      'outcomeId', low.outcome_id,
      'courseId', low.course_id,
      'programId', low.program_id,
      'severity', CASE WHEN low.attainment_percent < v_developing_threshold
        THEN 'high' ELSE 'medium' END,
      'value', low.attainment_percent,
      'threshold', v_success_threshold,
      'observedAt', low.last_calculated_at,
      'calculation', 'outcome_attainment_below_success_threshold'
    ) ORDER BY low.attainment_percent, low.outcome_id), '[]'::jsonb)
    INTO v_risk
  FROM (
    SELECT oa.outcome_id, oa.course_id, lo.program_id, oa.attainment_percent,
      oa.last_calculated_at
    FROM public.outcome_attainment oa
    JOIN public.learning_outcomes lo ON lo.id = oa.outcome_id
    WHERE oa.student_id = p_student_id
      AND lo.institution_id = v_institution_id
      AND oa.attainment_percent < v_success_threshold
    ORDER BY oa.attainment_percent, oa.last_calculated_at DESC, oa.outcome_id
    LIMIT 50
  ) low;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'outcomeId', strong.outcome_id,
      'courseId', strong.course_id,
      'programId', strong.program_id,
      'attainmentPercent', strong.attainment_percent,
      'basis', 'attainment_at_or_above_excellent_threshold',
      'threshold', v_excellent_threshold
    ) ORDER BY strong.attainment_percent DESC, strong.outcome_id), '[]'::jsonb)
    INTO v_strengths
  FROM (
    SELECT oa.outcome_id, oa.course_id, lo.program_id, oa.attainment_percent
    FROM public.outcome_attainment oa
    JOIN public.learning_outcomes lo ON lo.id = oa.outcome_id
    WHERE oa.student_id = p_student_id
      AND lo.institution_id = v_institution_id
      AND oa.attainment_percent >= v_excellent_threshold
    ORDER BY oa.attainment_percent DESC, oa.outcome_id
    LIMIT 50
  ) strong;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'outcomeId', opportunity.outcome_id,
      'courseId', opportunity.course_id,
      'programId', opportunity.program_id,
      'attainmentPercent', opportunity.attainment_percent,
      'basis', 'attainment_below_satisfactory_threshold',
      'threshold', v_satisfactory_threshold
    ) ORDER BY opportunity.attainment_percent, opportunity.outcome_id), '[]'::jsonb)
    INTO v_opportunities
  FROM (
    SELECT oa.outcome_id, oa.course_id, lo.program_id, oa.attainment_percent
    FROM public.outcome_attainment oa
    JOIN public.learning_outcomes lo ON lo.id = oa.outcome_id
    WHERE oa.student_id = p_student_id
      AND lo.institution_id = v_institution_id
      AND oa.attainment_percent < v_satisfactory_threshold
    ORDER BY oa.attainment_percent, oa.outcome_id
    LIMIT 50
  ) opportunity;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'goalId', goal.id,
      'weekStart', goal.week_start_date,
      'goalType', goal.goal_type,
      'goalText', goal.goal_text,
      'targetValue', goal.target_value,
      'currentValue', goal.current_value,
      'status', goal.status,
      'updatedAt', goal.updated_at
    ) ORDER BY goal.week_start_date DESC, goal.id), '[]'::jsonb)
    INTO v_goals
  FROM (
    SELECT g.* FROM public.weekly_goals g
    WHERE g.student_id = p_student_id
      AND g.status IN ('active', 'completed')
    ORDER BY g.week_start_date DESC, g.created_at DESC, g.id
    LIMIT 25
  ) goal;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'proposalId', proposal.id,
      'actionType', proposal.action_type,
      'courseId', proposal.course_id,
      'programId', proposal.program_id,
      'status', proposal.status,
      'createdAt', proposal.created_at,
      'expiresAt', proposal.expires_at
    ) ORDER BY proposal.created_at DESC, proposal.id), '[]'::jsonb)
    INTO v_interventions
  FROM (
    SELECT p.id, p.action_type, p.course_id, p.program_id, p.status,
      p.created_at, p.expires_at
    FROM public.agent_action_proposals p
    WHERE p.student_id = p_student_id
      AND p.institution_id = v_institution_id
      AND p.status IN ('pending', 'approved')
    ORDER BY p.created_at DESC, p.id
    LIMIT 50
  ) proposal;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'evidenceId', recent.id,
      'cloId', recent.clo_id,
      'ploId', recent.plo_id,
      'iloId', recent.ilo_id,
      'scorePercent', recent.score_percent,
      'attainmentLevel', recent.attainment_level,
      'observedAt', recent.created_at
    ) ORDER BY recent.created_at DESC, recent.id), '[]'::jsonb)
    INTO v_evidence
  FROM (
    SELECT e.* FROM public.evidence e
    WHERE e.student_id = p_student_id
    ORDER BY e.created_at DESC, e.id
    LIMIT 50
  ) recent;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'proposalId', history.id,
      'actionType', history.action_type,
      'courseId', history.course_id,
      'programId', history.program_id,
      'reason', history.reason,
      'status', history.status,
      'evidenceHash', history.evidence_hash,
      'createdAt', history.created_at,
      'decidedAt', history.decided_at
    ) ORDER BY history.created_at DESC, history.id), '[]'::jsonb)
    INTO v_recommendations
  FROM (
    SELECT p.id, p.action_type, p.course_id, p.program_id, p.reason,
      p.status, p.evidence_hash, p.created_at, p.decided_at
    FROM public.agent_action_proposals p
    WHERE p.student_id = p_student_id
      AND p.institution_id = v_institution_id
    ORDER BY p.created_at DESC, p.id
    LIMIT 50
  ) history;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'proposalId', action.proposal_id,
      'actionType', action.action_type,
      'courseId', action.course_id,
      'programId', action.program_id,
      'status', action.status,
      'approvedAt', action.decided_at,
      'executionId', action.execution_id,
      'toolName', action.tool_name,
      'toolVersion', action.tool_version,
      'executedBy', action.executed_by,
      'executedAt', action.executed_at,
      'result', action.result
    ) ORDER BY COALESCE(action.executed_at, action.decided_at) DESC,
      action.proposal_id), '[]'::jsonb)
    INTO v_actions
  FROM (
    SELECT p.id AS proposal_id, p.action_type, p.course_id, p.program_id,
      p.status, p.decided_at, x.id AS execution_id, x.tool_name,
      x.tool_version, x.executed_by, x.executed_at, x.result
    FROM public.agent_action_proposals p
    LEFT JOIN public.agent_action_executions x ON x.proposal_id = p.id
    WHERE p.student_id = p_student_id
      AND p.institution_id = v_institution_id
      AND p.status IN ('approved', 'executed')
    ORDER BY COALESCE(x.executed_at, p.decided_at) DESC, p.id
    LIMIT 50
  ) action;

  SELECT max(observed_at) INTO v_latest_source
  FROM (
    SELECT max(oa.last_calculated_at) AS observed_at
      FROM public.outcome_attainment oa WHERE oa.student_id = p_student_id
    UNION ALL SELECT max(e.created_at) FROM public.evidence e WHERE e.student_id = p_student_id
    UNION ALL SELECT max(h.completed_at) FROM public.habit_logs h WHERE h.student_id = p_student_id
    UNION ALL SELECT max(g.updated_at) FROM public.weekly_goals g WHERE g.student_id = p_student_id
    UNION ALL SELECT max(p.created_at) FROM public.agent_action_proposals p WHERE p.student_id = p_student_id
    UNION ALL SELECT max(x.executed_at) FROM public.agent_action_executions x WHERE x.student_id = p_student_id
  ) sources;

  v_document := jsonb_build_object(
    'studentId', p_student_id,
    'institutionId', v_institution_id,
    'mastery', jsonb_build_object('outcomes', v_mastery, 'subClos', v_sub_clos),
    'habits', jsonb_build_object('windowDays', 28, 'signals', v_habits),
    'riskSignals', v_risk,
    'strengths', v_strengths,
    'opportunities', v_opportunities,
    'goals', v_goals,
    'activeInterventions', v_interventions,
    'recentEvidence', v_evidence,
    'recommendationHistory', v_recommendations,
    'approvedExecutedActions', v_actions,
    'measuredInterventionEffects', '[]'::jsonb
  );

  INSERT INTO public.student_learning_states (
    student_id, institution_id, calculated_at, fresh_until, freshness,
    mastery, habits, risk_signals, strengths, opportunities, goals,
    active_interventions, recent_evidence, recommendation_history,
    approved_executed_actions, measured_intervention_effects, state_hash
  ) VALUES (
    p_student_id, v_institution_id, v_now, v_now + interval '24 hours',
    jsonb_build_object(
      'status', 'fresh',
      'maxSourceObservedAt', v_latest_source,
      'freshUntil', v_now + interval '24 hours'
    ),
    v_document->'mastery', v_document->'habits', v_risk, v_strengths,
    v_opportunities, v_goals, v_interventions, v_evidence,
    v_recommendations, v_actions, '[]'::jsonb, md5(v_document::text)
  )
  ON CONFLICT (student_id) DO UPDATE SET
    institution_id = EXCLUDED.institution_id,
    version = public.student_learning_states.version +
      CASE WHEN public.student_learning_states.state_hash IS DISTINCT FROM EXCLUDED.state_hash
        THEN 1 ELSE 0 END,
    calculated_at = EXCLUDED.calculated_at,
    fresh_until = EXCLUDED.fresh_until,
    freshness = EXCLUDED.freshness,
    mastery = EXCLUDED.mastery,
    habits = EXCLUDED.habits,
    risk_signals = EXCLUDED.risk_signals,
    strengths = EXCLUDED.strengths,
    opportunities = EXCLUDED.opportunities,
    goals = EXCLUDED.goals,
    active_interventions = EXCLUDED.active_interventions,
    recent_evidence = EXCLUDED.recent_evidence,
    recommendation_history = EXCLUDED.recommendation_history,
    approved_executed_actions = EXCLUDED.approved_executed_actions,
    measured_intervention_effects = EXCLUDED.measured_intervention_effects,
    state_hash = EXCLUDED.state_hash,
    updated_at = v_now
  RETURNING * INTO v_state;

  RETURN v_state;
END;
$function$;

COMMENT ON FUNCTION public.refresh_student_learning_state_v1(uuid) IS
  'Rebuilds one deterministic Student Learning State from authoritative tables. Service role only.';
REVOKE ALL ON FUNCTION public.refresh_student_learning_state_v1(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_student_learning_state_v1(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.student_learning_state_needs_refresh_v1(
  p_student_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT NOT EXISTS (
    SELECT 1
    FROM public.student_learning_states state
    WHERE state.student_id = p_student_id
      AND state.fresh_until > now()
  );
$function$;

COMMENT ON FUNCTION public.student_learning_state_needs_refresh_v1(uuid) IS
  'Service-only freshness boundary used before rebuilding a Student Learning State.';
REVOKE ALL ON FUNCTION public.student_learning_state_needs_refresh_v1(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.student_learning_state_needs_refresh_v1(uuid)
  TO service_role;

-- Staff never receive the global student row directly because it can contain
-- data from courses/programs outside their assignment. This authenticated RPC
-- is the database-enforced, role-aware projection boundary.
CREATE OR REPLACE FUNCTION public.get_student_learning_state_v1(
  p_student_id uuid,
  p_course_id uuid DEFAULT NULL,
  p_program_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $function$
DECLARE
  v_actor_id uuid := auth.uid();
  v_actor_role text;
  v_actor_institution_id uuid;
  v_state public.student_learning_states;
  v_result jsonb;
  v_filter_course boolean := false;
BEGIN
  IF v_actor_id IS NULL THEN
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
$function$;

COMMENT ON FUNCTION public.get_student_learning_state_v1(uuid, uuid, uuid) IS
  'Returns a DB-authorized full or course/program-minimized Student Learning State projection for all five roles.';
REVOKE ALL ON FUNCTION public.get_student_learning_state_v1(uuid, uuid, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_student_learning_state_v1(uuid, uuid, uuid)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.execute_approved_agent_personal_action_v1(
  p_proposal_id uuid,
  p_actor_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_actor_id uuid := p_actor_id;
  v_actor_role text;
  v_actor_institution_id uuid;
  v_proposal public.agent_action_proposals;
  v_run public.agent_runs;
  v_existing public.agent_action_executions;
  v_result jsonb;
  v_target_id uuid;
  v_course_id uuid;
  v_week_start date;
  v_planned_date date;
  v_start_time time;
  v_duration integer;
  v_state public.student_learning_states;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT p.role::text, p.institution_id
    INTO v_actor_role, v_actor_institution_id
  FROM public.profiles p
  WHERE p.id = v_actor_id AND p.is_active = true;

  SELECT * INTO v_proposal
  FROM public.agent_action_proposals p
  WHERE p.id = p_proposal_id
  FOR UPDATE;

  IF NOT FOUND OR v_proposal.institution_id <> v_actor_institution_id THEN
    RAISE EXCEPTION 'Proposal not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_proposal.status = 'executed' THEN
    SELECT * INTO v_existing
    FROM public.agent_action_executions x
    WHERE x.proposal_id = v_proposal.id;
    IF FOUND AND v_existing.executed_by = v_actor_id THEN
      RETURN v_existing.result || jsonb_build_object(
        'executionId', v_existing.id,
        'alreadyExecuted', true,
        'learningStateVersion', v_existing.learning_state_version
      );
    END IF;
    RAISE EXCEPTION 'Proposal already executed' USING ERRCODE = '23505';
  END IF;

  IF v_proposal.status <> 'approved'
    OR v_proposal.decided_by IS DISTINCT FROM v_actor_id
    OR v_proposal.required_approver_user_id IS DISTINCT FROM v_actor_id
    OR v_proposal.required_approver_role <> v_actor_role
  THEN
    RAISE EXCEPTION 'Approved proposal and exact approver required' USING ERRCODE = '42501';
  END IF;

  IF v_proposal.expires_at IS NOT NULL AND v_proposal.expires_at <= now() THEN
    RAISE EXCEPTION 'Proposal expired' USING ERRCODE = '22023';
  END IF;

  IF v_actor_role <> 'student'
    OR v_proposal.student_id IS DISTINCT FROM v_actor_id
    OR v_proposal.action_type NOT IN ('create_goal', 'create_planner_session')
    OR v_proposal.tool_version IS DISTINCT FROM '1.0.0'
  THEN
    RAISE EXCEPTION 'Protected action is not registered for this approver' USING ERRCODE = '42501';
  END IF;

  IF jsonb_typeof(v_proposal.payload) <> 'object'
    OR length(v_proposal.evidence_hash) <> 64
  THEN
    RAISE EXCEPTION 'Invalid protected action contract' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_run FROM public.agent_runs r WHERE r.id = v_proposal.run_id;
  IF NOT FOUND OR v_run.institution_id <> v_proposal.institution_id THEN
    RAISE EXCEPTION 'Proposal audit run is invalid' USING ERRCODE = '22023';
  END IF;

  IF v_proposal.action_type = 'create_goal' THEN
    IF v_proposal.payload - ARRAY['title', 'weekStart', 'goalType', 'targetValue'] <> '{}'::jsonb
      OR jsonb_typeof(v_proposal.payload->'title') <> 'string'
      OR length(btrim(v_proposal.payload->>'title')) NOT BETWEEN 1 AND 500
      OR (v_proposal.payload ? 'goalType' AND jsonb_typeof(v_proposal.payload->'goalType') <> 'string')
      OR (v_proposal.payload ? 'targetValue' AND jsonb_typeof(v_proposal.payload->'targetValue') <> 'number')
    THEN
      RAISE EXCEPTION 'Invalid create_goal payload' USING ERRCODE = '22023';
    END IF;

    v_week_start := COALESCE(
      CASE WHEN v_proposal.payload ? 'weekStart'
        THEN (v_proposal.payload->>'weekStart')::date END,
      date_trunc('week', now() AT TIME ZONE 'UTC')::date
    );
    IF v_week_start < current_date - 7 OR v_week_start > current_date + 366 THEN
      RAISE EXCEPTION 'Goal week is outside the permitted range' USING ERRCODE = '22023';
    END IF;
    IF COALESCE(v_proposal.payload->>'goalType', 'custom') NOT IN
      ('study_hours', 'sessions_completed', 'tasks_completed', 'custom', 'mastery')
    THEN
      RAISE EXCEPTION 'Invalid goal type' USING ERRCODE = '22023';
    END IF;
    IF (v_proposal.payload ? 'targetValue') AND
      ((v_proposal.payload->>'targetValue')::numeric <= 0 OR
       (v_proposal.payload->>'targetValue')::numeric > 10000)
    THEN
      RAISE EXCEPTION 'Invalid goal target' USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.weekly_goals (
      student_id, week_start, week_start_date, goal_text, goal_type,
      target_value, current_value, status, updated_at
    ) VALUES (
      v_actor_id, v_week_start, v_week_start,
      btrim(v_proposal.payload->>'title'),
      COALESCE(v_proposal.payload->>'goalType', 'custom'),
      CASE WHEN v_proposal.payload ? 'targetValue'
        THEN (v_proposal.payload->>'targetValue')::numeric END,
      0, 'active', now()
    ) RETURNING id INTO v_target_id;

    v_result := jsonb_build_object(
      'toolName', 'create_goal',
      'toolVersion', '1.0.0',
      'targetType', 'weekly_goal',
      'targetId', v_target_id,
      'studentId', v_actor_id
    );
  ELSE
    IF v_proposal.payload - ARRAY[
        'title', 'courseId', 'plannedDate', 'startTime',
        'durationMinutes', 'sessionType', 'intent'
      ] <> '{}'::jsonb
      OR jsonb_typeof(v_proposal.payload->'title') <> 'string'
      OR length(btrim(v_proposal.payload->>'title')) NOT BETWEEN 1 AND 255
      OR jsonb_typeof(v_proposal.payload->'courseId') <> 'string'
      OR jsonb_typeof(v_proposal.payload->'plannedDate') <> 'string'
      OR jsonb_typeof(v_proposal.payload->'durationMinutes') <> 'number'
    THEN
      RAISE EXCEPTION 'Invalid create_planner_session payload' USING ERRCODE = '22023';
    END IF;

    v_course_id := (v_proposal.payload->>'courseId')::uuid;
    v_planned_date := (v_proposal.payload->>'plannedDate')::date;
    v_start_time := COALESCE(
      CASE WHEN v_proposal.payload ? 'startTime'
        THEN (v_proposal.payload->>'startTime')::time END,
      time '09:00'
    );
    v_duration := (v_proposal.payload->>'durationMinutes')::integer;

    IF v_proposal.course_id IS DISTINCT FROM v_course_id
      OR v_duration NOT BETWEEN 15 AND 240
      OR v_planned_date < current_date
      OR v_planned_date > current_date + 366
      OR COALESCE(v_proposal.payload->>'sessionType', 'focus') NOT IN
        ('focus', 'pomodoro', 'free', 'review')
      OR NOT EXISTS (
        SELECT 1
        FROM public.student_courses sc
        JOIN public.courses c ON c.id = sc.course_id
        JOIN public.programs p ON p.id = c.program_id
        WHERE sc.student_id = v_actor_id
          AND sc.course_id = v_course_id
          AND sc.status = 'active'
          AND p.institution_id = v_actor_institution_id
      )
    THEN
      RAISE EXCEPTION 'Planner session scope is no longer authorized' USING ERRCODE = '42501';
    END IF;

    INSERT INTO public.study_sessions (
      student_id, course_id, session_type, planned_duration_minutes, intent,
      started_at, title, planned_date, planned_start_time, status, updated_at
    ) VALUES (
      v_actor_id, v_course_id,
      COALESCE(v_proposal.payload->>'sessionType', 'focus'),
      v_duration,
      CASE WHEN v_proposal.payload ? 'intent'
        THEN left(v_proposal.payload->>'intent', 2000) END,
      (v_planned_date + v_start_time) AT TIME ZONE 'UTC',
      btrim(v_proposal.payload->>'title'), v_planned_date, v_start_time,
      'planned', now()
    ) RETURNING id INTO v_target_id;

    v_result := jsonb_build_object(
      'toolName', 'create_planner_session',
      'toolVersion', '1.0.0',
      'targetType', 'study_session',
      'targetId', v_target_id,
      'studentId', v_actor_id,
      'courseId', v_course_id
    );
  END IF;

  INSERT INTO public.agent_action_executions (
    proposal_id, run_id, institution_id, student_id, executed_by,
    tool_name, tool_version, idempotency_key, result
  ) VALUES (
    v_proposal.id, v_proposal.run_id, v_proposal.institution_id,
    v_actor_id, v_actor_id, v_proposal.action_type, v_proposal.tool_version,
    v_proposal.idempotency_key, v_result
  ) RETURNING id INTO v_target_id;

  INSERT INTO public.agent_tool_attempts (
    run_id, request_id, actor_user_id, actor_role, institution_id, session_id,
    specialist, tool_name, tool_version, proposal_id, idempotency_key,
    evidence_hash, status, risk_classification, approval_state,
    provider, started_at, completed_at, latency_ms
  ) VALUES (
    v_run.id, v_run.request_id, v_actor_id, v_actor_role,
    v_actor_institution_id, v_run.session_id, v_run.specialist,
    v_proposal.action_type, v_proposal.tool_version, v_proposal.id,
    v_proposal.idempotency_key, v_proposal.evidence_hash,
    'succeeded', 'protected', 'executed', NULL, now(), now(), 0
  );

  UPDATE public.agent_action_proposals
  SET status = 'executed', executed_at = now()
  WHERE id = v_proposal.id AND status = 'approved';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Proposal execution race rejected' USING ERRCODE = '40001';
  END IF;

  v_state := public.refresh_student_learning_state_v1(v_actor_id);

  UPDATE public.agent_action_executions
  SET learning_state_version = v_state.version
  WHERE proposal_id = v_proposal.id;

  RETURN v_result || jsonb_build_object(
    'executionId', v_target_id,
    'alreadyExecuted', false,
    'learningStateVersion', v_state.version
  );
END;
$function$;

COMMENT ON FUNCTION public.execute_approved_agent_personal_action_v1(uuid, uuid) IS
  'Atomically rechecks and executes an approved registered personal write. Never dispatches arbitrary SQL, tables, or RPC names.';
REVOKE ALL ON FUNCTION public.execute_approved_agent_personal_action_v1(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.execute_approved_agent_personal_action_v1(uuid, uuid)
  TO service_role;
