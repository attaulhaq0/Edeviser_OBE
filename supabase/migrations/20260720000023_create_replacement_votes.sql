-- Task 1.22: Create replacement_votes table with columns and indexes
CREATE TABLE IF NOT EXISTS replacement_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id),
  target_member_id uuid NOT NULL REFERENCES profiles(id),
  initiated_by uuid NOT NULL REFERENCES profiles(id),
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'approved', 'rejected', 'expired')),
  votes_for integer NOT NULL DEFAULT 0,
  votes_against integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  teacher_override boolean NOT NULL DEFAULT false
);

-- Active vote lookup
CREATE INDEX IF NOT EXISTS idx_replacement_votes_team_status
  ON replacement_votes (team_id, status);

-- Cooldown check (7-day re-vote prevention)
CREATE INDEX IF NOT EXISTS idx_replacement_votes_target
  ON replacement_votes (target_member_id);

ALTER TABLE replacement_votes ENABLE ROW LEVEL SECURITY;
