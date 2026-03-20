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
    'good', 'low_discrimination', 'too_easy', 'too_hard', NULL
  )),
  last_calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (question_id)
);

CREATE INDEX idx_qanalytics_question ON question_analytics (question_id);
CREATE INDEX idx_qanalytics_flag ON question_analytics (quality_flag) WHERE quality_flag IS NOT NULL;
