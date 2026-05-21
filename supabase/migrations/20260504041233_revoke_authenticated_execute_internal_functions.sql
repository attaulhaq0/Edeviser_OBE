-- W3: REVOKE EXECUTE on internal-only SECURITY DEFINER functions.
-- These functions are called by cron jobs and edge functions via service_role,
-- not by regular authenticated users via PostgREST RPC.
DO $$
DECLARE
  target text;
  fn regprocedure;
BEGIN
  FOR target IN
    SELECT signature
    FROM (
      VALUES
        ('public.increment_team_xp(uuid, integer)'),
        ('public.recalculate_dynamic_prices(uuid)'),
        ('public.recalculate_league_tiers(uuid)'),
        ('public.expire_stale_recovery_sessions()'),
        ('public.badge_auto_archive()'),
        ('public.badge_spotlight_auto_rotate()'),
        ('public.rls_auto_enable()'),
        ('public.trigger_attainment_rollup()'),
        ('public.is_pgcron_available()')
    ) AS targets(signature)
  LOOP
    fn := to_regprocedure(target);
    IF fn IS NOT NULL THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM authenticated', fn);
    END IF;
  END LOOP;

  FOR target IN
    SELECT signature
    FROM (
      VALUES
        ('public.expire_stale_recovery_sessions()'),
        ('public.badge_auto_archive()'),
        ('public.badge_spotlight_auto_rotate()'),
        ('public.rls_auto_enable()'),
        ('public.trigger_attainment_rollup()'),
        ('public.is_pgcron_available()')
    ) AS targets(signature)
  LOOP
    fn := to_regprocedure(target);
    IF fn IS NOT NULL THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', fn);
    END IF;
  END LOOP;
END $$;
