-- ============================================
-- Migration 5a: RLS Policies for New Tables (Part 1)
-- ============================================

-- student_activity_log policies (append-only)
CREATE POLICY "activity_log_student_insert" ON student_activity_log
  FOR INSERT WITH CHECK (student_id = auth.uid());
CREATE POLICY "activity_log_admin_read" ON student_activity_log
  FOR SELECT USING (auth_user_role() = 'admin');

-- ai_feedback policies
CREATE POLICY "ai_feedback_student_read" ON ai_feedback
  FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "ai_feedback_student_update" ON ai_feedback
  FOR UPDATE USING (student_id = auth.uid());
CREATE POLICY "ai_feedback_teacher_read" ON ai_feedback
  FOR SELECT USING (
    auth_user_role() = 'teacher'
    AND student_id IN (
      SELECT sc.student_id FROM student_courses sc
      JOIN courses c ON c.id = sc.course_id
      WHERE c.teacher_id = auth.uid()
    )
  );
CREATE POLICY "ai_feedback_admin_read" ON ai_feedback
  FOR SELECT USING (auth_user_role() = 'admin');

-- semesters policies
CREATE POLICY "semesters_institution_read" ON semesters
  FOR SELECT USING (institution_id = auth_institution_id());
CREATE POLICY "semesters_admin_write" ON semesters
  FOR ALL USING (auth_user_role() = 'admin' AND institution_id = auth_institution_id());

-- departments policies
CREATE POLICY "departments_institution_read" ON departments
  FOR SELECT USING (institution_id = auth_institution_id());
CREATE POLICY "departments_admin_write" ON departments
  FOR ALL USING (auth_user_role() = 'admin' AND institution_id = auth_institution_id());

-- course_sections policies
CREATE POLICY "sections_read" ON course_sections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM courses c
      JOIN programs p ON p.id = c.program_id
      WHERE c.id = course_sections.course_id
      AND p.institution_id = auth_institution_id()
    )
  );
CREATE POLICY "sections_admin_write" ON course_sections
  FOR ALL USING (
    auth_user_role() = 'admin'
    AND EXISTS (
      SELECT 1 FROM courses c
      JOIN programs p ON p.id = c.program_id
      WHERE c.id = course_sections.course_id
      AND p.institution_id = auth_institution_id()
    )
  );
CREATE POLICY "sections_coordinator_write" ON course_sections
  FOR ALL USING (
    auth_user_role() = 'coordinator'
    AND EXISTS (
      SELECT 1 FROM courses c
      JOIN programs p ON p.id = c.program_id
      WHERE c.id = course_sections.course_id
      AND p.coordinator_id = auth.uid()
    )
  );

-- surveys policies
CREATE POLICY "surveys_institution_read" ON surveys
  FOR SELECT USING (institution_id = auth_institution_id());
CREATE POLICY "surveys_admin_write" ON surveys
  FOR ALL USING (auth_user_role() = 'admin' AND institution_id = auth_institution_id());
CREATE POLICY "surveys_coordinator_write" ON surveys
  FOR ALL USING (auth_user_role() = 'coordinator' AND institution_id = auth_institution_id());

-- survey_questions policies
CREATE POLICY "survey_questions_read" ON survey_questions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM surveys s WHERE s.id = survey_questions.survey_id AND s.institution_id = auth_institution_id())
  );
CREATE POLICY "survey_questions_admin_write" ON survey_questions
  FOR ALL USING (
    auth_user_role() IN ('admin', 'coordinator')
    AND EXISTS (SELECT 1 FROM surveys s WHERE s.id = survey_questions.survey_id AND s.institution_id = auth_institution_id())
  );

-- survey_responses policies
CREATE POLICY "survey_responses_own_read" ON survey_responses
  FOR SELECT USING (respondent_id = auth.uid());
CREATE POLICY "survey_responses_own_insert" ON survey_responses
  FOR INSERT WITH CHECK (respondent_id = auth.uid());
CREATE POLICY "survey_responses_admin_read" ON survey_responses
  FOR SELECT USING (
    auth_user_role() IN ('admin', 'coordinator')
    AND EXISTS (SELECT 1 FROM surveys s WHERE s.id = survey_responses.survey_id AND s.institution_id = auth_institution_id())
  );

-- cqi_action_plans policies
CREATE POLICY "cqi_plans_read" ON cqi_action_plans
  FOR SELECT USING (
    auth_user_role() IN ('admin', 'coordinator')
    AND EXISTS (
      SELECT 1 FROM programs p WHERE p.id = cqi_action_plans.program_id AND p.institution_id = auth_institution_id()
    )
  );
CREATE POLICY "cqi_plans_coordinator_write" ON cqi_action_plans
  FOR ALL USING (
    auth_user_role() = 'coordinator'
    AND EXISTS (
      SELECT 1 FROM programs p WHERE p.id = cqi_action_plans.program_id AND p.coordinator_id = auth.uid()
    )
  );
CREATE POLICY "cqi_plans_admin_write" ON cqi_action_plans
  FOR ALL USING (
    auth_user_role() = 'admin'
    AND EXISTS (
      SELECT 1 FROM programs p WHERE p.id = cqi_action_plans.program_id AND p.institution_id = auth_institution_id()
    )
  );

-- institution_settings policies
CREATE POLICY "institution_settings_read" ON institution_settings
  FOR SELECT USING (institution_id = auth_institution_id());
CREATE POLICY "institution_settings_admin_write" ON institution_settings
  FOR ALL USING (auth_user_role() = 'admin' AND institution_id = auth_institution_id());

-- program_accreditations policies
CREATE POLICY "program_accreditations_read" ON program_accreditations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM programs p WHERE p.id = program_accreditations.program_id AND p.institution_id = auth_institution_id())
  );
CREATE POLICY "program_accreditations_admin_write" ON program_accreditations
  FOR ALL USING (
    auth_user_role() = 'admin'
    AND EXISTS (SELECT 1 FROM programs p WHERE p.id = program_accreditations.program_id AND p.institution_id = auth_institution_id())
  );
CREATE POLICY "program_accreditations_coordinator_write" ON program_accreditations
  FOR ALL USING (
    auth_user_role() = 'coordinator'
    AND EXISTS (SELECT 1 FROM programs p WHERE p.id = program_accreditations.program_id AND p.coordinator_id = auth.uid())
  );
;
