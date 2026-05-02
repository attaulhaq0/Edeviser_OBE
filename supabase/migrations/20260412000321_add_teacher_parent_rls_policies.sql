-- Teacher SELECT CLO-linked sessions
CREATE POLICY "teacher_select_clo_sessions" ON study_sessions
  FOR SELECT TO authenticated
  USING (
    auth_user_role() = 'teacher'
    AND course_id IN (
      SELECT c.id FROM courses c WHERE c.teacher_id = auth.uid()
    )
    AND (clo_ids IS NOT NULL OR clo_id IS NOT NULL)
  );

-- Parent SELECT linked student sessions
CREATE POLICY "parent_select_linked_sessions" ON study_sessions
  FOR SELECT TO authenticated
  USING (
    auth_user_role() = 'parent'
    AND student_id IN (
      SELECT psl.student_id FROM parent_student_links psl
      WHERE psl.parent_id = auth.uid() AND psl.verified = true
    )
  );

-- Parent SELECT linked student tasks
CREATE POLICY "parent_select_linked_tasks" ON planner_tasks
  FOR SELECT TO authenticated
  USING (
    auth_user_role() = 'parent'
    AND student_id IN (
      SELECT psl.student_id FROM parent_student_links psl
      WHERE psl.parent_id = auth.uid() AND psl.verified = true
    )
  );

-- Parent SELECT linked student goals
CREATE POLICY "parent_select_linked_goals" ON weekly_goals
  FOR SELECT TO authenticated
  USING (
    auth_user_role() = 'parent'
    AND student_id IN (
      SELECT psl.student_id FROM parent_student_links psl
      WHERE psl.parent_id = auth.uid() AND psl.verified = true
    )
  );

-- Teacher SELECT course student evidence
CREATE POLICY "teacher_select_course_evidence" ON session_evidence
  FOR SELECT TO authenticated
  USING (
    auth_user_role() = 'teacher'
    AND session_id IN (
      SELECT ss.id FROM study_sessions ss
      JOIN courses c ON ss.course_id = c.id
      WHERE c.teacher_id = auth.uid()
    )
  );

-- Session reflections: student SELECT + INSERT own only
CREATE POLICY "student_select_own_reflections" ON session_reflections
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "student_insert_own_reflections" ON session_reflections
  FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid());;
