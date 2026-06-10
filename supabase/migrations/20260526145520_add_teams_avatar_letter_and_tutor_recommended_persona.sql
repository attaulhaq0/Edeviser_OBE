ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS avatar_letter text;
UPDATE public.teams SET avatar_letter = UPPER(LEFT(name, 1)) WHERE avatar_letter IS NULL;
DO $$ BEGIN
  IF to_regclass('public.tutor_conversations') IS NOT NULL THEN
    ALTER TABLE public.tutor_conversations ADD COLUMN IF NOT EXISTS recommended_persona text;
  END IF;
END $$;
