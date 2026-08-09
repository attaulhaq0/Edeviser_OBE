-- Parent-link invitations create a pending link before acceptance so the
-- invited student relationship is visible to the admin. Finalization must
-- update that row rather than insert a second row with the same invitation_id.
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
    UPDATE public.parent_student_links
    SET parent_id = p_user_id,
        status = 'pending',
        verified = false,
        updated_at = now()
    WHERE invitation_id = invitation_row.id;

    IF NOT FOUND THEN
      INSERT INTO public.parent_student_links (
      parent_id, student_id, institution_id, relationship, relationship_label,
      invited_email, invitation_id, status, verified
      ) VALUES (
      p_user_id, invitation_row.student_id, invitation_row.institution_id,
      COALESCE(invitation_row.relationship, 'parent'), invitation_row.relationship_label,
      invitation_row.email, invitation_row.id, 'pending', false
      );
    END IF;
  END IF;
  RETURN true;
END;
$$;
