-- Task 12 (Req 10.2): wrap bare auth.uid() in (select auth.uid()). ZERO access change.

-- session_reflections
DROP POLICY IF EXISTS "student_insert_own_reflections" ON public.session_reflections;
CREATE POLICY "student_insert_own_reflections" ON public.session_reflections AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (student_id = (select auth.uid()));
DROP POLICY IF EXISTS "student_select_own_reflections" ON public.session_reflections;
CREATE POLICY "student_select_own_reflections" ON public.session_reflections AS PERMISSIVE FOR SELECT TO authenticated USING (student_id = (select auth.uid()));

-- session_intents
DROP POLICY IF EXISTS "session_intents_student_insert" ON public.session_intents;
CREATE POLICY "session_intents_student_insert" ON public.session_intents AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (student_id = (select auth.uid()));
DROP POLICY IF EXISTS "session_intents_student_select" ON public.session_intents;
CREATE POLICY "session_intents_student_select" ON public.session_intents AS PERMISSIVE FOR SELECT TO authenticated USING (student_id = (select auth.uid()));

-- flow_check_ins
DROP POLICY IF EXISTS "flow_check_ins_student_insert" ON public.flow_check_ins;
CREATE POLICY "flow_check_ins_student_insert" ON public.flow_check_ins AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (student_id = (select auth.uid()));
DROP POLICY IF EXISTS "flow_check_ins_student_select" ON public.flow_check_ins;
CREATE POLICY "flow_check_ins_student_select" ON public.flow_check_ins AS PERMISSIVE FOR SELECT TO authenticated USING (student_id = (select auth.uid()));

-- review_schedules
DROP POLICY IF EXISTS "review_schedules_parent_select" ON public.review_schedules;
CREATE POLICY "review_schedules_parent_select" ON public.review_schedules AS PERMISSIVE FOR SELECT TO authenticated USING (student_id IN ( SELECT parent_student_links.student_id FROM parent_student_links WHERE ((parent_student_links.parent_id = (select auth.uid())) AND (parent_student_links.verified = true))));
DROP POLICY IF EXISTS "review_schedules_student_all" ON public.review_schedules;
CREATE POLICY "review_schedules_student_all" ON public.review_schedules AS PERMISSIVE FOR ALL TO authenticated USING (student_id = (select auth.uid())) WITH CHECK (student_id = (select auth.uid()));

-- reflection_digests
DROP POLICY IF EXISTS "reflection_digests_parent_select" ON public.reflection_digests;
CREATE POLICY "reflection_digests_parent_select" ON public.reflection_digests AS PERMISSIVE FOR SELECT TO authenticated USING ((student_id IN ( SELECT parent_student_links.student_id FROM parent_student_links WHERE ((parent_student_links.parent_id = (select auth.uid())) AND (parent_student_links.verified = true)))) AND (shared_with @> '[{"role": "parent"}]'::jsonb));
DROP POLICY IF EXISTS "reflection_digests_student_select" ON public.reflection_digests;
CREATE POLICY "reflection_digests_student_select" ON public.reflection_digests AS PERMISSIVE FOR SELECT TO authenticated USING (student_id = (select auth.uid()));
DROP POLICY IF EXISTS "reflection_digests_student_update" ON public.reflection_digests;
CREATE POLICY "reflection_digests_student_update" ON public.reflection_digests AS PERMISSIVE FOR UPDATE TO authenticated USING (student_id = (select auth.uid())) WITH CHECK (student_id = (select auth.uid()));
DROP POLICY IF EXISTS "reflection_digests_teacher_select" ON public.reflection_digests;
CREATE POLICY "reflection_digests_teacher_select" ON public.reflection_digests AS PERMISSIVE FOR SELECT TO authenticated USING ((shared_with @> '[{"role": "teacher"}]'::jsonb) AND (student_id IN ( SELECT sc.student_id FROM (student_courses sc JOIN courses c ON ((c.id = sc.course_id))) WHERE (c.teacher_id = (select auth.uid())))));

-- reflection_quality_scores
DROP POLICY IF EXISTS "reflection_quality_scores_student_select" ON public.reflection_quality_scores;
CREATE POLICY "reflection_quality_scores_student_select" ON public.reflection_quality_scores AS PERMISSIVE FOR SELECT TO authenticated USING (student_id = (select auth.uid()));

-- audit_runs
DROP POLICY IF EXISTS "admins_read_audit_runs" ON public.audit_runs;
CREATE POLICY "admins_read_audit_runs" ON public.audit_runs AS PERMISSIVE FOR SELECT TO authenticated USING (EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = 'admin'::user_role))));

-- audit_findings
DROP POLICY IF EXISTS "admins_read_audit_findings" ON public.audit_findings;
CREATE POLICY "admins_read_audit_findings" ON public.audit_findings AS PERMISSIVE FOR SELECT TO authenticated USING (EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = 'admin'::user_role))));

-- invitations
DROP POLICY IF EXISTS "staff_read_invitations" ON public.invitations;
CREATE POLICY "staff_read_invitations" ON public.invitations AS PERMISSIVE FOR SELECT TO authenticated USING (institution_id IN ( SELECT profiles.institution_id FROM profiles WHERE (profiles.id = (select auth.uid()))));;
