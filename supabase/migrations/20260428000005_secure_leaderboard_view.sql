-- ============================================================================
-- Migration: Secure leaderboard_weekly materialized view
-- ============================================================================
-- Defect 7: Materialized views cannot have RLS policies, so
-- leaderboard_weekly was directly queryable via PostgREST by any role
-- (including anon), exposing student ranking data.
--
-- Fix:
--   1. Revoke direct SELECT from anon and authenticated roles
--   2. Create a security-definer function that enforces institution scoping
--      and respects the leaderboard_anonymous opt-out flag
--   3. Grant EXECUTE only to authenticated role
-- ============================================================================

-- 1. Revoke direct access to the materialized view
REVOKE SELECT ON leaderboard_weekly FROM anon;
REVOKE SELECT ON leaderboard_weekly FROM authenticated;

-- 2. Create security-definer wrapper function
CREATE OR REPLACE FUNCTION get_leaderboard(p_institution_id uuid)
RETURNS TABLE (
  student_id    uuid,
  full_name     text,
  institution_id uuid,
  xp_total      bigint,
  level         integer,
  streak_current integer,
  global_rank   bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    lw.student_id,
    lw.full_name,
    lw.institution_id,
    lw.xp_total,
    lw.level,
    lw.streak_current,
    lw.global_rank
  FROM leaderboard_weekly lw
  JOIN student_gamification sg ON sg.student_id = lw.student_id
  WHERE
    -- Verify caller belongs to the requested institution
    (select auth_institution_id()) = p_institution_id
    -- Filter to the requested institution
    AND lw.institution_id = p_institution_id
    -- Exclude students who opted out of the leaderboard
    AND sg.leaderboard_anonymous = false;
$$;

-- 3. Grant execute to authenticated users only
GRANT EXECUTE ON FUNCTION get_leaderboard(uuid) TO authenticated;
