-- ============================================================
-- Add explanation_confidence column to question_bank
-- Stores the average RAG chunk similarity score for AI-generated explanations.
-- Nullable; when present, must be between 0.0 and 1.0.
-- ============================================================
ALTER TABLE question_bank ADD COLUMN IF NOT EXISTS explanation_confidence NUMERIC(3,2);

-- Add check constraint if column was just created (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'question_bank_explanation_confidence_check'
      AND conrelid = 'question_bank'::regclass
  ) THEN
    ALTER TABLE question_bank ADD CONSTRAINT question_bank_explanation_confidence_check
      CHECK (explanation_confidence IS NULL OR (explanation_confidence BETWEEN 0.0 AND 1.0));
  END IF;
END $$;
