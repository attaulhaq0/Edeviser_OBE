-- ============================================================
-- Add blooms_climb_state column to quiz_attempts table
-- ============================================================
-- Stores per-attempt Bloom's Climb tracking data as JSONB.
-- Structure: {
--   "current_level": <smallint 1-6>,
--   "consecutive_correct": <int>,
--   "transitions": [{ "from": <int>, "to": <int>, "at_question": <int> }],
--   "highest_level_reached": <smallint 1-6>
-- }
-- Nullable: existing attempts won't have this data.

ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS blooms_climb_state JSONB DEFAULT '{}';
