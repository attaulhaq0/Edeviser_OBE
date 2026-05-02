-- Add missing columns to social_challenges table
ALTER TABLE social_challenges ADD COLUMN IF NOT EXISTS institution_id uuid REFERENCES institutions(id);
ALTER TABLE social_challenges ADD COLUMN IF NOT EXISTS participation_mode text NOT NULL DEFAULT 'team' CHECK (participation_mode IN ('team', 'individual'));
ALTER TABLE social_challenges ADD COLUMN IF NOT EXISTS reward_xp integer NOT NULL DEFAULT 100 CHECK (reward_xp BETWEEN 50 AND 500);
ALTER TABLE social_challenges ADD COLUMN IF NOT EXISTS reward_badge_id text;
ALTER TABLE social_challenges ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Update challenge_type constraint to include cooperative
DO $$ BEGIN
  ALTER TABLE social_challenges DROP CONSTRAINT IF EXISTS social_challenges_challenge_type_check;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

ALTER TABLE social_challenges ADD CONSTRAINT social_challenges_challenge_type_check CHECK (challenge_type IN ('academic', 'habit', 'xp_race', 'blooms_climb', 'cooperative', 'team', 'course_wide'));

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_social_challenges_course_status ON social_challenges (course_id, status);
CREATE INDEX IF NOT EXISTS idx_social_challenges_institution ON social_challenges (institution_id);;
