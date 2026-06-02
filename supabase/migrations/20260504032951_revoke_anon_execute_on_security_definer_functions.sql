-- Revoke EXECUTE from anon on SECURITY DEFINER functions that should not be publicly callable
REVOKE EXECUTE ON FUNCTION public.badge_auto_archive() FROM anon;
REVOKE EXECUTE ON FUNCTION public.badge_spotlight_auto_rotate() FROM anon;
REVOKE EXECUTE ON FUNCTION public.delete_department_if_no_programs(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_badge_spotlight(uuid, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_earn_spend_ratio(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_leaderboard(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_wellness_aggregate_stats(uuid) FROM anon;
-- Guarded (db-function-search-path-qualification Task 6, replay-only):
-- increment_team_xp(uuid,integer) is CREATEd later in the chain (20260720000012),
-- so a bare REVOKE here aborts a fresh replay with 42883. Skip if not yet present;
-- on live (where it exists) the grant state is unchanged.
DO $$ BEGIN
  IF to_regprocedure('public.increment_team_xp(uuid, integer)') IS NOT NULL THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.increment_team_xp(uuid, integer) FROM anon';
  END IF;
END $$;
REVOKE EXECUTE ON FUNCTION public.is_pgcron_available() FROM anon;
REVOKE EXECUTE ON FUNCTION public.recalculate_dynamic_prices(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.recalculate_league_tiers(uuid) FROM anon;
-- Guarded (replay-only): rls_auto_enable() is NOT created by any migration in the chain
-- (it exists on live via the platform/Part-C), so a bare REVOKE aborts a fresh replay
-- with 42883. Skip when absent; applies normally on live where it exists.
DO $$ BEGIN
  IF to_regprocedure('public.rls_auto_enable()') IS NOT NULL THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon';
  END IF;
END $$;
REVOKE EXECUTE ON FUNCTION public.trigger_attainment_rollup() FROM anon;;
