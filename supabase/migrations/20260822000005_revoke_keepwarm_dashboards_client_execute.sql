-- ============================================================
-- Migration: Narrow keepwarm_dashboards() EXECUTE to server-only roles
-- Feature: infra-health / SECURITY DEFINER least-privilege grant hygiene
-- ============================================================
-- WHY THIS EXISTS
--   20260822000000_keepwarm_dashboards_cron.sql created
--   public.keepwarm_dashboards() as a SECURITY DEFINER utility and ran
--   `REVOKE EXECUTE ... FROM PUBLIC`. On a Supabase project, however, the `anon`
--   and `authenticated` roles are ALSO granted EXECUTE on public functions
--   independently of the PUBLIC pseudo-role (via the schema's default
--   privileges), so `REVOKE ... FROM PUBLIC` alone does NOT remove their access.
--   Live grants confirmed both roles still hold EXECUTE, so any unauthenticated
--   caller can hit `POST /rest/v1/rpc/keepwarm_dashboards` and force a
--   `pg_prewarm` pass over ~20 tables + their indexes -- needless I/O and an
--   abuse/DoS surface. The function returns only an integer count, so this is
--   NOT a data-leak; it is purely a least-privilege / attack-surface fix.
--   (Ref: security advisor `anon_security_definer_function_executable` +
--    `.kiro/steering/supabase-patterns.md` "SECURITY DEFINER Function Grant Hygiene".)
--
-- WHAT THIS DOES
--   Explicitly revokes EXECUTE from `anon` and `authenticated`. The function is
--   only ever invoked by the pg_cron job `keepwarm-dashboards` (which runs as the
--   function owner / `postgres`) and stays callable by `postgres`/`service_role`.
--   No client code calls this RPC (verified via a repo-wide search), so no
--   application behavior changes.
--
-- REPLAY-SAFETY (migration-replay-integrity)
--   keepwarm_dashboards() is CREATEd in 20260822000000, which sorts BEFORE this
--   migration, so on a fresh from-scratch replay the function already exists by
--   the time this runs. The `to_regprocedure(...) IS NOT NULL` guard is defensive
--   (mirrors the pattern in 20260704200235) and makes the REVOKE a no-op if the
--   function is ever absent, so this file can never abort a replay with 42883.
--
-- REVERSIBILITY
--   To restore (not recommended):
--     GRANT EXECUTE ON FUNCTION public.keepwarm_dashboards() TO anon, authenticated;
-- ============================================================

DO $$
BEGIN
  IF to_regprocedure('public.keepwarm_dashboards()') IS NOT NULL THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.keepwarm_dashboards() FROM anon, authenticated';
  END IF;
END $$;
