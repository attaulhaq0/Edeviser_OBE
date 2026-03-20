-- RLS policies for quiz_generation_logs
-- RLS is already enabled on this table

-- Teacher: read own generation logs
CREATE POLICY "gen_logs_teacher_read" ON quiz_generation_logs
  FOR SELECT TO authenticated
  USING (teacher_id = auth.uid());

-- Admin: read all logs within institution
CREATE POLICY "gen_logs_admin_read" ON quiz_generation_logs
  FOR SELECT TO authenticated
  USING (
    auth_user_role() = 'admin'
    AND institution_id = auth_institution_id()
  );;
