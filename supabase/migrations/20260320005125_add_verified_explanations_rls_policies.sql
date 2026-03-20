-- ============================================================
-- Migration: RLS policies for verified_explanations
-- Feature: AI-Powered Adaptive Quiz Generation (Task 15.2)
-- ============================================================

-- ============================================================
-- verified_explanations RLS policies
-- Teachers: full CRUD for their course questions
-- Students: read active verified explanations (served via post-quiz review)
-- Admins: read all within institution
-- ============================================================

-- Teachers: full CRUD for their course questions
CREATE POLICY "verified_teacher_all" ON verified_explanations
  FOR ALL TO authenticated
  USING (
    auth_user_role() = 'teacher'
    AND question_id IN (
      SELECT id FROM question_bank
      WHERE course_id IN (SELECT id FROM courses WHERE teacher_id = auth.uid())
    )
  );

-- Students: read active verified explanations (served via post-quiz review)
CREATE POLICY "verified_student_read" ON verified_explanations
  FOR SELECT TO authenticated
  USING (
    auth_user_role() = 'student'
    AND is_active = true
  );

-- Admins: read all within institution
CREATE POLICY "verified_admin_read" ON verified_explanations
  FOR SELECT TO authenticated
  USING (
    auth_user_role() = 'admin'
    AND institution_id = auth_institution_id()
  );;
