-- =============================================================================
-- connected_integrations — per-user third-party integration connection state
-- =============================================================================
--
-- Backs the coordinator "Me" page Connected Integrations section with a real
-- per-user connection record (google_calendar / outlook / slack). Establishing
-- an actual connection requires provider OAuth credentials (external, not
-- configured here) — this table stores the connection STATE so the UI reflects
-- reality (empty → all "Connect"); flipping to "connected" is done by the OAuth
-- callback once provider credentials exist.
--
-- RLS: a user manages ONLY their own rows (user_id = auth.uid()). No sensitive
-- token columns — OAuth tokens must live in a secrets store / edge function, not
-- a client-readable table. Replay-safe (table before policies).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.connected_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider text NOT NULL,
  status text NOT NULL DEFAULT 'disconnected',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  connected_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT connected_integrations_status_chk
    CHECK (status IN ('connected', 'disconnected')),
  UNIQUE (user_id, provider)
);

COMMENT ON TABLE public.connected_integrations IS
  'Per-user third-party integration connection state (no OAuth tokens). Users manage only their own rows.';

CREATE INDEX IF NOT EXISTS idx_connected_integrations_user
  ON public.connected_integrations (user_id);

ALTER TABLE public.connected_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "connected_integrations_select_own" ON public.connected_integrations
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "connected_integrations_insert_own" ON public.connected_integrations
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "connected_integrations_update_own" ON public.connected_integrations
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "connected_integrations_delete_own" ON public.connected_integrations
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));
