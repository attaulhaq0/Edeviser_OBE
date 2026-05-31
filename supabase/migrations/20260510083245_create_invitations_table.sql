-- ============================================================================
-- 20260901000005_create_invitations_table.sql
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.invitations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  email           citext NOT NULL,
  role            public.user_role NOT NULL,
  token           text UNIQUE NOT NULL,
  expires_at      timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  used_at         timestamptz,
  created_by      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.invitations IS
  'Signed, time-boxed, single-use invitation tokens for non-student onboarding. See design.md ADR-12.';
COMMENT ON COLUMN public.invitations.email IS
  'citext so case variants of the same address collide under the unique-pending-invite index.';
COMMENT ON COLUMN public.invitations.token IS
  'Opaque signed token generated server-side by the send-invitation-email Edge Function.';
COMMENT ON COLUMN public.invitations.used_at IS
  'Set to now() by public.consume_invitation(token) after successful signup. NULL = unredeemed.';

CREATE UNIQUE INDEX IF NOT EXISTS invitations_pending_institution_email_unique
  ON public.invitations (institution_id, email)
  WHERE used_at IS NULL;

CREATE INDEX IF NOT EXISTS invitations_institution_used_idx
  ON public.invitations (institution_id, used_at);

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invitations_admin_insert" ON public.invitations;
CREATE POLICY "invitations_admin_insert" ON public.invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (select public.auth_user_role()) = 'admin'
    AND institution_id = (select public.auth_institution_id())
  );

DROP POLICY IF EXISTS "invitations_admin_select" ON public.invitations;
CREATE POLICY "invitations_admin_select" ON public.invitations
  FOR SELECT
  TO authenticated
  USING (
    (select public.auth_user_role()) = 'admin'
    AND institution_id = (select public.auth_institution_id())
  );

DROP POLICY IF EXISTS "invitations_admin_delete" ON public.invitations;
CREATE POLICY "invitations_admin_delete" ON public.invitations
  FOR DELETE
  TO authenticated
  USING (
    (select public.auth_user_role()) = 'admin'
    AND institution_id = (select public.auth_institution_id())
    AND used_at IS NULL
  );

CREATE OR REPLACE FUNCTION public.get_invitation_by_token(p_token text)
RETURNS TABLE (
  id               uuid,
  institution_id   uuid,
  institution_name text,
  email            citext,
  role             public.user_role,
  expires_at       timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $func$
  SELECT
    i.id,
    i.institution_id,
    inst.name       AS institution_name,
    i.email,
    i.role,
    i.expires_at
  FROM public.invitations i
  JOIN public.institutions inst ON inst.id = i.institution_id
  WHERE i.token = p_token
    AND i.used_at IS NULL
    AND i.expires_at > now()
  LIMIT 1;
$func$;

COMMENT ON FUNCTION public.get_invitation_by_token(text) IS
  'Public-callable invitation lookup by token. Returns at most one row and only when the invitation is unredeemed and unexpired. Used by /accept-invite/:token.';

CREATE OR REPLACE FUNCTION public.consume_invitation(p_token text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  rows_updated int;
BEGIN
  UPDATE public.invitations
     SET used_at = now()
   WHERE token = p_token
     AND used_at IS NULL
     AND expires_at > now();

  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RETURN rows_updated > 0;
END;
$func$;

COMMENT ON FUNCTION public.consume_invitation(text) IS
  'Public-callable single-use redemption. Returns true on success, false if token is unknown / already consumed / expired.';

REVOKE ALL     ON FUNCTION public.get_invitation_by_token(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_invitation_by_token(text) FROM anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.get_invitation_by_token(text) TO   anon, authenticated;

REVOKE ALL     ON FUNCTION public.consume_invitation(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.consume_invitation(text) FROM anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.consume_invitation(text) TO   anon, authenticated;
;
