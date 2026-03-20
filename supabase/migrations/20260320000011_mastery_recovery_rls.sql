-- ============================================================
-- Migration: RLS policies for mastery_recovery_pathways
-- Feature: AI-Powered Adaptive Quiz Generation (Task 14.2)
-- ============================================================
-- Note: RLS is already enabled on the table from task 14.1
-- (20260320000010_create_mastery_recovery_pathways.sql)

-- Drop any existing policies to avoid conflicts
DROP POLICY IF EXISTS "recovery_student_read" ON mastery_recovery_pathways;
DROP POLICY IF EXISTS "recovery_teacher_read" ON mastery_recovery_pathways;
DROP POLICY IF EXISTS "recovery_admin_read" ON mastery_recovery_pathways;
DROP POLICY IF EXISTS "recovery_coordinator_read" ON mastery_recovery_pathways;
DROP POLICY IF EXISTS "student_own_recovery" ON mastery_recovery_pathways;
DROP POLICY IF EXISTS "teacher_course_recovery" ON mastery_recovery_pathways;
DROP POLICY IF EXISTS "coordinator_institution_recovery" ON mastery_recovery_pathways;
DROP POLICY IF EXISTS "admin_recovery" ON mastery_recovery_pathways;
DROP POLICY IF EXISTS "service_recovery" ON mastery_recovery_pathways;

-- ============================================================
-- 1. Student: read own recovery pathways
-- ============================================================
CREATE POLICY "student_own_recovery" ON mastery_recovery_pathways
  FOR SELECT TO authenticated
  USING (auth_user_role() = 'student' AND student_id = auth.uid());

-- ============================================================
-- 2. Teacher: read recovery pathways for their courses
-- ============================================================
CREATE POLICY "teacher_course_recovery" ON mastery_recovery_pathways
  FOR SELECT TO authenticated
  USING (
    auth_user_role() = 'teacher'
    AND course_id IN (SELECT id FROM courses WHERE teacher_id = auth.uid())
  );

-- ============================================================
-- 3. Coordinator: read recovery pathways within institution
-- ============================================================
CREATE POLICY "coordinator_institution_recovery" ON mastery_recovery_pathways
  FOR SELECT TO authenticated
  USING (
    auth_user_role() = 'coordinator'
    AND institution_id = auth_institution_id()
  );

-- ============================================================
-- 4. Admin: full access within institution
-- ============================================================
CREATE POLICY "admin_recovery" ON mastery_recovery_pathways
  FOR ALL TO authenticated
  USING (auth_user_role() = 'admin' AND institution_id = auth_institution_id());

-- ============================================================
-- 5. Service role: full access (for Edge Functions)
-- ============================================================
CREATE POLICY "service_recovery" ON mastery_recovery_pathways
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
