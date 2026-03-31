-- Task 143.1: Comeback Challenge columns on student_gamification
ALTER TABLE student_gamification
  ADD COLUMN IF NOT EXISTS comeback_challenge_active boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS comeback_challenge_start_date timestamptz,
  ADD COLUMN IF NOT EXISTS comeback_challenge_days_completed integer NOT NULL DEFAULT 0
    CHECK (comeback_challenge_days_completed >= 0 AND comeback_challenge_days_completed <= 3),
  ADD COLUMN IF NOT EXISTS comeback_challenge_streak_to_restore integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_active_days integer NOT NULL DEFAULT 0
    CHECK (total_active_days >= 0);
