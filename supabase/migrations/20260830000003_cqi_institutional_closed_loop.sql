-- Canonical CQI closed-loop state. Patterns hold detection lifecycle only;
-- cqi_action_plans remains the sole official CQI action record.

CREATE TABLE public.cqi_systemic_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  program_id uuid NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  outcome_id uuid NOT NULL REFERENCES public.learning_outcomes(id) ON DELETE RESTRICT,
  outcome_type text NOT NULL CHECK (outcome_type IN ('CLO', 'PLO', 'ILO')),
  pattern_kind text NOT NULL CHECK (pattern_kind = 'systemic_outcome_attainment_gap'),
  policy_version text NOT NULL CHECK (length(policy_version) BETWEEN 1 AND 100),
  window_start timestamptz NOT NULL,
  window_end timestamptz NOT NULL CHECK (window_end >= window_start),
  pattern_identity text NOT NULL CHECK (length(pattern_identity) BETWEEN 1 AND 1000),
  occurrence_version text NOT NULL CHECK (length(occurrence_version) BETWEEN 1 AND 2000),
  baseline_attainment numeric(5,2) NOT NULL CHECK (baseline_attainment BETWEEN 0 AND 100),
  current_attainment numeric(5,2) NOT NULL CHECK (current_attainment BETWEEN 0 AND 100),
  target_threshold numeric(5,2) NOT NULL CHECK (target_threshold BETWEEN 0 AND 100),
  sample_count integer NOT NULL CHECK (sample_count >= 2),
  affected_population integer NOT NULL CHECK (affected_population >= 2 AND affected_population <= sample_count),
  evidence_references jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(evidence_references) = 'array'),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'linked', 'resolved', 'reopened')),
  cooldown_until timestamptz,
  last_measurement_state text CHECK (last_measurement_state IN ('PENDING', 'IMPROVED', 'NO_MATERIAL_CHANGE', 'DECLINED', 'INSUFFICIENT_EVIDENCE')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, pattern_identity, occurrence_version)
);

CREATE UNIQUE INDEX cqi_systemic_patterns_unresolved_identity_unique
  ON public.cqi_systemic_patterns (institution_id, pattern_identity)
  WHERE status IN ('open', 'linked', 'reopened');
CREATE INDEX cqi_systemic_patterns_program_state_idx
  ON public.cqi_systemic_patterns (program_id, status, updated_at DESC);

ALTER TABLE public.cqi_action_plans
  ADD COLUMN source_proposal_id uuid REFERENCES public.agent_action_proposals(id) ON DELETE RESTRICT,
  ADD COLUMN systemic_pattern_id uuid REFERENCES public.cqi_systemic_patterns(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX cqi_action_plans_source_proposal_unique
  ON public.cqi_action_plans (source_proposal_id)
  WHERE source_proposal_id IS NOT NULL;

CREATE TABLE public.cqi_action_plan_measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cqi_action_plan_id uuid NOT NULL UNIQUE REFERENCES public.cqi_action_plans(id) ON DELETE CASCADE,
  systemic_pattern_id uuid NOT NULL REFERENCES public.cqi_systemic_patterns(id) ON DELETE RESTRICT,
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  program_id uuid NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  outcome_id uuid NOT NULL REFERENCES public.learning_outcomes(id) ON DELETE RESTRICT,
  measurement_method_version text NOT NULL CHECK (length(measurement_method_version) BETWEEN 1 AND 100),
  cohort_semantics text NOT NULL CHECK (length(cohort_semantics) BETWEEN 1 AND 200),
  denominator_semantics text NOT NULL CHECK (length(denominator_semantics) BETWEEN 1 AND 200),
  baseline_window_start timestamptz NOT NULL,
  baseline_window_end timestamptz NOT NULL CHECK (baseline_window_end >= baseline_window_start),
  after_window_start timestamptz,
  after_window_end timestamptz,
  baseline_metric numeric(5,2) NOT NULL CHECK (baseline_metric BETWEEN 0 AND 100),
  post_action_metric numeric(5,2) CHECK (post_action_metric BETWEEN 0 AND 100),
  baseline_sample_count integer NOT NULL CHECK (baseline_sample_count >= 2),
  post_action_sample_count integer,
  material_change numeric(5,2) NOT NULL DEFAULT 5 CHECK (material_change > 0 AND material_change <= 100),
  delta numeric(5,2),
  evaluation_state text NOT NULL DEFAULT 'PENDING' CHECK (evaluation_state IN ('PENDING', 'IMPROVED', 'NO_MATERIAL_CHANGE', 'DECLINED', 'INSUFFICIENT_EVIDENCE')),
  measured_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX cqi_action_plan_measurements_institution_state_idx
  ON public.cqi_action_plan_measurements (institution_id, evaluation_state, updated_at DESC);

ALTER TABLE public.cqi_systemic_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cqi_action_plan_measurements ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.cqi_systemic_patterns FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.cqi_action_plan_measurements FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.cqi_systemic_patterns TO service_role;
GRANT ALL ON TABLE public.cqi_action_plan_measurements TO service_role;

CREATE OR REPLACE FUNCTION public.get_coordinator_cqi_patterns_v1(p_program_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_institution uuid;
BEGIN
  SELECT p.institution_id INTO v_institution
  FROM public.programs p
  WHERE p.id = p_program_id AND p.coordinator_id = v_actor;
  IF v_institution IS NULL THEN
    RAISE EXCEPTION 'Coordinator scope required' USING ERRCODE = '42501';
  END IF;
  RETURN COALESCE((
    SELECT jsonb_agg(row_to_json(pattern_row)::jsonb ORDER BY pattern_row.updated_at DESC)
    FROM (
      SELECT pattern.id, pattern.status, pattern.pattern_identity, pattern.occurrence_version,
        pattern.outcome_id, pattern.outcome_type, pattern.course_id, pattern.baseline_attainment,
        pattern.current_attainment, pattern.target_threshold, pattern.sample_count,
        pattern.affected_population, pattern.evidence_references, pattern.last_measurement_state,
        pattern.updated_at, plan.id AS cqi_action_plan_id, measurement.evaluation_state,
        measurement.delta, measurement.post_action_metric
      FROM public.cqi_systemic_patterns pattern
      LEFT JOIN public.cqi_action_plans plan ON plan.systemic_pattern_id = pattern.id
      LEFT JOIN public.cqi_action_plan_measurements measurement ON measurement.cqi_action_plan_id = plan.id
      WHERE pattern.program_id = p_program_id AND pattern.institution_id = v_institution
    ) pattern_row
  ), '[]'::jsonb);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_admin_cqi_effectiveness_v1()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_institution uuid;
BEGIN
  SELECT p.institution_id INTO v_institution
  FROM public.profiles p
  WHERE p.id = auth.uid() AND p.role = 'admin' AND p.is_active = true;
  IF v_institution IS NULL THEN
    RAISE EXCEPTION 'Admin scope required' USING ERRCODE = '42501';
  END IF;
  RETURN jsonb_build_object(
    'openPatterns', (SELECT count(*) FROM public.cqi_systemic_patterns WHERE institution_id = v_institution AND status IN ('open', 'linked', 'reopened')),
    'resolvedPatterns', (SELECT count(*) FROM public.cqi_systemic_patterns WHERE institution_id = v_institution AND status = 'resolved'),
    'measurementStates', COALESCE((SELECT jsonb_object_agg(evaluation_state, state_count) FROM (SELECT evaluation_state, count(*) AS state_count FROM public.cqi_action_plan_measurements WHERE institution_id = v_institution GROUP BY evaluation_state) states), '{}'::jsonb)
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.get_coordinator_cqi_patterns_v1(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_coordinator_cqi_patterns_v1(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_admin_cqi_effectiveness_v1() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_cqi_effectiveness_v1() TO authenticated, service_role;
