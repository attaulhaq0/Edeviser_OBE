-- ============================================
-- Migration: Grade Insert/Update Trigger for Attainment Rollup
-- ============================================
-- When a grade is inserted or updated, this trigger calls the
-- calculate-attainment-rollup Edge Function via pg_net to cascade
-- evidence generation and outcome attainment recalculation through
-- the CLO → PLO → ILO chain.
--
-- Requires: pg_net extension (enabled in earlier migration)
-- ============================================

CREATE OR REPLACE FUNCTION public.trigger_attainment_rollup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _supabase_url text;
  _service_role_key text;
  _edge_function_url text;
  _request_id bigint;
BEGIN
  -- Read configuration from app settings (set via Supabase Dashboard or vault)
  _supabase_url := coalesce(
    current_setting('app.settings.supabase_url', true),
    'https://cdlgtbvxlxjpcddjazzx.supabase.co'
  );
  _service_role_key := current_setting('app.settings.service_role_key', true);

  _edge_function_url := _supabase_url || '/functions/v1/calculate-attainment-rollup';

  -- Fire-and-forget HTTP POST via pg_net.
  -- If pg_net or the Edge Function fails, we do NOT block the grade insert/update.
  BEGIN
    SELECT net.http_post(
      url := _edge_function_url,
      body := jsonb_build_object('grade_id', NEW.id),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || _service_role_key
      )
    ) INTO _request_id;
  EXCEPTION WHEN OTHERS THEN
    -- Log the error but never block the grade operation
    RAISE WARNING 'trigger_attainment_rollup: pg_net call failed — %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- Attach trigger to grades table: fires after insert or update
CREATE TRIGGER on_grade_insert_or_update
  AFTER INSERT OR UPDATE ON public.grades
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_attainment_rollup();
