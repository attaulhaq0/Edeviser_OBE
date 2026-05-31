-- FIX #3: Add tables to realtime publication
-- These are the tables the frontend subscribes to via useRealtime hooks
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.teams;
ALTER PUBLICATION supabase_realtime ADD TABLE public.badges;
ALTER PUBLICATION supabase_realtime ADD TABLE public.challenge_progress;
ALTER PUBLICATION supabase_realtime ADD TABLE public.outcome_attainment;
ALTER PUBLICATION supabase_realtime ADD TABLE public.xp_transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.submissions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.grades;;
