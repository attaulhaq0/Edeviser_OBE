\set ON_ERROR_STOP on
BEGIN;
SET LOCAL session_replication_role = replica;

INSERT INTO public.institutions (id, name, slug)
VALUES
  (
    '10000000-0000-4000-8000-000000000001',
    'Agentic Integration Institution',
    'agentic-integration-institution'
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    'Foreign Integration Institution',
    'foreign-integration-institution'
  );

INSERT INTO auth.users (id, aud, role, email, created_at, updated_at)
VALUES
  (
    '20000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'student-one@agentic.test',
    now(),
    now()
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'student-two@agentic.test',
    now(),
    now()
  ),
  (
    '20000000-0000-4000-8000-000000000003',
    'authenticated', 'authenticated', 'teacher@agentic.test', now(), now()
  ),
  (
    '20000000-0000-4000-8000-000000000004',
    'authenticated', 'authenticated', 'parent@agentic.test', now(), now()
  ),
  (
    '20000000-0000-4000-8000-000000000005',
    'authenticated', 'authenticated', 'coordinator@agentic.test', now(), now()
  ),
  (
    '20000000-0000-4000-8000-000000000006',
    'authenticated', 'authenticated', 'admin@agentic.test', now(), now()
  );

INSERT INTO public.institution_settings (
  institution_id, attainment_thresholds, success_threshold
)
VALUES (
  '10000000-0000-4000-8000-000000000001',
  '{"excellent":90,"satisfactory":65,"developing":45}'::jsonb,
  60
);

INSERT INTO public.profiles (
  id, institution_id, full_name, email, role, is_active
)
VALUES
  (
    '20000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    'Student One',
    'student-one@agentic.test',
    'student',
    true
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000002',
    'Student Two',
    'student-two@agentic.test',
    'student',
    true
  ),
  (
    '20000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000001',
    'Assigned Teacher', 'teacher@agentic.test', 'teacher', true
  ),
  (
    '20000000-0000-4000-8000-000000000004',
    '10000000-0000-4000-8000-000000000001',
    'Linked Parent', 'parent@agentic.test', 'parent', true
  ),
  (
    '20000000-0000-4000-8000-000000000005',
    '10000000-0000-4000-8000-000000000001',
    'Assigned Coordinator', 'coordinator@agentic.test', 'coordinator', true
  ),
  (
    '20000000-0000-4000-8000-000000000006',
    '10000000-0000-4000-8000-000000000001',
    'Institution Admin', 'admin@agentic.test', 'admin', true
  );

INSERT INTO public.programs (
  id, institution_id, coordinator_id, name, code, is_active
)
VALUES (
  '30000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000005',
  'Agentic Program',
  'AGP',
  true
);

INSERT INTO public.courses (
  id, program_id, teacher_id, name, code, semester, academic_year, is_active
)
VALUES (
  '40000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000003',
  'Agentic Course',
  'AGC101',
  'Fall',
  '2026',
  true
);

INSERT INTO public.student_courses (student_id, course_id, status)
VALUES (
  '20000000-0000-4000-8000-000000000001',
  '40000000-0000-4000-8000-000000000001',
  'active'
);

INSERT INTO public.parent_student_links (
  parent_id, student_id, relationship, verified, institution_id, status,
  verified_by, verified_at
)
VALUES (
  '20000000-0000-4000-8000-000000000004',
  '20000000-0000-4000-8000-000000000001',
  'parent',
  true,
  '10000000-0000-4000-8000-000000000001',
  'verified',
  '20000000-0000-4000-8000-000000000006',
  now()
);

INSERT INTO public.learning_outcomes (
  id, institution_id, program_id, course_id, type, title, sort_order
)
VALUES (
  '50000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000001',
  '40000000-0000-4000-8000-000000000001',
  'CLO',
  'Agentic CLO',
  1
);

INSERT INTO public.outcome_attainment (
  outcome_id, student_id, course_id, scope, attainment_percent,
  sample_count, last_calculated_at
)
VALUES (
  '50000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  '40000000-0000-4000-8000-000000000001',
  'student_course',
  55,
  4,
  now()
);

INSERT INTO public.habit_logs (student_id, habit_type, date, completed_at)
VALUES (
  '20000000-0000-4000-8000-000000000001',
  'read',
  current_date,
  now()
);

INSERT INTO public.agent_runs (
  id, request_id, actor_user_id, actor_role, institution_id, session_id,
  specialist, input_hash, status, completed_at
)
VALUES
  (
    '60000000-0000-4000-8000-000000000001',
    '60000000-0000-4000-8000-000000000011',
    '20000000-0000-4000-8000-000000000001',
    'student',
    '10000000-0000-4000-8000-000000000001',
    '60000000-0000-4000-8000-000000000021',
    'tutor',
    repeat('1', 64),
    'completed',
    now()
  ),
  (
    '60000000-0000-4000-8000-000000000002',
    '60000000-0000-4000-8000-000000000012',
    '20000000-0000-4000-8000-000000000001',
    'student',
    '10000000-0000-4000-8000-000000000001',
    '60000000-0000-4000-8000-000000000022',
    'tutor',
    repeat('2', 64),
    'completed',
    now()
  );

INSERT INTO public.agent_action_proposals (
  id, run_id, actor_user_id, institution_id, student_id, course_id,
  action_type, tool_version, payload, reason, evidence_references, evidence_hash,
  required_approver_role, required_approver_user_id, status,
  idempotency_key, expires_at, decided_at, decided_by
)
VALUES
  (
    '70000000-0000-4000-8000-000000000001',
    '60000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    NULL,
    'create_goal',
    '1.0.0',
    jsonb_build_object(
      'title', 'Raise CLO mastery',
      'goalType', 'mastery',
      'targetValue', 80
    ),
    'Deterministic mastery is below threshold.',
    jsonb_build_array(jsonb_build_object(
      'kind', 'outcome',
      'id', '50000000-0000-4000-8000-000000000001'
    )),
    repeat('a', 64),
    'student',
    '20000000-0000-4000-8000-000000000001',
    'approved',
    repeat('b', 64),
    now() + interval '1 day',
    now(),
    '20000000-0000-4000-8000-000000000001'
  ),
  (
    '70000000-0000-4000-8000-000000000002',
    '60000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    '40000000-0000-4000-8000-000000000001',
    'create_planner_session',
    '1.0.0',
    jsonb_build_object(
      'title', 'Review Agentic CLO',
      'courseId', '40000000-0000-4000-8000-000000000001',
      'plannedDate', (current_date + 1)::text,
      'startTime', '09:30',
      'durationMinutes', 45,
      'sessionType', 'review'
    ),
    'A bounded study session supports the approved goal.',
    '[]'::jsonb,
    repeat('c', 64),
    'student',
    '20000000-0000-4000-8000-000000000001',
    'approved',
    repeat('d', 64),
    now() + interval '1 day',
    now(),
    '20000000-0000-4000-8000-000000000001'
  );

SET LOCAL session_replication_role = origin;

DO $verify$
DECLARE
  first_goal jsonb;
  retried_goal jsonb;
  planner jsonb;
  denied boolean := false;
  state_row public.student_learning_states;
BEGIN
  BEGIN
    PERFORM public.execute_approved_agent_personal_action_v1(
      '70000000-0000-4000-8000-000000000001',
      '20000000-0000-4000-8000-000000000002'
    );
  EXCEPTION WHEN insufficient_privilege OR no_data_found THEN
    denied := true;
  END;
  IF NOT denied THEN
    RAISE EXCEPTION 'Wrong exact approver was not rejected';
  END IF;

  UPDATE public.agent_action_proposals
  SET tool_version = '2.0.0'
  WHERE id = '70000000-0000-4000-8000-000000000002';
  denied := false;
  BEGIN
    PERFORM public.execute_approved_agent_personal_action_v1(
      '70000000-0000-4000-8000-000000000002',
      '20000000-0000-4000-8000-000000000001'
    );
  EXCEPTION WHEN insufficient_privilege THEN
    denied := true;
  END;
  IF NOT denied THEN
    RAISE EXCEPTION 'Unapproved protected-write version was not rejected';
  END IF;
  UPDATE public.agent_action_proposals
  SET tool_version = '1.0.0'
  WHERE id = '70000000-0000-4000-8000-000000000002';

  first_goal := public.execute_approved_agent_personal_action_v1(
    '70000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001'
  );
  retried_goal := public.execute_approved_agent_personal_action_v1(
    '70000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001'
  );
  planner := public.execute_approved_agent_personal_action_v1(
    '70000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000001'
  );

  IF first_goal->>'alreadyExecuted' <> 'false'
    OR retried_goal->>'alreadyExecuted' <> 'true'
    OR planner->>'alreadyExecuted' <> 'false'
  THEN
    RAISE EXCEPTION 'Execution receipts do not preserve idempotency';
  END IF;
  IF (SELECT count(*) FROM public.weekly_goals
      WHERE student_id = '20000000-0000-4000-8000-000000000001') <> 1
    OR (SELECT count(*) FROM public.study_sessions
      WHERE student_id = '20000000-0000-4000-8000-000000000001') <> 1
    OR (SELECT count(*) FROM public.agent_action_executions) <> 2
    OR (SELECT count(*) FROM public.agent_tool_attempts
      WHERE approval_state = 'executed') <> 2
  THEN
    RAISE EXCEPTION 'Exactly-once side effect or audit assertion failed';
  END IF;

  SELECT * INTO state_row
  FROM public.student_learning_states
  WHERE student_id = '20000000-0000-4000-8000-000000000001';
  IF NOT FOUND
    OR state_row.version <> 2
    OR jsonb_array_length(state_row.risk_signals) <> 1
    OR jsonb_array_length(state_row.goals) <> 1
    OR jsonb_array_length(state_row.approved_executed_actions) <> 2
    OR (state_row.risk_signals->0->>'threshold')::numeric <> 60::numeric
    OR (state_row.mastery->'outcomes'->0->>'attainmentPercent')::numeric <> 55::numeric
  THEN
    RAISE EXCEPTION 'Deterministic Student Learning State assertion failed';
  END IF;
END;
$verify$;

DO $privileges$
BEGIN
  IF has_function_privilege(
    'authenticated',
    'public.execute_approved_agent_personal_action_v1(uuid,uuid)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'Authenticated callers can invoke the service-only executor';
  END IF;
  IF has_function_privilege(
    'authenticated',
    'public.student_learning_state_needs_refresh_v1(uuid)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'Authenticated callers can invoke the freshness boundary';
  END IF;
  IF has_table_privilege(
    'authenticated', 'public.student_learning_states', 'INSERT'
  ) THEN
    RAISE EXCEPTION 'Authenticated callers can forge Student Learning State';
  END IF;
END;
$privileges$;

SELECT set_config(
  'request.jwt.claim.sub',
  '20000000-0000-4000-8000-000000000001',
  true
);
SET LOCAL ROLE authenticated;
DO $student_rls$
BEGIN
  IF (SELECT count(*) FROM public.student_learning_states) <> 1 THEN
    RAISE EXCEPTION 'Student cannot read own Learning State';
  END IF;
END;
$student_rls$;
RESET ROLE;

SELECT set_config(
  'request.jwt.claim.sub',
  '20000000-0000-4000-8000-000000000002',
  true
);
SET LOCAL ROLE authenticated;
DO $foreign_rls$
BEGIN
  IF (SELECT count(*) FROM public.student_learning_states) <> 0 THEN
    RAISE EXCEPTION 'Cross-institution Learning State read was not denied';
  END IF;
END;
$foreign_rls$;
RESET ROLE;

SELECT set_config(
  'request.jwt.claim.sub',
  '20000000-0000-4000-8000-000000000003',
  true
);
SET LOCAL ROLE authenticated;
DO $teacher_rls$
DECLARE
  projected jsonb;
  denied boolean := false;
BEGIN
  IF (SELECT count(*) FROM public.student_learning_states) <> 0 THEN
    RAISE EXCEPTION 'Teacher received an unfiltered global Learning State row';
  END IF;
  projected := public.get_student_learning_state_v1(
    '20000000-0000-4000-8000-000000000001',
    '40000000-0000-4000-8000-000000000001',
    NULL
  );
  IF jsonb_array_length(projected->'mastery'->'outcomes') <> 1
    OR jsonb_array_length(projected->'goals') <> 0
  THEN
    RAISE EXCEPTION 'Assigned teacher projection is not course-minimized';
  END IF;
  BEGIN
    PERFORM public.get_student_learning_state_v1(
      '20000000-0000-4000-8000-000000000001',
      '40000000-0000-4000-8000-000000000099',
      NULL
    );
  EXCEPTION WHEN insufficient_privilege THEN
    denied := true;
  END;
  IF NOT denied THEN
    RAISE EXCEPTION 'Unassigned teacher course projection was not denied';
  END IF;
END;
$teacher_rls$;
RESET ROLE;

SELECT set_config(
  'request.jwt.claim.sub',
  '20000000-0000-4000-8000-000000000004',
  true
);
SET LOCAL ROLE authenticated;
DO $parent_rls$
BEGIN
  IF (SELECT count(*) FROM public.student_learning_states) <> 1 THEN
    RAISE EXCEPTION 'Verified parent cannot read linked Learning State';
  END IF;
END;
$parent_rls$;
RESET ROLE;

SELECT set_config(
  'request.jwt.claim.sub',
  '20000000-0000-4000-8000-000000000005',
  true
);
SET LOCAL ROLE authenticated;
DO $coordinator_rls$
DECLARE
  projected jsonb;
  denied boolean := false;
BEGIN
  IF (SELECT count(*) FROM public.student_learning_states) <> 0 THEN
    RAISE EXCEPTION 'Coordinator received an unfiltered global Learning State row';
  END IF;
  projected := public.get_student_learning_state_v1(
    '20000000-0000-4000-8000-000000000001',
    NULL,
    '30000000-0000-4000-8000-000000000001'
  );
  IF jsonb_array_length(projected->'mastery'->'outcomes') <> 1
    OR jsonb_array_length(projected->'goals') <> 0
  THEN
    RAISE EXCEPTION 'Assigned coordinator projection is not program-minimized';
  END IF;
  BEGIN
    PERFORM public.get_student_learning_state_v1(
      '20000000-0000-4000-8000-000000000001',
      NULL,
      '30000000-0000-4000-8000-000000000099'
    );
  EXCEPTION WHEN insufficient_privilege THEN
    denied := true;
  END;
  IF NOT denied THEN
    RAISE EXCEPTION 'Unassigned coordinator program projection was not denied';
  END IF;
END;
$coordinator_rls$;
RESET ROLE;

SELECT set_config(
  'request.jwt.claim.sub',
  '20000000-0000-4000-8000-000000000006',
  true
);
SET LOCAL ROLE authenticated;
DO $admin_rls$
BEGIN
  IF (SELECT count(*) FROM public.student_learning_states) <> 1 THEN
    RAISE EXCEPTION 'Institution admin cannot read Learning State';
  END IF;
END;
$admin_rls$;
RESET ROLE;

DO $proactive_queue$
DECLARE
  v_enqueued integer;
  v_duplicate integer;
  v_worker uuid := '70000000-0000-4000-8000-000000000001';
  v_student_job public.proactive_agent_jobs;
  v_parent_job public.proactive_agent_jobs;
  v_teacher_job public.proactive_agent_jobs;
  v_claimed integer;
  v_status text;
BEGIN
  UPDATE public.student_learning_states
  SET risk_signals = risk_signals || jsonb_build_array(jsonb_build_object(
    'kind', 'low_mastery',
    'courseId', 'malformed-course-id',
    'programId', 'malformed-program-id',
    'outcomeId', 'malformed-outcome-id'
  ))
  WHERE student_id = '20000000-0000-4000-8000-000000000001';

  v_enqueued := 0;
  FOR v_iteration IN 1..5 LOOP
    v_enqueued := v_enqueued + public.enqueue_proactive_agent_jobs_v1(
      '10000000-0000-4000-8000-000000000001',
      '20000000-0000-4000-8000-000000000001',
      1,
      'schedule'
    );
  END LOOP;
  IF v_enqueued <> 5 OR (
    SELECT count(DISTINCT recipient_role)
    FROM public.proactive_agent_jobs
  ) <> 5 THEN
    RAISE EXCEPTION 'Proactive routing did not produce exactly five role jobs';
  END IF;

  v_duplicate := public.enqueue_proactive_agent_jobs_v1(
    '10000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    10,
    'schedule'
  );
  IF v_duplicate <> 0 THEN
    RAISE EXCEPTION 'Proactive idempotency did not suppress duplicate jobs';
  END IF;

  UPDATE public.proactive_agent_jobs
  SET max_attempts = 1
  WHERE recipient_role = 'parent';

  SELECT count(*) INTO v_claimed
  FROM public.claim_proactive_agent_jobs_v1(v_worker, 10, 120);
  IF v_claimed <> 5 THEN
    RAISE EXCEPTION 'Bounded proactive claim did not return five jobs';
  END IF;

  SELECT * INTO v_student_job FROM public.proactive_agent_jobs
  WHERE recipient_role = 'student';
  SELECT * INTO v_parent_job FROM public.proactive_agent_jobs
  WHERE recipient_role = 'parent';
  SELECT * INTO v_teacher_job FROM public.proactive_agent_jobs
  WHERE recipient_role = 'teacher';

  INSERT INTO public.agent_runs (
    id, request_id, actor_user_id, actor_role, institution_id, session_id,
    specialist, input_hash, status, provider
  ) VALUES (
    '71000000-0000-4000-8000-000000000001',
    '72000000-0000-4000-8000-000000000001',
    v_student_job.recipient_user_id,
    v_student_job.recipient_role,
    v_student_job.institution_id,
    '73000000-0000-4000-8000-000000000001',
    v_student_job.specialist,
    repeat('a', 64),
    'completed',
    'deepseek'
  );

  IF NOT public.complete_proactive_agent_job_v1(
    v_student_job.id, v_worker,
    '71000000-0000-4000-8000-000000000001',
    'Review the cited outcome evidence and complete one focused practice step.',
    '[]'::jsonb, 'deepseek', 'deepseek-v4-flash'
  ) THEN
    RAISE EXCEPTION 'Proactive completion transition failed';
  END IF;

  v_status := public.fail_proactive_agent_job_v1(
    v_parent_job.id, v_worker, 'provider_unavailable'
  );
  IF v_status <> 'dead_letter' THEN
    RAISE EXCEPTION 'Terminal proactive failure did not dead-letter';
  END IF;

  v_status := public.fail_proactive_agent_job_v1(
    v_teacher_job.id, v_worker, 'provider_unavailable'
  );
  IF v_status <> 'retry' THEN
    RAISE EXCEPTION 'Recoverable proactive failure did not enter retry';
  END IF;

  UPDATE public.proactive_agent_jobs
  SET max_attempts = attempt_count,
      lease_until = now() - interval '1 second'
  WHERE recipient_role = 'admin';
  PERFORM * FROM public.claim_proactive_agent_jobs_v1(
    '70000000-0000-4000-8000-000000000002', 10, 120
  );
  IF NOT EXISTS (
    SELECT 1 FROM public.proactive_agent_jobs
    WHERE recipient_role = 'admin'
      AND status = 'dead_letter'
      AND error_classification = 'lease_expired_after_max_attempts'
  ) THEN
    RAISE EXCEPTION 'Expired maximum-attempt lease was not dead-lettered';
  END IF;
END;
$proactive_queue$;

SELECT set_config(
  'request.jwt.claim.sub',
  '20000000-0000-4000-8000-000000000001',
  true
);
SET LOCAL ROLE authenticated;
DO $proactive_feed$
BEGIN
  IF (SELECT count(*) FROM public.get_my_proactive_intelligence_v1(20)) <> 1 THEN
    RAISE EXCEPTION 'Student proactive feed did not return completed scoped guidance';
  END IF;
END;
$proactive_feed$;
RESET ROLE;

SELECT json_build_object(
  'valid', true,
  'executions', (SELECT count(*) FROM public.agent_action_executions),
  'proactive_completed', (
    SELECT count(*) FROM public.proactive_agent_jobs WHERE status = 'completed'
  ),
  'proactive_retry', (
    SELECT count(*) FROM public.proactive_agent_jobs WHERE status = 'retry'
  ),
  'proactive_dead_letter', (
    SELECT count(*) FROM public.proactive_agent_jobs WHERE status = 'dead_letter'
  ),
  'learning_state_version', (
    SELECT version FROM public.student_learning_states
    WHERE student_id = '20000000-0000-4000-8000-000000000001'
  )
) AS protected_write_verification;

ROLLBACK;

SELECT json_build_object(
  'rollback_rows', (
    SELECT count(*) FROM public.institutions
    WHERE id = '10000000-0000-4000-8000-000000000001'
  )
) AS rollback_verification;
