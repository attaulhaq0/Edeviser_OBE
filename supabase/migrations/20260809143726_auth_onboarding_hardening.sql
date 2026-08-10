-- Product-wide auth onboarding hardening.
-- Public user metadata is input only; authorization remains in profiles/RLS.

ALTER TABLE public.institutions
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

CREATE OR REPLACE VIEW public.institutions_public
WITH (security_invoker = true)
AS
SELECT id, slug, name, logo_url, join_mode
FROM public.institutions
WHERE is_active = true;

CREATE TABLE IF NOT EXISTS public.admin_bootstrap_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  email citext NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_bootstrap_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_bootstrap_requests FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  invitation_id uuid;
  bootstrap_request_id uuid;
  invitation_text text := NULLIF(trim(NEW.raw_user_meta_data ->> 'invitation_id'), '');
  bootstrap_text text := NULLIF(trim(NEW.raw_user_meta_data ->> 'bootstrap_request_id'), '');
  institution_text text := NULLIF(trim(NEW.raw_user_meta_data ->> 'institution_id'), '');
  requested_institution uuid;
  invitation_row public.invitations%ROWTYPE;
  institution_row public.institutions%ROWTYPE;
  final_role public.user_role := 'student'::public.user_role;
  final_institution uuid;
  email_domain text;
BEGIN
  -- Turn malformed client input into a safe policy error instead of leaking a
  -- PostgreSQL cast error to Auth.
  IF invitation_text IS NOT NULL AND invitation_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
    RAISE EXCEPTION 'invitation is invalid' USING ERRCODE = '42501';
  END IF;
  IF institution_text IS NOT NULL AND institution_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
    RAISE EXCEPTION 'institution selection is invalid' USING ERRCODE = '42501';
  END IF;
  IF bootstrap_text IS NOT NULL AND bootstrap_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
    RAISE EXCEPTION 'bootstrap request is invalid' USING ERRCODE = '42501';
  END IF;

  IF bootstrap_text IS NOT NULL THEN
    bootstrap_request_id := bootstrap_text::uuid;
    SELECT institution_id INTO final_institution
    FROM public.admin_bootstrap_requests
    WHERE id = bootstrap_request_id
      AND lower(email::text) = lower(NEW.email)
      AND consumed_at IS NULL
      AND expires_at > now()
    FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'valid bootstrap request required' USING ERRCODE = '42501';
    END IF;
    final_role := 'admin'::public.user_role;
  ELSIF invitation_text IS NOT NULL THEN
    invitation_id := invitation_text::uuid;
    SELECT * INTO invitation_row
    FROM public.invitations
    WHERE id = invitation_id
      AND status = 'pending'
      AND expires_at > now()
      AND revoked_at IS NULL
      AND lower(email::text) = lower(NEW.email)
    FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'valid invitation required' USING ERRCODE = '42501';
    END IF;
    final_role := invitation_row.role;
    final_institution := invitation_row.institution_id;
  ELSE
    IF institution_text IS NULL THEN
      RAISE EXCEPTION 'institution selection required' USING ERRCODE = '42501';
    END IF;
    requested_institution := institution_text::uuid;
    SELECT * INTO institution_row
    FROM public.institutions
    WHERE id = requested_institution;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'institution not found' USING ERRCODE = '23503';
    END IF;
    IF institution_row.join_mode = 'invite_only' THEN
      RAISE EXCEPTION 'student invitation required for this institution' USING ERRCODE = '42501';
    END IF;
    IF institution_row.join_mode = 'domain_restricted' THEN
      email_domain := lower(split_part(NEW.email, '@', 2));
      IF NOT (email_domain = ANY(institution_row.allowed_email_domains)) THEN
        RAISE EXCEPTION 'email domain is not allowed for this institution' USING ERRCODE = '42501';
      END IF;
    END IF;
    final_institution := requested_institution;
  END IF;

  INSERT INTO public.profiles (
    id, email, full_name, role, institution_id, status,
    email_verified_at, theme_preference, language_preference, created_at
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NULLIF(trim(NEW.raw_user_meta_data ->> 'full_name'), ''), 'Edeviser user'),
    final_role,
    final_institution,
    CASE WHEN NEW.email_confirmed_at IS NULL THEN 'pending_verification' ELSE 'active' END,
    NEW.email_confirmed_at,
    'system',
    COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'locale', ''), 'en'),
    now()
  ) ON CONFLICT (id) DO NOTHING;

  IF bootstrap_request_id IS NOT NULL THEN
    UPDATE public.admin_bootstrap_requests
    SET consumed_at = now()
    WHERE id = bootstrap_request_id AND consumed_at IS NULL;
  ELSIF invitation_id IS NOT NULL THEN
    INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, diff)
    VALUES (
      NEW.id, 'invitation_profile_provisioned', 'profile', NEW.id,
      jsonb_build_object('invitation_id', invitation_id, 'role', final_role::text, 'institution_id', final_institution)
    );
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS
  'Fail-closed provisioning: public signup is Student-only and requires a validated institution policy; invitation role and institution come from a pending server invitation.';

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, service_role;
