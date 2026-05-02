-- Task 1.5: Align social_challenges table with design spec
-- The table already exists from prior migrations. This migration fixes
-- column constraints, CHECK constraints, and removes legacy columns.

-- 1. Fix NOT NULL constraints on columns that should be required
ALTER TABLE social_challenges ALTER COLUMN course_id SET NOT NULL;
ALTER TABLE social_challenges ALTER COLUMN description SET NOT NULL;
ALTER TABLE social_challenges ALTER COLUMN created_by SET NOT NULL;
ALTER TABLE social_challenges ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE social_challenges ALTER COLUMN institution_id SET NOT NULL;

-- 2. Set proper defaults
ALTER TABLE social_challenges ALTER COLUMN description SET DEFAULT '';
ALTER TABLE social_challenges ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE social_challenges ALTER COLUMN status SET DEFAULT 'draft';

-- 3. Fix challenge_type CHECK to match design spec (remove legacy 'team', 'course_wide', 'course')
ALTER TABLE social_challenges DROP CONSTRAINT IF EXISTS social_challenges_challenge_type_check;
ALTER TABLE social_challenges ADD CONSTRAINT social_challenges_challenge_type_check
  CHECK (challenge_type IN ('academic', 'habit', 'xp_race', 'blooms_climb', 'cooperative'));

-- 4. Fix status CHECK to match design spec ('ended' instead of 'completed')
ALTER TABLE social_challenges DROP CONSTRAINT IF EXISTS social_challenges_status_check;
ALTER TABLE social_challenges ADD CONSTRAINT social_challenges_status_check
  CHECK (status IN ('draft', 'active', 'ended', 'cancelled'));

-- 5. Remove default on challenge_type (was 'course', not valid anymore)
ALTER TABLE social_challenges ALTER COLUMN challenge_type DROP DEFAULT;

-- 6. Change goal_target from numeric to integer and add CHECK
ALTER TABLE social_challenges ALTER COLUMN goal_target TYPE integer USING goal_target::integer;
ALTER TABLE social_challenges ALTER COLUMN goal_target DROP DEFAULT;
ALTER TABLE social_challenges DROP CONSTRAINT IF EXISTS social_challenges_goal_target_check;
ALTER TABLE social_challenges ADD CONSTRAINT social_challenges_goal_target_check
  CHECK (goal_target > 0);

-- 7. Drop legacy columns not in design spec
ALTER TABLE social_challenges DROP COLUMN IF EXISTS goal_metric;
ALTER TABLE social_challenges DROP COLUMN IF EXISTS reward_type;
ALTER TABLE social_challenges DROP COLUMN IF EXISTS reward_value;
ALTER TABLE social_challenges DROP COLUMN IF EXISTS notification_sent_90;

-- 8. Drop legacy trigger and function from 20260720000003
DROP TRIGGER IF EXISTS trg_enforce_max_active_challenges ON social_challenges;
DROP FUNCTION IF EXISTS enforce_max_active_challenges();

-- 9. Ensure indexes exist (idempotent)
CREATE INDEX IF NOT EXISTS idx_social_challenges_course_status ON social_challenges (course_id, status);
CREATE INDEX IF NOT EXISTS idx_social_challenges_institution ON social_challenges (institution_id);

-- RLS is already enabled from prior migrations;
