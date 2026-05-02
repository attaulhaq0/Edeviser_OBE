-- Task 46: Health check ping function (lightweight SELECT 1)
CREATE OR REPLACE FUNCTION health_check_ping()
RETURNS boolean
LANGUAGE sql
SECURITY INVOKER
AS $$ SELECT true; $$;

-- Task 48: Leaderboard composite index for fast XP-ranked queries
-- Covers: ORDER BY xp_total DESC with student_id for tie-breaking
CREATE INDEX IF NOT EXISTS idx_gamification_leaderboard
  ON student_gamification (xp_total DESC, student_id);

-- Institution-scoped leaderboard optimization:
-- When joining student_gamification with profiles for institution filtering,
-- this index on profiles.institution_id speeds up the join.
-- (profiles.institution_id index likely exists from earlier migrations,
-- but ensure it's present)
CREATE INDEX IF NOT EXISTS idx_profiles_institution
  ON profiles (institution_id);

-- NOTE: For >10K students, consider migrating to a Redis sorted set
-- for O(log N) leaderboard operations. The current PostgreSQL approach
-- with materialized view + these indexes handles up to ~10K students
-- with sub-100ms query times.;
