-- ============================================================================
-- 20260901000008_add_rate_limiting_audit.sql
--
-- Creates the rate-limiting audit surface specified by design.md ADR-16 for
-- the UI Consistency Global Fixes rollout.
--
-- Scope:
--   1. rate_limit_events — append-only log of every rate-limit check
--      performed by Edge Functions (signup, invite-accept, etc.). Windowed
--      counts over (ip_address, event_type, occurred_at) drive the 429
--      decision and feed CAPTCHA-threshold lookups from the /signup page.
--   2. blocked_ips      — durable IP block list consumed by the same Edge
--      Functions before any business logic runs. Admins may manage rows
--      from the admin panel; service role bypasses RLS for the write path
--      from Edge Functions.
--   3. check_rate_limit_approaching() — SECURITY DEFINER RPC exposed to
--      anon/authenticated so the unauthenticated signup page can decide
--      whether to render the CAPTCHA challenge without bypassing RLS on
--      rate_limit_events itself.
--
-- Not in scope:
--   • audit_logs is intentionally NOT altered. The live schema models
--     audit entries with a free-form `action text` column (no enum), so
--     Edge Functions emit the action names
--       'signup_rate_limit_exceeded'
--       'invite_accept_rate_limit_exceeded'
--       'captcha_challenge_issued'
--     directly without requiring a CHECK/ENUM extension migration.
--
-- Idempotency: every CREATE uses IF NOT EXISTS; policies are guarded by
-- DROP POLICY IF EXISTS so re-running this migration is safe.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. rate_limit_events — append-only windowed counter source
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rate_limit_events (
  id bigserial PRIMARY KEY,
  ip_address inet NOT NULL,
  event_type text NOT NULL,
  user_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.rate_limit_events IS
  'Append-only audit log of rate-limit check events emitted by Edge Functions. Feeds windowed counts (ip_address, event_type) used to issue 429 responses and CAPTCHA challenges. Writes bypass RLS via service role; admins have read-only visibility for audit review.';

COMMENT ON COLUMN public.rate_limit_events.ip_address IS
  'Caller IP address, extracted from the Edge Function request (X-Forwarded-For or remote address).';
COMMENT ON COLUMN public.rate_limit_events.event_type IS
  'Category of the rate-limited action (e.g. ''signup_attempt'', ''invite_accept_attempt'', ''invite_send_attempt''). Free-form text so new surfaces can be added without schema changes.';
COMMENT ON COLUMN public.rate_limit_events.user_id IS
  'Optional — set when an authenticated user triggered the check. NULL for unauthenticated signup-page traffic.';
COMMENT ON COLUMN public.rate_limit_events.metadata IS
  'Supplemental context captured at event time (e.g. user-agent hash, CAPTCHA token presence). jsonb so callers can extend without migrations.';
COMMENT ON COLUMN public.rate_limit_events.occurred_at IS
  'Event timestamp. Used as the leading sort column for windowed count queries.';

-- Primary read pattern: "count events for IP + event_type in the last N minutes".
CREATE INDEX IF NOT EXISTS rate_limit_events_ip_event_occurred_idx
  ON public.rate_limit_events (ip_address, event_type, occurred_at DESC);

-- Secondary read pattern: admin audit review ("latest rate-limit activity").
CREATE INDEX IF NOT EXISTS rate_limit_events_occurred_idx
  ON public.rate_limit_events (occurred_at DESC);

ALTER TABLE public.rate_limit_events ENABLE ROW LEVEL SECURITY;

-- Admins read-only. Edge Functions use the service role key which bypasses
-- RLS entirely, so no INSERT policy is needed for them.
DROP POLICY IF EXISTS "rate_limit_events_admin_read" ON public.rate_limit_events;
CREATE POLICY "rate_limit_events_admin_read" ON public.rate_limit_events
  FOR SELECT TO authenticated
  USING ((select public.auth_user_role()) = 'admin');


-- ----------------------------------------------------------------------------
-- 2. blocked_ips — durable IP block list
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.blocked_ips (
  ip_address inet PRIMARY KEY,
  blocked_until timestamptz NOT NULL,
  reason text NOT NULL,
  blocked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.blocked_ips IS
  'Durable block list of IP addresses that exceeded rate limits or were manually banned. Edge Functions check this table before any business logic. Admins manage rows via the admin panel; service role bypasses RLS for automated blocks.';

COMMENT ON COLUMN public.blocked_ips.ip_address IS 'Blocked caller IP (primary key).';
COMMENT ON COLUMN public.blocked_ips.blocked_until IS 'Block expiry timestamp. Edge Functions treat rows with blocked_until > now() as active.';
COMMENT ON COLUMN public.blocked_ips.reason IS 'Human-readable reason for the block (e.g. ''rate_limit_exceeded'', ''manual_admin_block'').';
COMMENT ON COLUMN public.blocked_ips.blocked_by IS 'Admin who created the block, NULL when written automatically by an Edge Function via service role.';
COMMENT ON COLUMN public.blocked_ips.created_at IS 'When the block was created.';

-- Index to let Edge Functions cheaply enumerate active blocks.
CREATE INDEX IF NOT EXISTS blocked_ips_blocked_until_idx
  ON public.blocked_ips (blocked_until);

ALTER TABLE public.blocked_ips ENABLE ROW LEVEL SECURITY;

-- Admins full CRUD; service role bypasses RLS for automated writes.
DROP POLICY IF EXISTS "blocked_ips_admin_all" ON public.blocked_ips;
CREATE POLICY "blocked_ips_admin_all" ON public.blocked_ips
  FOR ALL TO authenticated
  USING ((select public.auth_user_role()) = 'admin')
  WITH CHECK ((select public.auth_user_role()) = 'admin');


-- ----------------------------------------------------------------------------
-- 3. check_rate_limit_approaching() — SECURITY DEFINER probe for /signup
--
-- Returns true if the given IP has met or exceeded the approach threshold
-- (default: 3 events of the given type in the last 60 minutes). The /signup
-- page calls this RPC to decide whether to render the hCaptcha challenge
-- before the user can submit, without ever reading rate_limit_events
-- directly.
--
-- Security posture:
--   • SECURITY DEFINER so the function owns its own search_path and
--     bypasses RLS on rate_limit_events in a controlled, read-only way.
--   • SET search_path = public to neutralize search_path hijacks.
--   • STABLE because it performs only reads and returns the same result
--     within a single statement.
--   • EXECUTE revoked from PUBLIC (and explicitly re-revoked from
--     anon/authenticated) then re-GRANTed to anon/authenticated so the
--     default PUBLIC grant that PostgreSQL attaches to every function is
--     tightened to the two roles we actually intend to expose it to.
--   • No write side-effects — the signup page's rate_limit_events INSERT
--     goes through the Edge Function (service role), never this RPC.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_rate_limit_approaching(
  p_ip_address inet,
  p_event_type text DEFAULT 'signup_attempt',
  p_threshold int DEFAULT 3,
  p_window_minutes int DEFAULT 60
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(
    (SELECT count(*)
       FROM public.rate_limit_events
      WHERE ip_address = p_ip_address
        AND event_type = p_event_type
        AND occurred_at > now() - (p_window_minutes || ' minutes')::interval
    ) >= p_threshold,
    false
  );
$$;

COMMENT ON FUNCTION public.check_rate_limit_approaching(inet, text, int, int) IS
  'Returns true when the given IP has reached the rate-limit approach threshold for the given event_type within the window. SECURITY DEFINER probe used by the /signup page to decide whether to render the CAPTCHA challenge. Read-only; the signup Edge Function writes rate_limit_events separately.';

-- Tighten the default PUBLIC EXECUTE grant down to the two roles we intend
-- to expose, matching the pattern used by other SECURITY DEFINER helpers
-- in this codebase (see 20260504032951_revoke_anon_execute_on_security_definer_functions.sql).
REVOKE ALL ON FUNCTION public.check_rate_limit_approaching(inet, text, int, int) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_rate_limit_approaching(inet, text, int, int) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit_approaching(inet, text, int, int) TO anon, authenticated;
