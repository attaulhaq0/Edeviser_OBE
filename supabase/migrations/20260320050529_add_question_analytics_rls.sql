-- RLS policies for question_analytics
-- RLS is already enabled on this table

-- Teacher: read analytics for questions in their courses
CREATE POLICY "qanalytics_teacher_read" ON question_analytics
  FOR SELECT TO authenticated
  USING (
    auth_user_role() = 'teacher'
    AND question_id IN (
      SELECT id FROM question_bank
      WHERE course_id IN (SELECT id FROM courses WHERE teacher_id = (select auth.uid()))
    )
  );

-- Admin: read analytics within institution
CREATE POLICY "qanalytics_admin_read" ON question_analytics
  FOR SELECT TO authenticated
  USING (
    auth_user_role() = 'admin'
    AND question_id IN (
      SELECT id FROM question_bank WHERE institution_id = auth_institution_id()
    )
  );;
