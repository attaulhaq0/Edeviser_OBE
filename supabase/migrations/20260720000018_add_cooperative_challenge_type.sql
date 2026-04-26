-- Task 1.17: Add 'cooperative' to social_challenges.challenge_type CHECK constraint
-- Drop existing constraint and recreate with cooperative type
DO $$
BEGIN
  -- Try to drop the old check constraint (name may vary)
  ALTER TABLE social_challenges DROP CONSTRAINT IF EXISTS social_challenges_challenge_type_check;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

ALTER TABLE social_challenges
  ADD CONSTRAINT social_challenges_challenge_type_check
  CHECK (challenge_type IN ('academic', 'habit', 'xp_race', 'blooms_climb', 'cooperative', 'team', 'course_wide'));
