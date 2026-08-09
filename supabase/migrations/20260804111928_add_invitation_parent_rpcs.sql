-- Internal invitation and Parent-link RPC contract.
-- All mutating functions derive tenant scope from profiles and are callable
-- only by service_role (or postgres). Public preview exposes masked metadata.

CREATE OR REPLACE FUNCTION public.create_invitation(
  p_actor_id uuid,
  p_email citext,
  p_role text,
  p_token_hash text,
  p_idempotency_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor public.profiles%ROWTYPE;
  existing public.invitations%ROWTYPE;
  created public.invitations%ROWTYPE;
  institution_name text;
BEGIN
  SELECT * INTO actor
  FROM public.profiles
  WHERE id = p_actor_id AND is_active = true AND role = 'admin'::public.user_role;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'admin actor required' USING ERRCODE = '42501';
  END IF;
  IF p_role IS NULL OR p_role NOT IN ('coordinator', 'teacher', 'student', 'parent') THEN
    RAISE EXCEPTION 'unsupported invitation role' USING ERRCODE = '22023';
  END IF;
  IF p_email IS NULL OR length(trim(p_email::text)) = 0 OR length(p_token_hash) <> 64 THEN
    RAISE EXCEPTION 'invalid invitation input' USING ERRCODE = '22023';
  END IF;

  SELECT i.* INTO existing
  FROM public.invitations i
  WHERE i.institution_id = actor.institution_id
    AND i.idempotency_key = p_idempotency_key
  FOR UPDATE;
  IF FOUND THEN
    SELECT name INTO institution_name FROM public.institutions WHERE id = existing.institution_id;
    RETURN jsonb_build_object(
      'invitation_id', existing.id,
      'institution_id', existing.institution_id,
      'institution_name', institution_name,
      'recipient_email', existing.email,
      'status', existing.status,
      'idempotent', true
    );
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.invitations i
    WHERE i.institution_id = actor.institution_id
      AND i.email = lower(p_email::text)::public.citext
      AND i.status = 'pending'
      AND i.expires_at > now()
  ) THEN
    RAISE EXCEPTION 'duplicate pending invitation' USING ERRCODE = '23505';
  END IF;

  INSERT INTO public.invitations (
    institution_id, email, role, token_hash, token, status,
    idempotency_key, created_by, expires_at
  )
  VALUES (
    actor.institution_id, lower(p_email::text)::public.citext, p_role::public.user_role,
    lower(p_token_hash), NULL, 'pending', p_idempotency_key, p_actor_id,
    now() + interval '7 days'
  )
  RETURNING * INTO created;

  SELECT name INTO institution_name FROM public.institutions WHERE id = created.institution_id;
  RETURN jsonb_build_object(
    'invitation_id', created.id,
    'institution_id', created.institution_id,
    'institution_name', institution_name,
    'recipient_email', created.email,
    'status', created.status,
    'idempotent', false
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.preview_invitation(p_token_hash text)
RETURNS TABLE (
  institution_name text,
  invited_email citext,
  role public.user_role,
  expires_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT inst.name, i.email, i.role, i.expires_at
  FROM public.invitations i
  JOIN public.institutions inst ON inst.id = i.institution_id
  WHERE i.token_hash = lower(p_token_hash)
    AND i.status = 'pending'
    AND i.revoked_at IS NULL
    AND i.expires_at > now()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.preview_invitation_by_hash(p_token_hash text)
RETURNS TABLE (
  institution_name text,
  invited_email citext,
  role public.user_role,
  expires_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT * FROM public.preview_invitation(p_token_hash);
$$;

CREATE OR REPLACE FUNCTION public.mark_invitation_sent(
  p_invitation_id uuid,
  p_provider_message_id text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.invitations
  SET last_sent_at = now(),
      send_count = send_count + 1
  WHERE id = p_invitation_id AND status = 'pending';
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.finalize_invitation_acceptance(
  p_invitation_id uuid,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  invitation_row public.invitations%ROWTYPE;
  profile_row public.profiles%ROWTYPE;
BEGIN
  SELECT * INTO invitation_row FROM public.invitations WHERE id = p_invitation_id FOR UPDATE;
  IF NOT FOUND OR invitation_row.status <> 'pending'
     OR invitation_row.expires_at <= now() OR invitation_row.revoked_at IS NOT NULL THEN
    RETURN false;
  END IF;
  SELECT * INTO profile_row FROM public.profiles WHERE id = p_user_id;
  IF NOT FOUND OR profile_row.institution_id <> invitation_row.institution_id
     OR profile_row.role <> invitation_row.role THEN
    RETURN false;
  END IF;

  UPDATE public.invitations
  SET status = 'accepted', accepted_at = now(), accepted_by = p_user_id, used_at = now()
  WHERE id = invitation_row.id AND status = 'pending';
  IF NOT FOUND THEN RETURN false; END IF;

  IF invitation_row.student_id IS NOT NULL AND invitation_row.role = 'parent'::public.user_role THEN
    INSERT INTO public.parent_student_links (
      parent_id, student_id, institution_id, relationship, relationship_label,
      invited_email, invitation_id, status, verified
    )
    VALUES (
      p_user_id, invitation_row.student_id, invitation_row.institution_id,
      COALESCE(invitation_row.relationship, 'parent'), invitation_row.relationship_label,
      invitation_row.email, invitation_row.id, 'pending', false
    )
    ON CONFLICT (parent_id, student_id) DO UPDATE
      SET invitation_id = EXCLUDED.invitation_id,
          invited_email = EXCLUDED.invited_email,
          updated_at = now();
  END IF;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_parent_link_invitation(
  p_actor_id uuid,
  p_student_id uuid,
  p_email citext,
  p_relationship text,
  p_relationship_label text,
  p_token_hash text,
  p_idempotency_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor public.profiles%ROWTYPE;
  student public.profiles%ROWTYPE;
  existing_parent public.profiles%ROWTYPE;
  invitation_row public.invitations%ROWTYPE;
  link_row public.parent_student_links%ROWTYPE;
  institution_name text;
BEGIN
  SELECT * INTO actor FROM public.profiles
  WHERE id = p_actor_id AND is_active = true AND role = 'admin'::public.user_role;
  IF NOT FOUND THEN RAISE EXCEPTION 'admin actor required' USING ERRCODE = '42501'; END IF;
  SELECT * INTO student FROM public.profiles
  WHERE id = p_student_id AND institution_id = actor.institution_id
    AND role = 'student'::public.user_role AND is_active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'student is outside actor institution' USING ERRCODE = '42501'; END IF;
  IF p_relationship IS NULL OR p_relationship NOT IN ('mother', 'father', 'guardian', 'other') THEN
    RAISE EXCEPTION 'invalid relationship' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO existing_parent FROM public.profiles
  WHERE institution_id = actor.institution_id AND lower(email) = lower(p_email::text)
    AND role = 'parent'::public.user_role AND is_active = true
  LIMIT 1;
  IF FOUND THEN
    INSERT INTO public.parent_student_links (
      parent_id, student_id, institution_id, relationship, relationship_label,
      invited_email, status, verified
    ) VALUES (
      existing_parent.id, student.id, actor.institution_id, p_relationship,
      p_relationship_label, p_email, 'pending', false
    )
    ON CONFLICT (parent_id, student_id) DO UPDATE SET updated_at = now()
    RETURNING * INTO link_row;
    RETURN jsonb_build_object('link_id', link_row.id, 'send_required', false, 'existing_parent', true);
  END IF;

  SELECT * INTO invitation_row FROM public.invitations
  WHERE institution_id = actor.institution_id AND idempotency_key = p_idempotency_key
  FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.invitations (
      institution_id, email, role, token_hash, token, status, idempotency_key,
      created_by, student_id, relationship, relationship_label, expires_at
    ) VALUES (
      actor.institution_id, lower(p_email::text)::public.citext, 'parent'::public.user_role,
      lower(p_token_hash), NULL, 'pending', p_idempotency_key, p_actor_id,
      student.id, p_relationship, p_relationship_label, now() + interval '7 days'
    ) RETURNING * INTO invitation_row;
  END IF;

  INSERT INTO public.parent_student_links (
    parent_id, student_id, institution_id, relationship, relationship_label,
    invited_email, invitation_id, status, verified
  ) VALUES (
    NULL, student.id, actor.institution_id, p_relationship, p_relationship_label,
    p_email, invitation_row.id, 'pending', false
  )
  ON CONFLICT DO NOTHING
  RETURNING * INTO link_row;

  SELECT name INTO institution_name FROM public.institutions WHERE id = actor.institution_id;
  RETURN jsonb_build_object(
    'link_id', link_row.id,
    'invitation_id', invitation_row.id,
    'institution_id', actor.institution_id,
    'student_name', student.full_name,
    'recipient_email', p_email,
    'send_required', true,
    'institution_name', institution_name
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.link_existing_parent(
  p_actor_id uuid,
  p_student_id uuid,
  p_parent_id uuid,
  p_relationship text,
  p_relationship_label text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor public.profiles%ROWTYPE;
  parent public.profiles%ROWTYPE;
  student public.profiles%ROWTYPE;
  result_row public.parent_student_links%ROWTYPE;
BEGIN
  SELECT * INTO actor FROM public.profiles WHERE id = p_actor_id AND is_active AND role = 'admin'::public.user_role;
  IF NOT FOUND THEN RAISE EXCEPTION 'admin actor required' USING ERRCODE = '42501'; END IF;
  SELECT * INTO parent FROM public.profiles WHERE id = p_parent_id AND institution_id = actor.institution_id AND role = 'parent'::public.user_role AND is_active;
  SELECT * INTO student FROM public.profiles WHERE id = p_student_id AND institution_id = actor.institution_id AND role = 'student'::public.user_role AND is_active;
  IF parent.id IS NULL OR student.id IS NULL THEN RAISE EXCEPTION 'cross-institution or invalid profile' USING ERRCODE = '42501'; END IF;
  INSERT INTO public.parent_student_links (
    parent_id, student_id, institution_id, relationship, relationship_label,
    invited_email, status, verified
  ) VALUES (
    parent.id, student.id, actor.institution_id, p_relationship, p_relationship_label,
    parent.email::public.citext, 'pending', false
  ) ON CONFLICT (parent_id, student_id) DO UPDATE SET updated_at = now()
  RETURNING * INTO result_row;
  RETURN jsonb_build_object('link_id', result_row.id, 'status', result_row.status);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_parent_link(
  p_actor_id uuid,
  p_link_id uuid,
  p_action text,
  p_relationship text,
  p_relationship_label text,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor public.profiles%ROWTYPE;
  link_row public.parent_student_links%ROWTYPE;
BEGIN
  SELECT * INTO actor FROM public.profiles WHERE id = p_actor_id AND is_active AND role = 'admin'::public.user_role;
  IF NOT FOUND THEN RAISE EXCEPTION 'admin actor required' USING ERRCODE = '42501'; END IF;
  SELECT * INTO link_row FROM public.parent_student_links WHERE id = p_link_id AND institution_id = actor.institution_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'link not found' USING ERRCODE = '40400'; END IF;
  IF p_action = 'verify' THEN
    UPDATE public.parent_student_links SET status = 'verified', verified = true, verified_by = p_actor_id, verified_at = now(), updated_at = now() WHERE id = p_link_id;
  ELSIF p_action = 'reject' THEN
    UPDATE public.parent_student_links SET status = 'rejected', verified = false, rejected_by = p_actor_id, rejected_at = now(), updated_at = now() WHERE id = p_link_id;
  ELSIF p_action = 'revoke' THEN
    UPDATE public.parent_student_links SET status = 'revoked', verified = false, revoked_by = p_actor_id, revoked_at = now(), updated_at = now() WHERE id = p_link_id;
  ELSIF p_action = 'change_relationship' THEN
    UPDATE public.parent_student_links SET relationship = p_relationship, relationship_label = p_relationship_label, updated_at = now() WHERE id = p_link_id;
  ELSE
    RAISE EXCEPTION 'unsupported parent link action' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO link_row FROM public.parent_student_links WHERE id = p_link_id;
  RETURN jsonb_build_object('link_id', link_row.id, 'status', link_row.status, 'relationship', link_row.relationship);
END;
$$;

CREATE OR REPLACE FUNCTION public.parent_has_verified_link(p_student_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.parent_student_links l
    WHERE l.parent_id = (SELECT auth.uid())
      AND l.student_id = p_student_id
      AND (l.status = 'verified' OR l.verified = true)
  );
$$;

DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN SELECT signature FROM (VALUES
    ('create_invitation(uuid,citext,text,text,text)'),
    ('mark_invitation_sent(uuid,text)'),
    ('finalize_invitation_acceptance(uuid,uuid)'),
    ('create_parent_link_invitation(uuid,uuid,citext,text,text,text,text)'),
    ('link_existing_parent(uuid,uuid,uuid,text,text)'),
    ('admin_update_parent_link(uuid,uuid,text,text,text,text)')
  ) AS f(signature)
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon, authenticated', fn.signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO postgres, service_role', fn.signature);
  END LOOP;
END
$$;

REVOKE ALL ON FUNCTION public.preview_invitation(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.preview_invitation(text) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.preview_invitation_by_hash(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.preview_invitation_by_hash(text) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.parent_has_verified_link(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.parent_has_verified_link(uuid) TO authenticated, service_role, postgres;
