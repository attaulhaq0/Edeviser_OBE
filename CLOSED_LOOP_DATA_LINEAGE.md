# CLOSED LOOP DATA LINEAGE — Edeviser Platform
**Date:** 2026-09-12 | **Status:** ✅ VERIFIED AGAINST LIVE DB

## Complete Data Flow (Frontend → DB → Back → Frontend)
```
TEACHER: useCreateGrade → grades INSERT → trigger_attainment_rollup()
  → evidence INSERT (score_percent + raw_score from rubric_selections)
  → outcome_attainment UPSERT (CLO student_course → CLO course → PLO → ILO)
  → xp_transactions INSERT (15 XP) + student_gamification UPDATE
  → emit_notification (grade_released)
  → trg_habit_signals_on_submission → habit_logs (submission/late/study consistency)
  → trg_mark_state_stale_on_evidence → student_learning_states stale
  → agent-worker sweep → refresh_student_learning_state_v1 (mastery + habits)

COORDINATOR: classify_problem_cases_v1 → DecisionIntelligenceSection
  → buildInterventionDraftPlan → useCreateInterventionProposal
  → create_learning_intervention_proposal_v1 → agent_action_proposals (pending)
  → CoordinatorApprovalInbox → decide_proposal (approved) → execute_proposal
  → execute_approved_learning_intervention_v1 → learning_interventions (approved)
  → trg_create_measurement_on_intervention → intervention_measurements (PENDING)

CRON: intervention-jobs → claim_due_intervention_measurements_v1 (SKIP LOCKED)
  → complete_intervention_evaluation_v1 (IMPROVED/NO_MATERIAL_CHANGE/DECLINED/INSUFFICIENT_EVIDENCE)

COORDINATOR: generate-accreditation-report → outcome_attainment aggregation
  → PDF (jsPDF) → storage upload → accreditation_generated_reports

## TRIGGER CHAIN (verified live)
1. grades INSERT → trigger_attainment_rollup → evidence + attainment + XP
2. submissions INSERT → trg_habit_signals_on_submission → habit_logs
3. evidence INSERT → trg_mark_state_stale_on_evidence → stale flag
4. learning_interventions INSERT → trg_create_measurement_on_intervention → measurements
5. intervention_measurements UPDATE → refresh_learning_state
6. evidence UPDATE/DELETE → prevent_evidence_mutation (BLOCKS)