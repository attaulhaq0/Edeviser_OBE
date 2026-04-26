-- ============================================================
-- tutor_plan_updates — Learning plan update suggestions
-- Requirement 24, 25: Learning Plan Update Generation & Tracking
-- ============================================================

CREATE TABLE IF NOT EXISTS tutor_plan_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id),
  institution_id UUID NOT NULL REFERENCES institutions(id),
  course_id UUID NOT NULL REFERENCES courses(id),
  clo_id UUID NOT NULL,
  conversation_id UUID NOT NULL REFERENCES tutor_conversations(id),
  study_time_recommendation TEXT NOT NULL,
  recommended_materials JSONB NOT NULL DEFAULT '[]',
  suggested_planner_sessions INTEGER NOT NULL DEFAULT 1,
  interaction_count INTEGER NOT NULL,
  response VARCHAR(20) CHECK (response IN ('accepted', 'modified', 'dismissed')),
  modifications TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ
);

-- Index for querying plan updates by student + CLO (most recent first)
CREATE INDEX IF NOT EXISTS idx_plan_updates_student_clo
  ON tutor_plan_updates (student_id, clo_id, created_at DESC);

-- Index for institution-scoped queries
CREATE INDEX IF NOT EXISTS idx_plan_updates_institution
  ON tutor_plan_updates (institution_id);

-- ============================================================
-- RLS Policies
-- ============================================================

ALTER TABLE tutor_plan_updates ENABLE ROW LEVEL SECURITY;

-- Students can read and update their own plan updates
CREATE POLICY "plan_updates_student_select" ON tutor_plan_updates
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "plan_updates_student_update" ON tutor_plan_updates
  FOR UPDATE TO authenticated
  USING (student_id = auth.uid());

-- Teachers can read plan updates for students in their courses
CREATE POLICY "plan_updates_teacher_select" ON tutor_plan_updates
  FOR SELECT TO authenticated
  USING (
    auth_user_role() = 'teacher'
    AND course_id IN (
      SELECT id FROM courses WHERE teacher_id = auth.uid()
    )
  );

-- Admin can read all within institution
CREATE POLICY "plan_updates_admin_select" ON tutor_plan_updates
  FOR SELECT TO authenticated
  USING (
    auth_user_role() = 'admin'
    AND institution_id = auth_institution_id()
  );
