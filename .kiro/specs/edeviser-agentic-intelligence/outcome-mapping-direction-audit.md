# Outcome-Mapping Direction Audit — verified 2026-08-21

## Convention selected (canonical)

**source_outcome_id = parent/higher-level outcome · target_outcome_id = child/lower-level outcome**
Allowed pairs: ILO→PLO, PLO→CLO, CLO→SUB_CLO (Sub-CLO uses `parent_outcome_id`, not outcome_mappings).

## Reader/writer audit results

| Surface | Direction found | Status |
|---|---|---|
| Frontend hooks (useILOs/usePLOs/useCLOs inserts; useOutcomeChain; src/lib/outcomeChain.ts — explicit "source=PARENT, target=CHILD" comment) | canonical | ✅ |
| Live rollup trigger `trigger_attainment_rollup` (`JOIN learning_outcomes parent_plo ON parent_plo.id = m.source_outcome_id AND type='PLO' WHERE m.target_outcome_id = clo_id`) | canonical | ✅ live-verified |
| RLS mapping policies (coordinator ILO→PLO; teacher PLO→CLO) | canonical | ✅ live-verified |
| Hierarchy validation trigger | canonical pairs only | ✅ live-verified |
| Superseded local migration files (20260520070635 / 20260520094217 / 20260821000001 as present in the stale local checkout) | showed reversed reads | ⚠️ historical only — superseded by later MCP-applied migrations; sync local checkout (task 8.4) |

## Live data verification

```
SELECT so.type, to_.type, count(*) FROM outcome_mappings m
JOIN learning_outcomes so ON so.id = m.source_outcome_id
JOIN learning_outcomes to_ ON to_.id = m.target_outcome_id GROUP BY 1,2;
→ ILO→PLO: 12   PLO→CLO: 12   (no other combinations)
```

Zero mirrored duplicates, zero reversed rows, zero cross-institution pairs.

## Conclusion

The canonical convention is implemented across all readers and writers and the production data conforms. No data migration is required. Remaining: regression test guarding the direction (task 1.6) so both directions can never coexist again.