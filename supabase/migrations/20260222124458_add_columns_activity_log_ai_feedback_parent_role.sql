-- ============================================
-- Migration 2: Column additions, missing tables, parent role
-- ============================================

-- Add 'parent' to user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'parent';

-- Column additions for platform enhancements
ALTER TABLE student_gamification ADD COLUMN IF NOT EXISTS streak_freezes_available integer NOT NULL DEFAULT 0
  CHECK (streak_freezes_available >= 0 AND streak_freezes_available <= 2);

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS portfolio_public boolean NOT NULL DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS theme_preference text NOT NULL DEFAULT 'system'
  CHECK (theme_preference IN ('light', 'dark', 'system'));

-- Assignment prerequisites column
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS prerequisites jsonb DEFAULT '[]';

-- Create student_activity_log table
CREATE TABLE IF NOT EXISTS student_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES profiles(id) NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('login', 'page_view', 'submission', 'journal', 'streak_break', 'assignment_view', 'grading_start', 'grading_end', 'material_view', 'announcement_view', 'discussion_post', 'quiz_attempt', 'attendance_marked')),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE student_activity_log ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_activity_log_student ON student_activity_log(student_id, created_at DESC);

-- Create ai_feedback table
CREATE TABLE IF NOT EXISTS ai_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES profiles(id) NOT NULL,
  suggestion_type text NOT NULL CHECK (suggestion_type IN ('module_suggestion', 'at_risk_prediction', 'feedback_draft')),
  suggestion_text text NOT NULL,
  suggestion_data jsonb DEFAULT '{}',
  feedback text CHECK (feedback IN ('thumbs_up', 'thumbs_down')),
  validated_outcome text CHECK (validated_outcome IN ('correct', 'incorrect')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE ai_feedback ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_ai_feedback_student ON ai_feedback(student_id, created_at DESC);

-- Update xp_transactions source CHECK constraint
ALTER TABLE xp_transactions DROP CONSTRAINT IF EXISTS xp_transactions_source_check;
ALTER TABLE xp_transactions ADD CONSTRAINT xp_transactions_source_check
  CHECK (source IN ('login', 'submission', 'grade', 'badge', 'streak', 'journal', 'perfect_day', 'first_attempt', 'bonus_event', 'admin_adjustment', 'streak_freeze_purchase', 'discussion_question', 'discussion_answer', 'survey_completion', 'quiz_completion', 'perfect_rubric'));

-- Production readiness column additions
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS language_preference text NOT NULL DEFAULT 'en'
  CHECK (language_preference IN ('en', 'ur', 'ar'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tos_accepted_at timestamptz;

-- Update notification_preferences default to include muted_courses and quiet_hours
-- (column already exists, just update the default)
ALTER TABLE profiles ALTER COLUMN notification_preferences SET DEFAULT '{"muted_courses": [], "quiet_hours": {"enabled": false, "start": "22:00", "end": "07:00"}, "email_streak_risk": true, "email_grade_released": true, "email_new_assignment": true, "email_weekly_summary": true}'::jsonb;

ALTER TABLE submissions ADD COLUMN IF NOT EXISTS plagiarism_score numeric
  CHECK (plagiarism_score IS NULL OR (plagiarism_score >= 0 AND plagiarism_score <= 100));
;
