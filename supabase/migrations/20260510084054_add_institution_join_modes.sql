-- ============================================================================
-- 20260901000006_add_institution_join_modes.sql
-- Design: ui-consistency-global-fixes/design.md ADR-13, ADR-14.
-- Satisfies bugfix.md clause 2.11.
-- ============================================================================

-- 1. Extend institutions.
ALTER TABLE public.institutions
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS allowed_email_domains text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS join_mode text
    CHECK (join_mode IN ('open', 'invite_only', 'domain_restricted'))
    NOT NULL
    DEFAULT 'invite_only';

COMMENT ON COLUMN public.institutions.slug
  IS 'URL-safe unique identifier for the institution.';
COMMENT ON COLUMN public.institutions.allowed_email_domains
  IS 'Email domains permitted for self-signup when join_mode = domain_restricted.';
COMMENT ON COLUMN public.institutions.join_mode
  IS 'Signup policy: open / invite_only / domain_restricted. Default invite_only preserves the pre-ADR-13 trust boundary.';

-- 2. Backfill slug.
WITH slugged AS (
  SELECT id,
         trim(both '-' from lower(regexp_replace(coalesce(name, ''), '[^a-zA-Z0-9]+', '-', 'g'))) AS base_slug
  FROM public.institutions
  WHERE slug IS NULL
),
numbered AS (
  SELECT id,
         CASE WHEN base_slug = '' THEN 'institution-' || substr(id::text, 1, 8) ELSE base_slug END AS base_slug,
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

-- 3. Enforce slug NOT NULL + uniqueness (guarded).
DO $$
BEGIN
  ALTER TABLE public.institutions ALTER COLUMN slug SET NOT NULL;
EXCEPTION WHEN others THEN
  NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'institutions_slug_unique'
      AND conrelid = 'public.institutions'::regclass
  ) THEN
    ALTER TABLE public.institutions
      ADD CONSTRAINT institutions_slug_unique UNIQUE (slug);
  END IF;
END $$;

-- 4. Extend profiles with status + email_verified_at.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status text
    CHECK (status IN ('active', 'pending_verification', 'suspended'))
    NOT NULL
    DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS email_verified_at timestamptz;

COMMENT ON COLUMN public.profiles.status
  IS 'Account status: active, pending_verification (ADR-14), or suspended.';
COMMENT ON COLUMN public.profiles.email_verified_at
  IS 'Mirrored from auth.users.email_confirmed_at.';

-- 5. Backfill email_verified_at from auth.users.
UPDATE public.profiles AS p
SET email_verified_at = u.email_confirmed_at
FROM auth.users AS u
WHERE p.id = u.id
  AND u.email_confirmed_at IS NOT NULL
  AND p.email_verified_at IS NULL;

-- 6. Public view for the signup institution picker (anon-readable).
-- institutions has no is_active column in the current schema; the view
-- therefore exposes every institution row.
CREATE OR REPLACE VIEW public.institutions_public
WITH (security_invoker = true)
AS
SELECT id, slug, name, logo_url, join_mode
FROM public.institutions;

COMMENT ON VIEW public.institutions_public
  IS 'Public projection of institutions for the unauthenticated signup picker.';

GRANT SELECT ON public.institutions_public TO anon, authenticated;

-- 7. Upgrade handle_new_user with full ADR-13 + ADR-14 logic.
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
      final_role   := meta_role::public.user_role;
      final_status := 'active';
    ELSE
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
        final_status := 'pending_verification';
      END IF;

      final_role := 'student'::public.user_role;
    END IF;
  END IF;

  INSERT INTO public.profiles (
    id, email, full_name, role, institution_id, status,
    theme_preference, language_preference, tour_completed_at, created_at
  )
  VALUES (
    NEW.id, NEW.email, meta_full_name, final_role, meta_institution_id, final_status,
    'system', 'en', NULL, now()
  )
  ON CONFLICT (id) DO NOTHING;

  IF final_role <> 'student'::public.user_role AND meta_invitation_id IS NOT NULL THEN
    INSERT INTO public.audit_logs (
      actor_id, action, target_type, target_id, diff
    )
    VALUES (
      NEW.id, 'pending_approval', 'profile', NEW.id,
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
  IS 'AFTER INSERT trigger on auth.users. SECURITY DEFINER. Validates join_mode (ADR-13), assigns profiles.status (ADR-14), writes pending_approval audit entry for non-student invites.';

-- 8. Re-apply security hardening (idempotent).
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, service_role;
;
