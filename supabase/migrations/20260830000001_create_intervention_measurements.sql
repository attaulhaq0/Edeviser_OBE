-- Deterministic intervention measurement. Model output may explain this row,
-- but never supplies its official metric, delta, or evaluation state.

CREATE TABLE public.intervention_measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES public.agent_action_proposals(id) ON DELETE RESTRICT,
  execution_id uuid NOT NULL REFERENCES public.agent_action_executions(id) ON DELETE RESTRICT,
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  program_id uuid REFERENCES public.programs(id) ON DELETE SET NULL,
  outcome_id uuid REFERENCES public.learning_outcomes(id) ON DELETE SET NULL,
  baseline_evidence jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(baseline_evidence) IN ('array', 'object')),
  baseline_metric numeric(5,2) NOT NULL CHECK (baseline_metric >= 0 AND baseline_metric <= 100),
  measurement_window_start timestamptz NOT NULL,
  measurement_window_end timestamptz NOT NULL,
  post_action_evidence jsonb CHECK (post_action_evidence IS NULL OR jsonb_typeof(post_action_evidence) IN ('array', 'object')),
  post_action_metric numeric(5,2) CHECK (post_action_metric IS NULL OR (post_action_metric >= 0 AND post_action_metric <= 100)),
  delta numeric(6,2),
  evidence_sufficiency text NOT NULL DEFAULT 'pending' CHECK (evidence_sufficiency IN ('pending', 'sufficient', 'insufficient')),
  evaluation_state text NOT NULL DEFAULT 'PENDING' CHECK (evaluation_state IN ('PENDING', 'IMPROVED', 'NO_MATERIAL_CHANGE', 'DECLINED', 'INSUFFICIENT_EVIDENCE')),
  evaluator_summary text,
  evaluator_recommendation text CHECK (evaluator_recommendation IS NULL OR evaluator_recommendation IN ('continue', 'change', 'stop', 'review')),
  measured_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (proposal_id),
  UNIQUE (execution_id),
  CHECK (measurement_window_end >= measurement_window_start),
  CHECK ((evaluation_state = 'PENDING' AND measured_at IS NULL) OR (evaluation_state <> 'PENDING' AND measured_at IS NOT NULL))
);

CREATE INDEX intervention_measurements_student_time_idx
  ON public.intervention_measurements (institution_id, student_id, measured_at DESC);

ALTER TABLE public.intervention_measurements ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.intervention_measurements FROM PUBLIC, anon;
GRANT SELECT ON TABLE public.intervention_measurements TO authenticated;
GRANT ALL ON TABLE public.intervention_measurements TO service_role;

CREATE POLICY intervention_measurements_scoped_read
  ON public.intervention_measurements FOR SELECT TO authenticated
  USING (
    institution_id = (SELECT public.auth_institution_id())
    AND (
      (SELECT public.auth_user_role()) = 'admin'
      OR ((SELECT public.auth_user_role()) = 'student' AND student_id = (SELECT auth.uid()))
      OR ((SELECT public.auth_user_role()) = 'parent' AND public.parent_has_verified_link(student_id))
      OR ((SELECT public.auth_user_role()) = 'teacher' AND EXISTS (
        SELECT 1 FROM public.courses c WHERE c.id = intervention_measurements.course_id AND c.teacher_id = (SELECT auth.uid())
      ))
      OR ((SELECT public.auth_user_role()) = 'coordinator' AND EXISTS (
        SELECT 1 FROM public.programs p WHERE p.id = intervention_measurements.program_id AND p.coordinator_id = (SELECT auth.uid())
      ))
    )
  );

CREATE OR REPLACE FUNCTION public.measure_intervention_v1(
  p_measurement_id uuid,
  p_post_action_evidence jsonb,
  p_post_action_metric numeric,
  p_measured_at timestamptz DEFAULT now()
)
RETURNS public.intervention_measurements
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE v_row public.intervention_measurements;
BEGIN
  IF p_post_action_evidence IS NULL OR jsonb_typeof(p_post_action_evidence) NOT IN ('array', 'object') THEN
    RAISE EXCEPTION 'post-action evidence must be an object or array' USING ERRCODE = '22023';
  END IF;
  IF p_post_action_metric IS NULL OR (jsonb_typeof(p_post_action_evidence) = 'array' AND jsonb_array_length(p_post_action_evidence) = 0) THEN
    UPDATE public.intervention_measurements
    SET post_action_evidence = p_post_action_evidence, post_action_metric = NULL, delta = NULL,
      evidence_sufficiency = 'insufficient', evaluation_state = 'INSUFFICIENT_EVIDENCE',
      measured_at = p_measured_at, updated_at = now()
    WHERE id = p_measurement_id AND evaluation_state = 'PENDING'
    RETURNING * INTO v_row;
    IF NOT FOUND THEN RAISE EXCEPTION 'measurement not found or already measured' USING ERRCODE = 'P0002'; END IF;
    RETURN v_row;
  END IF;
  IF p_post_action_metric < 0 OR p_post_action_metric > 100 THEN
    RAISE EXCEPTION 'post-action metric must be between 0 and 100' USING ERRCODE = '22023';
  END IF;
  UPDATE public.intervention_measurements
  SET post_action_evidence = p_post_action_evidence,
      post_action_metric = round(p_post_action_metric, 2),
      delta = round(p_post_action_metric - baseline_metric, 2),
      evidence_sufficiency = 'sufficient',
      evaluation_state = CASE
        WHEN p_post_action_metric - baseline_metric >= 5 THEN 'IMPROVED'
        WHEN p_post_action_metric - baseline_metric <= -5 THEN 'DECLINED'
        ELSE 'NO_MATERIAL_CHANGE'
      END,
      measured_at = p_measured_at,
      updated_at = now()
  WHERE id = p_measurement_id AND evaluation_state = 'PENDING'
  RETURNING * INTO v_row;
  IF NOT FOUND THEN RAISE EXCEPTION 'measurement not found or already measured' USING ERRCODE = 'P0002'; END IF;
  RETURN v_row;
END;
$function$;

REVOKE ALL ON FUNCTION public.measure_intervention_v1(uuid, jsonb, numeric, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.measure_intervention_v1(uuid, jsonb, numeric, timestamptz) TO service_role;

CREATE OR REPLACE FUNCTION public.sync_learning_state_measurements_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE v_effects jsonb; v_hash text;
BEGIN
  IF pg_trigger_depth() > 1 THEN RETURN NEW; END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'measurementId', m.id, 'proposalId', m.proposal_id, 'executionId', m.execution_id,
    'outcomeId', m.outcome_id, 'baselineMetric', m.baseline_metric,
    'postActionMetric', m.post_action_metric, 'delta', m.delta,
    'evaluationState', m.evaluation_state, 'evidenceSufficiency', m.evidence_sufficiency,
    'measuredAt', m.measured_at
  ) ORDER BY m.measured_at DESC NULLS LAST, m.id), '[]'::jsonb)
  INTO v_effects FROM public.intervention_measurements m WHERE m.student_id = NEW.student_id AND m.institution_id = NEW.institution_id;
  v_hash := md5(jsonb_build_object('studentId', NEW.student_id, 'measuredInterventionEffects', v_effects)::text);
  IF NEW.measured_intervention_effects IS DISTINCT FROM v_effects THEN
    UPDATE public.student_learning_states SET measured_intervention_effects = v_effects, state_hash = v_hash,
      version = version + 1, updated_at = now() WHERE student_id = NEW.student_id;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS student_learning_state_measurements_sync ON public.student_learning_states;
CREATE TRIGGER student_learning_state_measurements_sync
  AFTER INSERT OR UPDATE ON public.student_learning_states
  FOR EACH ROW EXECUTE FUNCTION public.sync_learning_state_measurements_v1();

COMMENT ON TABLE public.intervention_measurements IS 'Canonical deterministic before/action/after intervention evaluation; official metrics are server-calculated.';

CREATE OR REPLACE FUNCTION public.register_intervention_measurement_v1(
  p_proposal_id uuid, p_execution_id uuid, p_baseline_evidence jsonb,
  p_baseline_metric numeric, p_window_start timestamptz, p_window_end timestamptz,
  p_student_id uuid, p_course_id uuid DEFAULT NULL, p_program_id uuid DEFAULT NULL,
  p_outcome_id uuid DEFAULT NULL
)
RETURNS public.intervention_measurements
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE v_row public.intervention_measurements;
BEGIN
  IF p_baseline_metric IS NULL OR p_baseline_metric < 0 OR p_baseline_metric > 100
    OR p_window_end < p_window_start THEN
    RAISE EXCEPTION 'invalid deterministic measurement baseline or window' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.intervention_measurements (
    proposal_id, execution_id, institution_id, student_id, course_id, program_id, outcome_id,
    baseline_evidence, baseline_metric, measurement_window_start, measurement_window_end
  )
  SELECT p_proposal_id, p_execution_id, p.institution_id, p_student_id, p_course_id, p_program_id, p_outcome_id,
    COALESCE(p_baseline_evidence, '[]'::jsonb), round(p_baseline_metric, 2), p_window_start, p_window_end
  FROM public.agent_action_proposals p
  WHERE p.id = p_proposal_id AND p.student_id = p_student_id
    AND p.institution_id = (SELECT institution_id FROM public.agent_action_executions WHERE id = p_execution_id)
    AND EXISTS (SELECT 1 FROM public.agent_action_executions x WHERE x.id = p_execution_id AND x.proposal_id = p_proposal_id)
  RETURNING * INTO v_row;
  IF NOT FOUND THEN RAISE EXCEPTION 'proposal and execution do not share an institution' USING ERRCODE = '42501'; END IF;
  RETURN v_row;
END;
$function$;

REVOKE ALL ON FUNCTION public.register_intervention_measurement_v1(uuid, uuid, jsonb, numeric, timestamptz, timestamptz, uuid, uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_intervention_measurement_v1(uuid, uuid, jsonb, numeric, timestamptz, timestamptz, uuid, uuid, uuid, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.get_intervention_effects_v1(
  p_student_id uuid DEFAULT NULL, p_course_id uuid DEFAULT NULL, p_program_id uuid DEFAULT NULL
)
RETURNS SETOF jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public
AS $function$
  SELECT CASE public.auth_user_role()
    WHEN 'student' THEN jsonb_build_object('measurementId', m.id, 'outcomeId', m.outcome_id,
      'evaluationState', m.evaluation_state, 'delta', m.delta, 'measuredAt', m.measured_at,
      'nextStep', m.evaluator_recommendation)
    WHEN 'parent' THEN jsonb_build_object('measurementId', m.id, 'evaluationState', m.evaluation_state,
      'delta', m.delta, 'measuredAt', m.measured_at, 'supportRecommendation', m.evaluator_recommendation)
    WHEN 'teacher' THEN jsonb_build_object('measurementId', m.id, 'proposalId', m.proposal_id,
      'baselineMetric', m.baseline_metric, 'postActionMetric', m.post_action_metric, 'delta', m.delta,
      'evaluationState', m.evaluation_state, 'evidenceSufficiency', m.evidence_sufficiency,
      'recommendation', m.evaluator_recommendation, 'measuredAt', m.measured_at)
    ELSE jsonb_build_object('measurementId', m.id, 'institutionId', m.institution_id,
      'programId', m.program_id, 'courseId', m.course_id, 'outcomeId', m.outcome_id,
      'evaluationState', m.evaluation_state, 'delta', m.delta, 'measuredAt', m.measured_at)
  END
  FROM public.intervention_measurements m
  WHERE (p_student_id IS NULL OR m.student_id = p_student_id)
    AND (p_course_id IS NULL OR m.course_id = p_course_id)
    AND (p_program_id IS NULL OR m.program_id = p_program_id);
$function$;

REVOKE ALL ON FUNCTION public.get_intervention_effects_v1(uuid, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_intervention_effects_v1(uuid, uuid, uuid) TO authenticated, service_role;
