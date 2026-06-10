DO $$ BEGIN
  IF to_regclass('public.challenge_participants') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime'
         AND schemaname = 'public'
         AND tablename = 'challenge_participants'
     ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.challenge_participants;
  END IF;
END $$;
