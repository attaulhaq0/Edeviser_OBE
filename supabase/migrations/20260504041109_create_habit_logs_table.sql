-- B2: Create habit_logs table for academic daily habits (login, submit, journal, read)
-- Distinct from wellness_habit_logs which tracks meditation, hydration, exercise, sleep

CREATE TABLE habit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  habit_type text NOT NULL CHECK (habit_type IN ('login', 'submit', 'journal', 'read')),
  date date NOT NULL,
  completed_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, habit_type, date)
);

-- Indexes for common query patterns
CREATE INDEX idx_habit_logs_student_date ON habit_logs(student_id, date);
CREATE INDEX idx_habit_logs_student_type_date ON habit_logs(student_id, habit_type, date);

-- Enable RLS
ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;

-- Student: SELECT/INSERT/UPDATE own rows
CREATE POLICY "student_select_own" ON habit_logs
  FOR SELECT TO authenticated
  USING (auth_user_role() = 'student' AND student_id = auth.uid());

CREATE POLICY "student_insert_own" ON habit_logs
  FOR INSERT TO authenticated
  WITH CHECK (auth_user_role() = 'student' AND student_id = auth.uid());

CREATE POLICY "student_update_own" ON habit_logs
  FOR UPDATE TO authenticated
  USING (auth_user_role() = 'student' AND student_id = auth.uid())
  WITH CHECK (auth_user_role() = 'student' AND student_id = auth.uid());

-- Parent: SELECT linked student rows via parent_student_links
CREATE POLICY "parent_select_linked" ON habit_logs
  FOR SELECT TO authenticated
  USING (
    auth_user_role() = 'parent'
    AND student_id IN (
      SELECT psl.student_id FROM parent_student_links psl
      WHERE psl.parent_id = auth.uid() AND psl.verified = true
    )
  );

-- Admin: full access within institution
CREATE POLICY "admin_all" ON habit_logs
  FOR ALL TO authenticated
  USING (
    auth_user_role() = 'admin'
    AND student_id IN (
      SELECT p.id FROM profiles p
      WHERE p.institution_id = auth_institution_id()
    )
  );

-- Teacher/Coordinator: SELECT for students in their institution
CREATE POLICY "staff_select" ON habit_logs
  FOR SELECT TO authenticated
  USING (
    auth_user_role() IN ('teacher', 'coordinator')
    AND student_id IN (
      SELECT p.id FROM profiles p
      WHERE p.institution_id = auth_institution_id()
    )
  );

-- Service role bypass (for edge functions using service_role key)
-- Note: service_role bypasses RLS by default in Supabase;
