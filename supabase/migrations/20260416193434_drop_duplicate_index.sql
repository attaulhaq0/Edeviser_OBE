-- Drop duplicate index on challenge_progress (keep the unique constraint index)
DROP INDEX IF EXISTS idx_challenge_progress_unique;;
