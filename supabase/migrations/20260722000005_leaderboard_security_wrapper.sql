-- =============================================================================
-- Migration: Secure leaderboard_weekly Materialized View
-- =============================================================================
-- Materialized views cannot have RLS policies, so leaderboard_weekly is
-- directly queryable via PostgREST. This migration:
-- 1. Revokes direct SELECT from anon and authenticated roles
-- 2. Creates a security-definer function that enforces institution scoping
--    and respects anonymous opt-out
-- 3. Grants EXECUTE only to authenticated role
-- =============================================================================

-- ─── Revoke direct access ────────────────────────────────────────────────────

REVOKE SELECT ON leaderboard_weekly FROM anon, authenticated;

-- ─── Create security-definer wrapper function ────────────────────────────────

CREATE OR REPLACE FUNCTION get_leaderboard(p_institution_id uuid)
RETURNS TABLE (
  student_id uuid,
  full_name text,
  xp_total bigint,
  level integer,
  streak_current integer,
  global_rank bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller belongs to the requested institution
  IF (select auth_institution_id()) IS DISTINCT FROM p_institution_id THEN
    RAISE EXCEPTION 'Access denied: institution mismatch';
  END IF;

  RETURN QUERY
  SELECT
    lw.student_id,
    lw.full_name,
    lw.xp_total,
    lw.level,
    lw.streak_count AS streak_current,
    lw.global_rank
  FROM leaderboard_weekly lw
  JOIN student_gamification sg ON sg.student_id = lw.student_id
  WHERE lw.institution_id = p_institution_id
    AND COALESCE(sg.leaderboard_anonymous, false) = false
  ORDER BY lw.xp_total DESC;
END;
$$;

-- ─── Grant execute to authenticated only ─────────────────────────────────────

GRANT EXECUTE ON FUNCTION get_leaderboard(uuid) TO authenticated;
