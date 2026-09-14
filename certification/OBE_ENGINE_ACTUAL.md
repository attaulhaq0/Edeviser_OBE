# OBE ENGINE — ACTUAL IMPLEMENTATION

**Audit:** 2026-09-14 | **Source:** Live DB + triggers + code inspection

---

## STATUS: LIVE / WORKING

The OBE engine is the most proven subsystem. It operates entirely through database triggers with no frontend calculation dependency.

## CANONICAL HIERARCHY

```
ILO (Institution Learning Outcome) — top-level institutional goals
  ↓ source_outcome_id
PLO (Program Learning Outcome) — program-scoped
  ↓ source_outcome_id  
CLO (Course Learning Outcome) — course-scoped, mapped to assessments
  ↓
Evidence → Attainment
```

**Live data (Noor International):**
- 4 ILOs, 4 PLOs, 13 CLOs
- 24 outcome_mappings (ILO→PLO, PLO→CLO)
- 1,113 outcome_attainment rows

## THE GRADE → ATTAINMENT PIPELINE

```
Teacher submits grade → grades table
  ↓ on_grade_insert_or_update TRIGGER
  ↓
evidence row created (immutable via prevent_evidence_mutation)
  ↓
outcome_attainment row created/updated (CLO level)
  ↓ trg_mark_state_stale_on_evidence TRIGGER
  ↓
student_learning_states.fresh_until = now()
  ↓
Attainment rolls up via calculate-attainment-rollup edge function
  (CLO → PLO → ILO aggregation with weights)
```

## KEY TRIGGERS

| Trigger | Table | Function | Status |
|---------|-------|----------|--------|
| on_grade_insert_or_update | grades | Creates evidence + attainment | LIVE |
| prevent_evidence_mutation | evidence | Immutability guard | LIVE |
| trg_mark_state_stale_on_evidence | evidence | Stale learner state | LIVE |
| trg_outcome_mapping_weight_sum | outcome_mappings | Validate weights | LIVE |
| trg_validate_outcome_mapping_hierarchy | outcome_mappings | Validate ILO>PLO>CLO direction | LIVE |
| trg_guard_mapped_outcome_delete | learning_outcomes | Prevent deletion of mapped outcomes | LIVE |

## MATHEMATICS

- CLO attainment = weighted average of student grades mapped to CLO via assignment clo_weights
- PLO attainment = weighted rollup of CLO attainment via outcome_mappings
- ILO attainment = weighted rollup of PLO attainment
- Attainment levels: excellent (≥85%), satisfactory (≥70%), developing (≥50%), not_yet (<50%)
- Thresholds configurable per institution via institution_settings.attainment_thresholds

## SOURCE OF TRUTH

| Value | Authority |
|-------|-----------|
| Raw grade | grades.total_score |
| Score percent | grades.score_percent |
| Evidence | evidence table (trigger-generated, immutable) |
| CLO attainment | outcome_attainment (trigger-generated) |
| PLO/ILO attainment | outcome_attainment (rollup function) |
| Final grade | compute_final_grade_v1 RPC (category-weighted) |
| Grade classification | grade_scales (per-course, configurable) |

## REMAINING GAPS

- compute_final_grade_v1 has no institution_id check (protected by table RLS, not explicit)
- Sub-CLO level not populated in live data
- Rollup recalculation on mapping change not automated
- Attainment snapshots monthly only (capture_active_semester_snapshots)