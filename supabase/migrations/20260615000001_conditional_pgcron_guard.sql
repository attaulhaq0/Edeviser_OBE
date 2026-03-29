-- ============================================================
-- Migration: Conditional pg_cron guard for free-tier compatibility
-- ============================================================
-- On Supabase free tier, pg_cron is not available. This migration
-- wraps all cron job creation in a DO block that checks for the
-- SUPABASE_PRO env var (set via current_setting). If the extension
-- is not available, cron jobs are silently skipped — Vercel Cron
-- Jobs serve as the fallback (see vercel.json).
-- ============================================================

-- Helper function: returns true if pg_cron extension is installed
CREATE OR REPLACE FUNCTION public.is_pgcron_available()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  );
END;
$$;

-- Re-create all cron jobs only if pg_cron is available.
-- This is idempotent — cron.schedule with the same name replaces the existing job.
DO $$
BEGIN
  IF public.is_pgcron_available() THEN
    -- Leaderboard refresh (every 5 minutes)
    PERFORM cron.schedule(
      'leaderboard-refresh',
      '*/5 * * * *',
      'REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_weekly'
    );

    -- Streak risk email (daily 8 PM UTC)
    PERFORM cron.schedule(
      'streak-risk-email',
      '0 20 * * *',
      format(
        'SELECT net.http_post(url := %L || ''/functions/v1/streak-risk-cron'', headers := jsonb_build_object(''Authorization'', ''Bearer '' || current_setting(''app.settings.service_role_key'', true)), body := ''{}''::jsonb)',
        current_setting('app.settings.supabase_url', true)
      )
    );

    -- Weekly summary email (Monday 8 AM UTC)
    PERFORM cron.schedule(
      'weekly-summary-email',
      '0 8 * * 1',
      format(
        'SELECT net.http_post(url := %L || ''/functions/v1/weekly-summary-cron'', headers := jsonb_build_object(''Authorization'', ''Bearer '' || current_setting(''app.settings.service_role_key'', true)), body := ''{}''::jsonb)',
        current_setting('app.settings.supabase_url', true)
      )
    );

    -- Compute at-risk signals (nightly 2 AM UTC)
    PERFORM cron.schedule(
      'compute-at-risk-signals',
      '0 2 * * *',
      format(
        'SELECT net.http_post(url := %L || ''/functions/v1/compute-at-risk-signals'', headers := jsonb_build_object(''Authorization'', ''Bearer '' || current_setting(''app.settings.service_role_key'', true)), body := ''{}''::jsonb)',
        current_setting('app.settings.supabase_url', true)
      )
    );

    -- Perfect day prompt (daily 6 PM UTC)
    PERFORM cron.schedule(
      'perfect-day-prompt',
      '0 18 * * *',
      format(
        'SELECT net.http_post(url := %L || ''/functions/v1/perfect-day-prompt'', headers := jsonb_build_object(''Authorization'', ''Bearer '' || current_setting(''app.settings.service_role_key'', true)), body := ''{}''::jsonb)',
        current_setting('app.settings.supabase_url', true)
      )
    );

    -- Streak midnight reset (daily midnight UTC)
    PERFORM cron.schedule(
      'streak-midnight-reset',
      '0 0 * * *',
      format(
        'SELECT net.http_post(url := %L || ''/functions/v1/process-streak'', headers := jsonb_build_object(''Authorization'', ''Bearer '' || current_setting(''app.settings.service_role_key'', true)), body := ''{"type": "midnight_reset"}''::jsonb)',
        current_setting('app.settings.supabase_url', true)
      )
    );

    -- AI at-risk prediction (nightly 3 AM UTC)
    PERFORM cron.schedule(
      'ai-at-risk-prediction',
      '0 3 * * *',
      format(
        'SELECT net.http_post(url := %L || ''/functions/v1/ai-at-risk-prediction'', headers := jsonb_build_object(''Authorization'', ''Bearer '' || current_setting(''app.settings.service_role_key'', true)), body := ''{}''::jsonb)',
        current_setting('app.settings.supabase_url', true)
      )
    );

    -- Notification digest (daily 8 PM UTC)
    PERFORM cron.schedule(
      'notification-digest',
      '0 20 * * *',
      format(
        'SELECT net.http_post(url := %L || ''/functions/v1/notification-digest'', headers := jsonb_build_object(''Authorization'', ''Bearer '' || current_setting(''app.settings.service_role_key'', true)), body := ''{}''::jsonb)',
        current_setting('app.settings.supabase_url', true)
      )
    );

    -- Fee overdue check (daily 6 AM UTC)
    PERFORM cron.schedule(
      'fee-overdue-check',
      '0 6 * * *',
      'UPDATE fee_payments SET status = ''overdue'' WHERE status = ''pending'' AND EXISTS (SELECT 1 FROM fee_structures fs WHERE fs.id = fee_payments.fee_structure_id AND fs.due_date < CURRENT_DATE)'
    );

    RAISE NOTICE 'pg_cron jobs created successfully (Pro tier detected)';
  ELSE
    RAISE NOTICE 'pg_cron not available — skipping cron job creation. Use Vercel Cron Jobs as fallback (see vercel.json).';
  END IF;
END;
$$;
