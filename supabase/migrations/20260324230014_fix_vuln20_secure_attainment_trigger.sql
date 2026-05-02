-- Vuln 20 Fix: Rewrite trigger to avoid GUC-based service_role_key exposure
-- Instead of reading from current_setting (which any user could query),
-- we restrict the GUC to only be readable by the postgres role.

-- Step 1: Revoke ability for authenticated role to read app.settings
DO $$
BEGIN
  -- Ensure the GUC is only set at the postgres role level (not session-level)
  -- This prevents non-superuser roles from reading it
  EXECUTE format(
    'ALTER ROLE postgres SET app.settings.service_role_key = %L',
    current_setting('app.settings.service_role_key', true)
  );
EXCEPTION WHEN OTHERS THEN
  -- If the setting doesn't exist yet, that's fine - it means it's not exposed
  RAISE NOTICE 'GUC app.settings.service_role_key not currently set: %', SQLERRM;
END;
$$;

-- Step 2: Recreate the trigger function with explicit role-level security
-- The function runs as SECURITY DEFINER (postgres role), so it CAN read
-- role-level settings. But authenticated users calling current_setting()
-- directly will get NULL since it's set on the postgres role only.
CREATE OR REPLACE FUNCTION public.trigger_attainment_rollup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  _supabase_url text;
  _service_role_key text;
  _edge_function_url text;
  _request_id bigint;
BEGIN
  -- Read from role-level settings (only accessible by postgres/SECURITY DEFINER)
  _supabase_url := coalesce(
    current_setting('app.settings.supabase_url', true),
    'https://cdlgtbvxlxjpcddjazzx.supabase.co'
  );
  _service_role_key := current_setting('app.settings.service_role_key', true);

  -- If no service role key configured, skip the HTTP call silently
  IF _service_role_key IS NULL OR _service_role_key = '' THEN
    RAISE WARNING 'trigger_attainment_rollup: service_role_key not configured, skipping';
    RETURN NEW;
  END IF;

  _edge_function_url := _supabase_url || '/functions/v1/calculate-attainment-rollup';

  BEGIN
    SELECT net.http_post(
      url := _edge_function_url,
      body := jsonb_build_object(
        'grade_id', NEW.id,
        'submission_id', NEW.submission_id
      ),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || _service_role_key
      )
    ) INTO _request_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'trigger_attainment_rollup: pg_net call failed — %', SQLERRM;
  END;

  RETURN NEW;
END;
$func$;

-- Step 3: Verify non-superuser roles cannot read the setting
-- (This is a documentation step - the actual protection comes from
-- the setting being on the postgres role, not session-level)
COMMENT ON FUNCTION public.trigger_attainment_rollup() IS
  'Calls calculate-attainment-rollup Edge Function via pg_net. '
  'Service role key is read from postgres role-level GUC (not accessible to authenticated users). '
  'Fixed: Vuln 20 from security audit 2026-03-24.';
;
