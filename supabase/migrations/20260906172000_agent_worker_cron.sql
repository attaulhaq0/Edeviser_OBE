-- agent_worker_cron — continuous-verification task 7.4 completion
-- pg_cron schedule for agent-worker to process the proactive jobs queue.
-- Applied LIVE via MCP (cron.job id 84, schedule */5 * * * *).
SELECT cron.schedule(
  'agent-worker-process',
  '*/5 * * * *',
  $$
  DO $inner$
  DECLARE v_secret text;
  BEGIN
    SELECT cs.secret INTO v_secret
      FROM private.cron_secrets cs
     WHERE cs.name = 'cron_intervention_jobs';
    IF v_secret IS NOT NULL AND length(btrim(v_secret)) > 0 THEN
      PERFORM net.http_post(
        url := 'https://cdlgtbvxlxjpcddjazzx.supabase.co/functions/v1/agent-worker',
        headers := jsonb_build_object('x-cron-secret', v_secret, 'Content-Type', 'application/json'),
        body := '{"limit":10}'::jsonb,
        timeout_milliseconds := 120000
      );
    END IF;
  END
  $inner$
  $$
);