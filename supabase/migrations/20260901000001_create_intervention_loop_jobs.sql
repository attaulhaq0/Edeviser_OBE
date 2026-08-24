-- Tasks 4.7 + 8.2 (edeviser-agentic-intelligence): intervention loop jobs.
--
-- GENERATION (intervention-generation-jobs): enqueues intervention-specialist
-- proactive jobs for FRESH low-mastery risk signals, routed to the course
-- teacher, idempotent per student+outcome+week via the durable
-- proactive_agent_jobs queue (lease/retry/dead-letter semantics inherited).
--
-- EVALUATION (intervention-evaluation-jobs): durable claim/complete/fail loop
-- over PENDING intervention_measurements whose measurement window has closed,
-- with bounded attempts and dead-lettering. The official post metric, delta,
-- and evaluation state are ALWAYS computed by measure_intervention_v1 --
-- neither the model nor this loop ever supplies official values.

ALTER TABLE public.intervention_measurements
  ADD COLUMN evaluation_attempt_count integer NOT NULL DEFAULT 0
    CHECK (evaluation_attempt_count >= 0),
  ADD COLUMN last_evaluation_error text,
  ADD COLUMN evaluation_dead_lettered_at timestamptz,
  ADD COLUMN evaluation_claimed_by uuid,
  ADD COLUMN evaluation_lease_until timestamptz;

CREATE INDEX intervention_measurements_due_idx
  ON public.intervention_measurements (measurement_window_end)
  WHERE evaluation_state = 'PENDING' AND evaluation_dead_lettered_at IS NULL;

-- ---------------------------------------------------------------------------
-- Generation: enqueue intervention-specialist jobs (teacher recipients).
-- Mirrors enqueue_proactive_agent_jobs_v1 candidate selection: canonical
-- deterministic Student Learning State, institution feature flags respected,
-- A0 institutions excluded, uuid-validated signals only.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enqueue_intervention_generation_jobs_v1(
  p_institution_id uuid DEFAULT NULL,
  p_batch_size integer DEFAULT 50,
  p_trigger_source text DEFAULT 'schedule'
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_inserted integer := 0;
BEGIN
  IF p_batch_size NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'Batch size must be between 1 and 100' USING ERRCODE = '22023';
  END IF;
  IF p_trigger_source NOT IN ('schedule', 'evidence_event') THEN
    RAISE EXCEPTION 'Unsupported trigger source' USING ERRCODE = '22023';
  END IF;

  WITH candidate_states AS (
    SELECT state.*, risk.item AS risk_signal
    FROM public.student_learning_states state
    JOIN public.profiles student
      ON student.id = state.student_id
     AND student.role = 'student'
     AND student.is_active = true
    JOIN public.institutions institution
      ON institution.id = state.institution_id
     AND institution.is_active = true
    CROSS JOIN LATERAL jsonb_array_elements(state.risk_signals) risk(item)
    WHERE (p_institution_id IS NULL OR state.institution_id = p_institution_id)
      AND state.fresh_until > now()
      AND jsonb_typeof(risk.item) = 'object'
      AND risk.item->>'kind' = 'low_mastery'
      AND CASE
        WHEN jsonb_typeof(institution.settings->'ai_proactive_enabled') = 'boolean'
        THEN (institution.settings->>'ai_proactive_enabled')::boolean
        WHEN jsonb_typeof(institution.settings->'ai_proactive'->'enabled') = 'boolean'
        THEN (institution.settings->>'ai_proactive'->>'enabled')::boolean
        ELSE true
      END
      AND COALESCE(
        institution.settings->'ai_proactive'->>'autonomy',
        institution.settings->>'ai_operational_autonomy',
        'A1'
      ) <> 'A0'
  ),
  parsed AS (
    SELECT candidate.*,
      CASE WHEN candidate.risk_signal->>'courseId' ~*
        '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        THEN (candidate.risk_signal->>'courseId')::uuid END AS signal_course_id,
      CASE WHEN candidate.risk_signal->>'programId' ~*
        '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        THEN (candidate.risk_signal->>'programId')::uuid END AS signal_program_id
    FROM candidate_states candidate
    WHERE candidate.risk_signal ?& ARRAY['courseId', 'programId', 'outcomeId']
      AND candidate.risk_signal->>'outcomeId' ~*
        '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  ),
  scoped AS (
    SELECT parsed.*,
      parsed.signal_course_id AS scoped_course_id,
      parsed.signal_program_id AS scoped_program_id,
      course.teacher_id AS recipient_teacher_id
    FROM parsed
    JOIN public.courses course
      ON course.id = parsed.signal_course_id
     AND course.teacher_id IS NOT NULL
    JOIN public.profiles teacher
      ON teacher.id = course.teacher_id
     AND teacher.is_active = true
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.proactive_agent_jobs j
      WHERE j.institution_id = parsed.institution_id
        AND j.student_id = parsed.student_id
        AND j.specialist = 'intervention'
        AND j.trigger_key = 'intervention_generation:v1:' || (parsed.risk_signal->>'outcomeId')
        AND j.created_at > now() - interval '7 days'
        AND j.status <> 'suppressed'
    )
    LIMIT p_batch_size
  ),
  payloads AS (
    SELECT scoped.*,
      jsonb_build_object(
        'contractVersion', 'intervention-generation-v1',
        'learningStateVersion', scoped.learning_state_version,
        'studentId', scoped.student_id,
        'courseId', scoped.scoped_course_id,
        'programId', scoped.scoped_program_id,
        'stateHash', scoped.state_hash,
        'calculatedAt', scoped.calculated_at,
        'freshUntil', scoped.fresh_until,
        'riskSignal', scoped.risk_signal
      ) AS evidence_packet_value
    FROM scoped
  )
  INSERT INTO public.proactive_agent_jobs (
    institution_id, student_id, recipient_user_id, recipient_role,
    course_id, program_id, learning_state_version, trigger_source, trigger_key,
    specialist, evidence_packet, evidence_hash, idempotency_key
  )
  SELECT
    payloads.institution_id,
    payloads.student_id,
    payloads.recipient_teacher_id,
    'teacher',
    payloads.scoped_course_id,
    payloads.scoped_program_id,
    payloads.learning_state_version,
    p_trigger_source,
    'intervention_generation:v1:' || (payloads.risk_signal->>'outcomeId'),
    'intervention',
    payloads.evidence_packet_value,
    md5(payloads.evidence_packet_value::text),
    'intervention:v1:' || payloads.student_id || ':'
      || (payloads.risk_signal->>'outcomeId') || ':'
      || to_char(date_trunc('week', now()), 'YYYY-MM-DD')
  FROM payloads
  ON CONFLICT (institution_id, idempotency_key) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END;
$function$;

REVOKE ALL ON FUNCTION public.enqueue_intervention_generation_jobs_v1(uuid, integer, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_intervention_generation_jobs_v1(uuid, integer, text)
  TO service_role;

-- ---------------------------------------------------------------------------
-- Evaluation: durable claim/complete/fail loop over due PENDING measurements.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_due_intervention_measurements_v1(
  p_worker_id uuid,
  p_batch_size integer DEFAULT 25,
  p_lease_seconds integer DEFAULT 600
)
RETURNS SETOF public.intervention_measurements
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF p_batch_size NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'Batch size must be between 1 and 100' USING ERRCODE = '22023';
  END IF;
  IF p_lease_seconds NOT BETWEEN 30 AND 3600 THEN
    RAISE EXCEPTION 'Lease must be between 30 and 3600 seconds' USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  WITH claimed AS (
    SELECT m.id
    FROM public.intervention_measurements m
    WHERE m.evaluation_state = 'PENDING'
      AND m.measurement_window_end <= now()
      AND m.evaluation_dead_lettered_at IS NULL
      AND m.evaluation_attempt_count < 3
      AND (m.evaluation_lease_until IS NULL OR m.evaluation_lease_until <= now())
    ORDER BY m.measurement_window_end
    LIMIT p_batch_size
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.intervention_measurements m
  SET evaluation_attempt_count = m.evaluation_attempt_count + 1,
      evaluation_claimed_by = p_worker_id,
      evaluation_lease_until = now() + make_interval(secs => p_lease_seconds),
      updated_at = now()
  FROM claimed c
  WHERE m.id = c.id
  RETURNING m.*;
END;
$function$;

CREATE OR REPLACE FUNCTION public.complete_intervention_evaluation_v1(
  p_measurement_id uuid,
  p_worker_id uuid,
  p_post_action_evidence jsonb,
  p_post_action_metric numeric
)
RETURNS public.intervention_measurements
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_row public.intervention_measurements;
BEGIN
  SELECT * INTO v_row
  FROM public.intervention_measurements
  WHERE id = p_measurement_id
    AND evaluation_claimed_by = p_worker_id
    AND evaluation_lease_until > now()
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'measurement not leased to this worker' USING ERRCODE = 'P0002';
  END IF;

  -- Official metric/delta/evaluation state: deterministic server calculation.
  v_row := public.measure_intervention_v1(
    p_measurement_id, p_post_action_evidence, p_post_action_metric
  );

  UPDATE public.intervention_measurements
  SET evaluation_claimed_by = NULL,
      evaluation_lease_until = NULL,
      updated_at = now()
  WHERE id = p_measurement_id;

  RETURN v_row;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fail_intervention_evaluation_v1(
  p_measurement_id uuid,
  p_worker_id uuid,
  p_error_classification text,
  p_dead_letter boolean DEFAULT false
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_dead boolean;
BEGIN
  UPDATE public.intervention_measurements
  SET evaluation_claimed_by = NULL,
      evaluation_lease_until = NULL,
      last_evaluation_error = LEFT(COALESCE(p_error_classification, 'unknown_error'), 512),
      evaluation_dead_lettered_at = CASE
        WHEN p_dead_letter OR evaluation_attempt_count >= 3 THEN now()
        ELSE evaluation_dead_lettered_at
      END,
      updated_at = now()
  WHERE id = p_measurement_id
    AND evaluation_claimed_by = p_worker_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'measurement not leased to this worker' USING ERRCODE = 'P0002';
  END IF;

  SELECT evaluation_dead_lettered_at IS NOT NULL INTO v_dead
  FROM public.intervention_measurements WHERE id = p_measurement_id;
  RETURN CASE WHEN v_dead THEN 'dead_letter' ELSE 'retry' END;
END;
$function$;

REVOKE ALL ON FUNCTION public.claim_due_intervention_measurements_v1(uuid, integer, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_due_intervention_measurements_v1(uuid, integer, integer)
  TO service_role;
REVOKE ALL ON FUNCTION public.complete_intervention_evaluation_v1(uuid, uuid, jsonb, numeric)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_intervention_evaluation_v1(uuid, uuid, jsonb, numeric)
  TO service_role;
REVOKE ALL ON FUNCTION public.fail_intervention_evaluation_v1(uuid, uuid, text, boolean)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fail_intervention_evaluation_v1(uuid, uuid, text, boolean)
  TO service_role;

COMMENT ON COLUMN public.intervention_measurements.evaluation_attempt_count IS
  'Bounded evaluation attempts (max 3) before dead-lettering; loop jobs only.';
COMMENT ON COLUMN public.intervention_measurements.evaluation_dead_lettered_at IS
  'Set when evaluation permanently failed; excluded from the due-claim scan.';

-- ---------------------------------------------------------------------------
-- pg_cron schedules (idempotent re-registration; no duplicate job names).
-- Auth mirrors existing cron targets: managed service key bearer from
-- app.settings; the function also accepts x-cron-secret in-handler.
-- ---------------------------------------------------------------------------
DO $do$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'intervention-evaluation-jobs') THEN
    PERFORM cron.unschedule('intervention-evaluation-jobs');
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'intervention-generation-jobs') THEN
    PERFORM cron.unschedule('intervention-generation-jobs');
  END IF;
END
$do$;

SELECT cron.schedule(
  'intervention-evaluation-jobs',
  '*/15 * * * *',
  $$SELECT net.http_post(
    url := 'https://cdlgtbvxlxjpcddjazzx.supabase.co/functions/v1/intervention-jobs',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
      'Content-Type', 'application/json'
    ),
    body := '{"action":"evaluate_measurements"}'::jsonb
  )$$
);

SELECT cron.schedule(
  'intervention-generation-jobs',
  '5 * * * *',
  $$SELECT net.http_post(
    url := 'https://cdlgtbvxlxjpcddjazzx.supabase.co/functions/v1/intervention-jobs',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
      'Content-Type', 'application/json'
    ),
    body := '{"action":"generate_candidates"}'::jsonb
  )$$
);
