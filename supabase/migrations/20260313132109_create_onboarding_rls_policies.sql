-- onboarding_questions RLS
CREATE POLICY "questions_student_read" ON onboarding_questions
  FOR SELECT USING (
    auth_user_role() = 'student'
    AND institution_id = auth_institution_id()
    AND is_active = true
  );

CREATE POLICY "questions_teacher_manage" ON onboarding_questions
  FOR ALL USING (
    auth_user_role() = 'teacher'
    AND assessment_type = 'baseline'
    AND course_id IN (SELECT id FROM courses WHERE teacher_id = auth.uid())
  );

CREATE POLICY "questions_admin_all" ON onboarding_questions
  FOR ALL USING (
    auth_user_role() = 'admin'
    AND institution_id = auth_institution_id()
  );

-- onboarding_responses RLS
CREATE POLICY "responses_student_own" ON onboarding_responses
  FOR ALL USING (student_id = auth.uid());

-- onboarding_progress RLS
CREATE POLICY "progress_student_own" ON onboarding_progress
  FOR ALL USING (student_id = auth.uid());

-- student_profiles RLS
CREATE POLICY "profiles_student_own" ON student_profiles
  FOR ALL USING (student_id = auth.uid());

CREATE POLICY "profiles_admin_read" ON student_profiles
  FOR SELECT USING (
    auth_user_role() = 'admin'
    AND institution_id = auth_institution_id()
  );

-- baseline_attainment RLS
CREATE POLICY "baseline_student_own" ON baseline_attainment
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "baseline_teacher_read" ON baseline_attainment
  FOR SELECT USING (
    auth_user_role() = 'teacher'
    AND course_id IN (SELECT id FROM courses WHERE teacher_id = auth.uid())
  );

CREATE POLICY "baseline_admin_read" ON baseline_attainment
  FOR SELECT USING (
    auth_user_role() = 'admin'
    AND course_id IN (
      SELECT c.id FROM courses c
      JOIN programs p ON c.program_id = p.id
      WHERE p.institution_id = auth_institution_id()
    )
  );

-- baseline_test_config RLS
CREATE POLICY "config_student_read" ON baseline_test_config
  FOR SELECT USING (
    auth_user_role() = 'student'
    AND course_id IN (SELECT course_id FROM student_courses WHERE student_id = auth.uid())
  );

CREATE POLICY "config_teacher_manage" ON baseline_test_config
  FOR ALL USING (
    auth_user_role() = 'teacher'
    AND course_id IN (SELECT id FROM courses WHERE teacher_id = auth.uid())
  );

CREATE POLICY "config_admin_all" ON baseline_test_config
  FOR ALL USING (
    auth_user_role() = 'admin'
    AND course_id IN (
      SELECT c.id FROM courses c
      JOIN programs p ON c.program_id = p.id
      WHERE p.institution_id = auth_institution_id()
    )
  );

-- micro_assessment_schedule RLS
CREATE POLICY "micro_schedule_student_own" ON micro_assessment_schedule
  FOR ALL USING (student_id = auth.uid());

-- starter_week_sessions RLS
CREATE POLICY "starter_sessions_student_own" ON starter_week_sessions
  FOR ALL USING (student_id = auth.uid());

-- goal_suggestions RLS
CREATE POLICY "goal_suggestions_student_own" ON goal_suggestions
  FOR ALL USING (student_id = auth.uid());;
