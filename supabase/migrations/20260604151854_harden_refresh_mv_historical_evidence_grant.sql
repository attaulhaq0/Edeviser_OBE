-- Feature: qa-partner-review-remediation — Req 4 (B4) hardening follow-up
-- The original migration (20260603201746) REVOKEd EXECUTE on
-- public.refresh_mv_historical_evidence() FROM PUBLIC, anon, but Supabase grants
-- EXECUTE to `authenticated` by default on public-schema functions, so the
-- design intent (service_role/postgres only) was not fully enforced. This
-- revokes the residual authenticated grant. Replay-safe: the function is
-- CREATEd in an earlier migration; guarded so a fresh replay where the function
-- does not yet exist is a no-op.
DO $$ BEGIN
  IF to_regprocedure('public.refresh_mv_historical_evidence()') IS NOT NULL THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.refresh_mv_historical_evidence() FROM authenticated';
  END IF;
END $$;;
