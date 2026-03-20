-- ============================================================
-- Add practice mode support columns
-- ============================================================
-- practice_mode_enabled: boolean toggle for teachers to enable practice mode per quiz
-- mode: tracks whether a quiz attempt is 'graded' or 'practice'

-- Add practice mode support to quizzes table
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS practice_mode_enabled BOOLEAN NOT NULL DEFAULT false;

-- Add mode column to quiz_attempts table
ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS mode VARCHAR(10) NOT NULL DEFAULT 'graded';

-- Add check constraint for mode values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'quiz_attempts_mode_check'
      AND conrelid = 'quiz_attempts'::regclass
  ) THEN
    ALTER TABLE quiz_attempts ADD CONSTRAINT quiz_attempts_mode_check
      CHECK (mode IN ('graded', 'practice'));
  END IF;
END $$;
