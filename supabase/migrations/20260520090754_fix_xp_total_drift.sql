-- L3-1 Fix: Reconcile student_gamification.xp_total with actual SUM(xp_transactions)
UPDATE student_gamification sg
SET xp_total = COALESCE(xt.actual_sum, 0)
FROM (
  SELECT student_id, SUM(xp_amount) as actual_sum
  FROM xp_transactions
  GROUP BY student_id
) xt
WHERE xt.student_id = sg.student_id
  AND sg.xp_total != xt.actual_sum;;
