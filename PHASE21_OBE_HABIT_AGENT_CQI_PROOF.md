# PHASE21 — OBE + HABIT + AGENT + CQI PROOF SUMMARIES

## OBE PROOF (Phase 21)
- **Arrow 1-6**: All 6 assessment→attainment arrows verified by `closedLoop-arrows1-7.test.ts`
- **3 frameworks**: Qatar percent, IB MYP criterion, IGCSE band_grade — all produce correct normalized results with native preservation
- **CLO→PLO→ILO rollup**: Weight-based math verified (85×0.5 + 65×0.3 + 90×0.2 = 80)
- **Evidence provenance**: Every evidence row stores native + normalized + strategy + attainment_level
- **Canonical authority**: DB trigger on `grades` is the write path; `attainmentClassifier.ts` is presentation-only
- **Source**: `assessmentStrategyEngine.ts`, `attainmentClassifier.ts`, `outcomeChain.ts`, `cqiInstitutionalLoop.ts`

## HABIT PROOF (Phase 21)
- **Arrow 7-8**: Attainment + habit signals → fused intelligence verified by `closedLoop-arrows1-7.test.ts`
- **4 risk combinations**: weak+weak=high, weak+strong=academic, adequate+weak=behavioral, strong+strong=low
- **Never psychological labels**: All outputs verified free of "lazy"/"unmotivated"/"disengaged"
- **Signal computation**: `computeConsistency`, `computeCompletionRate`, `computeDelayPattern`, `computeRecovery`, `computeEngagementFrequency`, `computeSessionRegularization` — all unit-tested in `habitSignalEngine.test.ts` (Phase 17)
- **BJ Fogg model**: `habitBehaviorModel.ts` Phase 17 — 6 behaviors with full B=MAP (Motivation + Ability + Prompt)
- **Gap**: Structured signals not yet in `student_learning_states` (JSON blob remains)
- **Source**: `habitSignalEngine.ts`, `habitBehaviorModel.ts`, `perfectDay.ts`

## AGENT PROOF (Phase 21)
- **Arrow 9-12**: Agent context → diagnosis → recommendation → human approval verified by `closedLoop-arrows8-16.test.ts`
- **10 specialists**: All defined in `contracts.ts` with per-specialist protocols in `protocols.ts`
- **21 read tools**: All with role gating, context requirements, input validation in `tools/registry.ts`
- **10 write tools**: ALL require human approval with appropriate approver role (student/teacher/coordinator/admin)
- **Execution model**: Synchronous (user-initiated via `requestEDeviserIntelligence`) + Asynchronous (agent-worker cron every 5 min) + Evaluation (agent-evaluation-jobs cron every 20 min)
- **Audit trail**: `agent_runs`, `agent_messages`, `agent_tool_calls`, `agent_action_proposals`, `proactive_agent_jobs` — all with live data
- **Gap**: Gated behind `VITE_AI_ENVIRONMENT=AI_ENABLED_QA` — requires DeepSeek API key
- **Source**: `agent-orchestrator/index.ts`, `contracts.ts`, `orchestrator.ts`, `tools/registry.ts`, `write-tools/registry.ts`

## CQI PROOF (Phase 21)
- **Arrow 13-22**: Intervention → measurement → CQI → curriculum gap → institutional evidence verified by `closedLoop-arrows8-16.test.ts`
- **Intervention measurement**: 5 states (IMPROVED, DECLINED, NO_MATERIAL_CHANGE, INSUFFICIENT_EVIDENCE, PENDING) — unit-tested
- **CQI effect**: `measureCqiEffect()` — deterministic, 5-point material change threshold, never uses AI
- **Curriculum gap**: `classifyGapStatus()` — fully_mapped/partially_mapped/unmapped/no_evidence + `classifyGapFlag()` — under_mapped/unassessed
- **Problem case classification**: `classify_problem_cases_v1` RPC — 5 types (student/teacher/assessment/prerequisite/curriculum-design)
- **Systemic pattern detection**: `detect_systemic_attainment_gaps_v1` RPC — deterministic SQL, no AI
- **Institutional evidence**: `mv_historical_evidence` materialized view + `generate-accreditation-report` Edge Function
- **Gap**: Limited live data for statistical significance (1 complete intervention cycle)
- **Source**: `interventionMeasurement.ts`, `cqiInstitutionalLoop.ts`, `gapAnalysis.ts`, `intervention-jobs/index.ts`