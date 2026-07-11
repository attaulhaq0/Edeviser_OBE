-- =============================================================================
-- coordinator_ai_insights — cache/log for coordinator AI attainment insights
-- =============================================================================
--
-- Stores the generated insight payload for the coordinator Outcome Attainment /
-- dashboard "AI insight" surfaces. The `coordinator-ai-insights` Edge Function
-- computes a rule-based insight from real attainment data and (when a
-- GEMINI_API_KEY is configured) enhances it with an LLM narrative, then writes
-- the result here so repeat views are a cache hit rather than a re-computation.
--
-- Rows are written ONLY by the Edge Function (service role, bypasses RLS) — the
-- append-only "insert_only via service role" pattern. Authenticated clients may
-- READ their own institution's rows (coordinator/admin) but can never forge one
-- (no INSERT/UPDATE/DELETE policy for authenticated). No sensitive data.
--
-- Replay-safe: CREATE TABLE IF NOT EXISTS; institutions/profiles and the RLS
-- helper functions (auth_institution_id / auth_user_role, migration
-- 20260222073710) all exist far earlier in the chain; the policy only CALLS
-- those helpers (the replay checker flags ALTER/GRANT/REVOKE/COMMENT on a
-- function, not calls inside a policy). Passes check-migration-replay-order.mjs.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.coordinator_ai_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  kind text NOT NULL,
  scope_key text NOT NULL DEFAULT 'institution',
  payload jsonb NOT NULL,
  source text NOT NULL DEFAULT 'computed',
  model text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  generated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.coordinator_ai_insights IS
  'Cached coordinator AI attainment insights (rule-based + optional LLM narrative). Written by the coordinator-ai-insights Edge Function (service role); read-only for institution coordinators/admins.';

CREATE INDEX IF NOT EXISTS idx_coordinator_ai_insights_lookup
  ON public.coordinator_ai_insights (institution_id, kind, scope_key, generated_at DESC);

ALTER TABLE public.coordinator_ai_insights ENABLE ROW LEVEL SECURITY;

-- Read: coordinators/admins see their own institution's cached insights.
-- initplan-wrapped subselects to match the codebase's RLS-perf convention.
CREATE POLICY "coordinator_ai_insights_read" ON public.coordinator_ai_insights
  FOR SELECT TO authenticated
  USING (
    institution_id = (SELECT public.auth_institution_id())
    AND (SELECT public.auth_user_role()) IN ('coordinator', 'admin')
  );

-- No INSERT/UPDATE/DELETE policies for authenticated: only the Edge Function
-- (service role) writes rows, so clients cannot fabricate or mutate insights.
