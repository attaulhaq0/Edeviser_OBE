-- ============================================================
-- Migration: RLS policies for mastery_recovery_pathways
-- Feature: AI-Powered Adaptive Quiz Generation (Task 14.2)
-- ============================================================

-- ============================================================
-- mastery_recovery_pathways RLS policies
-- Students: read their own recovery pathways
-- Teachers: read recovery pathways for their courses
-- Admins: read all within institution
-- Coordinators: read for metrics dashboard
-- System (Edge Functions with service role) handles INSERT/UPDATE
-- ============================================================

-- Students: read their own recovery pathways
CREATE POLICY "recovery_student_read" ON mastery_recovery_pathways
  FOR SELECT TO authenticated
  USING (student_id = (select auth.uid()));

-- Teachers: read recovery pathways for their courses
CREATE POLICY "recovery_teacher_read" ON mastery_recovery_pathways
  FOR SELECT TO authenticated
  USING (
    (select auth_user_role()) = 'teacher'
    AND course_id IN (SELECT id FROM courses WHERE teacher_id = (select auth.uid()))
  );

-- Admins: read all within institution
CREATE POLICY "recovery_admin_read" ON mastery_recovery_pathways
  FOR SELECT TO authenticated
  USING (
    (select auth_user_role()) = 'admin'
    AND institution_id = (select auth_institution_id())
  );

-- Coordinators: read for metrics dashboard
CREATE POLICY "recovery_coordinator_read" ON mastery_recovery_pathways
  FOR SELECT TO authenticated
  USING (
    (select auth_user_role()) = 'coordinator'
    AND institution_id = (select auth_institution_id())
  );
;
