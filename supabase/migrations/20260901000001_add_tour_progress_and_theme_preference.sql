-- ============================================================================
-- 20260901000001_add_tour_progress_and_theme_preference.sql
--
-- Adds two per-user columns to public.profiles:
--   • tour_completed_at  — timestamp when the first-time guided tour was
--     completed or dismissed (NULL = tour not yet shown).
--   • theme_preference   — user theme preference: 'light' | 'dark' | 'system'.
--
-- Satisfies bugfix.md clauses 2.10 (theme preference persistence) and
-- 2.15 (guided tour first-time-login detection).
--
-- Design: ui-consistency-global-fixes/design.md §5.1, ADR-01, ADR-02.
--
-- Idempotency: uses ADD COLUMN IF NOT EXISTS so re-runs are safe.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Add the two columns (DDL only, no DML).
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tour_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS theme_preference text
    CHECK (theme_preference IN ('light', 'dark', 'system'))
    DEFAULT 'system';

-- ----------------------------------------------------------------------------
-- 2. Column comments (per design.md §5.1).
-- ----------------------------------------------------------------------------
COMMENT ON COLUMN public.profiles.tour_completed_at
  IS 'Timestamp when the user completed or dismissed the first-time guided tour. NULL = tour not yet shown.';

COMMENT ON COLUMN public.profiles.theme_preference
  IS 'User theme preference: light | dark | system. Drives the Zustand themeStore via useTheme.';

-- ----------------------------------------------------------------------------
-- 3. RLS: allow users to UPDATE their own profile row.
--
-- The existing profiles RLS set (20260222073842, optimized in 20260428000003)
-- provides SELECT policies for self/admin/teacher/coordinator and a
-- "profiles_admin_write" FOR ALL policy scoped to admins. There is no
-- "profiles_update_own" policy today, so self-service writes to
-- tour_completed_at / theme_preference would be rejected by RLS.
--
-- Add a narrowly-scoped UPDATE policy that lets an authenticated user update
-- ONLY their own profile row. The USING and WITH CHECK clauses both pin id to
-- auth.uid() so a user cannot move the row to another user. Column-level
-- restriction (to only tour_completed_at / theme_preference / avatar_url /
-- etc.) is enforced at the app / RPC layer — consistent with how profile
-- self-edits are planned in downstream tasks (design.md ADR-01, ADR-02).
--
-- DROP IF EXISTS + CREATE so the migration remains idempotent across re-runs.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));
