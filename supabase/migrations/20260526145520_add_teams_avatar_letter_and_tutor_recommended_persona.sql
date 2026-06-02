ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS avatar_letter text;
UPDATE public.teams SET avatar_letter = UPPER(LEFT(name, 1)) WHERE avatar_letter IS NULL;

-- Replay-only guard: tutor_conversations is CREATEd later in the chain
-- (20260820000003), so a bare ALTER TABLE here aborts a fresh replay with 42P01.
-- Apply the column add only when the table already exists (no-op on a clean rebuild,
-- where the later CREATE TABLE already defines recommended_persona).
DO $$ BEGIN
  IF to_regclass('public.tutor_conversations') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.tutor_conversations ADD COLUMN IF NOT EXISTS recommended_persona text';
  END IF;
END $$;
