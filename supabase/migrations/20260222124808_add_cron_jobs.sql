-- ============================================
-- Migration 7: Cron Jobs
-- ============================================
-- NOTE: pg_cron and pg_net require Supabase Pro plan.
-- If these fail on free tier, see task 44 for Vercel Cron fallback.
-- The Edge Functions referenced here will be created in later tasks.

-- Leaderboard refresh (every 5 minutes)
SELECT cron.schedule(
  'leaderboard-refresh',
  '*/5 * * * *',
  'REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_weekly'
);

-- Streak risk email (daily 8 PM UTC)
SELECT cron.schedule(
  'streak-risk-email',
  '0 20 * * *',
  $$SELECT net.http_post(
    url := 'https://cdlgtbvxlxjpcddjazzx.supabase.co/functions/v1/streak-risk-cron',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)),
    body := '{}'::jsonb
  )$$
);

-- Weekly summary email (Monday 8 AM UTC)
SELECT cron.schedule(
  'weekly-summary-email',
  '0 8 * * 1',
  $$SELECT net.http_post(
    url := 'https://cdlgtbvxlxjpcddjazzx.supabase.co/functions/v1/weekly-summary-cron',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)),
    body := '{}'::jsonb
  )$$
);

-- Compute at-risk signals (nightly 2 AM UTC)
SELECT cron.schedule(
  'compute-at-risk-signals',
  '0 2 * * *',
  $$SELECT net.http_post(
    url := 'https://cdlgtbvxlxjpcddjazzx.supabase.co/functions/v1/compute-at-risk-signals',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)),
    body := '{}'::jsonb
  )$$
);

-- Perfect day prompt (daily 6 PM UTC)
SELECT cron.schedule(
  'perfect-day-prompt',
  '0 18 * * *',
  $$SELECT net.http_post(
    url := 'https://cdlgtbvxlxjpcddjazzx.supabase.co/functions/v1/perfect-day-prompt',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)),
    body := '{}'::jsonb
  )$$
);

-- Streak midnight reset (daily midnight UTC)
SELECT cron.schedule(
  'streak-midnight-reset',
  '0 0 * * *',
  $$SELECT net.http_post(
    url := 'https://cdlgtbvxlxjpcddjazzx.supabase.co/functions/v1/process-streak',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)),
    body := '{"type": "midnight_reset"}'::jsonb
  )$$
);

-- Fee overdue check (daily 6 AM UTC)
SELECT cron.schedule(
  'fee-overdue-check',
  '0 6 * * *',
  $$UPDATE fee_payments SET status = 'overdue' WHERE status = 'pending' AND EXISTS (SELECT 1 FROM fee_structures fs WHERE fs.id = fee_payments.fee_structure_id AND fs.due_date < CURRENT_DATE)$$
);
;
