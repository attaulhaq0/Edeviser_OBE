-- ============================================================================
-- Add profiles.portfolio_sharing_permitted and protect it from self-grant.
--
-- Requirements 24.1 / 24.2 (student-experience-remediation, task 1.3):
--   * Public portfolio sharing for K-12 minors must be gated behind a
--     school/admin-granted permission flag.
--   * A non-admin user MUST NOT be able to self-grant that permission via a
--     profiles self-update.
--
-- This migration is SELF-CONTAINED and IDEMPOTENT: it (re)creates the
-- canonical prevent_profile_privilege_escalation() BEFORE UPDATE trigger so
-- the protection holds even on databases where 20260901000009 has not yet
-- been applied, and it coexists with the profiles_update_own RLS WITH CHECK
-- policy (the trigger resets privileged columns to OLD for non-admins; the
-- WITH CHECK then passes because NEW == OLD for those columns).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Add the permission column (defaults to false -> private/ungranted).
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS portfolio_sharing_permitted boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.portfolio_sharing_permitted
  IS 'School/admin-granted permission allowing this user to make their portfolio publicly shareable. Privileged: only an admin may change it (enforced by prevent_profile_privilege_escalation). portfolio_public is only effective when this is true.';

-- ----------------------------------------------------------------------------
-- 2. (Re)create the privileged-column preservation trigger function, extended
--    to treat portfolio_sharing_permitted as privileged.
--
--    SECURITY DEFINER so auth_user_role() evaluates under the function owner
--    and bypasses RLS recursion. search_path pinned.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role text;
BEGIN
  -- Trigger-initiated updates (e.g., from SECURITY DEFINER functions running
  -- without an end-user session) leave auth.uid() NULL. In that case we trust
  -- the caller (service_role / postgres path) and return unchanged.
  IF (SELECT auth.uid()) IS NULL THEN
    RETURN NEW;
  END IF;

  caller_role := public.auth_user_role();

  -- Admins may touch any column via profiles_admin_write; nothing to do.
  IF caller_role = 'admin' THEN
    RETURN NEW;
  END IF;

  -- Non-admin self-edit: reset privileged columns to their OLD values so the
  -- UPDATE effectively ignores changes to those fields. The set of
  -- non-privileged (self-editable) columns is the complement of this list:
  --   avatar_url, full_name, theme_preference, language_preference,
  --   tour_completed_at, preferred_language, onboarding_completed,
  --   portfolio_public, notification_preferences, last_seen_at,
  --   tos_accepted_at.
  NEW.id                := OLD.id;
  NEW.role              := OLD.role;
  NEW.institution_id    := OLD.institution_id;
  NEW.is_active         := OLD.is_active;
  NEW.email             := OLD.email;
  NEW.created_at        := OLD.created_at;

  -- status / email_verified_at only exist after 20260901000006. Guard the
  -- assignment so this migration can be applied in either order.
  IF to_jsonb(NEW) ? 'status' THEN
    NEW.status := OLD.status;
  END IF;
  IF to_jsonb(NEW) ? 'email_verified_at' THEN
    NEW.email_verified_at := OLD.email_verified_at;
  END IF;

  -- portfolio_sharing_permitted is school/admin-granted: a non-admin cannot
  -- self-grant it. Guarded for ordering safety, though this migration adds the
  -- column above so it is always present at runtime here.
  IF to_jsonb(NEW) ? 'portfolio_sharing_permitted' THEN
    NEW.portfolio_sharing_permitted := OLD.portfolio_sharing_permitted;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.prevent_profile_privilege_escalation()
  IS 'BEFORE UPDATE trigger on public.profiles. Resets privileged columns (role, institution_id, status, is_active, email, email_verified_at, created_at, id, portfolio_sharing_permitted) to their OLD values when the caller is not an admin so a self-edit via profiles_update_own cannot escalate privileges or self-grant public portfolio sharing. No-op for admins (profiles_admin_write handles their full-column writes).';

REVOKE ALL     ON FUNCTION public.prevent_profile_privilege_escalation() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.prevent_profile_privilege_escalation() FROM anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.prevent_profile_privilege_escalation() TO postgres, service_role;

-- ----------------------------------------------------------------------------
-- 3. (Re)attach the trigger.
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_prevent_profile_privilege_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_profile_privilege_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_privilege_escalation();
;
