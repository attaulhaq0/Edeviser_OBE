-- Task 12 (Req 10.2): wrap bare auth.uid() in (select auth.uid()). ZERO access change.

-- Replay-safe guards: the tutor_*/teacher_handoff tables below are CREATEd by later migrations
-- (20260820*), so on a fresh from-scratch replay these DROP+CREATE POLICY pairs must no-op (the
-- table does not exist yet). The corrective migration 20260821000005 re-asserts these final
-- initplan-wrapped policy forms after the tables exist. On production the tables already exist,
-- so the guard predicate is true and the original DROP+CREATE runs unchanged.

-- tutor_conversations
DO $$ BEGIN
  IF to_regclass('public.tutor_conversations') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "users_read_own_tutor_conversations" ON public.tutor_conversations';
    EXECUTE 'CREATE POLICY "users_read_own_tutor_conversations" ON public.tutor_conversations AS PERMISSIVE FOR SELECT TO authenticated USING (student_id = (select auth.uid()))';
  END IF;
END $$;

-- tutor_messages
DO $$ BEGIN
  IF to_regclass('public.tutor_messages') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "users_read_own_tutor_messages" ON public.tutor_messages';
    EXECUTE 'CREATE POLICY "users_read_own_tutor_messages" ON public.tutor_messages AS PERMISSIVE FOR SELECT TO authenticated USING (conversation_id IN ( SELECT tutor_conversations.id FROM tutor_conversations WHERE (tutor_conversations.student_id = (select auth.uid()))))';
  END IF;
END $$;

-- tutor_usage_limits
DO $$ BEGIN
  IF to_regclass('public.tutor_usage_limits') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "users_read_own_tutor_usage" ON public.tutor_usage_limits';
    EXECUTE 'CREATE POLICY "users_read_own_tutor_usage" ON public.tutor_usage_limits AS PERMISSIVE FOR SELECT TO authenticated USING (student_id = (select auth.uid()))';
  END IF;
END $$;

-- tutor_llm_logs
DO $$ BEGIN
  IF to_regclass('public.tutor_llm_logs') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "admins_read_tutor_llm_logs" ON public.tutor_llm_logs';
    EXECUTE 'CREATE POLICY "admins_read_tutor_llm_logs" ON public.tutor_llm_logs AS PERMISSIVE FOR SELECT TO authenticated USING (EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = ''admin''::user_role))))';
  END IF;
END $$;

-- tutor_plan_updates
DO $$ BEGIN
  IF to_regclass('public.tutor_plan_updates') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "users_read_own_plan_updates" ON public.tutor_plan_updates';
    EXECUTE 'CREATE POLICY "users_read_own_plan_updates" ON public.tutor_plan_updates AS PERMISSIVE FOR SELECT TO authenticated USING (student_id = (select auth.uid()))';
  END IF;
END $$;

-- teacher_handoff_requests
DO $$ BEGIN
  IF to_regclass('public.teacher_handoff_requests') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "teachers_read_own_handoffs" ON public.teacher_handoff_requests';
    EXECUTE 'CREATE POLICY "teachers_read_own_handoffs" ON public.teacher_handoff_requests AS PERMISSIVE FOR SELECT TO authenticated USING (teacher_id = (select auth.uid()))';
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
