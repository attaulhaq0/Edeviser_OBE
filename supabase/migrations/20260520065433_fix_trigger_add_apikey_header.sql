-- Fix: Add apikey header to trigger_attainment_rollup so Supabase gateway accepts the request
CREATE OR REPLACE FUNCTION public.trigger_attainment_rollup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  _supabase_url text := 'https://cdlgtbvxlxjpcddjazzx.supabase.co';
  _service_role_key text;
  _edge_function_url text;
  _request_id bigint;
BEGIN
  SELECT decrypted_secret INTO _service_role_key
  FROM vault.decrypted_secrets
  WHERE name = 'service_role_key'
  LIMIT 1;

  IF _service_role_key IS NULL OR _service_role_key = '' THEN
    RAISE WARNING 'trigger_attainment_rollup: service_role_key not in vault, skipping';
    RETURN NEW;
  END IF;

  _edge_function_url := _supabase_url || '/functions/v1/calculate-attainment-rollup';

  BEGIN
    SELECT net.http_post(
      url := _edge_function_url,
      body := jsonb_build_object(
        'grade_id', NEW.id,
        'submission_id', NEW.submission_id,
        'total_score', NEW.total_score,
        'score_percent', NEW.score_percent,
        'rubric_selections', NEW.rubric_selections
      ),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || _service_role_key,
        'apikey', _service_role_key
      )
    ) INTO _request_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'trigger_attainment_rollup: pg_net call failed - %', SQLERRM;
  END;

  RETURN NEW;
END;
$func$;;
