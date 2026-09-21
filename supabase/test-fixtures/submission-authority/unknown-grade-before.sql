-- Independent negative topology variant on a fresh authorized pre-Phase-A fixture.
-- The real migration MUST fail before changing any application function/policy.
BEGIN;
DO $$ BEGIN
  IF current_setting('test.phase_a_fixture_authorized',true) IS DISTINCT FROM 'isolated-replay-only'
    OR to_regprocedure('public.submission_authority_phase_a_v1()') IS NOT NULL THEN
    RAISE EXCEPTION 'Expected authorized pre-Phase-A isolated fixture';
  END IF;
END $$;
CREATE FUNCTION public.qa_phase_a_unknown_grade_before() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END; $$;
CREATE TRIGGER qa_phase_a_unknown_grade_before BEFORE INSERT ON public.grades FOR EACH ROW EXECUTE FUNCTION public.qa_phase_a_unknown_grade_before();
COMMIT;
