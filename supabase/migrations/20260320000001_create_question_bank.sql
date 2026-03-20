-- ============================================================
-- question_bank — Centralized question storage for AI-powered adaptive quizzes
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

CREATE INDEX idx_qbank_course_status ON question_bank (course_id, status);
CREATE INDEX idx_qbank_clo ON question_bank (clo_id);
CREATE INDEX idx_qbank_bloom ON question_bank (bloom_level);
CREATE INDEX idx_qbank_difficulty ON question_bank (difficulty_rating);
CREATE INDEX idx_qbank_generation ON question_bank (generation_request_id);
