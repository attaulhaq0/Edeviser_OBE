-- ============================================================
-- Migration: Create question_bank, question_analytics, and quiz_generation_logs tables
-- Feature: AI-Powered Adaptive Quiz Generation (Tasks 1.1, 1.2, 1.3)
-- ============================================================

-- ============================================================
-- question_bank — Centralized question storage
-- ============================================================
CREATE TABLE question_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id),
  course_id UUID NOT NULL REFERENCES courses(id),
  clo_id UUID NOT NULL REFERENCES learning_outcomes(id),
  bloom_level SMALLINT NOT NULL CHECK (bloom_level BETWEEN 1 AND 6),
  question_type VARCHAR(20) NOT NULL CHECK (question_type IN (
    'mcq', 'true_false', 'short_answer', 'fill_in_blank'
  )),
  question_text TEXT NOT NULL,
  options JSONB,
  correct_answer JSONB NOT NULL,
  explanation TEXT,
  difficulty_rating NUMERIC(3,1) NOT NULL CHECK (difficulty_rating BETWEEN 1.0 AND 5.0),
  status VARCHAR(20) NOT NULL DEFAULT 'pending_review' CHECK (status IN (
    'pending_review', 'approved', 'rejected'
  )),
  generation_source VARCHAR(20) NOT NULL CHECK (generation_source IN (
    'ai', 'ai_edited', 'manual'
  )),
  source_chunks JSONB DEFAULT '[]',
  labels TEXT[] DEFAULT '{}',
  parent_question_id UUID REFERENCES question_bank(id),
  generation_request_id UUID,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE question_bank ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_qbank_course_status ON question_bank (course_id, status);
CREATE INDEX idx_qbank_clo ON question_bank (clo_id);
CREATE INDEX idx_qbank_bloom ON question_bank (bloom_level);
CREATE INDEX idx_qbank_difficulty ON question_bank (difficulty_rating);
CREATE INDEX idx_qbank_generation ON question_bank (generation_request_id);

-- ============================================================
-- question_analytics — Per-question performance metrics
-- ============================================================
CREATE TABLE question_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES question_bank(id) ON DELETE CASCADE,
  total_attempts INTEGER NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  success_rate NUMERIC(5,4) DEFAULT 0,
  avg_response_time_seconds NUMERIC(8,2) DEFAULT 0,
  discrimination_index NUMERIC(5,4) DEFAULT 0,
  calibrated_difficulty NUMERIC(3,1),
  quality_flag VARCHAR(20) CHECK (quality_flag IN (
    'good', 'low_discrimination', 'too_easy', 'too_hard'
  )),
  last_calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (question_id)
);

ALTER TABLE question_analytics ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_qanalytics_question ON question_analytics (question_id);
CREATE INDEX idx_qanalytics_flag ON question_analytics (quality_flag) WHERE quality_flag IS NOT NULL;

-- ============================================================
-- quiz_generation_logs — LLM API call monitoring for quiz generation
-- ============================================================
CREATE TABLE quiz_generation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id),
  teacher_id UUID NOT NULL REFERENCES profiles(id),
  course_id UUID NOT NULL REFERENCES courses(id),
  generation_request_id UUID NOT NULL,
  model_used VARCHAR(100) NOT NULL,
  prompt_tokens INTEGER NOT NULL,
  completion_tokens INTEGER NOT NULL,
  total_tokens INTEGER NOT NULL,
  latency_ms INTEGER NOT NULL,
  question_count_requested INTEGER NOT NULL,
  question_count_generated INTEGER NOT NULL,
  chunks_retrieved INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'error', 'timeout')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE quiz_generation_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_gen_logs_institution ON quiz_generation_logs (institution_id, created_at DESC);
CREATE INDEX idx_gen_logs_course ON quiz_generation_logs (course_id);;
