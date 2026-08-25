-- Task 4.7 corrective follow-up: repair + harden
-- enqueue_intervention_generation_jobs_v1 (runtime defect caught by production
-- cron monitoring; hardening from CodeRabbit review, all findings verified).
--
-- Original defects (live-verified):
--   1) 42883: double text-extraction `->>'ai_proactive'->>'enabled'`
--   2) 42703: non-existent learning_state_version column references
-- CodeRabbit hardening:
--   F2: NULL p_batch_size bypassed range validation
--   F3: deterministic ORDER BY before LIMIT
--   F4: fail-closed governance defaults (proactive OFF, autonomy A0 unless
--       the institution explicitly configures otherwise)
--   F6: tenant isolation — course institution via programs, teacher
--       institution match, active student_courses enrollment required
-- Rejected: F5 (relaxing programId) — the signal contract always emits it.
-- Supersedes the registration from 20260901000001 (kept immutable).

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
  IF p_batch_size IS NULL OR p_batch_size NOT BETWEEN 1 AND 100 THEN
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
        THEN (institution.settings->'ai_proactive'->>'enabled')::boolean
        ELSE false
      END
      AND COALESCE(
        institution.settings->'ai_proactive'->>'autonomy',
        institution.settings->>'ai_operational_autonomy',
        'A0'
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
    -- Signal contract (twin builder + specialist parsers) always emits all
    -- three keys; requiring programId rejects malformed signals rather than
    -- accepting them just because proactive_agent_jobs.program_id is nullable.
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
    JOIN public.programs program
      ON program.id = course.program_id
     AND program.institution_id = parsed.institution_id
    JOIN public.profiles teacher
      ON teacher.id = course.teacher_id
     AND teacher.is_active = true
     AND teacher.institution_id = parsed.institution_id
    WHERE EXISTS (
      SELECT 1
      FROM public.student_courses sc
      WHERE sc.student_id = parsed.student_id
        AND sc.course_id = course.id
        AND sc.status = 'active'
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.proactive_agent_jobs j
      WHERE j.institution_id = parsed.institution_id
        AND j.student_id = parsed.student_id
        AND j.specialist = 'intervention'
        AND j.trigger_key = 'intervention_generation:v1:' || (parsed.risk_signal->>'outcomeId')
        AND j.created_at > now() - interval '7 days'
        AND j.status <> 'suppressed'
    )
    ORDER BY parsed.fresh_until DESC, parsed.student_id ASC,
      parsed.risk_signal->>'outcomeId' ASC
    LIMIT p_batch_size
  ),
  payloads AS (
    SELECT scoped.*,
      jsonb_build_object(
        'contractVersion', 'intervention-generation-v1',
        'learningStateVersion', scoped.version,
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
    payloads.version,
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
