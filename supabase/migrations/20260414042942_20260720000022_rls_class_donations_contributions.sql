-- ============================================================
-- class_donations — RLS
-- ============================================================
ALTER TABLE class_donations ENABLE ROW LEVEL SECURITY;

-- Students: SELECT active donations for courses they're enrolled in
CREATE POLICY "class_donations_student_select" ON class_donations
  FOR SELECT TO authenticated
  USING (
    auth_user_role() = 'student'
    AND status = 'active'
    AND course_id IN (
      SELECT course_id FROM student_courses WHERE student_id = auth.uid()
    )
  );

-- Admins: full CRUD within institution
CREATE POLICY "class_donations_admin_all" ON class_donations
  FOR ALL TO authenticated
  USING (
    auth_user_role() = 'admin'
    AND institution_id = auth_institution_id()
  );

-- Teachers: SELECT donations for their courses
CREATE POLICY "class_donations_teacher_select" ON class_donations
  FOR SELECT TO authenticated
  USING (
    auth_user_role() = 'teacher'
    AND course_id IN (
      SELECT id FROM courses WHERE teacher_id = auth.uid()
    )
  );

-- ============================================================
-- class_donation_contributions — RLS
-- ============================================================
ALTER TABLE class_donation_contributions ENABLE ROW LEVEL SECURITY;

-- Students: SELECT their own contributions
CREATE POLICY "donation_contributions_student_select" ON class_donation_contributions
  FOR SELECT TO authenticated
  USING (
    auth_user_role() = 'student'
    AND student_id = auth.uid()
  );

-- Students: INSERT their own contributions
CREATE POLICY "donation_contributions_student_insert" ON class_donation_contributions
  FOR INSERT TO authenticated
  WITH CHECK (
    auth_user_role() = 'student'
    AND student_id = auth.uid()
  );

-- Admins: SELECT all contributions within institution
CREATE POLICY "donation_contributions_admin_select" ON class_donation_contributions
  FOR SELECT TO authenticated
  USING (
    auth_user_role() = 'admin'
    AND donation_id IN (
      SELECT id FROM class_donations WHERE institution_id = auth_institution_id()
    )
  );;
