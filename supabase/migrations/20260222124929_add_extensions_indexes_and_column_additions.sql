-- 1. Extensions (may fail on free tier — that's OK)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Performance Indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_attainment_unique ON outcome_attainment(
  outcome_id,
  COALESCE(student_id, '00000000-0000-0000-0000-000000000000'),
  COALESCE(course_id, '00000000-0000-0000-0000-000000000000'),
  scope
);
CREATE INDEX IF NOT EXISTS idx_gamification_leaderboard ON student_gamification(xp_total DESC, student_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_student ON student_activity_log(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_student ON xp_transactions(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_evidence_student ON evidence(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_student ON ai_feedback(student_id, created_at DESC);

-- 3. Column Additions — Platform Enhancements
ALTER TABLE student_gamification ADD COLUMN IF NOT EXISTS streak_freezes_available integer NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS portfolio_public boolean NOT NULL DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS theme_preference text NOT NULL DEFAULT 'system';

-- 4. Column Additions — Production Readiness
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS language_preference text NOT NULL DEFAULT 'en';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tos_accepted_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notification_preferences jsonb NOT NULL DEFAULT '{"muted_courses": [], "quiet_hours": {"enabled": false, "start": "22:00", "end": "07:00"}}';
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS plagiarism_score numeric;

-- 5. CHECK constraints on new columns
ALTER TABLE student_gamification ADD CONSTRAINT chk_streak_freezes_range CHECK (streak_freezes_available >= 0 AND streak_freezes_available <= 2);
ALTER TABLE profiles ADD CONSTRAINT chk_theme_preference CHECK (theme_preference IN ('light', 'dark', 'system'));
ALTER TABLE profiles ADD CONSTRAINT chk_language_preference CHECK (language_preference IN ('en', 'ur', 'ar'));
ALTER TABLE submissions ADD CONSTRAINT chk_plagiarism_score_range CHECK (plagiarism_score IS NULL OR (plagiarism_score >= 0 AND plagiarism_score <= 100));;
