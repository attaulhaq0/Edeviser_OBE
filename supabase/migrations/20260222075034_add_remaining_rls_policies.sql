-- ==============================
-- PROGRAMS RLS
-- ==============================
CREATE POLICY "programs_institution_read" ON public.programs
  FOR SELECT USING (institution_id = auth_institution_id());

CREATE POLICY "programs_admin_write" ON public.programs
  FOR ALL USING (
    auth_user_role() = 'admin'
    AND institution_id = auth_institution_id()
  );

-- ==============================
-- COURSES RLS
-- ==============================
CREATE POLICY "courses_institution_read" ON public.courses
  FOR SELECT USING (
    program_id IN (SELECT id FROM public.programs WHERE institution_id = auth_institution_id())
  );

CREATE POLICY "courses_coordinator_write" ON public.courses
  FOR ALL USING (
    auth_user_role() = 'coordinator'
    AND program_id IN (SELECT id FROM public.programs WHERE coordinator_id = auth.uid())
  );

CREATE POLICY "courses_admin_write" ON public.courses
  FOR ALL USING (
    auth_user_role() = 'admin'
    AND program_id IN (SELECT id FROM public.programs WHERE institution_id = auth_institution_id())
  );

-- ==============================
-- STUDENT_COURSES RLS
-- ==============================
CREATE POLICY "student_courses_student_read" ON public.student_courses
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "student_courses_teacher_manage" ON public.student_courses
  FOR ALL USING (
    auth_user_role() = 'teacher'
    AND course_id IN (SELECT id FROM public.courses WHERE teacher_id = auth.uid())
  );

CREATE POLICY "student_courses_admin_read" ON public.student_courses
  FOR SELECT USING (
    auth_user_role() IN ('admin', 'coordinator')
  );

-- ==============================
-- OUTCOME MAPPINGS RLS
-- ==============================
CREATE POLICY "outcome_mappings_institution_read" ON public.outcome_mappings
  FOR SELECT USING (
    source_outcome_id IN (SELECT id FROM public.learning_outcomes WHERE institution_id = auth_institution_id())
  );

CREATE POLICY "outcome_mappings_admin_write" ON public.outcome_mappings
  FOR ALL USING (auth_user_role() = 'admin');

CREATE POLICY "outcome_mappings_coordinator_write" ON public.outcome_mappings
  FOR ALL USING (auth_user_role() = 'coordinator');

CREATE POLICY "outcome_mappings_teacher_write" ON public.outcome_mappings
  FOR ALL USING (auth_user_role() = 'teacher');

-- ==============================
-- RUBRICS RLS
-- ==============================
CREATE POLICY "rubrics_institution_read" ON public.rubrics
  FOR SELECT USING (
    clo_id IN (SELECT id FROM public.learning_outcomes WHERE institution_id = auth_institution_id())
    OR is_template = true
  );

CREATE POLICY "rubrics_teacher_write" ON public.rubrics
  FOR ALL USING (
    auth_user_role() = 'teacher'
    AND (created_by = auth.uid() OR is_template = true)
  );

-- ==============================
-- RUBRIC_CRITERIA RLS
-- ==============================
CREATE POLICY "rubric_criteria_read" ON public.rubric_criteria
  FOR SELECT USING (
    rubric_id IN (SELECT id FROM public.rubrics)
  );

CREATE POLICY "rubric_criteria_teacher_write" ON public.rubric_criteria
  FOR ALL USING (
    auth_user_role() = 'teacher'
    AND rubric_id IN (SELECT id FROM public.rubrics WHERE created_by = auth.uid())
  );

-- ==============================
-- ASSIGNMENTS RLS
-- ==============================
CREATE POLICY "assignments_teacher_write" ON public.assignments
  FOR ALL USING (
    auth_user_role() = 'teacher'
    AND course_id IN (SELECT id FROM public.courses WHERE teacher_id = auth.uid())
  );

CREATE POLICY "assignments_student_read" ON public.assignments
  FOR SELECT USING (
    course_id IN (SELECT course_id FROM public.student_courses WHERE student_id = auth.uid() AND status = 'active')
  );

CREATE POLICY "assignments_staff_read" ON public.assignments
  FOR SELECT USING (
    auth_user_role() IN ('admin', 'coordinator')
  );

-- ==============================
-- GRADES RLS
-- ==============================
CREATE POLICY "grades_teacher_write" ON public.grades
  FOR ALL USING (
    auth_user_role() = 'teacher'
    AND graded_by = auth.uid()
  );

CREATE POLICY "grades_student_read" ON public.grades
  FOR SELECT USING (
    submission_id IN (SELECT id FROM public.submissions WHERE student_id = auth.uid())
  );

CREATE POLICY "grades_teacher_read" ON public.grades
  FOR SELECT USING (
    auth_user_role() = 'teacher'
    AND submission_id IN (
      SELECT s.id FROM public.submissions s
      JOIN public.assignments a ON a.id = s.assignment_id
      JOIN public.courses c ON c.id = a.course_id
      WHERE c.teacher_id = auth.uid()
    )
  );

-- ==============================
-- OUTCOME_ATTAINMENT RLS
-- ==============================
CREATE POLICY "attainment_student_read" ON public.outcome_attainment
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "attainment_staff_read" ON public.outcome_attainment
  FOR SELECT USING (
    auth_user_role() IN ('teacher', 'coordinator', 'admin')
  );

-- ==============================
-- BADGES RLS
-- ==============================
CREATE POLICY "badges_student_read" ON public.badges
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "badges_public_read" ON public.badges
  FOR SELECT USING (true);

-- ==============================
-- XP_TRANSACTIONS RLS
-- ==============================
CREATE POLICY "xp_transactions_student_read" ON public.xp_transactions
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "xp_transactions_admin_read" ON public.xp_transactions
  FOR SELECT USING (auth_user_role() = 'admin');

-- ==============================
-- JOURNAL_ENTRIES RLS
-- ==============================
CREATE POLICY "journal_student_own" ON public.journal_entries
  FOR ALL USING (student_id = auth.uid());

CREATE POLICY "journal_teacher_read_shared" ON public.journal_entries
  FOR SELECT USING (
    auth_user_role() = 'teacher'
    AND is_shared = true
    AND course_id IN (SELECT id FROM public.courses WHERE teacher_id = auth.uid())
  );

-- ==============================
-- NOTIFICATIONS RLS
-- ==============================
CREATE POLICY "notifications_own" ON public.notifications
  FOR ALL USING (user_id = auth.uid());

-- ==============================
-- AUDIT_LOGS — append only (no update/delete for anyone)
-- ==============================
CREATE POLICY "audit_logs_admin_insert" ON public.audit_logs
  FOR INSERT WITH CHECK (auth_user_role() = 'admin');;
