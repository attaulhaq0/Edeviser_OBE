-- Negative topology variant: only after legacy-binding.sql on a separate fresh
-- isolated fixture. The real migration MUST fail; do not repair/drop this to pass.
BEGIN;
DO $$ BEGIN
  IF current_setting('test.phase_a_fixture_authorized',true) IS DISTINCT FROM 'isolated-replay-only'
    OR to_regprocedure('public.submission_authority_phase_a_v1()') IS NOT NULL THEN
    RAISE EXCEPTION 'Expected authorized pre-Phase-A isolated fixture';
  END IF;
END $$;
DROP TRIGGER trg_habit_signals_on_submission ON public.submissions;
CREATE TRIGGER trg_habit_signals_on_submission AFTER UPDATE ON public.submissions FOR EACH ROW EXECUTE FUNCTION public.generate_habit_signals_from_submission_v1();
COMMIT;
