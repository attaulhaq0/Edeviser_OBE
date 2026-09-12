# IDEMPOTENCY CERTIFICATION — Phase 12
**Date:** 2026-09-12 | **Status:** FOUNDATION ESTABLISHED

## EXISTING IDEMPOTENCY PROTECTIONS

| Operation | Protection | Mechanism |
|-----------|-----------|-----------|
| XP transaction | ON CONFLICT DO NOTHING | Unique constraint on (student_id, source, reference_id) |
| Outcome attainment | ON CONFLICT DO UPDATE | Composite unique on (outcome_id, student_id, course_id, scope) |
| Agent proposals | idempotency_key column | Unique constraint |
| Submissions | partial unique index | Prevents duplicate (student, assignment) pairs |
| Evidence | prevent_evidence_mutation trigger | Blocks UPDATE/DELETE |
| Intervention start | validate_intervention_transition_v1 | Same-status idempotent (STARTED→STARTED) |
| Intervention complete | validate_intervention_transition_v1 | Same-status idempotent (COMPLETED→COMPLETED) |
| Measurement creation | trigger on INSERT | One measurement per intervention |

## GAPS (P2)
| Operation | Risk | Fix Needed |
|-----------|------|-----------|
| Grade creation | Duplicate grade for same submission | Unique constraint on grades(submission_id) |
| Evidence creation | Duplicate evidence for same grade+CLO | Unique constraint on (grade_id, clo_id) |
| Agent job enqueue | Duplicate jobs | Existing enqueue RPC checks for existing jobs |

## VERDICT: ADEQUATE FOR LAUNCH
Critical paths have idempotency protection. P2 hardening for remaining paths recommended.