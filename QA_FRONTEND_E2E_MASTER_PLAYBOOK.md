# QA FRONTEND E2E MASTER PLAYBOOK — Phase 12
**Date:** 2026-09-12 | **For:** QA Team

## TEST GROUPS

### GROUP A: Teacher Assessment (role: teacher)
| Test ID | Action | Expected UI | Expected DB |
|---------|--------|-------------|-------------|
| A1 | Login as teacher | Dashboard loads | profile RLS scoped |
| A2 | Open Mathematics 6 | Course page with gradebook | courses.framework_id=MYP |
| A3 | Create assignment | Assignment form with rubric | assignments INSERT |
| A4 | Grade submission | Rubric criterion selector | grades.rubric_selections populated |
| A5 | Submit grade | Success toast | trigger_attainment_rollup → evidence + attainment |
| A6 | Verify evidence | (use dev tools/diagnostic) | evidence.raw_score NOT NULL |

### GROUP B: Coordinator Diagnosis (role: coordinator)
| Test ID | Action | Expected UI | Expected DB |
|---------|--------|-------------|-------------|
| B1 | Login as coordinator | Dashboard with approval inbox | profile role=coordinator |
| B2 | Open Unit Close | DecisionIntelligenceSection visible | classify_problem_cases_v1 called |
| B3 | View problem case | CLO title, dominant cause, confidence | evidence citations display |
| B4 | Draft intervention | Plan dialog with citations | buildInterventionDraftPlan called |
| B5 | Submit for Approval | Success toast, proposalId | agent_action_proposals INSERT |

### GROUP C: Student Intervention (role: student)
| Test ID | Action | Expected UI | Expected DB |
|---------|--------|-------------|-------------|
| C1 | Login as student | Dashboard with interventions | RLS-scoped queries |
| C2 | View intervention | Intervention card with status | learning_interventions SELECT |
| C3 | Start intervention | Status → STARTED, started_at set | student_start_intervention_v1 |
| C4 | Complete intervention | Status → COMPLETED, completed_at set | student_complete_intervention_v1 |

### GROUP D: Accreditation Report (role: coordinator)
| Test ID | Action | Expected UI | Expected DB |
|---------|--------|-------------|-------------|
| D1 | Navigate to reports | Report generation form | page accessible |
| D2 | Select IB template | Template dropdown | template validation |
| D3 | Generate report | Download URL returned | accreditation_generated_reports INSERT |

### GROUP E: Security (cross-role)
| Test ID | Action | Expected Result |
|---------|--------|----------------|
| E1 | Teacher access Gulf Academy | 403 or empty data |
| E2 | Student access other student data | RLS blocks |
| E3 | Unauthenticated access | Redirect to login |

## CLEANUP
After each test group, verify:
- No duplicate records
- No orphaned FK references
- No cross-tenant data leakage
- Timestamps monotonically increasing

## FAILURE CASES
| Scenario | Expected Behavior |
|----------|------------------|
| Double-click submit | No duplicate grade/evidence |
| Network timeout | Clear error, safe retry |
| Session expired | Redirect to login, no partial writes |
| Invalid transition (backward) | Server error 22023 |