DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quiz_attempts' AND column_name = 'question_sequence'
  ) THEN
    ALTER TABLE quiz_attempts ADD COLUMN question_sequence JSONB DEFAULT '[]';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quiz_attempts' AND column_name = 'difficulty_trajectory'
  ) THEN
    ALTER TABLE quiz_attempts ADD COLUMN difficulty_trajectory JSONB DEFAULT '[]';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quiz_attempts' AND column_name = 'per_question_times'
  ) THEN
    ALTER TABLE quiz_attempts ADD COLUMN per_question_times JSONB DEFAULT '[]';
  END IF;
END
$$;;
