-- =============================================================
-- Migration: Fix Critical Security Issues from Audit Report
-- Date: 2026-04-01
-- Fixes: Missing RLS policies, function search_path, indexes
-- =============================================================

-- =============================================
-- 1. MISSING RLS POLICIES
-- =============================================

-- === evidence table (immutable, append-only) ===
CREATE POLICY "evidence_student_read" ON public.evidence
  FOR SELECT TO authenticated
  USING (student_id = (select auth.uid()));

CREATE POLICY "evidence_staff_read" ON public.evidence
  FOR SELECT TO authenticated
  USING (auth_user_role() IN ('teacher', 'coordinator', 'admin'));

CREATE POLICY "evidence_parent_read" ON public.evidence
  FOR SELECT TO authenticated
  USING (
    auth_user_role() = 'parent'
    AND student_id IN (
      SELECT psl.student_id FROM parent_student_links psl
      WHERE psl.parent_id = (select auth.uid()) AND psl.verified = true
    )
  );

-- === learning_outcomes table ===
CREATE POLICY "outcomes_institution_read" ON public.learning_outcomes
  FOR SELECT TO authenticated
  USING (institution_id = auth_institution_id());

CREATE POLICY "outcomes_admin_write" ON public.learning_outcomes
  FOR ALL TO authenticated
  USING (auth_user_role() = 'admin' AND institution_id = auth_institution_id());

CREATE POLICY "outcomes_coordinator_write" ON public.learning_outcomes
  FOR ALL TO authenticated
  USING (
    auth_user_role() = 'coordinator'
    AND program_id IN (
      SELECT id FROM programs WHERE coordinator_id = (select auth.uid())
    )
  );

CREATE POLICY "outcomes_teacher_write" ON public.learning_outcomes
  FOR ALL TO authenticated
  USING (
    auth_user_role() = 'teacher'
    AND course_id IN (
      SELECT id FROM courses WHERE teacher_id = (select auth.uid())
    )
  );

-- === submissions table ===
CREATE POLICY "submissions_student_own" ON public.submissions
  FOR ALL TO authenticated
  USING (student_id = (select auth.uid()));

CREATE POLICY "submissions_teacher_read" ON public.submissions
  FOR SELECT TO authenticated
  USING (
    auth_user_role() = 'teacher'
    AND assignment_id IN (
      SELECT id FROM assignments WHERE course_id IN (
        SELECT id FROM courses WHERE teacher_id = (select auth.uid())
      )
    )
  );

CREATE POLICY "submissions_admin_read" ON public.submissions
  FOR SELECT TO authenticated
  USING (auth_user_role() IN ('admin', 'coordinator'));

CREATE POLICY "submissions_parent_read" ON public.submissions
  FOR SELECT TO authenticated
  USING (
    auth_user_role() = 'parent'
    AND student_id IN (
      SELECT psl.student_id FROM parent_student_links psl
      WHERE psl.parent_id = (select auth.uid()) AND psl.verified = true
    )
  );

-- === student_gamification missing policies ===
CREATE POLICY "gamification_student_read" ON public.student_gamification
  FOR SELECT TO authenticated
  USING (student_id = (select auth.uid()));

CREATE POLICY "gamification_staff_read" ON public.student_gamification
  FOR SELECT TO authenticated
  USING (auth_user_role() IN ('teacher', 'coordinator', 'admin'));

-- === audit_logs missing SELECT policy ===
CREATE POLICY "audit_logs_admin_read" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (auth_user_role() = 'admin');

-- =============================================
-- 2. FIX FUNCTION SEARCH_PATH (security)
-- =============================================

CREATE OR REPLACE FUNCTION public.auth_user_role()
RETURNS text
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT role::text FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.auth_institution_id()
RETURNS uuid
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT institution_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.health_check_ping()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT true;
$$;

CREATE OR REPLACE FUNCTION public.expire_stale_recovery_sessions()
RETURNS integer
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  expired_count integer;
BEGIN
  UPDATE public.mastery_recovery_pathways
  SET status = 'expired', expired_at = now(), updated_at = now()
  WHERE status = 'active'
    AND activated_at < now() - interval '14 days';
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_wellness_aggregate_stats(p_institution_id uuid)
RETURNS TABLE(wellness_type text, total_logs bigint, unique_students bigint)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    whl.wellness_type::text,
    count(*) AS total_logs,
    count(DISTINCT whl.student_id) AS unique_students
  FROM public.wellness_habit_logs whl
  JOIN public.profiles p ON p.id = whl.student_id
  WHERE p.institution_id = p_institution_id
  GROUP BY whl.wellness_type;
$$;

-- =============================================
-- 3. PERFORMANCE INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_notifications_unread
  ON public.notifications(user_id, is_read)
  WHERE is_read = false;

CREATE INDEX IF NOT EXISTS idx_journal_student_course
  ON public.journal_entries(student_id, course_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_xp_transactions_student_source
  ON public.xp_transactions(student_id, source);;
