-- ---------------------------------------------------------------------------
-- Login Attempts Table — server-side rate limiting for authentication
-- ---------------------------------------------------------------------------
-- Tracks failed login attempts per email. After MAX_ATTEMPTS consecutive
-- failures the email is locked for LOCKOUT_DURATION (15 minutes).
-- Only accessible via service_role — no client access.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS login_attempts (
  email       text        PRIMARY KEY,
  attempt_count integer   NOT NULL DEFAULT 0,
  locked_until timestamptz,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Index for cleanup queries (find expired locks)
CREATE INDEX IF NOT EXISTS idx_login_attempts_locked_until
  ON login_attempts (locked_until)
  WHERE locked_until IS NOT NULL;

-- Enable RLS — service_role only (no client access)
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS by default, so we only need to ensure
-- no authenticated/anon users can access this table.
-- An explicit deny-all policy for authenticated users:
CREATE POLICY "deny_all_authenticated" ON login_attempts
  FOR ALL TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "deny_all_anon" ON login_attempts
  FOR ALL TO anon
  USING (false)
  WITH CHECK (false);
