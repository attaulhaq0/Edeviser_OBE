-- Task 1.2: Create teams table with all columns, indexes
CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id),
  institution_id uuid NOT NULL REFERENCES institutions(id),
  name text NOT NULL,
  captain_id uuid NOT NULL REFERENCES profiles(id),
  xp_total integer NOT NULL DEFAULT 0,
  streak_count integer NOT NULL DEFAULT 0,
  streak_last_active_date date,
  cooperation_score integer NOT NULL DEFAULT 100,
  health_score integer NOT NULL DEFAULT 100,
  health_status text NOT NULL DEFAULT 'healthy'
    CHECK (health_status IN ('healthy', 'needs_attention', 'at_risk')),
  created_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- Unique team name per course (only among non-deleted teams)
CREATE UNIQUE INDEX IF NOT EXISTS idx_teams_unique_name_per_course
  ON teams (course_id, name) WHERE deleted_at IS NULL;

-- Fast lookup for active teams in a course
CREATE INDEX IF NOT EXISTS idx_teams_course_active
  ON teams (course_id) WHERE deleted_at IS NULL;

-- Institution scope for RLS
CREATE INDEX IF NOT EXISTS idx_teams_institution
  ON teams (institution_id);

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
