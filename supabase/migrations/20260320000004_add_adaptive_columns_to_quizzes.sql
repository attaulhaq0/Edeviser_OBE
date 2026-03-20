-- ============================================================
-- Add adaptive quiz support columns to existing quizzes table
-- ============================================================
-- is_adaptive: boolean toggle for teachers to enable adaptive mode per quiz
-- adaptation_config: JSONB storing { initial_difficulty, difficulty_step_up, difficulty_step_down, difficulty_range }

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quizzes' AND column_name = 'is_adaptive'
  ) THEN
    ALTER TABLE quizzes ADD COLUMN is_adaptive BOOLEAN NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quizzes' AND column_name = 'adaptation_config'
  ) THEN
    ALTER TABLE quizzes ADD COLUMN adaptation_config JSONB DEFAULT '{}';
  END IF;
END
$$;
