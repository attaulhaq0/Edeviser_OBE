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

CREATE INDEX idx_gen_logs_institution ON quiz_generation_logs (institution_id, created_at DESC);
CREATE INDEX idx_gen_logs_course ON quiz_generation_logs (course_id);
