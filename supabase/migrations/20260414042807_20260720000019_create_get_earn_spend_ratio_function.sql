-- ============================================================
-- get_earn_spend_ratio — Compute earn/spend ratio for an institution
-- Returns: total_earned, total_spent, ratio, status
-- Status: healthy (2:1 to 5:1), inflationary (>5:1), deflationary (<2:1)
-- ============================================================

CREATE OR REPLACE FUNCTION get_earn_spend_ratio(p_institution_id UUID)
RETURNS TABLE (total_earned BIGINT, total_spent BIGINT, ratio NUMERIC, status TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  WITH earned AS (
    SELECT COALESCE(SUM(xt.xp_amount), 0) AS total
    FROM xp_transactions xt
    JOIN profiles p ON p.id = xt.student_id
    WHERE p.institution_id = p_institution_id
  ),
  spent AS (
    SELECT COALESCE(SUM(xp.xp_cost), 0) AS total
    FROM xp_purchases xp
    JOIN marketplace_items mi ON mi.id = xp.item_id
    WHERE mi.institution_id = p_institution_id AND xp.status != 'refunded'
  )
  SELECT
    earned.total AS total_earned,
    spent.total AS total_spent,
    CASE WHEN spent.total > 0 THEN ROUND(earned.total::NUMERIC / spent.total, 2) ELSE NULL END AS ratio,
    CASE
      WHEN spent.total = 0 THEN 'no_spending'
      WHEN earned.total::NUMERIC / spent.total > 5 THEN 'inflationary'
      WHEN earned.total::NUMERIC / spent.total < 2 THEN 'deflationary'
      ELSE 'healthy'
    END AS status
  FROM earned, spent;
$$;;
