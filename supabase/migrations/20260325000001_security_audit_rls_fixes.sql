-- ============================================================
-- Security Audit Remediation: RLS Policy Fixes
-- Fixes: Vulns 14-27 (cross-tenant leakage + overly permissive)
-- Date: 2026-03-25
-- ============================================================

-- ─── Vuln 14: student_courses cross-tenant read ─────────────────────────────
DROP POLICY IF EXISTS "student_courses_admin_read" ON public.student_courses;
CREATE POLICY "student_courses_admin_read" ON public.student_courses
  FOR SELECT USING (
    auth_user_role() IN ('admin', 'coordinator')
    AND course_id IN (
      SELECT id FROM public.courses WHERE program_id IN (
        SELECT id FROM public.programs WHERE institution_id = auth_institution_id()
      )
    )
  );

-- ─── Vuln 15: outcome_mappings cross-tenant write ───────────────────────────
DROP POLICY IF EXISTS "outcome_mappings_admin_write" ON public.outcome_mappings;
DROP POLICY IF EXISTS "outcome_mappings_coordinator_write" ON public.outcome_mappings;
DROP POLICY IF EXISTS "outcome_mappings_teacher_write" ON public.outcome_mappings;

CREATE POLICY "outcome_mappings_admin_write" ON public.outcome_mappings
  FOR ALL USING (
    auth_user_role() = 'admin'
    AND source_outcome_id IN (
      SELECT id FROM public.learning_outcomes WHERE institution_id = auth_institution_id()
    )
  );
CREATE POLICY "outcome_mappings_coordinator_write" ON public.outcome_mappings
  FOR ALL USING (
    auth_user_role() = 'coordinator'
    AND source_outcome_id IN (
      SELECT id FROM public.learning_outcomes WHERE institution_id = auth_institution_id()
    )
  );
CREATE POLICY "outcome_mappings_teacher_write" ON public.outcome_mappings
  FOR ALL USING (
    auth_user_role() = 'teacher'
    AND source_outcome_id IN (
      SELECT id FROM public.learning_outcomes WHERE institution_id = auth_institution_id()
    )
  );

-- ─── Vuln 16: assignments cross-tenant read ─────────────────────────────────
DROP POLICY IF EXISTS "assignments_staff_read" ON public.assignments;
CREATE POLICY "assignments_staff_read" ON public.assignments
  FOR SELECT USING (
    auth_user_role() IN ('admin', 'coordinator')
    AND course_id IN (
      SELECT id FROM public.courses WHERE program_id IN (
        SELECT id FROM public.programs WHERE institution_id = auth_institution_id()
      )
    )
  );

-- ─── Vuln 17: outcome_attainment cross-tenant read ──────────────────────────
DROP POLICY IF EXISTS "attainment_staff_read" ON public.outcome_attainment;
CREATE POLICY "attainment_staff_read" ON public.outcome_attainment
  FOR SELECT USING (
    auth_user_role() IN ('teacher', 'coordinator', 'admin')
    AND student_id IN (
      SELECT id FROM public.profiles WHERE institution_id = auth_institution_id()
    )
  );

-- ─── Vuln 18: attendance_records cross-tenant read ──────────────────────────
DROP POLICY IF EXISTS "attendance_admin_read" ON attendance_records;
CREATE POLICY "attendance_admin_read" ON attendance_records
  FOR SELECT USING (
    auth_user_role() = 'admin'
    AND student_id IN (
      SELECT id FROM public.profiles WHERE institution_id = auth_institution_id()
    )
  );

-- ─── Vuln 19: SECURITY DEFINER function without auth check ──────────────────
CREATE OR REPLACE FUNCTION get_wellness_aggregate_stats(p_institution_id uuid)
RETURNS TABLE (
  wellness_type text,
  total_logs bigint,
  unique_students bigint
) AS $
BEGIN
  -- Security: verify caller belongs to the requested institution
  IF auth_institution_id() != p_institution_id THEN
    RAISE EXCEPTION 'unauthorized: institution mismatch';
  END IF;

  RETURN QUERY
  SELECT
    whl.wellness_type::text,
    COUNT(*)::bigint AS total_logs,
    COUNT(DISTINCT whl.student_id)::bigint AS unique_students
  FROM wellness_habit_logs whl
  JOIN profiles p ON p.id = whl.student_id
  WHERE p.institution_id = p_institution_id
  GROUP BY whl.wellness_type;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── Vuln 21: xp_transactions cross-tenant read ────────────────────────────
DROP POLICY IF EXISTS "xp_transactions_admin_read" ON public.xp_transactions;
CREATE POLICY "xp_transactions_admin_read" ON public.xp_transactions
  FOR SELECT USING (
    auth_user_role() = 'admin'
    AND student_id IN (
      SELECT id FROM public.profiles WHERE institution_id = auth_institution_id()
    )
  );

-- ─── Vuln 22: ai_feedback cross-tenant read ────────────────────────────────
DROP POLICY IF EXISTS "ai_feedback_admin_read" ON ai_feedback;
CREATE POLICY "ai_feedback_admin_read" ON ai_feedback
  FOR SELECT USING (
    auth_user_role() = 'admin'
    AND student_id IN (
      SELECT id FROM public.profiles WHERE institution_id = auth_institution_id()
    )
  );

-- ─── Vuln 23: student_activity_log cross-tenant read ────────────────────────
DROP POLICY IF EXISTS "activity_log_admin_read" ON student_activity_log;
CREATE POLICY "activity_log_admin_read" ON student_activity_log
  FOR SELECT USING (
    auth_user_role() = 'admin'
    AND student_id IN (
      SELECT id FROM public.profiles WHERE institution_id = auth_institution_id()
    )
  );

-- ─── Vuln 24: habit_tracking cross-tenant read ─────────────────────────────
DROP POLICY IF EXISTS "habit_tracking_staff_read" ON public.habit_tracking;
CREATE POLICY "habit_tracking_staff_read" ON public.habit_tracking
  FOR SELECT USING (
    auth_user_role() IN ('teacher', 'coordinator', 'admin')
    AND student_id IN (
      SELECT id FROM public.profiles WHERE institution_id = auth_institution_id()
    )
  );

-- ─── Vuln 25: badges cross-tenant read ──────────────────────────────────────
DROP POLICY IF EXISTS "badges_public_read" ON public.badges;
CREATE POLICY "badges_institution_read" ON public.badges
  FOR SELECT USING (
    student_id IN (
      SELECT id FROM public.profiles WHERE institution_id = auth_institution_id()
    )
  );

-- ─── Vuln 26: verified_explanations cross-tenant student read ───────────────
DROP POLICY IF EXISTS "verified_student_read" ON verified_explanations;
CREATE POLICY "verified_student_read" ON verified_explanations
  FOR SELECT TO authenticated
  USING (
    auth_user_role() = 'student'
    AND is_active = true
    AND question_id IN (
      SELECT id FROM question_bank
      WHERE course_id IN (
        SELECT course_id FROM student_courses WHERE student_id = auth.uid()
      )
    )
  );

-- ─── Vuln 27: quiz_attempts overly permissive ──────────────────────────────
DROP POLICY IF EXISTS "quiz_attempts_own" ON quiz_attempts;
CREATE POLICY "quiz_attempts_student_read" ON quiz_attempts
  FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "quiz_attempts_student_insert" ON quiz_attempts
  FOR INSERT WITH CHECK (student_id = auth.uid());
