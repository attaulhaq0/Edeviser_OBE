-- =============================================================================
-- Add student_gamification and challenge_participants to the realtime
-- publication so the frontend can subscribe to live XP/streak/level and
-- challenge participation updates.
--
-- Frontend hooks affected:
--   - useRealtime({ table: "student_gamification" }) in StudentDashboard,
--     LeaderboardPage
--   - useRealtime({ table: "challenge_participants" }) in ChallengeListView
--
-- Without these on the publication, the hooks silently fall back to 30s
-- polling and the "Live" badge never lights up.
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'student_gamification'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.student_gamification;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'challenge_participants'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.challenge_participants;
  END IF;
END $$;
