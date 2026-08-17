-- Close the feedback edge: every measured intervention refreshes the
-- canonical Student Learning State and deterministically updates its risk
-- projection. No model-authored value is accepted here.

CREATE OR REPLACE FUNCTION public.reconcile_student_learning_state_measurements_v1(
  p_student_id uuid
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  v_state public.student_learning_states;
  v_effects jsonb;
  v_risk jsonb;
  v_hash text;
BEGIN
  SELECT * INTO v_state FROM public.student_learning_states WHERE student_id = p_student_id;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'measurementId', m.id, 'proposalId', m.proposal_id, 'executionId', m.execution_id,
    'outcomeId', m.outcome_id, 'baselineMetric', m.baseline_metric,
    'postActionMetric', m.post_action_metric, 'delta', m.delta,
    'evaluationState', m.evaluation_state, 'evidenceSufficiency', m.evidence_sufficiency,
    'measuredAt', m.measured_at
  ) ORDER BY m.measured_at DESC NULLS LAST, m.id), '[]'::jsonb)
  INTO v_effects
  FROM public.intervention_measurements m
  WHERE m.student_id = p_student_id AND m.institution_id = v_state.institution_id;

  SELECT COALESCE(jsonb_agg(
    CASE
      WHEN EXISTS (
        SELECT 1 FROM public.intervention_measurements m
        WHERE m.student_id = p_student_id AND m.evaluation_state IN ('DECLINED', 'NO_MATERIAL_CHANGE')
          AND m.outcome_id IS NOT NULL AND m.outcome_id::text = risk->>'outcomeId'
      ) THEN jsonb_set(risk, '{severity}', '"high"'::jsonb, true)
      ELSE risk
    END
    ORDER BY ord
  ), '[]'::jsonb)
  INTO v_risk
  FROM jsonb_array_elements(v_state.risk_signals) WITH ORDINALITY AS entries(risk, ord)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.intervention_measurements m
    WHERE m.student_id = p_student_id AND m.evaluation_state = 'IMPROVED'
      AND m.outcome_id IS NOT NULL AND m.outcome_id::text = risk->>'outcomeId'
  );

  v_hash := md5(jsonb_build_object(
    'studentId', p_student_id, 'riskSignals', v_risk,
    'measuredInterventionEffects', v_effects
  )::text);

  IF v_state.risk_signals IS DISTINCT FROM v_risk
    OR v_state.measured_intervention_effects IS DISTINCT FROM v_effects THEN
    UPDATE public.student_learning_states
    SET risk_signals = v_risk,
        measured_intervention_effects = v_effects,
        state_hash = v_hash,
        version = version + 1,
        updated_at = now()
    WHERE student_id = p_student_id;
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.reconcile_student_learning_state_measurements_v1(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_student_learning_state_measurements_v1(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.sync_learning_state_measurements_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
BEGIN
  IF pg_trigger_depth() > 1 THEN RETURN NEW; END IF;
  PERFORM public.reconcile_student_learning_state_measurements_v1(NEW.student_id);
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.refresh_learning_state_after_intervention_measurement_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
BEGIN
  IF pg_trigger_depth() > 1 THEN RETURN NEW; END IF;
  PERFORM public.refresh_student_learning_state_v1(NEW.student_id);
  PERFORM public.reconcile_student_learning_state_measurements_v1(NEW.student_id);
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.refresh_learning_state_after_intervention_measurement_v1() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_learning_state_after_intervention_measurement_v1() TO service_role;

DROP TRIGGER IF EXISTS intervention_measurement_learning_state_refresh ON public.intervention_measurements;
CREATE TRIGGER intervention_measurement_learning_state_refresh
  AFTER INSERT OR UPDATE OF post_action_evidence, post_action_metric, evaluation_state, measured_at
  ON public.intervention_measurements
  FOR EACH ROW EXECUTE FUNCTION public.refresh_learning_state_after_intervention_measurement_v1();
