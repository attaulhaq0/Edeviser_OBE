-- ============================================================
-- Migration: recalculate_league_tiers PL/pgSQL function
-- Task 16.2: Ranks students by xp_total within institution,
-- assigns tiers: Diamond = top 5%, Gold = top 20%,
-- Silver = top 50%, Bronze = bottom 50%.
-- Uses PERCENT_RANK() window function.
-- ============================================================

CREATE OR REPLACE FUNCTION recalculate_league_tiers(p_institution_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  WITH ranked AS (
    SELECT
      sg.student_id,
      PERCENT_RANK() OVER (ORDER BY COALESCE(sg.xp_total, 0) DESC) AS prank
    FROM student_gamification sg
    JOIN profiles p ON p.id = sg.student_id
    WHERE p.institution_id = p_institution_id
  )
  UPDATE student_gamification sg
  SET league_tier = CASE
    WHEN r.prank <= 0.05 THEN 'diamond'
    WHEN r.prank <= 0.20 THEN 'gold'
    WHEN r.prank <= 0.50 THEN 'silver'
    ELSE 'bronze'
  END
  FROM ranked r
  WHERE sg.student_id = r.student_id;
END;
$$;;
