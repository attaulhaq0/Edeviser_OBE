-- =============================================================================
-- Fix: auth_user_role() and auth_institution_id() infinite recursion
-- =============================================================================
-- Problem: RLS policies on the `profiles` table call `auth_user_role()` to
-- check if the user is an admin/teacher/coordinator. But `auth_user_role()`
-- itself queries `public.profiles` to find the role.
--
-- Without SECURITY DEFINER, PostgreSQL evaluates RLS on that internal query
-- too, which calls `auth_user_role()` again... infinite recursion. PostgREST
-- requests hung forever, causing login redirects to the dashboard to freeze.
--
-- Fix: mark both helper functions as SECURITY DEFINER so they bypass RLS when
-- reading from profiles. This is the standard Supabase pattern for RLS helpers.
--
-- Impact: profile queries went from timing out at 30+ seconds to ~1 second.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.auth_user_role()
  RETURNS text
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
  SELECT role::text FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.auth_institution_id()
  RETURNS uuid
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
  SELECT institution_id FROM public.profiles WHERE id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.auth_user_role() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.auth_institution_id() TO authenticated, anon;
