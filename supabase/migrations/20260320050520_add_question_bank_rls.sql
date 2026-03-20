-- RLS policies for question_bank
-- RLS is already enabled on this table

-- Teacher: full CRUD on questions for their own courses
CREATE POLICY "qbank_teacher_all" ON question_bank
  FOR ALL TO authenticated
  USING (
    auth_user_role() = 'teacher'
    AND course_id IN (SELECT id FROM courses WHERE teacher_id = auth.uid())
  )
  WITH CHECK (
    auth_user_role() = 'teacher'
    AND course_id IN (SELECT id FROM courses WHERE teacher_id = auth.uid())
  );

-- Admin: read-only within institution
CREATE POLICY "qbank_admin_read" ON question_bank
  FOR SELECT TO authenticated
  USING (
    auth_user_role() = 'admin'
    AND institution_id = auth_institution_id()
  );

-- No student policy = no student access;
