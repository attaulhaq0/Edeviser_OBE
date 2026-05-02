-- ============================================================
-- Migration: pg_cron job for weekly league tier recalculation
-- Task 16.3: Runs at Sunday midnight UTC.
-- Uses conditional pgcron guard pattern.
-- ============================================================

DO $outer$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Recalculate league tiers for all institutions every Sunday at midnight UTC
    PERFORM cron.schedule(
      'recalculate-league-tiers',
      '0 0 * * 0',
      'SELECT recalculate_league_tiers(i.id) FROM institutions i'
    );

    RAISE NOTICE 'pg_cron job recalculate-league-tiers created successfully';
  ELSE
    RAISE NOTICE 'pg_cron not available — skipping league tier recalculation cron job.';
  END IF;
END;
$outer$;;
