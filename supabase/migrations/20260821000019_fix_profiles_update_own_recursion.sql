-- =============================================================================
-- Fix: 42P17 "infinite recursion detected in policy for relation profiles"
-- on every UPDATE to public.profiles.
--
-- Root cause: the `profiles_update_own` policy's WITH CHECK enforced
-- immutability of role / institution_id / status by SELECTing those columns
-- FROM public.profiles *inside the policy expression*. A policy on `profiles`
-- that itself queries `profiles` makes Postgres abort UPDATEs with SQLSTATE
-- 42P17. SELECTs were unaffected because the read policies use the
-- SECURITY DEFINER helpers auth_user_role() / auth_institution_id() (which
-- bypass RLS) — which is why reads returned 200 but every profile self-update
-- (language switch, theme / notification prefs, and the avatar upload's
-- profiles.avatar_url write) failed with HTTP 500.
--
-- Fix: keep the identical privilege-immutability guard, but source the current
-- values from SECURITY DEFINER helpers (which bypass RLS → no recursion)
-- instead of an inline subquery on profiles. A new auth_user_status() helper
-- mirrors the existing auth_user_role() / auth_institution_id() helpers.
--
-- Behaviour preserved: only the authenticated self-update path
-- (profiles_update_own) changes. The admin write path (profiles_admin_write,
-- cmd ALL) and service_role (which bypasses RLS entirely) are untouched.
-- Null-safe comparisons (IS NOT DISTINCT FROM) avoid blocking a self-update for
-- a row whose institution_id is NULL.
-- =============================================================================

-- 1) Current-user status helper. Mirrors the existing auth_user_role() and
--    auth_institution_id() helpers: SECURITY DEFINER so it bypasses RLS on
--    profiles (no recursion), STABLE, fixed search_path.
CREATE OR REPLACE FUNCTION public.auth_user_status()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT status FROM public.profiles WHERE id = auth.uid();
$$;

-- 2) Recreate the self-update policy WITHOUT the self-referential subquery.
--    The WITH CHECK still pins role / institution_id / status to the caller's
--    current stored values (privilege-escalation guard), but reads them via the
--    RLS-bypassing helpers rather than an inline SELECT on profiles.
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;

CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (
    id = (SELECT auth.uid())
    AND role::text IS NOT DISTINCT FROM (SELECT public.auth_user_role())
    AND institution_id IS NOT DISTINCT FROM (SELECT public.auth_institution_id())
    AND status IS NOT DISTINCT FROM (SELECT public.auth_user_status())
  );
