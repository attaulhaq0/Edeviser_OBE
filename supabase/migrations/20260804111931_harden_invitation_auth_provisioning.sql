-- Fail-closed Auth provisioning. Role and tenant are derived from a locked,
-- server-created invitation; raw_user_meta_data.role is never consulted.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  invitation_id uuid;
  invitation_row public.invitations%ROWTYPE;
  institution_row public.institutions%ROWTYPE;
  final_role public.user_role := 'student'::public.user_role;
  final_institution uuid;
  final_status text := 'active';
  requested_institution uuid;
  email_domain text;
BEGIN
  invitation_id := NULLIF(NEW.raw_user_meta_data ->> 'invitation_id', '')::uuid;

  IF invitation_id IS NOT NULL THEN
    SELECT * INTO invitation_row
    FROM public.invitations
    WHERE id = invitation_id
      AND status = 'pending'
      AND expires_at > now()
      AND revoked_at IS NULL
      AND lower(email::text) = lower(NEW.email)
    FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'valid server invitation required' USING ERRCODE = '42501';
    END IF;
    final_role := invitation_row.role;
    final_institution := invitation_row.institution_id;
  ELSE
    -- Self-registration is always a Student. The institution claim is only
    -- accepted after validating the institution's signup policy and domain.
    requested_institution := NULLIF(NEW.raw_user_meta_data ->> 'institution_id', '')::uuid;
    IF requested_institution IS NULL THEN
      RAISE EXCEPTION 'institution selection required' USING ERRCODE = '42501';
    END IF;
    SELECT * INTO institution_row FROM public.institutions WHERE id = requested_institution;
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
    final_status,
    NEW.email_confirmed_at,
    'system',
    COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'locale', ''), 'en'),
    now()
  )
  ON CONFLICT (id) DO NOTHING;

  IF invitation_id IS NOT NULL THEN
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
  'Fail-closed Auth provisioning. Invitation role and institution come from a server-created invitation; browser role claims are ignored.';

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, service_role;
