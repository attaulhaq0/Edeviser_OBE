-- ============================================
-- Migration 5c: RLS Policies for Quizzes, Fees, Parent, Calendar
-- ============================================

-- quizzes policies
CREATE POLICY "quizzes_course_read" ON quizzes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM courses c JOIN programs p ON p.id = c.program_id
      WHERE c.id = quizzes.course_id AND p.institution_id = auth_institution_id()
    )
  );
CREATE POLICY "quizzes_teacher_write" ON quizzes
  FOR ALL USING (
    auth_user_role() = 'teacher'
    AND EXISTS (SELECT 1 FROM courses c WHERE c.id = quizzes.course_id AND c.teacher_id = auth.uid())
  );

-- quiz_questions policies
CREATE POLICY "quiz_questions_read" ON quiz_questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM quizzes q
      JOIN courses c ON c.id = q.course_id
      JOIN programs p ON p.id = c.program_id
      WHERE q.id = quiz_questions.quiz_id AND p.institution_id = auth_institution_id()
    )
  );
CREATE POLICY "quiz_questions_teacher_write" ON quiz_questions
  FOR ALL USING (
    auth_user_role() = 'teacher'
    AND EXISTS (
      SELECT 1 FROM quizzes q
      JOIN courses c ON c.id = q.course_id
      WHERE q.id = quiz_questions.quiz_id AND c.teacher_id = auth.uid()
    )
  );

-- quiz_attempts policies
CREATE POLICY "quiz_attempts_own" ON quiz_attempts
  FOR ALL USING (student_id = auth.uid());
CREATE POLICY "quiz_attempts_teacher_read" ON quiz_attempts
  FOR SELECT USING (
    auth_user_role() = 'teacher'
    AND EXISTS (
      SELECT 1 FROM quizzes q
      JOIN courses c ON c.id = q.course_id
      WHERE q.id = quiz_attempts.quiz_id AND c.teacher_id = auth.uid()
    )
  );

-- grade_categories policies
CREATE POLICY "grade_categories_read" ON grade_categories
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM courses c JOIN programs p ON p.id = c.program_id
      WHERE c.id = grade_categories.course_id AND p.institution_id = auth_institution_id()
    )
  );
CREATE POLICY "grade_categories_teacher_write" ON grade_categories
  FOR ALL USING (
    auth_user_role() = 'teacher'
    AND EXISTS (SELECT 1 FROM courses c WHERE c.id = grade_categories.course_id AND c.teacher_id = auth.uid())
  );

-- timetable_slots policies
CREATE POLICY "timetable_slots_read" ON timetable_slots
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM course_sections cs
      JOIN courses c ON c.id = cs.course_id
      JOIN programs p ON p.id = c.program_id
      WHERE cs.id = timetable_slots.section_id AND p.institution_id = auth_institution_id()
    )
  );
CREATE POLICY "timetable_slots_admin_write" ON timetable_slots
  FOR ALL USING (
    auth_user_role() = 'admin'
    AND EXISTS (
      SELECT 1 FROM course_sections cs
      JOIN courses c ON c.id = cs.course_id
      JOIN programs p ON p.id = c.program_id
      WHERE cs.id = timetable_slots.section_id AND p.institution_id = auth_institution_id()
    )
  );

-- academic_calendar_events policies
CREATE POLICY "calendar_events_institution_read" ON academic_calendar_events
  FOR SELECT USING (institution_id = auth_institution_id());
CREATE POLICY "calendar_events_admin_write" ON academic_calendar_events
  FOR ALL USING (auth_user_role() = 'admin' AND institution_id = auth_institution_id());

-- parent_student_links policies
CREATE POLICY "parent_links_parent_read" ON parent_student_links
  FOR SELECT USING (parent_id = auth.uid());
CREATE POLICY "parent_links_student_read" ON parent_student_links
  FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "parent_links_admin_manage" ON parent_student_links
  FOR ALL USING (
    auth_user_role() = 'admin'
    AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = parent_student_links.student_id AND p.institution_id = auth_institution_id())
  );

-- fee_structures policies
CREATE POLICY "fee_structures_institution_read" ON fee_structures
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM programs p WHERE p.id = fee_structures.program_id AND p.institution_id = auth_institution_id()
    )
  );
CREATE POLICY "fee_structures_admin_write" ON fee_structures
  FOR ALL USING (
    auth_user_role() = 'admin'
    AND EXISTS (
      SELECT 1 FROM programs p WHERE p.id = fee_structures.program_id AND p.institution_id = auth_institution_id()
    )
  );

-- fee_payments policies
CREATE POLICY "fee_payments_own_read" ON fee_payments
  FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "fee_payments_admin_manage" ON fee_payments
  FOR ALL USING (
    auth_user_role() = 'admin'
    AND EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = fee_payments.student_id AND p.institution_id = auth_institution_id()
    )
  );

-- Parent read-only access to linked student data
CREATE POLICY "parent_read_student_grades" ON grades
  FOR SELECT USING (
    auth_user_role() = 'parent'
    AND EXISTS (
      SELECT 1 FROM submissions s
      JOIN parent_student_links psl ON psl.student_id = s.student_id
      WHERE s.id = grades.submission_id
      AND psl.parent_id = auth.uid()
      AND psl.verified = true
    )
  );
CREATE POLICY "parent_read_student_attendance" ON attendance_records
  FOR SELECT USING (
    auth_user_role() = 'parent'
    AND EXISTS (
      SELECT 1 FROM parent_student_links psl
      WHERE psl.student_id = attendance_records.student_id
      AND psl.parent_id = auth.uid()
      AND psl.verified = true
    )
  );
CREATE POLICY "parent_read_student_gamification" ON student_gamification
  FOR SELECT USING (
    auth_user_role() = 'parent'
    AND EXISTS (
      SELECT 1 FROM parent_student_links psl
      WHERE psl.student_id = student_gamification.student_id
      AND psl.parent_id = auth.uid()
      AND psl.verified = true
    )
  );
CREATE POLICY "parent_read_student_attainment" ON outcome_attainment
  FOR SELECT USING (
    auth_user_role() = 'parent'
    AND student_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM parent_student_links psl
      WHERE psl.student_id = outcome_attainment.student_id
      AND psl.parent_id = auth.uid()
      AND psl.verified = true
    )
  );
;
