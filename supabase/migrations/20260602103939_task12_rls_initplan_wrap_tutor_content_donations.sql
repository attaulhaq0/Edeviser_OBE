-- Task 12 (Req 10.2): wrap bare auth.uid() in (select auth.uid()). ZERO access change.

-- tutor_conversations
-- REPLAY-ONLY GUARD: tutor_conversations is CREATEd later (20260820000003). The whole
-- drop+recreate is a no-op on a fresh replay (table absent) and runs normally on live.
DO $$ BEGIN
  IF to_regclass('public.tutor_conversations') IS NOT NULL THEN
    EXECUTE $stmt$ DROP POLICY IF EXISTS "users_read_own_tutor_conversations" ON public.tutor_conversations $stmt$;
    EXECUTE $stmt$ CREATE POLICY "users_read_own_tutor_conversations" ON public.tutor_conversations AS PERMISSIVE FOR SELECT TO authenticated USING (student_id = (select auth.uid())) $stmt$;
  END IF;
END $$;

-- tutor_messages
-- REPLAY-ONLY GUARD: tutor_messages is CREATEd later (20260820000004).
DO $$ BEGIN
  IF to_regclass('public.tutor_messages') IS NOT NULL THEN
    EXECUTE $stmt$ DROP POLICY IF EXISTS "users_read_own_tutor_messages" ON public.tutor_messages $stmt$;
    EXECUTE $stmt$ CREATE POLICY "users_read_own_tutor_messages" ON public.tutor_messages AS PERMISSIVE FOR SELECT TO authenticated USING (conversation_id IN ( SELECT tutor_conversations.id FROM tutor_conversations WHERE (tutor_conversations.student_id = (select auth.uid())))) $stmt$;
  END IF;
END $$;

-- tutor_usage_limits
-- REPLAY-ONLY GUARD: tutor_usage_limits is CREATEd later (20260820000005).
DO $$ BEGIN
  IF to_regclass('public.tutor_usage_limits') IS NOT NULL THEN
    EXECUTE $stmt$ DROP POLICY IF EXISTS "users_read_own_tutor_usage" ON public.tutor_usage_limits $stmt$;
    EXECUTE $stmt$ CREATE POLICY "users_read_own_tutor_usage" ON public.tutor_usage_limits AS PERMISSIVE FOR SELECT TO authenticated USING (student_id = (select auth.uid())) $stmt$;
  END IF;
END $$;

-- tutor_llm_logs
-- REPLAY-ONLY GUARD: tutor_llm_logs is CREATEd later (20260820000006).
DO $$ BEGIN
  IF to_regclass('public.tutor_llm_logs') IS NOT NULL THEN
    EXECUTE $stmt$ DROP POLICY IF EXISTS "admins_read_tutor_llm_logs" ON public.tutor_llm_logs $stmt$;
    EXECUTE $stmt$ CREATE POLICY "admins_read_tutor_llm_logs" ON public.tutor_llm_logs AS PERMISSIVE FOR SELECT TO authenticated USING (EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = 'admin'::user_role)))) $stmt$;
  END IF;
END $$;

-- tutor_plan_updates
-- REPLAY-ONLY GUARD: tutor_plan_updates is CREATEd later (20260820100002).
DO $$ BEGIN
  IF to_regclass('public.tutor_plan_updates') IS NOT NULL THEN
    EXECUTE $stmt$ DROP POLICY IF EXISTS "users_read_own_plan_updates" ON public.tutor_plan_updates $stmt$;
    EXECUTE $stmt$ CREATE POLICY "users_read_own_plan_updates" ON public.tutor_plan_updates AS PERMISSIVE FOR SELECT TO authenticated USING (student_id = (select auth.uid())) $stmt$;
  END IF;
END $$;

-- teacher_handoff_requests
-- REPLAY-ONLY GUARD: teacher_handoff_requests is CREATEd later (20260820100003).
DO $$ BEGIN
  IF to_regclass('public.teacher_handoff_requests') IS NOT NULL THEN
    EXECUTE $stmt$ DROP POLICY IF EXISTS "teachers_read_own_handoffs" ON public.teacher_handoff_requests $stmt$;
    EXECUTE $stmt$ CREATE POLICY "teachers_read_own_handoffs" ON public.teacher_handoff_requests AS PERMISSIVE FOR SELECT TO authenticated USING (teacher_id = (select auth.uid())) $stmt$;
  END IF;
END $$;

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
