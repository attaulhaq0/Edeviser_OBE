-- Revoke direct access to leaderboard_weekly materialized view
REVOKE SELECT ON leaderboard_weekly FROM anon, authenticated;

-- Create security-definer wrapper function
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
  IF (select auth_institution_id()) != p_institution_id THEN
    RAISE EXCEPTION 'Access denied: institution mismatch';
  END IF;

  RETURN QUERY
  SELECT
    lw.student_id,
    lw.full_name,
    lw.xp_total,
    lw.level,
    lw.streak_current,
    lw.global_rank
  FROM leaderboard_weekly lw
  WHERE lw.institution_id = p_institution_id
    AND lw.student_id NOT IN (
      SELECT sg.student_id FROM student_gamification sg
      WHERE sg.leaderboard_anonymous = true
    )
  ORDER BY lw.global_rank ASC;
END;
$$;

-- Grant execute to authenticated only
GRANT EXECUTE ON FUNCTION get_leaderboard(uuid) TO authenticated;;
