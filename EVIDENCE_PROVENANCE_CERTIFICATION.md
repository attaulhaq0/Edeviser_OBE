# EVIDENCE PROVENANCE CERTIFICATION

**Date:** 2026-09-12 | **Status:** ✅ PARTIAL (schema complete, raw_score not populated)

## Evidence Schema (Live Verified)
| Column | Type | Populated | Status |
|--------|------|-----------|--------|
| id | uuid | ✅ 1,650 rows | ✅ |
| student_id | uuid | ✅ | ✅ |
| submission_id | uuid | ✅ | ✅ |
| grade_id | uuid | ✅ | ✅ |
| clo_id | uuid | ✅ | ✅ |
| plo_id | uuid | ✅ | ✅ |
| ilo_id | uuid | ✅ | ✅ |
| score_percent | numeric | ✅ | ✅ |
| attainment_level | enum | ✅ (developing/satisfactory/excellent) | ✅ |
| raw_score | jsonb | ❌ NULL for all | ❌ |
| created_at | timestamptz | ✅ | ✅ |

## Provenance Chain (Live Verified)
```
submission.student_id → evidence.student_id ✅
grade.submission_id → evidence.submission_id ✅
grade.score_percent → evidence.score_percent ✅
outcome_mapping.clo_id → evidence.clo_id ✅
evidence.clo_id → outcome_attainment.clo_id ✅
```

## Missing Provenance
- **raw_score**: Column exists but never populated. Criterion (MYP A-D 0-8), band (IGCSE 9-1/A*-G), and component-weighted native semantics are lost.
- **assessment_model**: Not tagged on evidence — cannot distinguish percent vs criterion vs band-grade evidence
- **framework context**: Not tagged on evidence — cannot trace which framework boundary was used

## Accreditation Evidence Answerability
Can the system answer these from current evidence?
| Question | Answerable? | Evidence Source |
|----------|------------|-----------------|
| WHAT happened? | ✅ | evidence.score_percent, attainment_level |
| WHO? | ✅ | evidence.student_id |
| WHEN? | ✅ | evidence.created_at |
| WHERE? | ✅ | outcome_attainment.course_id → courses |
| WHICH outcome? | ✅ | evidence.clo_id → learning_outcomes |
| WHICH assessment? | ✅ | evidence.submission_id → assignments |
| WHICH framework? | ⚠️ | courses.framework_id = NULL |
| WHAT evidence? | ✅ | evidence rows |
| HOW calculated? | ⚠️ | Percent-only — native semantics lost |
| WHAT action followed? | ❌ | No intervention evidence |
| DID it improve? | ❌ | No measurement evidence |

## VERDICT
✅ PARTIAL — Basic provenance chain works for percent-based evidence. Raw score provenance, framework context, and intervention evidence chains are dark.