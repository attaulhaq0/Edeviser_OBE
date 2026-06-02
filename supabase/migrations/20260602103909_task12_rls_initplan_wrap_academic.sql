-- Task 12 (Req 10.2): wrap bare auth.uid() in (select auth.uid()). ZERO access change.

-- evidence
DROP POLICY IF EXISTS "evidence_parent_read" ON public.evidence;
CREATE POLICY "evidence_parent_read" ON public.evidence AS PERMISSIVE FOR SELECT TO authenticated USING ((auth_user_role() = 'parent'::text) AND (student_id IN ( SELECT psl.student_id FROM parent_student_links psl WHERE ((psl.parent_id = (select auth.uid())) AND (psl.verified = true)))));
DROP POLICY IF EXISTS "evidence_student_read" ON public.evidence;
CREATE POLICY "evidence_student_read" ON public.evidence AS PERMISSIVE FOR SELECT TO authenticated USING (student_id = (select auth.uid()));

-- submissions
DROP POLICY IF EXISTS "submissions_parent_read" ON public.submissions;
CREATE POLICY "submissions_parent_read" ON public.submissions AS PERMISSIVE FOR SELECT TO authenticated USING ((auth_user_role() = 'parent'::text) AND (student_id IN ( SELECT psl.student_id FROM parent_student_links psl WHERE ((psl.parent_id = (select auth.uid())) AND (psl.verified = true)))));
DROP POLICY IF EXISTS "submissions_student_own" ON public.submissions;
CREATE POLICY "submissions_student_own" ON public.submissions AS PERMISSIVE FOR ALL TO authenticated USING (student_id = (select auth.uid()));
DROP POLICY IF EXISTS "submissions_teacher_read" ON public.submissions;
CREATE POLICY "submissions_teacher_read" ON public.submissions AS PERMISSIVE FOR SELECT TO authenticated USING ((auth_user_role() = 'teacher'::text) AND (assignment_id IN ( SELECT assignments.id FROM assignments WHERE (assignments.course_id IN ( SELECT courses.id FROM courses WHERE (courses.teacher_id = (select auth.uid())))))));

-- learning_outcomes
DROP POLICY IF EXISTS "outcomes_coordinator_write" ON public.learning_outcomes;
CREATE POLICY "outcomes_coordinator_write" ON public.learning_outcomes AS PERMISSIVE FOR ALL TO authenticated USING ((auth_user_role() = 'coordinator'::text) AND (program_id IN ( SELECT programs.id FROM programs WHERE (programs.coordinator_id = (select auth.uid())))));
DROP POLICY IF EXISTS "outcomes_teacher_write" ON public.learning_outcomes;
CREATE POLICY "outcomes_teacher_write" ON public.learning_outcomes AS PERMISSIVE FOR ALL TO authenticated USING ((auth_user_role() = 'teacher'::text) AND (course_id IN ( SELECT courses.id FROM courses WHERE (courses.teacher_id = (select auth.uid())))));

-- student_gamification
DROP POLICY IF EXISTS "gamification_student_read" ON public.student_gamification;
CREATE POLICY "gamification_student_read" ON public.student_gamification AS PERMISSIVE FOR SELECT TO authenticated USING (student_id = (select auth.uid()));

-- notifications
DROP POLICY IF EXISTS "users_read_own_notifications" ON public.notifications;
CREATE POLICY "users_read_own_notifications" ON public.notifications AS PERMISSIVE FOR SELECT TO authenticated USING (user_id = (select auth.uid()));

-- onboarding_progress
DROP POLICY IF EXISTS "users_read_own_onboarding" ON public.onboarding_progress;
CREATE POLICY "users_read_own_onboarding" ON public.onboarding_progress AS PERMISSIVE FOR SELECT TO authenticated USING (student_id = (select auth.uid()));;
