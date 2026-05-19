-- Revoke EXECUTE from public role (which anon and authenticated inherit from).
-- These are internal/cron functions that should only be called by service_role or triggers.
DO $$
DECLARE
  target text;
  fn regprocedure;
BEGIN
  FOR target IN
    SELECT signature
    FROM (
      VALUES
        ('public.badge_auto_archive()'),
        ('public.badge_spotlight_auto_rotate()'),
        ('public.delete_department_if_no_programs(uuid)'),
        ('public.is_pgcron_available()'),
        ('public.rls_auto_enable()'),
        ('public.trigger_attainment_rollup()')
    ) AS targets(signature)
  LOOP
    fn := to_regprocedure(target);
    IF fn IS NOT NULL THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM public', fn);
    END IF;
  END LOOP;
END $$;

-- These are called by authenticated users via frontend RPC: keep authenticated, revoke anon/public.
DO $$
DECLARE
  target text;
  fn regprocedure;
BEGIN
  FOR target IN
    SELECT signature
    FROM (
      VALUES
        ('public.get_badge_spotlight(uuid, integer)'),
        ('public.get_earn_spend_ratio(uuid)'),
        ('public.get_leaderboard(uuid)'),
        ('public.get_wellness_aggregate_stats(uuid)'),
        ('public.increment_team_xp(uuid, integer)'),
        ('public.recalculate_dynamic_prices(uuid)'),
        ('public.recalculate_league_tiers(uuid)')
    ) AS targets(signature)
  LOOP
    fn := to_regprocedure(target);
    IF fn IS NOT NULL THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon, public', fn);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn);
    END IF;
  END LOOP;
END $$;
