-- Task 12 (Req 10.2): wrap bare auth.uid() in (select auth.uid()). ZERO access change.

-- tutor_conversations
DROP POLICY IF EXISTS "users_read_own_tutor_conversations" ON public.tutor_conversations;
CREATE POLICY "users_read_own_tutor_conversations" ON public.tutor_conversations AS PERMISSIVE FOR SELECT TO authenticated USING (student_id = (select auth.uid()));

-- tutor_messages
DROP POLICY IF EXISTS "users_read_own_tutor_messages" ON public.tutor_messages;
CREATE POLICY "users_read_own_tutor_messages" ON public.tutor_messages AS PERMISSIVE FOR SELECT TO authenticated USING (conversation_id IN ( SELECT tutor_conversations.id FROM tutor_conversations WHERE (tutor_conversations.student_id = (select auth.uid()))));

-- tutor_usage_limits
DROP POLICY IF EXISTS "users_read_own_tutor_usage" ON public.tutor_usage_limits;
CREATE POLICY "users_read_own_tutor_usage" ON public.tutor_usage_limits AS PERMISSIVE FOR SELECT TO authenticated USING (student_id = (select auth.uid()));

-- tutor_llm_logs
DROP POLICY IF EXISTS "admins_read_tutor_llm_logs" ON public.tutor_llm_logs;
CREATE POLICY "admins_read_tutor_llm_logs" ON public.tutor_llm_logs AS PERMISSIVE FOR SELECT TO authenticated USING (EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = 'admin'::user_role))));

-- tutor_plan_updates
DROP POLICY IF EXISTS "users_read_own_plan_updates" ON public.tutor_plan_updates;
CREATE POLICY "users_read_own_plan_updates" ON public.tutor_plan_updates AS PERMISSIVE FOR SELECT TO authenticated USING (student_id = (select auth.uid()));

-- teacher_handoff_requests
DROP POLICY IF EXISTS "teachers_read_own_handoffs" ON public.teacher_handoff_requests;
CREATE POLICY "teachers_read_own_handoffs" ON public.teacher_handoff_requests AS PERMISSIVE FOR SELECT TO authenticated USING (teacher_id = (select auth.uid()));

-- challenge_progress
DROP POLICY IF EXISTS "challenge_progress_update" ON public.challenge_progress;
CREATE POLICY "challenge_progress_update" ON public.challenge_progress AS PERMISSIVE FOR UPDATE TO authenticated USING (participant_id = (select auth.uid()));

-- student_content
DROP POLICY IF EXISTS "student_content_student_insert" ON public.student_content;
CREATE POLICY "student_content_student_insert" ON public.student_content AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((auth_user_role() = 'student'::text) AND (student_id = (select auth.uid())) AND (institution_id = auth_institution_id()));
DROP POLICY IF EXISTS "student_content_student_select" ON public.student_content;
CREATE POLICY "student_content_student_select" ON public.student_content AS PERMISSIVE FOR SELECT TO authenticated USING ((auth_user_role() = 'student'::text) AND (student_id = (select auth.uid())));

-- student_quest_progress
DROP POLICY IF EXISTS "quest_progress_student_own" ON public.student_quest_progress;
CREATE POLICY "quest_progress_student_own" ON public.student_quest_progress AS PERMISSIVE FOR ALL TO authenticated USING ((auth_user_role() = 'student'::text) AND (student_id = (select auth.uid())));

-- class_donations
DROP POLICY IF EXISTS "class_donations_student_select" ON public.class_donations;
CREATE POLICY "class_donations_student_select" ON public.class_donations AS PERMISSIVE FOR SELECT TO authenticated USING ((auth_user_role() = 'student'::text) AND ((status)::text = 'active'::text) AND (course_id IN ( SELECT student_courses.course_id FROM student_courses WHERE (student_courses.student_id = (select auth.uid())))));
DROP POLICY IF EXISTS "class_donations_teacher_select" ON public.class_donations;
CREATE POLICY "class_donations_teacher_select" ON public.class_donations AS PERMISSIVE FOR SELECT TO authenticated USING ((auth_user_role() = 'teacher'::text) AND (course_id IN ( SELECT courses.id FROM courses WHERE (courses.teacher_id = (select auth.uid())))));

-- class_donation_contributions
DROP POLICY IF EXISTS "donation_contributions_student_insert" ON public.class_donation_contributions;
CREATE POLICY "donation_contributions_student_insert" ON public.class_donation_contributions AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((auth_user_role() = 'student'::text) AND (student_id = (select auth.uid())));
DROP POLICY IF EXISTS "donation_contributions_student_select" ON public.class_donation_contributions;
CREATE POLICY "donation_contributions_student_select" ON public.class_donation_contributions AS PERMISSIVE FOR SELECT TO authenticated USING ((auth_user_role() = 'student'::text) AND (student_id = (select auth.uid())));;
