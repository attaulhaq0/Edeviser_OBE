-- Task 19 CORRECTIVE (forward): the additive policy profiles_parent_read_linked introduced an
-- infinite-recursion cycle (42P17) between public.profiles and public.parent_student_links
-- (the latter's parent_links_admin_manage policy reads profiles back), which broke ALL
-- authenticated reads of profiles platform-wide. This forward migration removes ONLY the
-- defective policy, restoring profiles to its exact pre-change state (the 5 pre-existing SELECT
-- policies are untouched). It does NOT re-attempt the parent-visibility fix; the recursion-safe
-- replacement (a SECURITY DEFINER link-check helper) is proposed for explicit confirmation.
DROP POLICY IF EXISTS "profiles_parent_read_linked" ON public.profiles;;
