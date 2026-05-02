-- Add denormalized aggregate columns to peer_teaching_moments
-- view_count: tracks total views for quick display
-- avg_clarity_rating / avg_helpfulness_rating: cached averages for display

ALTER TABLE peer_teaching_moments
  ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_clarity_rating numeric(3,2),
  ADD COLUMN IF NOT EXISTS avg_helpfulness_rating numeric(3,2);;
