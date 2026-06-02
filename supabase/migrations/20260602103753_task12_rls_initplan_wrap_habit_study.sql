-- Task 12 (Req 10.2): wrap bare auth.uid() in (select auth.uid()) to fix auth_rls_initplan.
-- Predicates, roles (authenticated), command, and PERMISSIVE flag are byte-for-byte equivalent in meaning. ZERO access change.

-- habit_logs
DROP POLICY IF EXISTS "parent_select_linked" ON public.habit_logs;
CREATE POLICY "parent_select_linked" ON public.habit_logs AS PERMISSIVE FOR SELECT TO authenticated USING ((auth_user_role() = 'parent'::text) AND (student_id IN ( SELECT psl.student_id FROM parent_student_links psl WHERE ((psl.parent_id = (select auth.uid())) AND (psl.verified = true)))));
DROP POLICY IF EXISTS "student_insert_own" ON public.habit_logs;
CREATE POLICY "student_insert_own" ON public.habit_logs AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((auth_user_role() = 'student'::text) AND (student_id = (select auth.uid())));
DROP POLICY IF EXISTS "student_select_own" ON public.habit_logs;
CREATE POLICY "student_select_own" ON public.habit_logs AS PERMISSIVE FOR SELECT TO authenticated USING ((auth_user_role() = 'student'::text) AND (student_id = (select auth.uid())));
DROP POLICY IF EXISTS "student_update_own" ON public.habit_logs;
CREATE POLICY "student_update_own" ON public.habit_logs AS PERMISSIVE FOR UPDATE TO authenticated USING ((auth_user_role() = 'student'::text) AND (student_id = (select auth.uid()))) WITH CHECK ((auth_user_role() = 'student'::text) AND (student_id = (select auth.uid())));
DROP POLICY IF EXISTS "users_read_own_habit_logs" ON public.habit_logs;
CREATE POLICY "users_read_own_habit_logs" ON public.habit_logs AS PERMISSIVE FOR SELECT TO authenticated USING (student_id = (select auth.uid()));

-- habit_correlations
DROP POLICY IF EXISTS "habit_correlations_own" ON public.habit_correlations;
CREATE POLICY "habit_correlations_own" ON public.habit_correlations AS PERMISSIVE FOR ALL TO authenticated USING (student_id = (select auth.uid()));

-- study_sessions
DROP POLICY IF EXISTS "parent_select_linked_sessions" ON public.study_sessions;
CREATE POLICY "parent_select_linked_sessions" ON public.study_sessions AS PERMISSIVE FOR SELECT TO authenticated USING ((auth_user_role() = 'parent'::text) AND (student_id IN ( SELECT psl.student_id FROM parent_student_links psl WHERE ((psl.parent_id = (select auth.uid())) AND (psl.verified = true)))));
DROP POLICY IF EXISTS "study_sessions_own" ON public.study_sessions;
CREATE POLICY "study_sessions_own" ON public.study_sessions AS PERMISSIVE FOR ALL TO authenticated USING (student_id = (select auth.uid()));
DROP POLICY IF EXISTS "teacher_select_clo_sessions" ON public.study_sessions;
CREATE POLICY "teacher_select_clo_sessions" ON public.study_sessions AS PERMISSIVE FOR SELECT TO authenticated USING ((auth_user_role() = 'teacher'::text) AND (course_id IN ( SELECT c.id FROM courses c WHERE (c.teacher_id = (select auth.uid())))) AND ((clo_ids IS NOT NULL) OR (clo_id IS NOT NULL)));

-- planner_tasks
DROP POLICY IF EXISTS "parent_select_linked_tasks" ON public.planner_tasks;
CREATE POLICY "parent_select_linked_tasks" ON public.planner_tasks AS PERMISSIVE FOR SELECT TO authenticated USING ((auth_user_role() = 'parent'::text) AND (student_id IN ( SELECT psl.student_id FROM parent_student_links psl WHERE ((psl.parent_id = (select auth.uid())) AND (psl.verified = true)))));
DROP POLICY IF EXISTS "planner_tasks_own" ON public.planner_tasks;
CREATE POLICY "planner_tasks_own" ON public.planner_tasks AS PERMISSIVE FOR ALL TO authenticated USING (student_id = (select auth.uid()));

-- weekly_goals
DROP POLICY IF EXISTS "parent_select_linked_goals" ON public.weekly_goals;
CREATE POLICY "parent_select_linked_goals" ON public.weekly_goals AS PERMISSIVE FOR SELECT TO authenticated USING ((auth_user_role() = 'parent'::text) AND (student_id IN ( SELECT psl.student_id FROM parent_student_links psl WHERE ((psl.parent_id = (select auth.uid())) AND (psl.verified = true)))));
DROP POLICY IF EXISTS "weekly_goals_own" ON public.weekly_goals;
CREATE POLICY "weekly_goals_own" ON public.weekly_goals AS PERMISSIVE FOR ALL TO authenticated USING (student_id = (select auth.uid()));

-- session_evidence
DROP POLICY IF EXISTS "session_evidence_own" ON public.session_evidence;
CREATE POLICY "session_evidence_own" ON public.session_evidence AS PERMISSIVE FOR ALL TO authenticated USING (EXISTS ( SELECT 1 FROM study_sessions s WHERE ((s.id = session_evidence.session_id) AND (s.student_id = (select auth.uid())))));
DROP POLICY IF EXISTS "teacher_select_course_evidence" ON public.session_evidence;
CREATE POLICY "teacher_select_course_evidence" ON public.session_evidence AS PERMISSIVE FOR SELECT TO authenticated USING ((auth_user_role() = 'teacher'::text) AND (session_id IN ( SELECT ss.id FROM (study_sessions ss JOIN courses c ON ((ss.course_id = c.id))) WHERE (c.teacher_id = (select auth.uid())))));;
