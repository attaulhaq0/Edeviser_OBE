-- Task 13 (migration-history-reconciliation): tighten the 5 permissive rls_policy_always_true
-- write policies introduced by the Task 3 phantom-table deploy (20260601205749).
-- Replaces USING(true)/WITH CHECK(true) for `authenticated` with least-privilege predicates.
-- Recursion-safe: the only helper used is public.auth_user_role(), which is SECURITY DEFINER
-- with search_path=public and therefore BYPASSES RLS (no policy re-entry / 42P17).
-- Legitimate writers are service_role Edge Functions (check-badges, process-onboarding,
-- process-streak), which bypass RLS entirely, so these narrowed `authenticated` grants
-- do not affect any real write path.

-- 1. student_badges INSERT: only staff (admin/teacher/coordinator) may insert via the
--    authenticated REST surface; students can no longer self-award. SELECT policy untouched.
DROP POLICY IF EXISTS "student_badges_insert" ON public.student_badges;
CREATE POLICY "student_badges_insert" ON public.student_badges
  FOR INSERT TO authenticated
  WITH CHECK ((select public.auth_user_role()) IN ('admin','teacher','coordinator'));

-- 2. quiz_clos INSERT: only staff may create quiz<->CLO mappings. SELECT policy untouched.
DROP POLICY IF EXISTS "quiz_clos_insert" ON public.quiz_clos;
CREATE POLICY "quiz_clos_insert" ON public.quiz_clos
  FOR INSERT TO authenticated
  WITH CHECK ((select public.auth_user_role()) IN ('admin','teacher','coordinator'));

-- 3. quiz_clos DELETE: only staff may delete quiz<->CLO mappings.
DROP POLICY IF EXISTS "quiz_clos_delete" ON public.quiz_clos;
CREATE POLICY "quiz_clos_delete" ON public.quiz_clos
  FOR DELETE TO authenticated
  USING ((select public.auth_user_role()) IN ('admin','teacher','coordinator'));

-- 4. team_gamification INSERT: only staff via authenticated surface (real writes are server crons).
DROP POLICY IF EXISTS "team_gamification_insert" ON public.team_gamification;
CREATE POLICY "team_gamification_insert" ON public.team_gamification
  FOR INSERT TO authenticated
  WITH CHECK ((select public.auth_user_role()) IN ('admin','teacher','coordinator'));

-- 5. team_gamification UPDATE: only staff via authenticated surface; set both USING and
--    WITH CHECK so neither the visible-row nor the post-update predicate is permissive.
DROP POLICY IF EXISTS "team_gamification_update" ON public.team_gamification;
CREATE POLICY "team_gamification_update" ON public.team_gamification
  FOR UPDATE TO authenticated
  USING ((select public.auth_user_role()) IN ('admin','teacher','coordinator'))
  WITH CHECK ((select public.auth_user_role()) IN ('admin','teacher','coordinator'));;
