-- Normalize outcome_mappings weight drift: rescale each parent's child weights
-- so they sum to exactly 1.0. Rollup is scale-invariant so attainment is
-- unaffected; this corrects the documented 'weights sum to a whole' invariant
-- and removes the 0.99 rounding drift on 3 ILO parents. Idempotent: re-running
-- on already-normalized data is a no-op (factor = 1.0).
WITH sums AS (
  SELECT target_outcome_id, SUM(weight) AS total
  FROM outcome_mappings
  GROUP BY target_outcome_id
  HAVING SUM(weight) > 0 AND ABS(SUM(weight) - 1.0) > 0.0005
)
UPDATE outcome_mappings om
SET weight = ROUND((om.weight / s.total)::numeric, 6)
FROM sums s
WHERE om.target_outcome_id = s.target_outcome_id;;
