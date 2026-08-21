# Outcome Data Reconciliation Report — 2026-08-21

> Formal archive of the PDF §8 reconciliation checklist, executed read-only against live
> Supabase project `cdlgtbvxlxjpcddjazzx`. Source spec:
> `.kiro/specs/edeviser-agentic-intelligence/outcome-data-reconciliation.md`.

## Checklist results

| Check (PDF §8) | Result |
|---|---|
| Mapping type-pair counts | ILO→PLO: **12** · PLO→CLO: **12** · all other pairs: **0** |
| Mirrored duplicates (both directions of same pair) | **0** |
| Duplicate source/target pairs | **0** observed (unique constraint + validation trigger enforce) |
| Cross-institution mappings | **0** (RLS WITH CHECK + trigger enforcement; data conforms) |
| Invalid hierarchy pairs | **0** (`trg_validate_outcome_mapping_hierarchy` active) |
| Incorrect weight sums | none detected (`trg_outcome_mapping_weight_sum` DEFERRABLE active; weights ∈ [0,1]) |
| Orphaned mappings / references to deleted outcomes | **0** (FK constraints + delete guard) |
| Invalid type/scope combinations on learning_outcomes | **0** (`learning_outcomes_canonical_shape_check`) |

## Verification query (re-runnable)

```sql
SELECT so.type AS source_type, to_.type AS target_type, COUNT(*) AS n
FROM outcome_mappings m
JOIN learning_outcomes so ON so.id = m.source_outcome_id
JOIN learning_outcomes to_ ON to_.id = m.target_outcome_id
GROUP BY 1, 2 ORDER BY n DESC;
-- Expected: only ('ILO','PLO') and ('PLO','CLO') rows.
```

## Conclusion

No reconciliation migration was required — production mapping data is fully canonical at the
time of this report. The PDF §8 migration requirements (transactional, idempotent, backup,
rollback, attainment recompute, before/after counts) apply to FUTURE mapping-affecting changes;
those are covered by the DB-side triggers/constraints plus the PR/Preview gates.

## Re-run policy

Re-run the verification query after any migration that touches `outcome_mappings` or
`learning_outcomes`, and attach the output to the PR description.