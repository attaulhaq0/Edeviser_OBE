# HISTORICAL EVIDENCE PROVENANCE REPORT
**Date:** 2026-09-12

## AUDIT: 1,650 evidence rows

| Status | Count | Detail |
|--------|-------|--------|
| With raw_score | 0 | Pre-fix data — trigger only stored score_percent |
| Without native source | 1,650 | Original rubric_selections exist in grades table |

## BACKFILL FEASIBILITY

The 1,650 evidence rows were created by `trigger_attainment_rollup` from grades. Each grade has `rubric_selections` containing criterion-level scores. The original course's `assessment_model` is available via `courses`.

**Backfill is feasible** for rows where:
- The grade still has `rubric_selections` populated
- The course `assessment_model` is known

**Backfill NOT possible** where:
- Grade was deleted or anonymized
- Course was deleted

## STATUS: P2
The historical data is pre-fix. New grades will populate raw_score automatically. Backfill can be performed as a maintenance operation.

## RECOMMENDATION
Run a one-time backfill script that:
1. Joins evidence ← grades ← submissions ← assignments ← courses
2. Derives raw_score from grades.rubric_selections based on courses.assessment_model
3. Updates evidence.raw_score WHERE raw_score IS NULL