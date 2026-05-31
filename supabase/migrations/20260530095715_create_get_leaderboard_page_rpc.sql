-- get_leaderboard_page: paginated, institution-scoped leaderboard RPC
-- Replaces the whole-institution fetch + client-side top-50 slice and the
-- full-table getOptOutStudentIds scan in useLeaderboard. Ranks by cumulative
-- xp_total (parity with the original leaderboard_weekly materialized view),
-- excludes opted-out students set-based, and returns one ranked page plus the
-- total eligible (non-opted-out) cohort count used to drive the min-cohort gate.
-- Requirements: 6.5, 32.1, 32.3, 32.4
CREATE OR REPLACE FUNCTION public.get_leaderboard_page(
  p_institution_id uuid,
  p_limit integer,
  p_offset integer
)
RETURNS TABLE (
  student_id uuid,
  full_name text,
  xp_total bigint,
  level integer,
  streak_current integer,
  global_rank bigint,
  eligible_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Institution scoping: caller must belong to the requested institution.
  IF (SELECT auth_institution_id()) IS DISTINCT FROM p_institution_id THEN
    RAISE EXCEPTION 'Access denied: institution mismatch';
  END IF;

  -- Defensive pagination guards.
  IF p_limit IS NULL OR p_limit < 0 THEN
    RAISE EXCEPTION 'Invalid limit: must be a non-negative integer';
  END IF;
  IF p_offset IS NULL OR p_offset < 0 THEN
    RAISE EXCEPTION 'Invalid offset: must be a non-negative integer';
  END IF;

  RETURN QUERY
  WITH eligible AS (
    SELECT
      sg.student_id,
      p.full_name,
      sg.xp_total::bigint AS xp_total,
      sg.level,
      sg.streak_current
    FROM student_gamification sg
    JOIN profiles p ON p.id = sg.student_id
    WHERE p.institution_id = p_institution_id
      AND p.is_active = true
      AND sg.leaderboard_anonymous IS NOT TRUE
  ),
  ranked AS (
    SELECT
      e.student_id,
      e.full_name,
      e.xp_total,
      e.level,
      e.streak_current,
      RANK() OVER (ORDER BY e.xp_total DESC) AS global_rank,
      COUNT(*) OVER () AS eligible_count
    FROM eligible e
  )
  SELECT
    r.student_id,
    r.full_name,
    r.xp_total,
    r.level,
    r.streak_current,
    r.global_rank,
    r.eligible_count
  FROM ranked r
  ORDER BY r.global_rank ASC, r.student_id ASC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- Lock down execution: authenticated callers only (parity with get_leaderboard).
REVOKE EXECUTE ON FUNCTION public.get_leaderboard_page(uuid, integer, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_leaderboard_page(uuid, integer, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_leaderboard_page(uuid, integer, integer) TO authenticated;;
