-- Create atomic increment function for team XP
-- Used by award-xp Edge Function to prevent race conditions
-- from concurrent XP awards to different team members

CREATE OR REPLACE FUNCTION increment_team_xp(p_team_id UUID, p_amount INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE teams
  SET xp_total = COALESCE(xp_total, 0) + p_amount,
      updated_at = NOW()
  WHERE id = p_team_id
    AND deleted_at IS NULL;
END;
$$;
-- Grant execute to authenticated users (Edge Functions use service role)
GRANT EXECUTE ON FUNCTION increment_team_xp(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_team_xp(UUID, INTEGER) TO service_role;
