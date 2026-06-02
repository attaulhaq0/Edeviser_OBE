-- W3: REVOKE EXECUTE on internal-only SECURITY DEFINER functions
-- These functions are called by cron jobs and edge functions via service_role,
-- NOT by regular authenticated users via PostgREST RPC.

-- Functions that were incorrectly re-granted to authenticated in previous migration
-- Guarded (db-function-search-path-qualification Task 6, replay-only):
-- increment_team_xp(uuid,integer) is CREATEd later in the chain (20260720000012),
-- so a bare REVOKE here aborts a fresh replay with 42883. Skip if not yet present.
DO $$ BEGIN
  IF to_regprocedure('public.increment_team_xp(uuid, integer)') IS NOT NULL THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.increment_team_xp(uuid, integer) FROM authenticated';
  END IF;
END $$;
REVOKE EXECUTE ON FUNCTION public.recalculate_dynamic_prices(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.recalculate_league_tiers(uuid) FROM authenticated;

-- Function that was never addressed in any previous REVOKE migration
REVOKE EXECUTE ON FUNCTION public.expire_stale_recovery_sessions() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.expire_stale_recovery_sessions() FROM anon;

-- Re-revoke from authenticated for safety (idempotent)
REVOKE EXECUTE ON FUNCTION public.badge_auto_archive() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.badge_spotlight_auto_rotate() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.trigger_attainment_rollup() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.is_pgcron_available() FROM authenticated;

-- Re-revoke from anon for safety (idempotent)
REVOKE EXECUTE ON FUNCTION public.badge_auto_archive() FROM anon;
REVOKE EXECUTE ON FUNCTION public.badge_spotlight_auto_rotate() FROM anon;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon;
REVOKE EXECUTE ON FUNCTION public.trigger_attainment_rollup() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_pgcron_available() FROM anon;;
