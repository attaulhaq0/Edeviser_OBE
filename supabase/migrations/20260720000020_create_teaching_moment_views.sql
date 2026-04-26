-- Task 1.19: Create teaching_moment_views table with columns and indexes
CREATE TABLE IF NOT EXISTS teaching_moment_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teaching_moment_id uuid NOT NULL REFERENCES peer_teaching_moments(id),
  viewer_id uuid NOT NULL REFERENCES profiles(id),
  viewed_at timestamptz NOT NULL DEFAULT now(),
  pre_view_attainment numeric
);

-- View tracking index
CREATE INDEX IF NOT EXISTS idx_teaching_moment_views_lookup
  ON teaching_moment_views (teaching_moment_id, viewer_id);

ALTER TABLE teaching_moment_views ENABLE ROW LEVEL SECURITY;
