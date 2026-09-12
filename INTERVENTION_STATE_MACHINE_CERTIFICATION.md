# INTERVENTION STATE MACHINE CERTIFICATION
**Date:** 2026-09-12 | **Status:** ✅ CERTIFIED

## STATE MACHINE DEFINITION
11 states with enforced transitions:

```
RECOMMENDED → APPROVED, CANCELLED
APPROVED → ASSIGNED, CANCELLED
ASSIGNED → STARTED, CANCELLED
STARTED → COMPLETED, CANCELLED
COMPLETED → MEASURED
MEASURED → EFFECTIVE, PARTIALLY_EFFECTIVE, INEFFECTIVE, INCONCLUSIVE
EFFECTIVE → (terminal)
PARTIALLY_EFFECTIVE → (terminal)
INEFFECTIVE → (terminal)
INCONCLUSIVE → (terminal)
CANCELLED → (terminal)
```

## ENFORCEMENT
- **DB level**: CHECK constraint on `learning_interventions.status`
- **Transition level**: `validate_intervention_transition_v1(from, to)` — IMMUTABLE SQL
- **RPC level**: `advance_intervention_status_v1(id, new_status)` validates before UPDATE
- **Student RPCs**: `student_start_intervention_v1` and `student_complete_intervention_v1` validate transitions + ownership

## INVALID TRANSITIONS BLOCKED
- COMPLETED → STARTED (backward)
- MEASURED → APPROVED (backward)
- EFFECTIVE → any state (terminal)
- CANCELLED → any state (terminal)
- STARTED → APPROVED (skip forward)
- Student attempting non-own intervention

## IDEMPOTENCY
- Same-status transitions allowed (e.g., STARTED → STARTED)
- All updates are idempotent

## TESTS
- 20 unit tests in `interventionStateMachinePhase12.test.ts`
- All valid transitions verified
- All invalid transitions blocked
- Terminal states verified
- Student ownership enforcement verified