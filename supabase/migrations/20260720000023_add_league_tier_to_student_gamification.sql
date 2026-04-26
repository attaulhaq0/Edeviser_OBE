-- ============================================================
-- Migration: Add league_tier column to student_gamification
-- Task 16.1: Inclusive Leaderboard — League Tiers
-- ============================================================

-- Add league_tier column with CHECK constraint and default 'bronze'
ALTER TABLE student_gamification
  ADD COLUMN IF NOT EXISTS league_tier VARCHAR(10) NOT NULL DEFAULT 'bronze'
  CONSTRAINT chk_league_tier CHECK (league_tier IN ('bronze', 'silver', 'gold', 'diamond'));

-- Index for efficient league-scoped leaderboard queries
CREATE INDEX IF NOT EXISTS idx_student_gamification_league_tier
  ON student_gamification (league_tier);

-- Composite index for institution-scoped league queries
-- student_gamification doesn't have institution_id directly,
-- so we index on league_tier + xp_total for efficient tier-scoped ranking
CREATE INDEX IF NOT EXISTS idx_student_gamification_league_xp
  ON student_gamification (league_tier, xp_total DESC);
