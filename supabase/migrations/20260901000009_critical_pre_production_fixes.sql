-- ============================================================================
-- 20260901000009_critical_pre_production_fixes.sql
--
-- Pre-production hardening bundle. Addresses four live blockers identified
-- during the deployment audit (2026-05-10):
--
--   1. profiles.institution_id NOT NULL blocks open self-signup.
--      The current trigger tries to insert NULL when the user did not pick
--      an institution, which aborts signup. We relax the constraint to
--      NULLABLE and add a CHECK so only status='pending_verification' rows
--      may be missing it. Active / suspended users still require one, so
--      all downstream RLS scoping (auth_institution_id()) stays sound.
--
--   2. profiles_update_own policy was column-blind — a user could update
--      their own role, institution_id, status, etc. and self-escalate.
--      We keep the policy (so self-edits of allowed columns succeed) and
--      add a BEFORE UPDATE trigger that resets privileged columns back to
--      their OLD values whenever the caller is not an admin.
--
--   3. handle_new_user() join_mode domain check was case-sensitive, so
--      "User@Example.com" failed when allowed_email_domains contained
--      "example.com". We lower() both sides now.
--
--   4. handle_new_user() trusted metadata.invitation_id without verifying
--      that the invitation existed, was unredeemed, was issued to the
--      same (institution, email, role), and was still within its expiry
--      window. A forged invitation_id could mint a teacher / admin account.
--      We now validate the row and raise an exception if it does not match.
--
-- All steps are idempotent (DROP IF EXISTS / guarded DO blocks / CREATE OR
-- REPLACE). Safe to re-run.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Relax profiles.institution_id NOT NULL — enforce only for non-pending
--    accounts via a CHECK constraint.
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'institution_id'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.profiles ALTER COLUMN institution_id DROP NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_institution_required_when_active'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_institution_required_when_active
      CHECK (
        status = 'pending_verification'
        OR institution_id IS NOT NULL
      );
  END IF;
END $$;

COMMENT ON CONSTRAINT profiles_institution_required_when_active ON public.profiles
  IS 'Active / suspended accounts must be scoped to an institution. Only pending_verification accounts (open self-signup awaiting email verification) may have NULL institution_id.';

-- ----------------------------------------------------------------------------
-- 2. Column-level hardening for profiles_update_own.
--
--    The policy itself stays scoped to id = auth.uid() (necessary so the
--    user can update avatar_url, tour_completed_at, theme_preference,
--    language_preference, onboarding_completed, portfolio_public,
--    notification_preferences, full_name). The trigger below preserves
--    privileged columns from OLD whenever the caller is not an admin so a
--    legitimate self-update of allowed columns succeeds but any attempt to
--    change role / institution_id / status / is_active / email /
--    email_verified_at / created_at / id is silently neutralized.
--
--    SECURITY DEFINER so the auth_user_role() call is evaluated under the
--    function owner and bypasses RLS recursion. search_path pinned.
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
  -- without an end-user session) leave auth.uid() NULL. In that case we
  -- trust the caller (service_role / postgres path) and return unchanged.
  IF (SELECT auth.uid()) IS NULL THEN
    RETURN NEW;
  END IF;

  caller_role := public.auth_user_role();

  -- Admins may touch any column via profiles_admin_write; nothing to do.
  IF caller_role = 'admin' THEN
    RETURN NEW;
  END IF;

  -- Non-admin self-edit: reset privileged columns to their OLD values so
  -- the UPDATE effectively ignores changes to those fields. The set of
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

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.prevent_profile_privilege_escalation()
  IS 'BEFORE UPDATE trigger on public.profiles. Resets privileged columns (role, institution_id, status, is_active, email, email_verified_at, created_at, id) to their OLD values when the caller is not an admin so a self-edit via profiles_update_own cannot escalate privileges. No-op for admins (profiles_admin_write handles their full-column writes).';

REVOKE ALL     ON FUNCTION public.prevent_profile_privilege_escalation() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.prevent_profile_privilege_escalation() FROM anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.prevent_profile_privilege_escalation() TO postgres, service_role;

DROP TRIGGER IF EXISTS trg_prevent_profile_privilege_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_profile_privilege_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

-- ----------------------------------------------------------------------------
-- 3 + 4. Upgraded handle_new_user() — case-insensitive domain check +
--        invitation_id validation.
--
--    Diff vs 20260901000006:
--      • email_domain := lower(split_part(NEW.email, '@', 2));
--        allowed_email_domains compared via lower() on each element.
--      • When meta_invitation_id IS NOT NULL: look up the row in
--        public.invitations and enforce (token not needed at this layer,
--        we trust the id because the accept flow already validated the
--        token via consume_invitation()):
--          - must exist
--          - must not be consumed (used_at IS NULL)  [redundant with
--            consume_invitation() but defensive if the write order ever
--            changes]
--          - must not be expired (expires_at > now())
--          - institution_id must match meta_institution_id
--          - email (citext) must match lower(NEW.email)
--          - role must match meta_role
--        A mismatch raises ERRCODE 42501 (insufficient_privilege).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  meta_full_name      text;
  meta_institution_id uuid;
  meta_role           text;
  meta_invitation_id  uuid;
  institution_row     public.institutions%ROWTYPE;
  invitation_row      public.invitations%ROWTYPE;
  final_role          public.user_role;
  final_status        text;
  email_domain        text;
  allowed_domain      text;
  domain_matches      boolean;
BEGIN
  -- Normalize optional signup metadata.
  meta_full_name      := COALESCE(NEW.raw_user_meta_data ->> 'full_name', '');
  meta_institution_id := NULLIF(NEW.raw_user_meta_data ->> 'institution_id', '')::uuid;
  meta_role           := COALESCE(NEW.raw_user_meta_data ->> 'role', 'student');
  meta_invitation_id  := NULLIF(NEW.raw_user_meta_data ->> 'invitation_id', '')::uuid;

  final_role   := 'student'::public.user_role;
  final_status := 'active';

  IF meta_institution_id IS NOT NULL THEN
    SELECT * INTO institution_row
    FROM public.institutions
    WHERE id = meta_institution_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invalid institution_id: %', meta_institution_id
        USING ERRCODE = '23503';
    END IF;

    IF meta_invitation_id IS NOT NULL THEN
      -- Invite flow: verify the invitation actually backs this request.
      SELECT * INTO invitation_row
      FROM public.invitations
      WHERE id = meta_invitation_id;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid invitation_id: %', meta_invitation_id
          USING ERRCODE = '42501';
      END IF;

      IF invitation_row.used_at IS NOT NULL THEN
        RAISE EXCEPTION 'Invitation has already been used'
          USING ERRCODE = '42501';
      END IF;

      IF invitation_row.expires_at <= now() THEN
        RAISE EXCEPTION 'Invitation has expired'
          USING ERRCODE = '42501';
      END IF;

      IF invitation_row.institution_id <> meta_institution_id THEN
        RAISE EXCEPTION 'Invitation institution mismatch'
          USING ERRCODE = '42501';
      END IF;

      -- invitations.email is citext so comparison against the raw auth email
      -- is already case-insensitive when we cast to citext.
      IF invitation_row.email <> NEW.email::citext THEN
        RAISE EXCEPTION 'Invitation email mismatch'
          USING ERRCODE = '42501';
      END IF;

      IF invitation_row.role::text <> meta_role THEN
        RAISE EXCEPTION 'Invitation role mismatch'
          USING ERRCODE = '42501';
      END IF;

      final_role   := invitation_row.role;
      final_status := 'active';
    ELSE
      -- Self-signup flow: validate against join_mode.
      IF institution_row.join_mode = 'invite_only' AND meta_role <> 'student' THEN
        RAISE EXCEPTION 'This institution requires an invitation for role %', meta_role
          USING ERRCODE = '42501';
      END IF;

      IF institution_row.join_mode = 'domain_restricted' THEN
        -- Case-insensitive domain comparison: lowercase the email domain
        -- and every entry in allowed_email_domains before testing.
        email_domain := lower(split_part(NEW.email, '@', 2));

        domain_matches := false;
        IF institution_row.allowed_email_domains IS NOT NULL THEN
          FOREACH allowed_domain IN ARRAY institution_row.allowed_email_domains LOOP
            IF lower(allowed_domain) = email_domain THEN
              domain_matches := true;
              EXIT;
            END IF;
          END LOOP;
        END IF;

        IF NOT domain_matches THEN
          RAISE EXCEPTION 'Email domain % is not allowed for this institution', email_domain
            USING ERRCODE = '42501';
        END IF;
        final_status := 'active';
      ELSIF institution_row.join_mode = 'open' THEN
        final_status := 'pending_verification';
      END IF;

      -- Self-signup always resolves to student regardless of requested role.
      final_role := 'student'::public.user_role;
    END IF;
  ELSE
    -- No institution_id supplied. Signup still succeeds so the email can be
    -- verified; the account sits in pending_verification and the profiles
    -- CHECK constraint (profiles_institution_required_when_active) allows
    -- the NULL institution_id only because status = 'pending_verification'.
    final_status := 'pending_verification';
  END IF;

  -- Insert the matching profile row. ON CONFLICT DO NOTHING so replayed
  -- trigger events never fail.
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    institution_id,
    status,
    theme_preference,
    language_preference,
    tour_completed_at,
    created_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    meta_full_name,
    final_role,
    meta_institution_id,
    final_status,
    'system',
    'en',
    NULL,
    now()
  )
  ON CONFLICT (id) DO NOTHING;

  -- Non-student invite-flow accounts get a pending_approval audit trail
  -- so admins can review and suspend if the invitation was misused.
  IF final_role <> 'student'::public.user_role AND meta_invitation_id IS NOT NULL THEN
    INSERT INTO public.audit_logs (
      actor_id,
      action,
      target_type,
      target_id,
      diff
    )
    VALUES (
      NEW.id,
      'pending_approval',
      'profile',
      NEW.id,
      jsonb_build_object(
        'role', final_role::text,
        'invitation_id', meta_invitation_id,
        'institution_id', meta_institution_id
      )
    );
  END IF;

  RETURN NEW;
END;
$func$;

COMMENT ON FUNCTION public.handle_new_user()
  IS 'AFTER INSERT trigger on auth.users. Creates a matching public.profiles row. Case-insensitive domain match for join_mode=domain_restricted. Validates invitation_id against public.invitations when present. search_path pinned.';

REVOKE ALL     ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.handle_new_user() TO postgres, service_role;
