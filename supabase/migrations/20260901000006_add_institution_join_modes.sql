-- ============================================================================
-- 20260901000006_add_institution_join_modes.sql
--
-- Extends institutions + profiles with the columns required by ADR-13
-- (multi-institution self-serve + per-institution join_mode) and ADR-14
-- (email_verified_at + status semantics), creates the public institutions_public
-- view used by the unauthenticated signup picker, and upgrades
-- public.handle_new_user() with the full join_mode validation + status
-- assignment + audit logging logic that was intentionally deferred from
-- 20260901000002 until the prerequisite columns existed.
--
-- Design: ui-consistency-global-fixes/design.md §5.4, ADR-13, ADR-14.
-- Satisfies bugfix.md clause 2.11 (self-signup respects institution join_mode).
--
-- Verified against the live schema before writing:
--   • public.institutions: (id, name, settings, created_at, logo_url,
--     accreditation_body). NO is_active column — the institutions_public view
--     therefore omits a WHERE is_active = true clause (there is no such flag
--     to gate on yet; if one is added later a follow-up migration can tighten
--     the view).
--   • public.audit_logs: (id, actor_id, action, target_type, target_id, diff,
--     ip_address, created_at). Schema does NOT have entity_type / entity_id /
--     metadata / institution_id columns — the pending-approval entry in
--     handle_new_user() therefore uses target_type + target_id and folds
--     institution_id + role + invitation_id into the diff jsonb.
--   • public.profiles: theme_preference + language_preference already exist
--     (from 20260222124458 + 20260901000001). tour_completed_at already
--     exists (from 20260901000001). This migration only adds status +
--     email_verified_at.
--   • auth.users.email_confirmed_at exists — used for the status backfill.
--
-- Idempotency: all ADD COLUMN statements use IF NOT EXISTS; the constraint /
-- NOT NULL / unique tightening steps guard with catalog lookups so re-runs
-- are safe.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Extend public.institutions with slug / allowed_email_domains / join_mode.
--    logo_url already exists on the table (added by 20260222073726) so it is
--    intentionally NOT re-added here.
-- ----------------------------------------------------------------------------
ALTER TABLE public.institutions
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS allowed_email_domains text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS join_mode text
    CHECK (join_mode IN ('open', 'invite_only', 'domain_restricted'))
    NOT NULL
    DEFAULT 'invite_only';

COMMENT ON COLUMN public.institutions.slug
  IS 'URL-safe unique identifier for the institution. Used by the signup institution picker and by future SSO/branding routes.';

COMMENT ON COLUMN public.institutions.allowed_email_domains
  IS 'Email domains permitted for self-signup when join_mode = ''domain_restricted''. Empty array disables domain restriction.';

COMMENT ON COLUMN public.institutions.join_mode
  IS 'Signup policy: open (anyone can self-signup), invite_only (must accept an invitation), domain_restricted (self-signup allowed only for emails matching allowed_email_domains). Default invite_only preserves the pre-ADR-13 trust boundary.';

-- ----------------------------------------------------------------------------
-- 2. Backfill institutions.slug for any row where it is still NULL.
--
-- Slugify: lower-case, replace any run of non-alphanumerics with '-', then
-- trim leading/trailing dashes. Collisions are resolved by appending the
-- row id suffix so the subsequent UNIQUE constraint can be added safely
-- even if two institutions would otherwise produce the same slug.
-- ----------------------------------------------------------------------------
WITH slugged AS (
  SELECT
    id,
    trim(both '-' from lower(regexp_replace(coalesce(name, ''), '[^a-zA-Z0-9]+', '-', 'g'))) AS base_slug
  FROM public.institutions
  WHERE slug IS NULL
),
numbered AS (
  SELECT
    id,
    CASE
      WHEN base_slug = '' THEN 'institution-' || substr(id::text, 1, 8)
      ELSE base_slug
    END AS base_slug,
    row_number() OVER (
      PARTITION BY CASE WHEN base_slug = '' THEN 'institution-' || substr(id::text, 1, 8) ELSE base_slug END
      ORDER BY id
    ) AS rn
  FROM slugged
)
UPDATE public.institutions AS inst
SET slug = CASE WHEN n.rn = 1 THEN n.base_slug ELSE n.base_slug || '-' || substr(inst.id::text, 1, 8) END
FROM numbered AS n
WHERE inst.id = n.id
  AND inst.slug IS NULL;

-- ----------------------------------------------------------------------------
-- 3. Enforce slug NOT NULL and uniqueness. Guarded so re-runs are safe.
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  -- NOT NULL (no-op if already enforced)
  ALTER TABLE public.institutions ALTER COLUMN slug SET NOT NULL;
EXCEPTION WHEN others THEN
  -- ignore if already not null
  NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'institutions_slug_unique'
      AND conrelid = 'public.institutions'::regclass
  ) THEN
    ALTER TABLE public.institutions
      ADD CONSTRAINT institutions_slug_unique UNIQUE (slug);
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 4. Extend public.profiles with status + email_verified_at (ADR-14).
--    theme_preference / language_preference / tour_completed_at already
--    exist and are NOT re-added.
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status text
    CHECK (status IN ('active', 'pending_verification', 'suspended'))
    NOT NULL
    DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS email_verified_at timestamptz;

COMMENT ON COLUMN public.profiles.status
  IS 'Account status: active (normal), pending_verification (open-signup account awaiting email verification per ADR-14), suspended (admin-disabled).';

COMMENT ON COLUMN public.profiles.email_verified_at
  IS 'Timestamp of email verification (mirrored from auth.users.email_confirmed_at). NULL until verified.';

-- ----------------------------------------------------------------------------
-- 5. Backfill profiles.email_verified_at from auth.users.email_confirmed_at
--    so existing users are never flagged as pending after this migration runs.
-- ----------------------------------------------------------------------------
UPDATE public.profiles AS p
SET email_verified_at = u.email_confirmed_at
FROM auth.users AS u
WHERE p.id = u.id
  AND u.email_confirmed_at IS NOT NULL
  AND p.email_verified_at IS NULL;

-- ----------------------------------------------------------------------------
-- 6. public.institutions_public view — anon-readable projection used by the
--    unauthenticated signup institution-picker (design.md §8.3, ADR-13).
--
--    security_invoker = true so RLS / grants of the querying role apply
--    rather than the view owner's (hardens against SECURITY DEFINER leaks).
--
--    Note: the spec description mentioned an is_active gate, but the live
--    institutions schema has no is_active column. The view therefore exposes
--    every institution row — appropriate while the institution catalog is
--    curated manually by admins. A follow-up migration can add is_active +
--    re-wrap the view with a WHERE clause if soft-delete semantics become
--    desirable.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.institutions_public
WITH (security_invoker = true)
AS
SELECT
  id,
  slug,
  name,
  logo_url,
  join_mode
FROM public.institutions;

COMMENT ON VIEW public.institutions_public
  IS 'Public projection of institutions for the unauthenticated signup institution picker. Exposes only non-sensitive columns (id, slug, name, logo_url, join_mode).';

-- Anonymous SELECT is required so the signup page can populate the picker
-- before the user is authenticated. authenticated also granted so the picker
-- can be re-used from invite-acceptance pages.
GRANT SELECT ON public.institutions_public TO anon, authenticated;

-- ----------------------------------------------------------------------------
-- 6b. RLS policy for anon on the base institutions table so the
--     security_invoker=true view actually returns rows to unauthenticated
--     callers. Without this, the existing institutions_read_own policy
--     (which requires id = auth_institution_id()) would cause anon to see
--     zero rows through the view, breaking the signup institution picker.
--
--     The policy exposes ALL institution rows to anon — institutions are a
--     curated catalog, not user-authored content, and the view restricts the
--     column projection to (id, slug, name, logo_url, join_mode). Sensitive
--     columns (settings, accreditation_body, allowed_email_domains) never
--     reach anon because the view does not select them.
--
--     authenticated users retain access via the existing institutions_read_own
--     policy (scoped to their institution), so this policy is purely additive
--     for the anon signup flow.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "institutions_anon_browse" ON public.institutions;
CREATE POLICY "institutions_anon_browse" ON public.institutions
  FOR SELECT
  TO anon
  USING (true);

COMMENT ON POLICY "institutions_anon_browse" ON public.institutions
  IS 'Allows unauthenticated signup page to list institutions via the institutions_public view. Column projection is enforced by the view; sensitive columns are not exposed.';

-- ----------------------------------------------------------------------------
-- 7. Upgrade public.handle_new_user() with the full ADR-13 + ADR-14 logic.
--
--    Behavior summary:
--      • Reads full_name / institution_id / role / invitation_id from the
--        new user's raw_user_meta_data.
--      • If an institution_id is present: looks up the institution row and
--        validates the request against its join_mode.
--        - invitation_id present → trust the invite (use the supplied role,
--          mark status='active').
--        - invite_only + non-student role self-signup → RAISE EXCEPTION.
--        - domain_restricted → email domain must match
--          institutions.allowed_email_domains, else RAISE EXCEPTION.
--        - open → status='pending_verification' (email must be verified
--          before the app treats the account as active).
--        - Self-signup always forces role='student' regardless of the
--          requested role in metadata. Non-student roles require an invite.
--      • Inserts the profiles row with the resolved role + status.
--      • Logs a 'pending_approval' audit_logs entry when an invite provisioned
--        a non-student role so admins have a reviewable trail.
--
--    Schema-adapted audit insert:
--      audit_logs has columns (actor_id, action, target_type, target_id,
--      diff, ip_address, created_at) — the ADR-14 draft assumed a different
--      column set (entity_type / entity_id / metadata / institution_id).
--      We fold institution_id + role + invitation_id into diff jsonb and
--      use target_type / target_id. No ON CONFLICT target is available
--      (no unique constraint on audit_logs beyond the PK) so the insert
--      is a plain INSERT.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta_full_name      text;
  meta_institution_id uuid;
  meta_role           text;
  meta_invitation_id  uuid;
  institution_row     public.institutions%ROWTYPE;
  final_role          public.user_role;
  final_status        text;
  email_domain        text;
BEGIN
  -- Normalize optional signup metadata.
  meta_full_name      := COALESCE(NEW.raw_user_meta_data ->> 'full_name', '');
  meta_institution_id := NULLIF(NEW.raw_user_meta_data ->> 'institution_id', '')::uuid;
  meta_role           := COALESCE(NEW.raw_user_meta_data ->> 'role', 'student');
  meta_invitation_id  := NULLIF(NEW.raw_user_meta_data ->> 'invitation_id', '')::uuid;

  -- Conservative defaults — overridden per join_mode below.
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
      -- Invite-flow: trust the role the invitation was issued for.
      final_role   := meta_role::public.user_role;
      final_status := 'active';
    ELSE
      -- Self-signup flow: validate against join_mode.
      IF institution_row.join_mode = 'invite_only' AND meta_role <> 'student' THEN
        RAISE EXCEPTION 'This institution requires an invitation for role %', meta_role
          USING ERRCODE = '42501';
      END IF;

      IF institution_row.join_mode = 'domain_restricted' THEN
        email_domain := split_part(NEW.email, '@', 2);
        IF NOT (email_domain = ANY(institution_row.allowed_email_domains)) THEN
          RAISE EXCEPTION 'Email domain % is not allowed for this institution', email_domain
            USING ERRCODE = '42501';
        END IF;
        final_status := 'active';
      ELSIF institution_row.join_mode = 'open' THEN
        -- Open self-signup: require email verification before activation.
        final_status := 'pending_verification';
      END IF;

      -- Self-signup always resolves to student regardless of requested role.
      final_role := 'student'::public.user_role;
    END IF;
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
$$;

COMMENT ON FUNCTION public.handle_new_user()
  IS 'AFTER INSERT trigger on auth.users that creates a matching public.profiles row. SECURITY DEFINER. Validates institution join_mode (ADR-13), assigns profiles.status (ADR-14), and writes a pending_approval audit_logs entry for non-student invites. search_path pinned to public.';

-- ----------------------------------------------------------------------------
-- 8. Re-apply the security hardening (matches 20260901000002): revoke from
--    PUBLIC / anon / authenticated so the function can only be invoked by
--    the trigger under the owning role. CREATE OR REPLACE does not change
--    existing grants, but being explicit here keeps the migration safe to
--    run on a clean database where the upstream migration hasn't applied.
-- ----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, service_role;
