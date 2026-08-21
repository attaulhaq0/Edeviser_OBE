# OBE Hierarchy Audit — verified 2026-08-21 (live DB + code)

## Canonical hierarchy (final, documented)

```
Institution
  └── ILO      (type='ILO', institution_id required, program_id NULL, course_id NULL)
       └── PLO (type='PLO', institution_id required, program_id required, course_id NULL)
            └── CLO (type='CLO', institution_id required, program_id follows course→program, course_id required)
                 └── Sub-CLO (supported via parent_outcome_id column on learning_outcomes — NOT via outcome_mappings)
                      └── Assessments / rubrics / evidence → outcome_attainment
Graduate Attributes: dedicated tables graduate_attributes / graduate_attribute_mappings (kept as-is per PDF §10).
```

Responsibility model: Admin owns ILO governance; Coordinator owns PLO definition + PLO→ILO mapping for assigned programs; Teacher owns CLO/Sub-CLO + CLO→PLO mapping for taught courses; Student produces evidence and views authorized mastery; Parent views authorized summaries.

## Live enforcement (verified via pg_constraint / pg_trigger)

| Object | Kind | What it enforces |
|---|---|---|
| `learning_outcomes_canonical_shape_check` | CHECK | ILO/PLO/CLO shape combos exactly per hierarchy above |
| `learning_outcomes_weight_check` | CHECK | weight ∈ (0, 1.0] |
| `outcome_mappings_weight_check` | CHECK | weight ∈ [0, 1.0] |
| `trg_validate_outcome_mapping_hierarchy` | TRIGGER | mapping pair matches allowed hierarchy |
| `trg_outcome_mapping_weight_sum` | TRIGGER (DEFERRABLE) | weight totals follow platform rule |
| `trg_guard_mapped_outcome_delete` | TRIGGER | deletion blocked while valid dependencies exist |
| `trg_enforce_learning_outcome_scope` | TRIGGER | scope/type consistency on write |

RLS policies (see outcome-security-remediation.md) additionally enforce role+type+institution on every mutation.

## Data state (live counts)

- outcome_mappings joined to learning_outcomes types: **12× ILO→PLO, 12× PLO→CLO** — zero other pairs.
- No mirrored duplicates, no cross-institution pairs, no invalid type/scope combinations detected.

## Conclusion

The canonical hierarchy is fully enforced at the database layer and the production data conforms. Remaining work is test certification (tasks 1.6) and archiving the reconciliation artifact (1.7).