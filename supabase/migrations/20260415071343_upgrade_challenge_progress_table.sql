-- Add missing columns to challenge_progress table
ALTER TABLE challenge_progress ADD COLUMN IF NOT EXISTS participant_type text NOT NULL DEFAULT 'team' CHECK (participant_type IN ('team', 'individual'));
ALTER TABLE challenge_progress ADD COLUMN IF NOT EXISTS current_progress integer NOT NULL DEFAULT 0;
ALTER TABLE challenge_progress ADD COLUMN IF NOT EXISTS reward_granted boolean NOT NULL DEFAULT false;

-- Add indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_challenge_progress_unique ON challenge_progress (challenge_id, participant_id);
CREATE INDEX IF NOT EXISTS idx_challenge_progress_leaderboard ON challenge_progress (challenge_id, current_progress DESC);;
