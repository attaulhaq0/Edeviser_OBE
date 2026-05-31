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

-- 1. Function (minimal baseline — Task 6 extends with join_mode/status/audit).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta_full_name      text;
  meta_institution_id uuid;
BEGIN
  meta_full_name      := COALESCE(NEW.raw_user_meta_data ->> 'full_name', '');
  meta_institution_id := NULLIF(NEW.raw_user_meta_data ->> 'institution_id', '')::uuid;

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
  IS 'AFTER INSERT trigger on auth.users that creates a matching public.profiles row. SECURITY DEFINER. Minimal baseline — extended by 20260901000006 with join_mode validation (ADR-13), status assignment (ADR-14), and audit_logs entries for non-student invited roles.';

-- 2. Security hardening.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, service_role;

-- 3. Trigger — DROP IF EXISTS + CREATE for idempotency.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
;
