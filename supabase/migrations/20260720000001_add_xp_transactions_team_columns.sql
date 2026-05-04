-- Task 131.2: Add team XP columns to xp_transactions
-- Adds scope, team_id, base_xp, final_xp, multipliers columns

ALTER TABLE xp_transactions
  ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'individual'
    CHECK (scope IN ('individual', 'team')),
  ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES teams(id),
  ADD COLUMN IF NOT EXISTS base_xp integer,
  ADD COLUMN IF NOT EXISTS final_xp integer,
  ADD COLUMN IF NOT EXISTS multipliers jsonb DEFAULT '{}';
-- Index for team XP queries
CREATE INDEX IF NOT EXISTS idx_xp_transactions_team
  ON xp_transactions (team_id, created_at DESC)
  WHERE team_id IS NOT NULL;
