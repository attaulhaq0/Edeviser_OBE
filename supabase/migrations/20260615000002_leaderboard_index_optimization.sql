-- ============================================
-- Leaderboard Index Optimization
-- Task 48.1: Composite index for direct leaderboard queries
-- Requirements: 50 (Performance), 25 (Leaderboard)
-- ============================================

-- 1. Composite index on student_gamification for ORDER BY xp_total DESC queries.
--    This index already exists from migration 20260222124435 but we include it
--    here with IF NOT EXISTS for completeness and idempotency.
CREATE INDEX IF NOT EXISTS idx_gamification_leaderboard
  ON student_gamification (xp_total DESC, student_id);

-- 2. Covering index on profiles for institution-scoped leaderboard joins.
--    The leaderboard_weekly materialized view and direct queries join
--    student_gamification with profiles via (id) and filter by institution_id.
--    This index lets the planner satisfy the join + institution filter with an
--    index-only scan instead of a sequential scan on profiles.
CREATE INDEX IF NOT EXISTS idx_profiles_institution_id_covering
  ON profiles (institution_id, id);

-- ============================================
-- Redis Upgrade Path (>10K students)
-- ============================================
-- When the student population exceeds ~10,000 active students per institution,
-- the PostgreSQL-backed leaderboard (even with these indexes and the
-- leaderboard_weekly materialized view) may hit refresh latency and read
-- contention limits. At that scale, consider the following migration path:
--
-- 1. Deploy a Redis (or Upstash Redis) sorted set per institution:
--      Key:   leaderboard:{institution_id}:all_time
--      Score: xp_total
--      Member: student_id
--
-- 2. On each XP award (award-xp Edge Function), atomically ZINCRBY the
--    student's score in the sorted set. This gives O(log N) writes.
--
-- 3. Replace the leaderboard query with ZREVRANGE (top-N) or ZREVRANK
--    (single student rank) — both O(log N + M) reads.
--
-- 4. Keep the materialized view as a fallback / consistency check.
--    A pg_cron job can reconcile Redis scores against xp_total nightly.
--
-- 5. For weekly/monthly leaderboards, use separate sorted sets with a
--    TTL-based rotation or a cron that resets them on schedule.
--
-- Upstash Redis is recommended for Supabase/Vercel deployments due to
-- its HTTP-based REST API (no persistent connections needed from Edge
-- Functions) and per-request pricing model.
-- ============================================
