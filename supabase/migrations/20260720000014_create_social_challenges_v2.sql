-- Task 1.5: Create social_challenges table per design spec
-- Note: This creates the table per the team-challenges design spec.
-- The existing 20260720000003 migration created an earlier version.
-- This migration adds the missing columns and constraints if the table already exists.

-- Add new columns if they don't exist (for the design-spec schema)
DO $$
BEGIN
  -- Add institution_id if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'social_challenges' AND column_name = 'institution_id'
  ) THEN
    ALTER TABLE social_challenges ADD COLUMN institution_id uuid REFERENCES institutions(id);
  END IF;

  -- Add participation_mode if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'social_challenges' AND column_name = 'participation_mode'
  ) THEN
    ALTER TABLE social_challenges ADD COLUMN participation_mode text NOT NULL DEFAULT 'team'
      CHECK (participation_mode IN ('team', 'individual'));
  END IF;

  -- Add reward_xp if missing (maps from reward_value)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'social_challenges' AND column_name = 'reward_xp'
  ) THEN
    ALTER TABLE social_challenges ADD COLUMN reward_xp integer NOT NULL DEFAULT 100
      CHECK (reward_xp BETWEEN 50 AND 500);
  END IF;

  -- Add reward_badge_id if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'social_challenges' AND column_name = 'reward_badge_id'
  ) THEN
    ALTER TABLE social_challenges ADD COLUMN reward_badge_id text;
  END IF;

  -- Add updated_at if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'social_challenges' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE social_challenges ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
  END IF;
END $$;
