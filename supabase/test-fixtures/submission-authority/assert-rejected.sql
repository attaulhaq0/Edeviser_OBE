-- Execute after the expected failed migration in either negative topology fixture.
-- The failed command must have ON_ERROR_STOP enabled and its transaction rolled back.
DO $$ BEGIN
  IF current_setting('test.phase_a_fixture_authorized',true) IS DISTINCT FROM 'isolated-replay-only' THEN
    RAISE EXCEPTION 'Explicit isolated replay fixture authorization required';
  END IF;
  IF to_regprocedure('public.submission_authority_phase_a_v1()') IS NOT NULL
    OR to_regprocedure('public.submission_actor_active_v1()') IS NOT NULL
    OR EXISTS(SELECT 1 FROM pg_trigger WHERE tgname IN('trg_submission_authority_phase_a_v1','trg_grade_source_authority_phase_a_v1','trg_quiz_attempt_authority_phase_a_v1')) THEN
    RAISE EXCEPTION 'Failed migration left partial Phase A authority objects';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_policy WHERE polrelid='public.submissions'::regclass AND polname='submissions_student_own' AND polcmd='*')
    OR NOT EXISTS(SELECT 1 FROM pg_policy WHERE polrelid='public.grades'::regclass AND polname='grades_teacher_write' AND polcmd='*')
    OR NOT EXISTS(SELECT 1 FROM pg_policy WHERE polrelid='public.quiz_attempts'::regclass AND polname='quiz_attempts_student_insert' AND polcmd='a') THEN
    RAISE EXCEPTION 'Failed migration did not preserve original writer policies';
  END IF;
END $$;
