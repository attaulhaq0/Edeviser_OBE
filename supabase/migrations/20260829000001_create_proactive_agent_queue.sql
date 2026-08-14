-- Durable, institution-scoped proactive Intelligence queue.
-- Candidate selection consumes the canonical deterministic Student Learning
-- State. The model explains evidence and recommends actions; it never computes
-- official risk or bypasses the existing proposal/approval boundary.

CREATE TABLE public.proactive_agent_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_role text NOT NULL CHECK (recipient_role IN (
    'student', 'teacher', 'parent', 'coordinator', 'admin'
  )),
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
  program_id uuid REFERENCES public.programs(id) ON DELETE CASCADE,
  learning_state_version bigint NOT NULL CHECK (learning_state_version > 0),
  trigger_source text NOT NULL CHECK (trigger_source IN ('schedule', 'evidence_event')),
  trigger_key text NOT NULL,
  specialist text NOT NULL CHECK (specialist IN (
    'tutor', 'mastery', 'habit', 'risk', 'intervention',
    'teacher', 'parent', 'coordinator', 'admin', 'evaluator'
  )),
  evidence_packet jsonb NOT NULL CHECK (jsonb_typeof(evidence_packet) = 'object'),
  evidence_hash text NOT NULL CHECK (length(evidence_hash) = 32),
  idempotency_key text NOT NULL,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN (
    'queued', 'running', 'retry', 'completed', 'dead_letter', 'suppressed'
  )),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  max_attempts integer NOT NULL DEFAULT 3 CHECK (max_attempts BETWEEN 1 AND 5),
  available_at timestamptz NOT NULL DEFAULT now(),
  lease_until timestamptz,
  claimed_by uuid,
  run_id uuid REFERENCES public.agent_runs(id) ON DELETE SET NULL,
  recommendation text,
  proposal_ids jsonb NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(proposal_ids) = 'array'),
  provider text,
  model text,
  error_classification text,
  last_error_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, idempotency_key),
  CHECK ((status = 'running') = (lease_until IS NOT NULL)),
  CHECK (recommendation IS NULL OR length(recommendation) <= 16000)
);

CREATE INDEX proactive_agent_jobs_claim_idx
  ON public.proactive_agent_jobs (status, available_at, created_at)
  WHERE status IN ('queued', 'retry', 'running');
CREATE INDEX proactive_agent_jobs_recipient_idx
  ON public.proactive_agent_jobs (recipient_user_id, completed_at DESC)
  WHERE status = 'completed';
CREATE INDEX proactive_agent_jobs_dead_letter_idx
  ON public.proactive_agent_jobs (institution_id, last_error_at DESC)
  WHERE status = 'dead_letter';

ALTER TABLE public.proactive_agent_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.proactive_agent_jobs FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.proactive_agent_jobs TO service_role;

COMMENT ON TABLE public.proactive_agent_jobs IS
  'Durable bounded work queue and delivery record for deterministic-triggered, role-scoped proactive Intelligence.';

CREATE OR REPLACE FUNCTION public.enqueue_proactive_agent_jobs_v1(
  p_institution_id uuid DEFAULT NULL,
  p_student_id uuid DEFAULT NULL,
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
      AND (p_student_id IS NULL OR state.student_id = p_student_id)
      AND state.fresh_until > now()
      AND jsonb_typeof(risk.item) = 'object'
      AND risk.item->>'kind' = 'low_mastery'
      AND CASE
        WHEN jsonb_typeof(institution.settings->'ai_proactive_enabled') = 'boolean'
        THEN (institution.settings->>'ai_proactive_enabled')::boolean
        WHEN jsonb_typeof(institution.settings->'ai_proactive'->'enabled') = 'boolean'
        THEN (institution.settings->'ai_proactive'->>'enabled')::boolean
        ELSE true
      END
      AND COALESCE(
        institution.settings->'ai_proactive'->>'autonomy',
        institution.settings->>'ai_operational_autonomy',
        'A1'
      ) <> 'A0'
  ), scoped AS (
    SELECT candidate.*,
      (candidate.risk_signal->>'courseId')::uuid AS scoped_course_id,
      (candidate.risk_signal->>'programId')::uuid AS scoped_program_id,
      candidate.risk_signal->>'outcomeId' AS outcome_id,
      course.teacher_id,
      program.coordinator_id
    FROM candidate_states candidate
    JOIN public.courses course
      ON course.id = (candidate.risk_signal->>'courseId')::uuid
    JOIN public.programs program
      ON program.id = course.program_id
     AND program.institution_id = candidate.institution_id
    WHERE candidate.risk_signal ?& ARRAY['courseId', 'programId', 'outcomeId']
      AND course.program_id = (candidate.risk_signal->>'programId')::uuid
  ), routed AS (
    SELECT scoped.*,
      recipient.user_id AS routed_user_id,
      recipient.role AS routed_role,
      CASE recipient.role
        WHEN 'student' THEN 'mastery'
        WHEN 'teacher' THEN 'risk'
        WHEN 'parent' THEN 'parent'
        WHEN 'coordinator' THEN 'coordinator'
        ELSE 'admin'
      END AS routed_specialist
    FROM scoped
    CROSS JOIN LATERAL (
      SELECT scoped.student_id AS user_id, 'student'::text AS role
      UNION ALL SELECT scoped.teacher_id, 'teacher' WHERE scoped.teacher_id IS NOT NULL
      UNION ALL SELECT parent_link.parent_id, 'parent'
        FROM public.parent_student_links parent_link
        WHERE parent_link.student_id = scoped.student_id
          AND parent_link.verified = true
      UNION ALL SELECT scoped.coordinator_id, 'coordinator'
        WHERE scoped.coordinator_id IS NOT NULL
      UNION ALL SELECT administrator.id, 'admin'
        FROM public.profiles administrator
        WHERE administrator.institution_id = scoped.institution_id
          AND administrator.role = 'admin'
          AND administrator.is_active = true
    ) recipient
    JOIN public.profiles recipient_profile
      ON recipient_profile.id = recipient.user_id
     AND recipient_profile.institution_id = scoped.institution_id
     AND recipient_profile.role::text = recipient.role
     AND recipient_profile.is_active = true
    WHERE CASE
      WHEN jsonb_typeof(recipient_profile.notification_preferences->'ai_proactive_enabled') = 'boolean'
      THEN (recipient_profile.notification_preferences->>'ai_proactive_enabled')::boolean
      ELSE true
    END
      AND COALESCE(
        recipient_profile.notification_preferences->>'ai_autonomy',
        'A1'
      ) <> 'A0'
  ), bounded AS (
    SELECT * FROM routed
    ORDER BY institution_id, student_id, outcome_id, routed_role, routed_user_id
    LIMIT p_batch_size
  ), inserted AS (
    INSERT INTO public.proactive_agent_jobs (
      institution_id, student_id, recipient_user_id, recipient_role,
      course_id, program_id, learning_state_version, trigger_source,
      trigger_key, specialist, evidence_packet, evidence_hash, idempotency_key
    )
    SELECT institution_id, student_id, routed_user_id, routed_role,
      scoped_course_id, scoped_program_id, version, p_trigger_source,
      'student-learning-state/low-mastery/v1', routed_specialist,
      jsonb_build_object(
        'contractVersion', 'proactive-evidence/v1.0.0',
        'learningStateVersion', version,
        'studentId', student_id,
        'courseId', scoped_course_id,
        'programId', scoped_program_id,
        'riskSignal', risk_signal,
        'stateHash', state_hash,
        'calculatedAt', calculated_at,
        'freshUntil', fresh_until
      ),
      md5(jsonb_build_object(
        'stateHash', state_hash,
        'riskSignal', risk_signal,
        'recipientRole', routed_role
      )::text),
      md5(concat_ws(':', institution_id, student_id, version, outcome_id,
        routed_user_id, routed_role, 'student-learning-state/low-mastery/v1'))
    FROM bounded
    ON CONFLICT (institution_id, idempotency_key) DO NOTHING
    RETURNING 1
  )
  SELECT count(*)::integer INTO v_inserted FROM inserted;

  RETURN v_inserted;
END;
$function$;

CREATE OR REPLACE FUNCTION public.claim_proactive_agent_jobs_v1(
  p_worker_id uuid,
  p_batch_size integer DEFAULT 10,
  p_lease_seconds integer DEFAULT 120
)
RETURNS SETOF public.proactive_agent_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF p_batch_size NOT BETWEEN 1 AND 25 OR p_lease_seconds NOT BETWEEN 30 AND 600 THEN
    RAISE EXCEPTION 'Invalid claim bounds' USING ERRCODE = '22023';
  END IF;

  UPDATE public.proactive_agent_jobs job
  SET status = 'dead_letter', lease_until = NULL, claimed_by = NULL,
      error_classification = 'lease_expired_after_max_attempts',
      last_error_at = now(), updated_at = now()
  WHERE job.status = 'running'
    AND job.lease_until < now()
    AND job.attempt_count >= job.max_attempts;

  RETURN QUERY
  WITH candidates AS (
    SELECT job.id
    FROM public.proactive_agent_jobs job
    WHERE job.attempt_count < job.max_attempts
      AND ((
        job.status IN ('queued', 'retry') AND job.available_at <= now()
      ) OR (
        job.status = 'running' AND job.lease_until < now()
      ))
    ORDER BY job.available_at, job.created_at, job.id
    FOR UPDATE SKIP LOCKED
    LIMIT p_batch_size
  )
  UPDATE public.proactive_agent_jobs job
  SET status = 'running', attempt_count = job.attempt_count + 1,
      lease_until = now() + make_interval(secs => p_lease_seconds),
      claimed_by = p_worker_id, updated_at = now(),
      error_classification = NULL
  FROM candidates
  WHERE job.id = candidates.id
  RETURNING job.*;
END;
$function$;

CREATE OR REPLACE FUNCTION public.complete_proactive_agent_job_v1(
  p_job_id uuid,
  p_worker_id uuid,
  p_run_id uuid,
  p_recommendation text,
  p_proposal_ids jsonb,
  p_provider text,
  p_model text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF length(p_recommendation) NOT BETWEEN 1 AND 16000
    OR jsonb_typeof(p_proposal_ids) <> 'array' THEN
    RAISE EXCEPTION 'Invalid completion payload' USING ERRCODE = '22023';
  END IF;
  UPDATE public.proactive_agent_jobs
  SET status = 'completed', run_id = p_run_id,
      recommendation = p_recommendation, proposal_ids = p_proposal_ids,
      provider = p_provider, model = p_model, completed_at = now(),
      lease_until = NULL, claimed_by = NULL, updated_at = now()
  WHERE id = p_job_id AND status = 'running' AND claimed_by = p_worker_id;
  RETURN FOUND;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fail_proactive_agent_job_v1(
  p_job_id uuid,
  p_worker_id uuid,
  p_error_classification text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_status text;
BEGIN
  UPDATE public.proactive_agent_jobs job
  SET status = CASE WHEN job.attempt_count >= job.max_attempts
      THEN 'dead_letter' ELSE 'retry' END,
    available_at = CASE WHEN job.attempt_count >= job.max_attempts THEN job.available_at
      ELSE now() + make_interval(mins => LEAST(60, power(5, job.attempt_count)::integer)) END,
    lease_until = NULL, claimed_by = NULL,
    error_classification = left(COALESCE(p_error_classification, 'unknown_error'), 200),
    last_error_at = now(), updated_at = now()
  WHERE job.id = p_job_id AND job.status = 'running' AND job.claimed_by = p_worker_id
  RETURNING status INTO v_status;
  RETURN v_status;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_my_proactive_intelligence_v1(
  p_limit integer DEFAULT 20
)
RETURNS TABLE (
  id uuid, recipient_role text, specialist text, student_id uuid,
  course_id uuid, program_id uuid, trigger_key text,
  evidence_packet jsonb, recommendation text, proposals jsonb,
  completed_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $function$
DECLARE
  v_actor_id uuid := auth.uid();
  v_role text;
  v_institution_id uuid;
BEGIN
  IF v_actor_id IS NULL OR p_limit NOT BETWEEN 1 AND 50 THEN
    RAISE EXCEPTION 'Invalid proactive feed request' USING ERRCODE = '42501';
  END IF;
  SELECT profile.role::text, profile.institution_id
    INTO v_role, v_institution_id
  FROM public.profiles profile
  WHERE profile.id = v_actor_id AND profile.is_active = true;
  IF v_role IS NULL THEN
    RAISE EXCEPTION 'Active profile required' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT job.id, job.recipient_role, job.specialist, job.student_id,
    job.course_id, job.program_id, job.trigger_key, job.evidence_packet,
    job.recommendation,
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', proposal.id,
        'actionType', proposal.action_type,
        'status', proposal.status,
        'requiredApproverRole', proposal.required_approver_role
      ) ORDER BY proposal.created_at, proposal.id)
      FROM public.agent_action_proposals proposal
      WHERE proposal.run_id = job.run_id
        AND proposal.required_approver_user_id = v_actor_id
        AND proposal.required_approver_role = v_role
    ), '[]'::jsonb) AS proposals,
    job.completed_at
  FROM public.proactive_agent_jobs job
  WHERE job.status = 'completed'
    AND job.recipient_user_id = v_actor_id
    AND job.recipient_role = v_role
    AND job.institution_id = v_institution_id
    AND CASE v_role
      WHEN 'student' THEN job.student_id = v_actor_id
      WHEN 'teacher' THEN EXISTS (
        SELECT 1 FROM public.courses course
        WHERE course.id = job.course_id AND course.teacher_id = v_actor_id
      )
      WHEN 'parent' THEN EXISTS (
        SELECT 1 FROM public.parent_student_links link
        WHERE link.parent_id = v_actor_id AND link.student_id = job.student_id
          AND link.verified = true
      )
      WHEN 'coordinator' THEN EXISTS (
        SELECT 1 FROM public.programs program
        WHERE program.id = job.program_id
          AND program.coordinator_id = v_actor_id
          AND program.institution_id = v_institution_id
      )
      WHEN 'admin' THEN true
      ELSE false
    END
  ORDER BY job.completed_at DESC, job.id
  LIMIT p_limit;
END;
$function$;

COMMENT ON FUNCTION public.enqueue_proactive_agent_jobs_v1(uuid, uuid, integer, text) IS
  'Service-only deterministic candidate routing from fresh canonical Student Learning State risk signals.';
COMMENT ON FUNCTION public.claim_proactive_agent_jobs_v1(uuid, integer, integer) IS
  'Service-only bounded SKIP LOCKED queue claim with expired-lease recovery.';
COMMENT ON FUNCTION public.fail_proactive_agent_job_v1(uuid, uuid, text) IS
  'Service-only retry transition with bounded backoff and terminal dead-letter status.';
COMMENT ON FUNCTION public.get_my_proactive_intelligence_v1(integer) IS
  'Authenticated five-role proactive feed with execution-time scope rechecks.';

REVOKE ALL ON FUNCTION public.enqueue_proactive_agent_jobs_v1(uuid, uuid, integer, text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_proactive_agent_jobs_v1(uuid, integer, integer)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_proactive_agent_job_v1(uuid, uuid, uuid, text, jsonb, text, text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fail_proactive_agent_job_v1(uuid, uuid, text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_my_proactive_intelligence_v1(integer)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.enqueue_proactive_agent_jobs_v1(uuid, uuid, integer, text)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_proactive_agent_jobs_v1(uuid, integer, integer)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_proactive_agent_job_v1(uuid, uuid, uuid, text, jsonb, text, text)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.fail_proactive_agent_job_v1(uuid, uuid, text)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.get_my_proactive_intelligence_v1(integer)
  TO authenticated, service_role;
