-- Enable RLS
ALTER TABLE wellness_habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_wellness_preferences ENABLE ROW LEVEL SECURITY;

-- 1.6: RLS for wellness_habit_logs
-- Students: SELECT own logs
CREATE POLICY "student_select_own_wellness_logs" ON wellness_habit_logs
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());

-- Students: INSERT own logs
CREATE POLICY "student_insert_own_wellness_logs" ON wellness_habit_logs
  FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid() AND auth_user_role() = 'student');

-- Students: UPDATE value field only on own logs
CREATE POLICY "student_update_own_wellness_logs" ON wellness_habit_logs
  FOR UPDATE TO authenticated
  USING (student_id = auth.uid() AND auth_user_role() = 'student')
  WITH CHECK (student_id = auth.uid());

-- Parents: SELECT linked student logs when parent_visibility = true
CREATE POLICY "parent_read_linked_wellness_logs" ON wellness_habit_logs
  FOR SELECT TO authenticated
  USING (
    auth_user_role() = 'parent'
    AND student_id IN (
      SELECT psl.student_id FROM parent_student_links psl
      JOIN student_wellness_preferences swp ON swp.student_id = psl.student_id
      WHERE psl.parent_id = auth.uid()
        AND psl.verified = true
        AND swp.parent_visibility = true
    )
  );

-- No DELETE policy — append-only
-- No teacher SELECT policy

-- 1.7: RLS for student_wellness_preferences
CREATE POLICY "student_manage_own_preferences" ON student_wellness_preferences
  FOR ALL TO authenticated
  USING (student_id = auth.uid() AND auth_user_role() = 'student')
  WITH CHECK (student_id = auth.uid() AND auth_user_role() = 'student');;
