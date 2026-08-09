-- The live migration predates the function's later CREATE (20260823000004).
-- Guard the ACL operation so a clean replay does not fail before that object
-- exists; the final function migration applies its intended ACL after CREATE.
DO $$
BEGIN
  IF to_regprocedure('public.get_coordinator_accreditation_readiness()') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.get_coordinator_accreditation_readiness() FROM anon;
    GRANT EXECUTE ON FUNCTION public.get_coordinator_accreditation_readiness() TO authenticated;
  END IF;
END
$$;
