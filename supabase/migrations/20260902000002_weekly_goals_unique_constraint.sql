-- =============================================================================
-- Add the missing unique constraint that useWeeklyGoals.upsert() relies on.
--
-- Without this, the hook fails with:
--   "there is no unique or exclusion constraint matching the ON CONFLICT
--    specification"
--
-- The hook upserts on (student_id, week_start_date, goal_type). This file
-- creates the matching unique index so the upsert can resolve a conflict
-- target.
--
-- Already applied to production via apply_migration; this file backfills
-- the migration history so preview branches and future deploys stay in sync.
-- =============================================================================

-- Backfill week_start_date from week_start (legacy column) for any rows where
-- it is null. The schema has both columns for historical reasons.
UPDATE public.weekly_goals
SET week_start_date = week_start
WHERE week_start_date IS NULL;

-- Make week_start_date NOT NULL so the unique index is well-defined.
ALTER TABLE public.weekly_goals
  ALTER COLUMN week_start_date SET NOT NULL;

-- The unique constraint that powers useWeeklyGoals.upsert().
CREATE UNIQUE INDEX IF NOT EXISTS uq_weekly_goals_student_week_type
  ON public.weekly_goals (student_id, week_start_date, goal_type);
