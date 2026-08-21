# Outcome Data Reconciliation Report — 2026-08-21 (live queries)

## Method

Read-only SQL against live project `cdlgtbvxlxjpcddjazzx`, per PDF §8 checklist.

## Findings

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

## Conclusion

No reconciliation migration is required — production data is fully canonical. The PDF §8
migration requirements (transactional, idempotent, backup, rollback, attainment recompute,
before/after counts) therefore apply only to FUTURE mapping changes, which are already covered
by the DB-side triggers/constraints plus the PR/Preview gates.

## Follow-up

- Task 1.7: archive this report as a dated artifact under `docs/audits/` and re-run the same
  query set after any future mapping-affecting migration.