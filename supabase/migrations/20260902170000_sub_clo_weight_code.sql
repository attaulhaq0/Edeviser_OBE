-- QA Round 2026-09-02 (V3): Sub-CLO weights accepted by UI but never persisted.
-- Adds weight (default 1.0, matching learning_outcomes.weight convention) and
-- optional code so the Sub-CLO manager can persist what it collects.
ALTER TABLE public.sub_clos
  ADD COLUMN IF NOT EXISTS weight numeric NOT NULL DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS code text;