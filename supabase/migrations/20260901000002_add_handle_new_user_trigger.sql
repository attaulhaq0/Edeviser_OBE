-- ============================================================================
-- 20260901000002_add_handle_new_user_trigger.sql
--
-- Adds the public.handle_new_user() trigger function + AFTER INSERT trigger on
-- auth.users. When a new auth user is created, a matching row is inserted into
-- public.profiles so the application always has a profile to join against.
--
-- Design: ui-consistency-global-fixes/design.md §5.2, ADR-03.
--
-- ADR-13 (join_mode validation) and ADR-14 (status + audit_logs for non-student
-- invites) are DEFERRED to the Task 6 migration (20260901000006), which runs
-- AFTER the institutions.join_mode / institutions.allowed_email_domains columns
-- and profiles.status column exist. Task 6 will CREATE OR REPLACE this
-- function with the full logic. This migration keeps handle_new_user() minimal
-- so it can be applied standalone without depending on downstream migrations.
--
-- Satisfies bugfix.md clauses 2.11, 2.12 (baseline — extended in Task 6).
--
-- Security:
--   • SECURITY DEFINER so the function bypasses RLS on profiles at signup time
--     (there is no authenticated session yet when the trigger fires).
--   • search_path pinned to public to prevent search_path hijacking.
--   • EXECUTE revoked from PUBLIC; granted only to postgres and service_role.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Function (minimal baseline — Task 6 extends with join_mode/status/audit).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta_full_name     text;
  meta_institution_id uuid;
BEGIN
  -- Pull optional signup metadata. raw_user_meta_data is JSONB and may be
  -- absent / partial, so we coalesce and NULLIF to normalize missing keys.
  meta_full_name      := COALESCE(NEW.raw_user_meta_data ->> 'full_name', '');
  meta_institution_id := NULLIF(NEW.raw_user_meta_data ->> 'institution_id', '')::uuid;

  -- Insert the matching profile row. ON CONFLICT DO NOTHING so re-triggers
  -- (e.g., Supabase re-issuing the event during replication) never fail.
  --
  -- Note: profiles.institution_id is currently NOT NULL (see
  -- 20260222065552_create_profiles_table.sql). Callers without a valid
  -- institution_id will therefore fail the insert — this is the correct
  -- behavior until Task 6 introduces join_mode-aware signup flows and (if
  -- required) relaxes the constraint for the 'open' self-signup path.
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    institution_id,
    theme_preference,
    tour_completed_at,
    created_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    meta_full_name,
    'student'::public.user_role,
    meta_institution_id,
    'system',
    NULL,
    now()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user()
  IS 'AFTER INSERT trigger on auth.users that creates a matching public.profiles row. '
     'SECURITY DEFINER. Minimal baseline — extended by 20260901000006 with '
     'join_mode validation (ADR-13), status assignment (ADR-14), and audit_logs '
     'entries for non-student invited roles.';

-- ----------------------------------------------------------------------------
-- 2. Security hardening: revoke from PUBLIC / anon / authenticated so the
--    function can only be invoked via the AFTER INSERT trigger on auth.users
--    (which runs under the owning role). This matches the project-wide pattern
--    established in 20260504032951_revoke_anon_execute_on_security_definer_functions.sql
--    and 20260504033048_revoke_public_execute_on_security_definer_functions.sql:
--    Supabase implicitly grants EXECUTE to anon + authenticated on every
--    public function, which must be explicitly revoked.
-- ----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, service_role;

-- ----------------------------------------------------------------------------
-- 3. Trigger. DROP IF EXISTS + CREATE for idempotency across re-runs.
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
