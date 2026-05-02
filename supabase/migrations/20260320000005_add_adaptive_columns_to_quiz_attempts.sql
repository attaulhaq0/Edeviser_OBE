-- ============================================================
-- Add adaptive session data columns to existing quiz_attempts table
-- ============================================================
-- question_sequence: JSONB array of { question_id, difficulty_rating, bloom_level }
-- difficulty_trajectory: JSONB array of { question_number, target_difficulty, actual_difficulty, was_correct }
-- per_question_times: JSONB array of { question_id, response_time_ms }

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quiz_attempts' AND column_name = 'question_sequence'
  ) THEN
    ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS question_sequence JSONB DEFAULT '[]';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quiz_attempts' AND column_name = 'difficulty_trajectory'
  ) THEN
    ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS difficulty_trajectory JSONB DEFAULT '[]';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quiz_attempts' AND column_name = 'per_question_times'
  ) THEN
    ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS per_question_times JSONB DEFAULT '[]';
  END IF;
END
$$;
