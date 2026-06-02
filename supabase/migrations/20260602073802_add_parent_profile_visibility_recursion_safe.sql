-- Task 19: parent can read their verified-linked child's profile, recursion-safe.
-- Uses a SECURITY DEFINER helper (mirrors auth_user_role/auth_institution_id) so the
-- profiles policy does NOT inline an RLS-enforced subquery on parent_student_links
-- (which references profiles back -> 42P17 infinite recursion).

CREATE OR REPLACE FUNCTION public.parent_has_verified_link(p_student_id uuid)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
AS $fn$
  SELECT EXISTS (
    SELECT 1 FROM public.parent_student_links psl
    WHERE psl.parent_id = auth.uid()
      AND psl.student_id = p_student_id
      AND psl.verified = true
  );
$fn$;

REVOKE ALL ON FUNCTION public.parent_has_verified_link(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.parent_has_verified_link(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.parent_has_verified_link(uuid) TO authenticated, service_role, postgres;

COMMENT ON FUNCTION public.parent_has_verified_link(uuid) IS 'Task 19: SECURITY DEFINER check that the calling parent has a verified parent_student_links row to p_student_id. RLS-bypassing by design to avoid a parent_student_links<->profiles RLS recursion cycle. search_path pinned.';

CREATE POLICY "profiles_parent_read_linked" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    (SELECT public.auth_user_role()) = 'parent'
    AND (SELECT public.parent_has_verified_link(profiles.id))
  );;
