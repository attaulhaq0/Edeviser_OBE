-- 16.1: Add habit_targets, reminder_times, dismissed_onboarding_tips columns
-- to student_wellness_preferences table.
-- These columns were included in the original table creation migration
-- (20260319133117_create_wellness_habit_tables.sql), so this migration
-- uses ADD COLUMN IF NOT EXISTS to be idempotent.

ALTER TABLE student_wellness_preferences
  ADD COLUMN IF NOT EXISTS habit_targets jsonb NOT NULL DEFAULT '{}';

ALTER TABLE student_wellness_preferences
  ADD COLUMN IF NOT EXISTS reminder_times jsonb NOT NULL DEFAULT '{}';

ALTER TABLE student_wellness_preferences
  ADD COLUMN IF NOT EXISTS dismissed_onboarding_tips text[] NOT NULL DEFAULT '{}';
