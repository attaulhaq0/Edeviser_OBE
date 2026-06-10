-- Revoke EXECUTE from public role (which anon and authenticated inherit from)
-- These are internal/cron functions that should only be called by service_role or triggers
REVOKE EXECUTE ON FUNCTION public.badge_auto_archive() FROM public;
REVOKE EXECUTE ON FUNCTION public.badge_spotlight_auto_rotate() FROM public;
REVOKE EXECUTE ON FUNCTION public.delete_department_if_no_programs(uuid) FROM public;
REVOKE EXECUTE ON FUNCTION public.is_pgcron_available() FROM public;
DO $$ BEGIN
  IF to_regprocedure('public.rls_auto_enable()') IS NOT NULL THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM public';
  END IF;
END $$;
REVOKE EXECUTE ON FUNCTION public.trigger_attainment_rollup() FROM public;

-- These are called by authenticated users via frontend RPC — keep authenticated, revoke anon
REVOKE EXECUTE ON FUNCTION public.get_badge_spotlight(uuid, integer) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_badge_spotlight(uuid, integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_earn_spend_ratio(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_earn_spend_ratio(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_leaderboard(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_wellness_aggregate_stats(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_wellness_aggregate_stats(uuid) TO authenticated;

DO $$ BEGIN
  IF to_regprocedure('public.increment_team_xp(uuid, integer)') IS NOT NULL THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.increment_team_xp(uuid, integer) FROM anon, public';
  END IF;
END $$;
DO $$ BEGIN
  IF to_regprocedure('public.increment_team_xp(uuid, integer)') IS NOT NULL THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.increment_team_xp(uuid, integer) TO authenticated';
  END IF;
END $$;

REVOKE EXECUTE ON FUNCTION public.recalculate_dynamic_prices(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.recalculate_dynamic_prices(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.recalculate_league_tiers(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.recalculate_league_tiers(uuid) TO authenticated;;
