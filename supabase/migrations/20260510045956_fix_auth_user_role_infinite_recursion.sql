-- Fix: auth_user_role() was causing infinite recursion in profiles RLS
-- Problem: profiles RLS policies call auth_user_role(), which queries profiles
-- itself. Without SECURITY DEFINER, PostgreSQL evaluates RLS on that internal
-- query too, causing infinite recursion and timeouts.
-- Fix: mark as SECURITY DEFINER to bypass RLS when reading the role.

CREATE OR REPLACE FUNCTION public.auth_user_role()
  RETURNS text
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
  SELECT role::text FROM public.profiles WHERE id = auth.uid();
$$;

-- Also fix auth_institution_id() with the same pattern
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
;
