-- ============================================================
-- Migration: Create verified_explanations table
-- Feature: AI-Powered Adaptive Quiz Generation (Task 15.1)
-- ============================================================

-- ============================================================
-- verified_explanations — Teacher-approved explanation cache
-- ============================================================
CREATE TABLE verified_explanations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id),
  question_id UUID NOT NULL REFERENCES question_bank(id) ON DELETE CASCADE,
  explanation_text TEXT NOT NULL,
  source VARCHAR(20) NOT NULL CHECK (source IN ('teacher_approved', 'teacher_edited')),
  verified_by UUID NOT NULL REFERENCES profiles(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE verified_explanations ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX idx_verified_active ON verified_explanations (question_id) WHERE is_active = true;
CREATE INDEX idx_verified_question ON verified_explanations (question_id);
