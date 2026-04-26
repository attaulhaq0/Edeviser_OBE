-- ============================================================
-- pg_cron job: Daily dynamic price recalculation at midnight UTC
-- Uses the conditional pgcron guard pattern.
-- ============================================================

DO $outer$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Recalculate dynamic prices for all institutions daily at midnight UTC
    PERFORM cron.schedule(
      'recalculate-dynamic-prices',
      '0 0 * * *',
      'SELECT recalculate_dynamic_prices(i.id) FROM institutions i'
    );

    RAISE NOTICE 'pg_cron job recalculate-dynamic-prices created successfully';
  ELSE
    RAISE NOTICE 'pg_cron not available — skipping dynamic price recalculation cron job.';
  END IF;
END;
$outer$;
