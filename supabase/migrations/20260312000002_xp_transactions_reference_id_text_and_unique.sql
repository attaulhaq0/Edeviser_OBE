-- Migrate xp_transactions.reference_id from uuid to text so it can store
-- both UUIDs (assignment IDs) and deterministic idempotency keys like
-- "login:<student_id>:<date>".
ALTER TABLE public.xp_transactions
  ALTER COLUMN reference_id TYPE text USING reference_id::text;

-- Add a unique constraint on (student_id, reference_id) to enforce idempotency
-- atomically at the DB level, preventing race-condition duplicates.
-- NULLs are excluded (multiple NULL reference_ids per student are allowed).
CREATE UNIQUE INDEX IF NOT EXISTS idx_xp_transactions_student_reference
  ON public.xp_transactions (student_id, reference_id)
  WHERE reference_id IS NOT NULL;
