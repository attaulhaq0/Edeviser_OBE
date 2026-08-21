# Implementation Plan

## Overview

Transform Edeviser into a secure, context-aware, multi-agent learning platform per the
"Edeviser Agentic Intelligence Platform Specification" (PDF): canonical OBE/ILO layer,
DeepSeek-only agentic backbone, approval-gated interventions, Student Learning Digital Twin,
and role-aware assistant experiences — delivered through verified vertical slices.

Status legend: `[x]` done (with live/code evidence) · `[~]` partial · `[ ]` not started.

**Verification basis (2026-08-21):** every `[x]` was confirmed against the LIVE Supabase project
`cdlgtbvxlxjpcddjazzx` (pg_policy / pg_constraint / pg_trigger / pg_proc / deployed edge functions)
and GitHub main (`attaulhaq0/Edeviser_OBE`). Full evidence:
`docs/audits/AGENTIC-INTELLIGENCE-CROSSCHECK-2026-08-21.md`.

Gates for every remaining task: `npm run lint` → `npx tsc --noEmit` → `npm test`
(+ `db:check-replay` for migrations) → feature branch + PR → green CI + Supabase Preview → merge.
Never expose outcome write-tools to agents before Phase 1 certification. Never mark a task
complete without its tests.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["0.1", "0.2", "0.3", "0.4", "0.5"] },
    { "id": 1, "tasks": ["1.1", "1.2", "1.3", "1.4", "1.5"], "after": 0 },
    { "id": 2, "tasks": ["1.6", "1.7", "1.8"], "after": 1 },
    { "id": 3, "tasks": ["2.1", "2.2", "2.4", "2.5", "2.6", "2.7", "2.8", "2.9", "2.10", "2.11", "2.12", "2.3"], "after": 2 },
    { "id": 4, "tasks": ["3.1", "3.2", "3.3", "3.4", "3.5", "3.6"], "after": 3 },
    { "id": 5, "tasks": ["4.1", "4.2", "4.3", "4.4", "4.5", "4.6", "4.7", "4.8"], "after": 4 },
    { "id": 6, "tasks": ["5.1", "5.2", "5.3", "5.4"], "after": 5 },
    { "id": 7, "tasks": ["6.1", "6.2", "6.3", "6.4"], "after": 6 },
    { "id": 8, "tasks": ["7.1", "7.2", "7.3", "7.4"], "after": 7 },
    { "id": 9, "tasks": ["8.1", "8.2", "8.3", "8.4", "8.5"], "parallelWithAll": true }
  ]
}
```

## Tasks

### Phase 0 — Audits & specifications

- [x] 0.1 Repository audit (routes, hooks, outcome libs, admin/coordinator/teacher pages, e2e) — findings in `current-state-audit.md`, `ilo-frontend-backend-audit.md`.
- [x] 0.2 Live-schema audit of outcome objects (columns, enums, constraints, FKs, indexes, triggers, functions, RLS policies, grants) — findings in `obe-hierarchy-audit.md`, `outcome-security-remediation.md`.
- [x] 0.3 Mapping-direction audit across all readers/writers — `outcome-mapping-direction-audit.md`. Verdict: canonical direction (source=parent → target=child) is implemented end-to-end; live data 100% canonical (12× ILO→PLO, 12× PLO→CLO, zero reversed/mirrored).
- [x] 0.4 RLS audit — `outcome-security-remediation.md`. Verdict: role+type-scoped split policies WITH CHECK are LIVE (admin-ILO / coordinator-PLO / teacher-CLO + institution reads + canonical mapping policies).
- [x] 0.5 Specifications authored (this directory). Canonical trio: requirements.md, design.md, tasks.md; all supporting files synchronized.

## Phase 1 — OBE reconciliation & hardening

- [x] 1.1 Reconcile mapping direction — DONE & live-verified: hooks write canonical; live `trigger_attainment_rollup` reads canonical (`source=PLO … WHERE target_outcome_id = clo_id`); zero historical reversed rows to migrate.
- [x] 1.2 Repair outcome data — DONE: no mirrored/duplicate/cross-institution/invalid rows found live (reconciliation counts recorded in `outcome-data-reconciliation.md`; archive artifact recommended as follow-up 1.7).
- [x] 1.3 Database constraints — DONE & live: `learning_outcomes_canonical_shape_check`, weight CHECKs on learning_outcomes + outcome_mappings.
- [x] 1.4 Mapping validation DB-side — DONE & live: `trg_validate_outcome_mapping_hierarchy`, `trg_outcome_mapping_weight_sum` (DEFERRABLE), `trg_guard_mapped_outcome_delete`, `trg_enforce_learning_outcome_scope`.
- [x] 1.5 Outcome RLS remediation — DONE & live: split SELECT/INSERT/UPDATE/DELETE policies per role+type WITH CHECK; institution-scoped reads; canonical-direction mapping policies.
- [ ] 1.6 Regression tests for Phase 1: mapping-direction regression test + data-level CLO→PLO→ILO cascade tests (one-to-one, one-to-many, many-to-one, weight changes, grade updates/reversal, empty evidence, duplicate mappings, institution isolation). *(PDF §17, §38)*
- [x] 1.7 Archive the formal outcome-data reconciliation report artifact under `docs/audits/` (counts already captured; persist as dated document). *(DONE: docs/audits/OUTCOME-DATA-RECONCILIATION-2026-08-21.md)*
- [ ] 1.8 **[PREREQUISITE — do before 6.2 write tools]** Verify Admin ILO reorder safety end-to-end (atomic validated reorder; no arbitrary-ID upsert) and delete-dependency direction (follows canonical mapping); add e2e coverage if gaps found. *(PDF §13–14)*

## Phase 2 — DeepSeek provider, Tutor migration, orchestrator, read-only tools, logging

- [x] 2.1 DeepSeekProvider — DONE: `_shared/ai/providers/deepseek.ts` (v4-flash/v4-pro, retries, timeout, cost estimation from official prices); provider factory is DeepSeek-only and config hard-fails on any other `AI_PROVIDER`.
- [x] 2.2 Provider interface — DONE: `_shared/ai/provider.ts` (AIProvider/AICompletionRequest/Response/tool-calls/errors).
- [x] 2.3 MockProvider for deterministic tests *(PDF §29)*. *(DONE: supabase/functions/_shared/ai/providers/mock-provider.ts + src/__tests__/unit/mockProvider.test.ts; never selectable in production — factory hard-fails on non-deepseek)*
- [x] 2.4 Tutor migration — DONE (deployed chat-with-tutor v18): DeepSeek generation via canonical provider boundary; SSE contract preserved; enrollment/CLO-scope/institution authorization; usage limits; academic-integrity detection; server-authorized citation validation; independence nudges; handoff triggers; plan-update triggers; Big-Five persona auto-select; L1/L2/L3 autonomy with assignment>CLO precedence and teacher-ceiling cap.
- [x] 2.5 Embeddings — DONE: Supabase-native gte-small provider (+ optional self-hosted bge-m3 multilingual), versioned metadata, pgvector RPCs v2/v3; RAG fail-closed (no uncited fallback); untrusted-evidence framing (prompt-injection resistance).
- [x] 2.6 Shared orchestrator — DONE: `_shared/ai/orchestrator.ts` (431 lines) + deployed `agent-orchestrator` (v10) and `agent-worker` (v10) edge functions; SPECIALISTS_BY_ROLE routing; proposal store integration; audit sink.
- [x] 2.7 Read-only tool registry — DONE (on main): `_shared/ai/tools/registry.ts` — 21 typed read tools: the original 12 (get_student_learning_context, get_course_mastery, get_outcome_chain, get_habit_context, get_at_risk_signals, search_course_materials, get_assignment_context, get_teacher_course_context, get_parent_child_progress, get_coordinator_outcome_context, get_admin_institution_context, get_intervention_effects) PLUS the 9 PDF §18 outcome tools (get_institution_ilos, get_ilo_detail, get_ilo_attainment, get_ilo_attainment_trend, get_ilo_mapping_coverage, get_ilo_program_contributions, get_ilo_evidence_summary, get_unmapped_program_outcomes, get_outcome_hierarchy_health) with allowedRoles, requiredContext, risk, approvalRequired=false, input/output validation, ToolBoundaryError enforcement.
- [x] 2.8 Write-tools boundary — STARTED (main has `_shared/ai/write-tools/`): audit contents vs PDF §25 protected-action list; complete where thin.
- [x] 2.9 Logging — PARTIAL: agent_runs, agent_action_proposals, agent_action_executions, agent_tool_attempts tables live; tutor_llm_logs live. Remaining: see 8.x observability tasks.
- [x] 2.10 Approval system core — DONE: agent_action_proposals + agent_action_executions live; statuses incl. expired boundary handling (`proposals.ts`); approvals folded into proposals (documented deviation from §35's separate approvals table — acceptable unless product wants separation).
- [x] 2.11 Digital Twin core table — DONE: `student_learning_states` (mastery/habits/risk_signals/strengths/opportunities/goals/active_interventions/recent_evidence/recommendation_history/approved_executed_actions/measured_intervention_effects jsonb sections + version/freshness/state_hash) with RLS.
- [x] 2.12 Proactive intelligence backend — DONE (backend only): proactive-intelligence.ts + proactive-worker.ts on main; NOT yet surfaced in frontend (see Phase 3).

## Phase 3 — Shared assistant frontend, page context, low-risk suggestions, approval UX

- [ ] 3.1 Build `src/ai/components/*`: EdeviserAssistantPanel, AgentConversation, AgentComposer, AgentSuggestionCard, AgentApprovalCard, AgentEvidenceDrawer, AgentTaskInbox, AgentSourceCitation, AgentAutonomyControl, AgentFeedbackControls, LearningStateSummary, OutcomeAlignmentSummary. Design-system based; i18n en/ar from day one; RTL via logical props.
- [ ] 3.2 Page-capability matrix: enumerate every authenticated route (start from PDF §19 list, adapt to real routes) with entity/outcome level/tools/prompts/approval/evidence sources. Deliverable: `page-capability-matrix.md` + code registry consumed by the assistant shell.
- [ ] 3.3 Mount Ask-Edeviser entry + suggested prompts + contextual insight on Student, Teacher, Admin pages first (per PDF §39 Phase 3 scope).
- [ ] 3.4 Wire AgentApprovalCard to agent_action_proposals (approve/reject flows calling agent-orchestrator decision endpoint); revalidate authorization at execution time.
- [ ] 3.5 Surface proactive suggestions (proactive-intelligence backend exists) behind AI_PROACTIVE_AGENTS_ENABLED flag.
- [ ] 3.6 Frontend tests: component tests for approval card (approve→executes, reject→cancelled, expiry), tool-scope denial rendering, i18n en/ar snapshots.

## Phase 4 — Digital Twin breadth + Mastery/Habit/Risk agents + intervention loop

- [ ] 4.1 Add calculation_version/policy_version/model_version fields to student_learning_states (or a versions jsonb) per PDF §28.
- [x] 4.2 Decide snapshot strategy: keep single-table jsonb sections (documented deviation) or add student_mastery_snapshots/student_habit_snapshots/student_risk_snapshots; document decision in design.md/data-model.md. *(DECIDED: keep single-table jsonb sections; documented in design.md §Design decisions. Snapshots may be added later only if history queries demand it.)*
- [ ] 4.3 Implement Mastery Agent (CLO/PLO analysis, derived-ILO alignment with "derived alignment" labeling, prerequisite gaps, trends, chain explanation) using read tools only.
- [ ] 4.4 Implement Habit Agent (consistency, streaks, sessions, late-submission patterns, intervention acceptance, timing, recovery) — deterministic-evidence-based, no invented scores.
- [ ] 4.5 Implement Risk Agent (deterministic signals from OBE+habit evidence, structured output, escalation recommendation).
- [ ] 4.6 Implement Intervention Agent (next safe action selection using measured_intervention_effects; drafts; approval requests).
- [ ] 4.7 Intervention loop jobs: intervention-generation-jobs + intervention-evaluation-jobs (idempotent, batched, dead-letter) — see 8.x.
- [ ] 4.8 Tests: agents produce derived-alignment language only; risk scores never invented; intervention proposals always require approval per PROTECTED_ACTIONS.

## Phase 5 — Teacher & Coordinator copilots + CQI drafts

- [ ] 5.1 Teacher Agent: assigned-course students, misconceptions, draft feedback, intervention drafts, question generation, lesson adaptation (draft-only; publish requires approval).
- [ ] 5.2 Coordinator Agent: PLO/ILO alignment reads, curriculum coverage, program trends, CQI drafts (cqi-draft.ts exists — wire into specialist), accreditation evidence summaries.
- [ ] 5.3 ILO/PLO/CLO first-class context in agent prompts via outcome-context builder (context/ module).
- [ ] 5.4 Tests: coordinator reads ILOs but cannot edit; teacher explains alignment but cannot edit ILO/PLO; CQI drafts never auto-apply.

## Phase 6 — Parent Agent, full Admin Agent, governance/cost dashboard

- [ ] 6.1 Parent Agent: verified-child summary, deadlines, attendance, support suggestions, privacy-aware explanations (uses get_parent_child_progress tool).
- [~] 6.2 Full Admin Agent: ILO governance tools per PDF §18 — READ TOOLS REGISTERED (get_institution_ilos, get_ilo_detail, get_ilo_attainment, get_ilo_attainment_trend, get_ilo_mapping_coverage, get_ilo_program_contributions, get_ilo_evidence_summary, get_unmapped_program_outcomes, get_outcome_hierarchy_health in _shared/ai/tools/registry.ts). REMAINING: draft_ilo, propose_create/update/delete_ilo, propose_reorder_ilos, draft_ilo_governance_report via write-tools boundary → agent_action_proposals requiring Admin approval (blocked on 1.8 prerequisite).
*(MOVED TO DEFERRED — not required for spec completion; see Deferred section.)*
- [ ] 6.4 Tests: Admin Agent cannot create ILO without approval; no role receives unauthorized tools (registry allow-list assertions).

## Phase 7 — Controlled A3 automation

- [x] 7.1 A0–A3 operational autonomy policy engine (`policy/autonomy.ts`): effective autonomy = min(institution, role, page, tool, user preference, teacher/coordinator ceiling); users may lower, never exceed ceilings. L1–L3 pedagogical autonomy stays separate (already in Tutor). *(DONE: supabase/functions/_shared/ai/policy/autonomy.ts + src/__tests__/unit/agentAutonomyPolicy.test.ts incl. PROTECTED_ACTIONS invariant)*
- [ ] 7.2 Institution-level feature flags for A3; evaluation thresholds; rollback controls.
- [~] 7.3 A3 may execute ONLY pre-approved low-risk action classes; PROTECTED_ACTIONS (§25 list) never bypassed — property test asserting this invariant. *(PARTIAL: unit-level invariant covered in agentAutonomyPolicy.test.ts via mayAutoExecute over all PROTECTED_ACTIONS; fast-check property sweep remains.)*
- [ ] 7.4 Evaluation harness: agent_evaluations table + agent-evaluation-jobs; citation/integrity/tool-correctness scoring.

## Cross-cutting — Observability, jobs, docs, hygiene

- [ ] 8.1 Tables: agent_conversations, agent_messages, agent_tool_calls (agent_tool_attempts exists — reconcile naming), agent_tasks, agent_feedback, agent_evaluations, learning_interventions, intervention_outcomes, learning_state_events (+ student_support_states if product wants it). RLS on each; no secrets/tokens/raw PII/chain-of-thought logged.
- [ ] 8.2 Background job families (audit existing cron first; no duplicates): student-risk-jobs, learning-state-update-jobs, teacher-summary-jobs, parent-summary-jobs, coordinator-analysis-jobs, institution-outcome-health-jobs, attainment-recalculation-jobs, agent-evaluation-jobs (+ intervention jobs in 4.7). Small batches, idempotency, retry limits, dead-letter, institution scope, audit logging.
- [ ] 8.3 Docs deliverables: deployment guide, DeepSeek secret-setup guide (Supabase secrets; never print values), rollback guide, known-limitations report.
- [ ] 8.4 Hygiene: delete stale GEMINI_API_KEY/TUTOR_PRIMARY_MODEL lines from .env.example; sync local checkout with main/live (superseded local migration files caused false audit findings); regenerate src/types/database.ts.
- [ ] 8.5 General gates before any merge: lint, tsc, unit, integration, RLS, edge-fn schema check, Playwright, visual, a11y, Arabic/RTL, migration replay, Security Advisor, Performance Advisor (use exact package.json script names).

## Deferred — not required for spec completion

- 6.3 Institution intelligence + governance/cost dashboard UI (AI cost from tutor_llm_logs +
  agent_runs usage; safety/adoption/setup-completeness panels).
  Rationale: product UI feature beyond the agentic platform's core acceptance criteria; the
  underlying data (tutor_llm_logs, agent_runs usage) already exists. Re-scope into a product
  spec when prioritized; do not block Phases 3–8 on it.

## Notes

- Explicit non-goals (per PDF): no Pinecone; no generic SQL tools; no service-role keys in browser;
  no user_metadata authorization; no automatic official outcome mutations; no duplicate cron
  schedules; no mock production data.
- Deviations documented in design.md §3: single-table Digital Twin (vs snapshot tables),
  approvals folded into proposals, agent_tool_attempts naming, generation/embeddings provider split.
- Supporting files in this directory stay synchronized with this canonical tasks file
  (see traceability.md for the requirement→implementation→test map).
