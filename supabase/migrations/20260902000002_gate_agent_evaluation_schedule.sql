-- Task 7.4 follow-up: gate the agent-evaluation-jobs schedule behind an
-- explicit enable marker (CodeRabbit review finding, verified valid).
--
-- The currently deployed function build predates threshold wiring; firing the
-- hourly job before that build is replaced would score ALL institutions
-- unconditionally. This migration re-registers the job so each tick is a
-- cheap no-op until the deploy runbook inserts the marker:
--
--   INSERT INTO private.cron_secrets(name, secret)
--   VALUES ('agent_evaluation_jobs_enabled', 'enabled-after-deploy');
--
-- Applied migrations are immutable: 20260902000001 stays exactly as applied;
-- this file supersedes only the agent-evaluation-jobs registration.

SELECT cron.unschedule('agent-evaluation-jobs');

SELECT cron.schedule(
  'agent-evaluation-jobs',
  '20 * * * *',
  $job$
  DO $inner$
  DECLARE
    v_secret text;
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM private.cron_secrets cs
       WHERE cs.name = 'agent_evaluation_jobs_enabled'
    ) THEN
      RETURN; -- not yet enabled: threshold-aware function deployment pending
    END IF;
    SELECT cs.secret INTO v_secret
      FROM private.cron_secrets cs
     WHERE cs.name = 'cron_intervention_jobs';
    IF v_secret IS NOT NULL AND length(btrim(v_secret)) > 0 THEN
      PERFORM net.http_post(
        url := 'https://cdlgtbvxlxjpcddjazzx.supabase.co/functions/v1/agent-evaluation-jobs',
        headers := jsonb_build_object(
          'x-cron-secret', v_secret,
          'Content-Type', 'application/json'
        ),
        body := '{}'::jsonb
      );
    END IF;
  END
  $inner$;
  $job$
);
