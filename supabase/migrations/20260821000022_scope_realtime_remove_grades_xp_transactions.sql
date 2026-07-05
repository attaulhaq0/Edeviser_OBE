-- Perf (queryperformance.md M1): remove grades + xp_transactions from the
-- supabase_realtime publication. Confirmed (exhaustive useRealtime/.channel scan
-- across .ts + .tsx) that NEITHER table has any frontend subscriber, so they were
-- generating WAL/replication work for nothing on the shared-CPU tier.
--
-- Guarded so the DROP is idempotent AND replay-safe: on a fresh replay both tables
-- are ADDed to the publication by 20260520102922, so the guard finds and drops
-- them; on any state where they're already absent it is a no-op (never errors).
-- Reversible: ALTER PUBLICATION supabase_realtime ADD TABLE public.<t>.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'grades'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.grades;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'xp_transactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.xp_transactions;
  END IF;
END $$;
