-- Task 1.21: Create team_health_snapshots table with columns and indexes
CREATE TABLE IF NOT EXISTS team_health_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id),
  health_score integer NOT NULL,
  gini_coefficient numeric(4,3) NOT NULL,
  engagement_trend text NOT NULL CHECK (engagement_trend IN ('rising', 'stable', 'declining')),
  challenge_participation_rate numeric(5,2) NOT NULL,
  activity_overlap_rate numeric(5,2) NOT NULL,
  computed_at timestamptz NOT NULL DEFAULT now()
);

-- Trend queries: latest snapshots per team
CREATE INDEX IF NOT EXISTS idx_team_health_snapshots_trend
  ON team_health_snapshots (team_id, computed_at DESC);

ALTER TABLE team_health_snapshots ENABLE ROW LEVEL SECURITY;
