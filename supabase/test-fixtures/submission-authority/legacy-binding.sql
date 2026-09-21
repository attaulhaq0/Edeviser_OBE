-- Optional positive topology variant: run after before.sql and before Phase A.
-- This is a binding stand-in, not a copy/certification of the live broken body.
BEGIN;
DO $$ BEGIN
  IF current_setting('test.phase_a_fixture_authorized',true) IS DISTINCT FROM 'isolated-replay-only'
    OR to_regprocedure('public.submission_authority_phase_a_v1()') IS NOT NULL
    OR to_regprocedure('public.generate_habit_signals_from_submission_v1()') IS NOT NULL THEN
    RAISE EXCEPTION 'Expected authorized clean pre-Phase-A isolated fixture';
  END IF;
END $$;
CREATE FUNCTION public.generate_habit_signals_from_submission_v1() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN RAISE EXCEPTION USING ERRCODE='42P01',MESSAGE='Legacy habit binding stand-in'; END;
$$;
ALTER FUNCTION public.generate_habit_signals_from_submission_v1() OWNER TO postgres;
CREATE TRIGGER trg_habit_signals_on_submission AFTER INSERT ON public.submissions FOR EACH ROW EXECUTE FUNCTION public.generate_habit_signals_from_submission_v1();
COMMIT;
