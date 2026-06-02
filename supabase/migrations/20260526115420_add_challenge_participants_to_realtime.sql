-- Replay-only guard: challenge_participants is CREATEd later in the chain
-- (20260720000003), so a bare ALTER PUBLICATION ... ADD TABLE here aborts a fresh
-- replay (Supabase Preview / clean rebuild) with 42P01. Add it only when the table
-- exists, and only when it is not already a member of the publication (idempotent).
DO $$ BEGIN
  IF to_regclass('public.challenge_participants') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime'
         AND schemaname = 'public'
         AND tablename = 'challenge_participants'
     ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.challenge_participants';
  END IF;
END $$;
