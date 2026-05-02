-- ============================================================
-- Migration: RLS policies for verified_explanations
-- Feature: AI-Powered Adaptive Quiz Generation (Task 15.2)
-- ============================================================
-- RLS is already enabled on the table from Task 15.1 migration.
-- This migration only adds the policies.
-- ============================================================

-- Teachers: full CRUD for their course questions
DROP POLICY IF EXISTS "verified_teacher_all" ON verified_explanations;
CREATE POLICY "verified_teacher_all" ON verified_explanations
  FOR ALL TO authenticated
  USING (
    (select auth_user_role()) = 'teacher'
    AND question_id IN (
      SELECT id FROM question_bank
      WHERE course_id IN (SELECT id FROM courses WHERE teacher_id = (select auth.uid()))
    )
  );

-- Students: read active verified explanations (served via post-quiz review)
DROP POLICY IF EXISTS "verified_student_read" ON verified_explanations;
CREATE POLICY "verified_student_read" ON verified_explanations
  FOR SELECT TO authenticated
  USING (
    (select auth_user_role()) = 'student'
    AND is_active = true
  );

-- Admins: read all within institution
DROP POLICY IF EXISTS "verified_admin_read" ON verified_explanations;
CREATE POLICY "verified_admin_read" ON verified_explanations
  FOR SELECT TO authenticated
  USING (
    (select auth_user_role()) = 'admin'
    AND institution_id = (select auth_institution_id())
  );
