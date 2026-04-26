-- Task 1.6: Create challenge_progress table with columns, unique constraint, leaderboard index
CREATE TABLE IF NOT EXISTS challenge_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES social_challenges(id),
  participant_type text NOT NULL CHECK (participant_type IN ('team', 'individual')),
  participant_id uuid NOT NULL,
  current_progress integer NOT NULL DEFAULT 0,
  completed_at timestamptz,
  reward_granted boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- One progress record per participant per challenge
CREATE UNIQUE INDEX IF NOT EXISTS idx_challenge_progress_unique
  ON challenge_progress (challenge_id, participant_id);

-- Fast leaderboard query
CREATE INDEX IF NOT EXISTS idx_challenge_progress_leaderboard
  ON challenge_progress (challenge_id, current_progress DESC);

ALTER TABLE challenge_progress ENABLE ROW LEVEL SECURITY;
