\set ON_ERROR_STOP on

BEGIN;
SET LOCAL session_replication_role = replica;

INSERT INTO public.institutions (id, name, slug) VALUES
  ('81000000-0000-4000-8000-000000000001', 'CQI Verification Institution', 'cqi-verification'),
  ('81000000-0000-4000-8000-000000000002', 'CQI Foreign Institution', 'cqi-foreign-verification');

INSERT INTO public.profiles (id, institution_id, full_name, email, role, is_active) VALUES
  ('82000000-0000-4000-8000-000000000001', '81000000-0000-4000-8000-000000000001', 'CQI Coordinator', 'cqi-coordinator@test.invalid', 'coordinator', true),
  ('82000000-0000-4000-8000-000000000002', '81000000-0000-4000-8000-000000000001', 'CQI Admin', 'cqi-admin@test.invalid', 'admin', true),
  ('82000000-0000-4000-8000-000000000003', '81000000-0000-4000-8000-000000000001', 'CQI Student One', 'cqi-student-one@test.invalid', 'student', true),
  ('82000000-0000-4000-8000-000000000004', '81000000-0000-4000-8000-000000000001', 'CQI Student Two', 'cqi-student-two@test.invalid', 'student', true),
  ('82000000-0000-4000-8000-000000000006', '81000000-0000-4000-8000-000000000001', 'CQI Replacement One', 'cqi-replacement-one@test.invalid', 'student', true),
  ('82000000-0000-4000-8000-000000000007', '81000000-0000-4000-8000-000000000001', 'CQI Replacement Two', 'cqi-replacement-two@test.invalid', 'student', true),
  ('82000000-0000-4000-8000-000000000005', '81000000-0000-4000-8000-000000000002', 'Foreign Coordinator', 'cqi-foreign-coordinator@test.invalid', 'coordinator', true);

INSERT INTO public.programs (id, institution_id, coordinator_id, name, code, is_active) VALUES
  ('83000000-0000-4000-8000-000000000001', '81000000-0000-4000-8000-000000000001', '82000000-0000-4000-8000-000000000001', 'CQI Program', 'CQI', true),
  ('83000000-0000-4000-8000-000000000002', '81000000-0000-4000-8000-000000000002', '82000000-0000-4000-8000-000000000005', 'Foreign CQI Program', 'FCQI', true);

INSERT INTO public.courses (id, program_id, name, code, semester, academic_year, is_active) VALUES
  ('84000000-0000-4000-8000-000000000001', '83000000-0000-4000-8000-000000000001', 'CQI Course', 'CQI101', 'Fall', '2026', true);
INSERT INTO public.semesters (id, institution_id, name, code, start_date, end_date, is_active) VALUES
  ('85000000-0000-4000-8000-000000000001', '81000000-0000-4000-8000-000000000001', 'Fall 2026', 'F26', '2026-08-01', '2026-12-31', true);
INSERT INTO public.learning_outcomes (id, institution_id, program_id, course_id, type, title, sort_order) VALUES
  ('86000000-0000-4000-8000-000000000001', '81000000-0000-4000-8000-000000000001', '83000000-0000-4000-8000-000000000001', '84000000-0000-4000-8000-000000000001', 'CLO', 'CQI verification outcome', 1);

INSERT INTO public.cqi_systemic_patterns (
  id, institution_id, program_id, course_id, outcome_id, outcome_type, pattern_kind,
  policy_version, window_start, window_end, pattern_identity, occurrence_version,
  baseline_attainment, current_attainment, target_threshold, sample_count, affected_population,
  evidence_references
) VALUES (
  '87000000-0000-4000-8000-000000000001', '81000000-0000-4000-8000-000000000001',
  '83000000-0000-4000-8000-000000000001', '84000000-0000-4000-8000-000000000001',
  '86000000-0000-4000-8000-000000000001', 'CLO', 'systemic_outcome_attainment_gap',
  'attainment-v1', '2026-08-01T00:00:00Z', '2026-08-10T23:59:59Z',
  'cqi/verification/clo', 'occurrence-1', 50, 50, 70, 2, 2, '["evidence-1"]'::jsonb
);

INSERT INTO public.agent_runs (
  id, request_id, actor_user_id, actor_role, institution_id, session_id, specialist, input_hash, status, completed_at
) VALUES (
  '88000000-0000-4000-8000-000000000001', '88100000-0000-4000-8000-000000000001',
  '82000000-0000-4000-8000-000000000001', 'coordinator', '81000000-0000-4000-8000-000000000001',
  '88200000-0000-4000-8000-000000000001', 'coordinator', repeat('a', 64), 'completed', now()
);
INSERT INTO public.agent_action_proposals (
  id, run_id, actor_user_id, institution_id, program_id, action_type, tool_version, payload,
  reason, evidence_references, evidence_hash, required_approver_role, required_approver_user_id,
  status, idempotency_key, expires_at, decided_at, decided_by
) VALUES (
  '89000000-0000-4000-8000-000000000001', '88000000-0000-4000-8000-000000000001',
  '82000000-0000-4000-8000-000000000001', '81000000-0000-4000-8000-000000000001',
  '83000000-0000-4000-8000-000000000001', 'create_cqi_action', '1.0.0',
  jsonb_build_object('systemicPatternId', '87000000-0000-4000-8000-000000000001',
    'semesterId', '85000000-0000-4000-8000-000000000001', 'targetAttainment', 70,
    'actionDescription', 'Add a structured formative practice cycle.', 'responsiblePerson', 'CQI Coordinator'),
  'The canonical attainment pattern meets the action threshold.', '["evidence-1"]'::jsonb,
  repeat('b', 64), 'coordinator', '82000000-0000-4000-8000-000000000001', 'approved',
  repeat('c', 64), now() + interval '1 day', now(), '82000000-0000-4000-8000-000000000001'
);

INSERT INTO public.agent_action_proposals (
  id, run_id, actor_user_id, institution_id, program_id, action_type, tool_version, payload,
  reason, evidence_references, evidence_hash, required_approver_role, required_approver_user_id,
  status, idempotency_key, expires_at, decided_at, decided_by
)
SELECT
  '89000000-0000-4000-8000-000000000002', run_id, actor_user_id, institution_id, program_id,
  action_type, tool_version, payload - 'responsiblePerson', reason, evidence_references,
  evidence_hash, required_approver_role, required_approver_user_id, status, repeat('d', 64),
  expires_at, decided_at, decided_by
FROM public.agent_action_proposals
WHERE id = '89000000-0000-4000-8000-000000000001';

DO $missing_payload_key$
BEGIN
  PERFORM public.execute_approved_cqi_action_v1(
    '89000000-0000-4000-8000-000000000002', '82000000-0000-4000-8000-000000000001'
  );
  RAISE EXCEPTION 'Missing CQI proposal payload key was accepted';
EXCEPTION WHEN SQLSTATE '22023' THEN
  IF SQLERRM <> 'Invalid CQI proposal contract' THEN RAISE; END IF;
END;
$missing_payload_key$;

SET LOCAL session_replication_role = origin;

INSERT INTO public.outcome_attainment (outcome_id, student_id, course_id, scope, attainment_percent, sample_count, last_calculated_at) VALUES
  ('86000000-0000-4000-8000-000000000001', '82000000-0000-4000-8000-000000000003', '84000000-0000-4000-8000-000000000001', 'student_course', 50, 1, '2026-08-05T12:00:00Z'),
  ('86000000-0000-4000-8000-000000000001', '82000000-0000-4000-8000-000000000004', '84000000-0000-4000-8000-000000000001', 'student_course', 50, 1, '2026-08-05T12:00:00Z');

DO $execution$
DECLARE
  v_first jsonb;
  v_retry jsonb;
BEGIN
  v_first := public.execute_approved_cqi_action_v1(
    '89000000-0000-4000-8000-000000000001', '82000000-0000-4000-8000-000000000001'
  );
  v_retry := public.execute_approved_cqi_action_v1(
    '89000000-0000-4000-8000-000000000001', '82000000-0000-4000-8000-000000000001'
  );
  IF v_first->>'alreadyExecuted' <> 'false' OR v_retry->>'alreadyExecuted' <> 'true'
    OR (SELECT count(*) FROM public.cqi_action_plans WHERE source_proposal_id = '89000000-0000-4000-8000-000000000001') <> 1
    OR (SELECT count(*) FROM public.agent_action_executions WHERE proposal_id = '89000000-0000-4000-8000-000000000001') <> 1
  THEN RAISE EXCEPTION 'CQI protected execution was not exactly once'; END IF;
END;
$execution$;

UPDATE public.outcome_attainment
SET attainment_percent = 60, last_calculated_at = '2026-08-20T12:00:00Z'
WHERE outcome_id = '86000000-0000-4000-8000-000000000001';

DO $measurement$
DECLARE v_result jsonb;
BEGIN
  v_result := public.measure_cqi_action_plan_v1(
    (SELECT id FROM public.cqi_action_plan_measurements WHERE systemic_pattern_id = '87000000-0000-4000-8000-000000000001'),
    '2026-08-20T00:00:00Z', '2026-08-21T00:00:00Z', '82000000-0000-4000-8000-000000000001'
  );
  IF v_result->>'evaluationState' <> 'IMPROVED' OR (v_result->>'delta')::numeric <> 10
    OR (SELECT status FROM public.cqi_systemic_patterns WHERE id = '87000000-0000-4000-8000-000000000001') <> 'resolved'
  THEN RAISE EXCEPTION 'CQI measurement did not resolve a materially improved pattern'; END IF;
END;
$measurement$;

UPDATE public.outcome_attainment
SET attainment_percent = 50, last_calculated_at = '2026-08-22T12:00:00Z'
WHERE outcome_id = '86000000-0000-4000-8000-000000000001';

DO $reopen$
DECLARE v_result jsonb;
BEGIN
  v_result := public.measure_cqi_action_plan_v1(
    (SELECT id FROM public.cqi_action_plan_measurements WHERE systemic_pattern_id = '87000000-0000-4000-8000-000000000001'),
    '2026-08-22T00:00:00Z', '2026-08-23T00:00:00Z', '82000000-0000-4000-8000-000000000001'
  );
  IF v_result->>'evaluationState' <> 'NO_MATERIAL_CHANGE'
    OR (SELECT status FROM public.cqi_systemic_patterns WHERE id = '87000000-0000-4000-8000-000000000001') <> 'reopened'
  THEN RAISE EXCEPTION 'CQI non-improvement did not reopen the pattern'; END IF;
END;
$reopen$;

DO $insufficient$
DECLARE v_result jsonb;
BEGIN
  v_result := public.measure_cqi_action_plan_v1(
    (SELECT id FROM public.cqi_action_plan_measurements WHERE systemic_pattern_id = '87000000-0000-4000-8000-000000000001'),
    '2026-08-24T00:00:00Z', '2026-08-25T00:00:00Z', '82000000-0000-4000-8000-000000000001'
  );
  IF v_result->>'evaluationState' <> 'INSUFFICIENT_EVIDENCE'
    OR (SELECT status FROM public.cqi_systemic_patterns WHERE id = '87000000-0000-4000-8000-000000000001') <> 'reopened'
  THEN RAISE EXCEPTION 'CQI insufficient evidence did not preserve the reopened pattern'; END IF;
END;
$insufficient$;

UPDATE public.outcome_attainment
SET student_id = CASE student_id
  WHEN '82000000-0000-4000-8000-000000000003'::uuid THEN '82000000-0000-4000-8000-000000000006'::uuid
END,
    attainment_percent = 90,
    last_calculated_at = '2026-08-26T12:00:00Z'
WHERE outcome_id = '86000000-0000-4000-8000-000000000001';

DO $incompatible_population$
DECLARE v_result jsonb;
BEGIN
  v_result := public.measure_cqi_action_plan_v1(
    (SELECT id FROM public.cqi_action_plan_measurements WHERE systemic_pattern_id = '87000000-0000-4000-8000-000000000001'),
    '2026-08-26T00:00:00Z', '2026-08-27T00:00:00Z', '82000000-0000-4000-8000-000000000001'
  );
  IF v_result->>'evaluationState' <> 'INSUFFICIENT_EVIDENCE'
    OR v_result->>'delta' IS NOT NULL
    OR v_result->>'postActionMetric' IS NOT NULL
    OR v_result->>'postActionSampleCount' IS NOT NULL
  THEN RAISE EXCEPTION 'An equal-sized but incompatible CQI population produced a comparable outcome'; END IF;
END;
$incompatible_population$;

DO $privileges$
BEGIN
  IF has_function_privilege('authenticated', 'public.execute_approved_cqi_action_v1(uuid,uuid)', 'EXECUTE')
    OR has_function_privilege('authenticated', 'public.measure_cqi_action_plan_v1(uuid,timestamp with time zone,timestamp with time zone,uuid)', 'EXECUTE')
    OR has_table_privilege('authenticated', 'public.cqi_systemic_patterns', 'SELECT')
  THEN RAISE EXCEPTION 'CQI protected-write/table privilege was exposed to authenticated users'; END IF;
END;
$privileges$;

SELECT set_config('request.jwt.claim.sub', '82000000-0000-4000-8000-000000000001', true);
SET LOCAL ROLE authenticated;
DO $coordinator_read$
BEGIN
  IF jsonb_array_length(public.get_coordinator_cqi_patterns_v1('83000000-0000-4000-8000-000000000001')) <> 1 THEN
    RAISE EXCEPTION 'Coordinator scoped CQI read did not return its program pattern';
  END IF;
END;
$coordinator_read$;
RESET ROLE;

SELECT set_config('request.jwt.claim.sub', '82000000-0000-4000-8000-000000000002', true);
SET LOCAL ROLE authenticated;
DO $admin_read$
DECLARE v_summary jsonb;
BEGIN
  v_summary := public.get_admin_cqi_effectiveness_v1();
  IF (v_summary->>'openPatterns')::integer <> 1
    OR (v_summary->'measurementStates'->>'INSUFFICIENT_EVIDENCE')::integer <> 1 THEN
    RAISE EXCEPTION 'Admin CQI aggregate was not institution scoped';
  END IF;
END;
$admin_read$;
RESET ROLE;

ROLLBACK;
