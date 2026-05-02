-- ============================================================
-- Migration: RLS policies for blooms_progression
-- Feature: AI-Powered Adaptive Quiz Generation (Task 17.2)
-- ============================================================
-- RLS is already enabled on the table from Task 17.1 migration.
-- This migration only adds the policies.
-- ============================================================

-- Students: read their own progression
DROP POLICY IF EXISTS "blooms_student_read" ON blooms_progression;
CREATE POLICY "blooms_student_read" ON blooms_progression
  FOR SELECT TO authenticated
  USING (student_id = (select auth.uid()));

-- Teachers: read progression for their courses
DROP POLICY IF EXISTS "blooms_teacher_read" ON blooms_progression;
CREATE POLICY "blooms_teacher_read" ON blooms_progression
  FOR SELECT TO authenticated
  USING (
    (select auth_user_role()) = 'teacher'
    AND course_id IN (SELECT id FROM courses WHERE teacher_id = (select auth.uid()))
  );

-- Admins: read all within institution
DROP POLICY IF EXISTS "blooms_admin_read" ON blooms_progression;
CREATE POLICY "blooms_admin_read" ON blooms_progression
  FOR SELECT TO authenticated
  USING (
    (select auth_user_role()) = 'admin'
    AND institution_id = (select auth_institution_id())
  );
