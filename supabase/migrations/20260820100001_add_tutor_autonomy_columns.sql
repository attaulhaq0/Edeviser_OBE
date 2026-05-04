-- ============================================================
-- Migration: Add tutor autonomy level columns
-- Feature: AI Chat Tutor — Autonomy Level Database Support
-- Tasks: 13.1, 13.2, 13.3, 13.4
-- ============================================================

-- 13.1: Add tutor_autonomy_level to assignments table
-- Teachers can configure how much help the AI provides per assignment
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS tutor_autonomy_level VARCHAR(2) DEFAULT 'L1'
  CHECK (tutor_autonomy_level IN ('L1', 'L2', 'L3'));
-- 13.2: Add tutor_autonomy_level to learning_outcomes (CLOs) table
-- Teachers can configure autonomy level per CLO as a fallback
ALTER TABLE learning_outcomes ADD COLUMN IF NOT EXISTS tutor_autonomy_level VARCHAR(2) DEFAULT 'L2'
  CHECK (tutor_autonomy_level IN ('L1', 'L2', 'L3'));
-- 13.3: Add autonomy_override to tutor_conversations table
-- Students can override to L1 ("Figure it out") or L3 ("Just explain it")
ALTER TABLE tutor_conversations ADD COLUMN IF NOT EXISTS autonomy_override VARCHAR(2)
  CHECK (autonomy_override IN ('L1', 'L3'));
-- 13.4: Add autonomy_level and nudge_type to tutor_messages table
-- Track which autonomy level was active for each message
ALTER TABLE tutor_messages ADD COLUMN IF NOT EXISTS autonomy_level VARCHAR(2)
  CHECK (autonomy_level IN ('L1', 'L2', 'L3'));
-- Track independence nudges sent to the student
ALTER TABLE tutor_messages ADD COLUMN IF NOT EXISTS nudge_type VARCHAR(30);
