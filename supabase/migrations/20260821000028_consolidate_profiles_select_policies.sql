-- H1 RLS consolidation: merge the 5 permissive SELECT policies on profiles
-- (own / admin-institution / coordinator-institution / teacher-students /
-- verified-parent) into ONE policy TO authenticated. Left untouched:
--   * profiles_admin_write            (cmd ALL)
--   * profiles_update_own             (cmd UPDATE; WITH CHECK pins role/inst/status)
--   * profiles_anon_public_portfolio  (TO anon -- the only anon read path)
--
-- Behavior-identical by construction: Postgres OR-combines permissive policies.
-- Four of the five were TO {public}, but every branch requires a role or
-- auth.uid() (both null for anon), so anon reads still come ONLY through the
-- untouched anon-portfolio policy. Folding into TO authenticated preserves
-- behavior while halving per-row policy evaluation on the busiest table.
--
-- Recursion-safe: no branch does a bare RLS'd SELECT on profiles. role /
-- institution come from the SECURITY DEFINER helpers public.auth_user_role() /
-- public.auth_institution_id(); the parent branch uses the SECURITY DEFINER
-- public.parent_has_verified_link(); the teacher branch reads student_courses /
-- courses. This is the same recursion-safe shape the individual policies used
-- (see 20260510045956, 20260602073802, 20260821000019).
--
-- Replay-safe: every old policy name below is created by an earlier migration
-- (profiles_parent_read_linked last at 20260602073802, the other four at
-- 20260428000003), so all exist here and are dropped; "profiles_read" is
-- created by no earlier migration. No function ALTER/GRANT/COMMENT (no 42883).

DROP POLICY IF EXISTS "profiles_read_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_read_institution" ON public.profiles;
DROP POLICY IF EXISTS "profiles_coordinator_read" ON public.profiles;
DROP POLICY IF EXISTS "profiles_teacher_read_students" ON public.profiles;
DROP POLICY IF EXISTS "profiles_parent_read_linked" ON public.profiles;

CREATE POLICY "profiles_read" ON public.profiles
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    -- own profile
    (id = (select auth.uid()))
    -- admin: profiles in their institution
    OR (((select public.auth_user_role()) = 'admin'::text)
      AND (institution_id = (select public.auth_institution_id())))
    -- coordinator: profiles in their institution
    OR (((select public.auth_user_role()) = 'coordinator'::text)
      AND (institution_id = (select public.auth_institution_id())))
    -- teacher: students enrolled in a course they teach
    OR (((select public.auth_user_role()) = 'teacher'::text)
      AND (id IN (
        select sc.student_id
        from public.student_courses sc
          join public.courses c on c.id = sc.course_id
        where c.teacher_id = (select auth.uid())
      )))
    -- verified parent: their linked child's profile (recursion-safe helper)
    OR (((select public.auth_user_role()) = 'parent'::text)
      AND (select public.parent_has_verified_link(profiles.id)))
  );
