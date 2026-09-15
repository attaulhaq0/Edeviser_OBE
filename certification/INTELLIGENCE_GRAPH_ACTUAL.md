# INTELLIGENCE GRAPH — ACTUAL STATE

**Audit:** 2026-09-14 | **Source:** Live DB + orchestrator code + triggers

---

## THE 22-ARROW INTELLIGENCE CHAIN

| # | Arrow | Status | Evidence |
|---|-------|--------|----------|
| 1 | Activity → Assessment | LIVE | 552 submissions |
| 2 | Assessment → Native Result | LIVE | grades.total_score (percent/criterion) |
| 3 | Native Result → Normalization | LIVE | grades.score_percent via trigger |
| 4 | Normalization → Evidence | LIVE | 1,650 evidence rows (trigger-generated) |
| 5 | Evidence → CLO | LIVE | outcome_attainment with CLO scope |
| 6 | CLO → PLO | LIVE | Rollup via calculate-attainment-rollup |
| 7 | PLO → ILO | LIVE | Rollup via calculate-attainment-rollup |
| 8 | ILO → Learner State | LIVE | 41 student_learning_states (freshness tracked) |
| 9 | Learner State → Habit Signal | BROKEN | Triggers exist, 0 data in habit tables |
| 10 | Habit Signal → B/M/A/P | BROKEN | behavior-correlation.ts exists, never invoked |
| 11 | B/M/A/P → Fused Intelligence | BROKEN | No habit data to fuse |
| 12 | Fused Intelligence → Agent | PARTIAL | Agent receives OBE context, no habit context |
| 13 | Agent → Proposal | PARTIAL | agent_action_proposals table (0 rows currently) |
| 14 | Proposal → Approval | CONTRACT | approve_proposal endpoint exists, never tested live |
| 15 | Approval → Intervention | BROKEN | 3 manual interventions, 0 via approval flow |
| 16 | Intervention → Student Action | BROKEN | No student completion recorded |
| 17 | Student Action → Measurement | BROKEN | 0 intervention_measurements |
| 18 | Measurement → Reassessment | BROKEN | Never executed |
| 19 | Reassessment → New Evidence | BROKEN | Never executed |
| 20 | New Evidence → CQI/Gap | PARTIAL | 1 cqi_systemic_pattern, 3 cqi_action_plans |
| 21 | CQI/Gap → Reporting | BROKEN | 0 accreditation_generated_reports |
| 22 | Reporting → Institutional Intelligence | BROKEN | Empty report tables |

## LIVE ARROWS: 8/22 (36%)
## PARTIAL: 3/22 (14%)
## BROKEN: 11/22 (50%)

## KEY FINDING

The OBE half (arrows 1-8, Activity → Learner State) is fully operational with real data.
The Habit + Intelligence + Intervention half (arrows 9-22) has complete infrastructure
(triggers, tables, edge functions) but zero live execution. The platform is a working
OBE engine with an architected-but-dormant intelligence layer on top.