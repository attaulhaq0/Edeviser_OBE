# INTERVENTION CERTIFICATION — Edeviser Platform

**Date:** 2026-09-12 | **Status:** ❌ NOT CERTIFIED

## Intervention State Machine
| State | Expected | Live Count | Status |
|-------|----------|------------|--------|
| RECOMMENDED | Agent generates proposal | 2 (wrong type) | ⚠️ |
| APPROVED | Coordinator approves | 0 | ❌ |
| ASSIGNED | Intervention created | 0 | ❌ |
| STARTED | Student begins | 0 | ❌ |
| COMPLETED | Student finishes | 0 | ❌ |
| MEASURED | Effectiveness evaluated | 0 | ❌ |
| EFFECTIVE | Positive delta | 0 | ❌ |
| PARTIALLY_EFFECTIVE | Some improvement | 0 | ❌ |
| INEFFECTIVE | No improvement | 0 | ❌ |
| INCONCLUSIVE | Insufficient evidence | 0 | ❌ |
| CANCELLED | Rejected/withdrawn | 0 | ❌ |

## Pipeline Architecture
```
classify_problem_cases_v1 → problemCaseActions (draft)
  → DecisionIntelligenceSection (UI) → [MISSING: Submit for Approval]
  → agent_action_proposals (create_learning_intervention)
  → CoordinatorApprovalInbox → approve → execute_proposal
  → execute_approved_learning_intervention_v1 → learning_interventions rows
```

## Missing Links
1. **Submit button** in DecisionIntelligenceSection draft dialog → proposal creation
2. **create_learning_intervention proposal type** — current proposals are publish_official_content
3. **Student intervention view** — no UI for viewing/starting/completing interventions
4. **Reassessment trigger** — completing an intervention should prompt reassessment

## Fix Available
`scripts/certification/create_learning_intervention_proposal.sql` provides the RPC bridge from draft dialog → proposal.

## VERDICT
❌ NOT CERTIFIED — 0 interventions exist. The architecture supports the full lifecycle but no proposal has been created, approved, or executed for learning interventions.