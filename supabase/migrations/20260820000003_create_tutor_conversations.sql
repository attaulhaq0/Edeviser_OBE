-- ============================================================
-- Migration: Create tutor_conversations table
-- Feature: AI Chat Tutor with RAG Engine — Chat Sessions
-- ============================================================

CREATE TABLE IF NOT EXISTS tutor_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id),
  institution_id UUID NOT NULL REFERENCES institutions(id),
  course_id UUID REFERENCES courses(id),
  persona VARCHAR(30) NOT NULL DEFAULT 'socratic_guide' CHECK (persona IN (
    'socratic_guide', 'step_by_step_coach', 'quick_explainer'
  )),
  title VARCHAR(200),
  clo_scope UUID[] DEFAULT '{}',
  message_count INTEGER NOT NULL DEFAULT 0,
  xp_awarded BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for student conversation listing (ordered by recent activity)
CREATE INDEX IF NOT EXISTS idx_conversations_student ON tutor_conversations (student_id, updated_at DESC);

-- Index for course-scoped queries
CREATE INDEX IF NOT EXISTS idx_conversations_course ON tutor_conversations (course_id);

-- Index for institution-scoped analytics
CREATE INDEX IF NOT EXISTS idx_conversations_institution ON tutor_conversations (institution_id, created_at DESC);
