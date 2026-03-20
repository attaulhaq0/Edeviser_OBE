-- ============================================================
-- Migration: Create mastery_recovery_pathways table
-- Feature: AI-Powered Adaptive Quiz Generation (Task 14.1)
-- ============================================================

-- ============================================================
-- mastery_recovery_pathways — Tracks recovery sessions for stuck students
-- ============================================================
CREATE TABLE mastery_recovery_pathways (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id),
  student_id UUID NOT NULL REFERENCES profiles(id),
  clo_id UUID NOT NULL REFERENCES learning_outcomes(id),
  course_id UUID NOT NULL REFERENCES courses(id),
  failure_count INTEGER NOT NULL DEFAULT 2,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired')),
  ai_tutor_completed BOOLEAN NOT NULL DEFAULT false,
  ai_tutor_completed_at TIMESTAMPTZ,
  practice_completed BOOLEAN NOT NULL DEFAULT false,
  practice_completed_at TIMESTAMPTZ,
  peer_suggestion_shown BOOLEAN NOT NULL DEFAULT false,
  peer_suggestion_applicable BOOLEAN NOT NULL DEFAULT true,
  retry_quiz_attempt_id UUID,
  retry_outcome VARCHAR(10) CHECK (retry_outcome IN ('pass', 'fail', NULL)),
  activated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  expired_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE mastery_recovery_pathways ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_recovery_student_clo ON mastery_recovery_pathways (student_id, clo_id);
CREATE INDEX idx_recovery_course ON mastery_recovery_pathways (course_id, status);
CREATE INDEX idx_recovery_status ON mastery_recovery_pathways (status) WHERE status = 'active';
CREATE UNIQUE INDEX idx_recovery_active_unique ON mastery_recovery_pathways (student_id, clo_id) WHERE status = 'active';;
