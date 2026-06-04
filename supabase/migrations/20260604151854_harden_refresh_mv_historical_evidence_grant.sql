-- Feature: qa-partner-review-remediation — Req 4 (B4) hardening follow-up
-- The original migration (20260603201746_create_mv_historical_evidence) REVOKEd
-- EXECUTE on public.refresh_mv_historical_evidence() FROM PUBLIC, anon, but
-- Supabase grants EXECUTE to `authenticated` by default on public-schema
-- functions, so the design intent (service_role/postgres only) was not fully
-- enforced. The security advisor (0029_authenticated_security_definer_function_executable)
-- flagged the residual `authenticated` grant. This revokes it.
--
-- Replay integrity (migration-replay-integrity.md): the function is CREATEd in
-- an earlier migration (20260603201746); this REVOKE is guarded with
-- to_regprocedure() so a from-scratch replay where the function does not yet
-- exist is a no-op, and it applies normally where it does.
DO $$ BEGIN
  IF to_regprocedure('public.refresh_mv_historical_evidence()') IS NOT NULL THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.refresh_mv_historical_evidence() FROM authenticated';
  END IF;
END $$;
