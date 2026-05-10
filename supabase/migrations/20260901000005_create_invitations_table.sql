-- ============================================================================
-- 20260901000005_create_invitations_table.sql
--
-- Creates public.invitations — the scalable non-student onboarding surface that
-- backs the /accept-invite/:token flow and the Admin Invite Users page.
--
-- Per design.md §5.3 and ADR-12:
--   • self-service signup at /signup always creates role = 'student' (public
--     tier); any non-student onboarding (admin / coordinator / teacher /
--     parent, and open-enrolment student invites) must flow through a signed,
--     time-boxed, single-use invitation row created by an admin.
--   • the accept flow is unauthenticated (the invited user does not yet have
--     a session), so reads are NEVER allowed directly against the table —
--     they go through a SECURITY DEFINER RPC that only returns the row for
--     the specific token presented, and only when the row is still valid.
--
-- Satisfies bugfix.md clauses 2.11 (ADR-12).
--
-- Idempotency: every CREATE uses IF NOT EXISTS or DROP IF EXISTS + CREATE so
-- this migration can be re-applied safely.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. Extensions.
--
-- citext gives us case-insensitive email comparison at the storage layer so
-- the unique-pending-invite index (institution_id, email) does not care about
-- 'User@example.com' vs 'user@example.com'. pgcrypto is already enabled on
-- this project (it backs gen_random_uuid()); kept as IF NOT EXISTS for local
-- / fresh-DB reapplication.
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. Table.
--
-- Notes:
--   • role uses the existing public.user_role enum (includes
--     admin / coordinator / teacher / student / parent) — verified via
--     introspection before authoring this migration.
--   • token is UNIQUE NOT NULL. Supabase/Postgres auto-creates an index for
--     the UNIQUE constraint, so no separate btree is needed for the
--     get_invitation_by_token(token) lookup.
--   • expires_at defaults to now() + 7 days (ADR-12 validity window).
--   • used_at is nullable; setting it = now() is how consume_invitation()
--     marks a row as redeemed (single-use enforcement).
--   • created_by references auth.users so we can show the issuing admin in
--     the admin Invitations list; ON DELETE CASCADE so offboarding an admin
--     cleans up their outstanding invites.
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 2. Indexes.
--
-- The (institution_id, email) partial-unique index prevents a duplicate
-- PENDING invitation for the same (institution, email) pair while still
-- permitting re-invites once an earlier invitation has been consumed
-- (used_at IS NOT NULL). This is the behavior design.md §5.3 calls out.
--
-- The (institution_id, used_at) btree supports the admin Invitations page
-- (`WHERE institution_id = ... ORDER BY used_at NULLS FIRST`) and the
-- `SELECT * WHERE institution_id = $1 AND used_at IS NULL` dashboard count.
--
-- No separate token index — the UNIQUE constraint on token already creates one.
-- ----------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS invitations_pending_institution_email_unique
  ON public.invitations (institution_id, email)
  WHERE used_at IS NULL;

CREATE INDEX IF NOT EXISTS invitations_institution_used_idx
  ON public.invitations (institution_id, used_at);

-- ----------------------------------------------------------------------------
-- 3. Row Level Security.
--
-- Admins of the same institution can INSERT / SELECT / DELETE (DELETE only
-- on unused rows — used invites are retained as the audit trail).
-- No policy for anon / other roles: the accept flow is via SECURITY DEFINER
-- RPCs below, not direct table access.
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 4. SECURITY DEFINER RPCs.
--
-- These are the ONLY way an unauthenticated client can interact with the
-- invitations table. Both are STABLE-or-VOLATILE as appropriate, pin
-- search_path = public to defeat search-path hijacking, and are revoked from
-- PUBLIC by default then re-granted specifically to anon + authenticated.
-- ----------------------------------------------------------------------------

-- 4a. get_invitation_by_token: token-presenting lookup used by the
--     /accept-invite/:token page to render the pre-filled signup form.
--     Returns at most one row, and only when the invitation is still valid
--     (not consumed, not expired). Institution name is joined in so the
--     accept page can show "You've been invited to Carnegie Mellon Qatar"
--     without a second authenticated query.
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

-- 4b. consume_invitation: flips used_at to now() on a still-valid row.
--     Returns true if a row was updated (success), false otherwise (token
--     unknown / already consumed / expired). Called by the accept flow
--     after auth.users insert succeeds so handle_new_user() has had a chance
--     to create the matching profiles row with the invited role.
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

-- ----------------------------------------------------------------------------
-- 5. Function grants.
--
-- Supabase implicitly grants EXECUTE to PUBLIC (and thus anon + authenticated)
-- on every CREATE FUNCTION. We revoke everything and then re-grant ONLY to
-- anon + authenticated so the function is reachable from PostgREST but not
-- from any future role we haven't explicitly opted in. This mirrors the
-- project-wide pattern established in
-- 20260504032951_revoke_anon_execute_on_security_definer_functions.sql and
-- 20260504033048_revoke_public_execute_on_security_definer_functions.sql.
-- ----------------------------------------------------------------------------
REVOKE ALL     ON FUNCTION public.get_invitation_by_token(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_invitation_by_token(text) FROM anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.get_invitation_by_token(text) TO   anon, authenticated;

REVOKE ALL     ON FUNCTION public.consume_invitation(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.consume_invitation(text) FROM anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.consume_invitation(text) TO   anon, authenticated;
