-- Task 1.20: Create teaching_moment_ratings table with columns, unique constraint
CREATE TABLE IF NOT EXISTS teaching_moment_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teaching_moment_id uuid NOT NULL REFERENCES peer_teaching_moments(id),
  viewer_id uuid NOT NULL REFERENCES profiles(id),
  clarity_rating integer NOT NULL CHECK (clarity_rating BETWEEN 1 AND 5),
  helpfulness_rating integer NOT NULL CHECK (helpfulness_rating BETWEEN 1 AND 5),
  rated_at timestamptz NOT NULL DEFAULT now()
);

-- One rating per viewer per moment
CREATE UNIQUE INDEX IF NOT EXISTS idx_teaching_moment_ratings_unique
  ON teaching_moment_ratings (teaching_moment_id, viewer_id);

ALTER TABLE teaching_moment_ratings ENABLE ROW LEVEL SECURITY;
