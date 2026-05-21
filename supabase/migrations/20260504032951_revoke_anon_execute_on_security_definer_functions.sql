-- Revoke EXECUTE from anon on SECURITY DEFINER functions that should not be publicly callable.
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
        ('public.get_badge_spotlight(uuid, integer)'),
        ('public.get_earn_spend_ratio(uuid)'),
        ('public.get_leaderboard(uuid)'),
        ('public.get_wellness_aggregate_stats(uuid)'),
        ('public.increment_team_xp(uuid, integer)'),
        ('public.is_pgcron_available()'),
        ('public.recalculate_dynamic_prices(uuid)'),
        ('public.recalculate_league_tiers(uuid)'),
        ('public.rls_auto_enable()'),
        ('public.trigger_attainment_rollup()')
    ) AS targets(signature)
  LOOP
    fn := to_regprocedure(target);
    IF fn IS NOT NULL THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', fn);
    END IF;
  END LOOP;
END $$;
