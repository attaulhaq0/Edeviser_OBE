# OBE CERTIFICATION — Edeviser Platform

**Date:** 2026-09-12 | **Status:** ✅ OBE CORE CERTIFIED (with P1 caveats)

## Assessment → Evidence → Attainment Chain

### What Works
1. **Submission → Grade**: 552 submissions produce 550 grades via trigger
2. **Grade → Evidence**: `trigger_attainment_rollup` creates 1 evidence row per grade
3. **Evidence → CLO Attainment**: Weighted rollup to CLO level via outcome_mappings
4. **CLO → PLO → ILO Cascade**: Upward cascade through mapping hierarchy
5. **Mapping Direction**: ILO→PLO→CLO is canonical and consistent

### Verified Test Cases
| Case | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| Percent assessment | score_percent=85 | attainment 85% | 85% at CLO | ✅ |
| Multiple assessments | 3 scores: 73.5, 70.7, 81.2 | avg 75.13 | 75.13 at CLO | ✅ |
| Multi-course | Math + English + Social Studies + Science | 4 separate CLO chains | Verified | ✅ |
| PLO rollup | 4 CLOs → 1 PLO | Weighted avg | 76.60 PLO | ✅ |
| ILO rollup | PLOs → ILO | Derived alignment | 71.30 ILO (labeled) | ✅ |

### P1 Caveats
1. **Percent-only**: All attainment is percent-based. Criterion (MYP 0-8) and band (IGCSE 9-1) semantics lost.
2. **Raw score not preserved**: evidence.raw_score=NULL for all rows.
3. **Framework context missing**: Attainment calculation doesn't know framework-specific boundaries.
4. **Criterion boundaries unused**: MYP criterion_boundaries table has data but trigger doesn't consult it.

### OBE → Learner State Connection
- `refresh_student_learning_state_v1` reads outcome_attainment and populates learner states
- 41 states materialized with correct CLO/PLO/ILO attainment values
- Confidence and sample_count preserved
- **Gap**: States are stale — no automatic refresh on new evidence

## VERDICT
**✅ OBE CORE CERTIFIED** — The assessment → evidence → attainment chain works correctly for percent-based assessments. P1 issues with criterion/band semantics and raw score preservation must be addressed before Qatar K-12 deployment.