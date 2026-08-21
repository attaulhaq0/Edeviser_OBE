# Design — Edeviser Agentic Intelligence, Digital Twin & OBE/ILO Remediation

> Canonical file. Describes HOW the system is (verified state) and will be built.
> All claims marked "live" were verified against Supabase project `cdlgtbvxlxjpcddjazzx`
> on 2026-08-21; "main" = GitHub attaulhaq0/Edeviser_OBE default branch.

## Overview

Transform Edeviser into a secure, context-aware, multi-agent learning platform: a canonical
OBE/ILO layer enforced at the database, a DeepSeek-only agentic backbone (orchestrator +
worker + typed tool registry + approval proposals), a Student Learning Digital Twin, and one
shared role-aware assistant frontend. This design records the VERIFIED current state (do not
rebuild) and the remaining build surface.

## Architecture

```
Browser (React 18 + TS + Vite + TanStack Query + Shadcn/ui, en/ar RTL)
   │  JWT (Authorization header) — never service keys
   ▼
Edge Functions (Deno)
   ├─ chat-with-tutor (v18, live) ── canonical AIProvider boundary ──► DeepSeek API
   ├─ agent-orchestrator (v10, live) ── SPECIALISTS_BY_ROLE routing, proposals, audit sink
   ├─ agent-worker (v10, live) ── background/proactive processing
   └─ domain functions (award-xp, check-badges, generate-*, …)
   │
   ▼
PostgreSQL (RLS everywhere; SECURITY INVOKER preferred)
   ├─ OBE core: learning_outcomes / outcome_mappings / outcome_attainment (+ triggers/constraints)
   ├─ Agent core: agent_runs, agent_action_proposals, agent_action_executions, agent_tool_attempts
   ├─ Digital Twin: student_learning_states (jsonb sections + version/freshness/state_hash)
   └─ Tutor: tutor_conversations/messages/usage_limits/llm_logs/plan_updates
```

## 2. Verified building blocks (do not rebuild)

| Block | Location | State |
|---|---|---|
| DeepSeek provider | `_shared/ai/providers/deepseek.ts` | live; v4-flash/v4-pro; retries/timeout/cost estimation |
| Provider interface + factory | `_shared/ai/provider.ts`, `provider-factory.ts` | live; factory hard-fails on non-deepseek |
| Embeddings | `_shared/ai/embedding*.ts`, `providers/supabase-embedding.ts`, `providers/http-embedding.ts` | live; gte-small (v2) + bge-m3 option (v3); pgvector RPCs search_course_materials_v2/v3 |
| Orchestrator | `_shared/ai/orchestrator.ts`; `agent-orchestrator/index.ts` | live; SPECIALISTS_BY_ROLE, ProposalStore, audit sink |
| Proposals/approvals | `_shared/ai/proposals.ts`; tables agent_action_proposals/executions | live; statuses incl. expired; approvals folded into proposals (documented deviation) |
| Read tool registry | `_shared/ai/tools/registry.ts` (main) | 12 typed read tools; allowedRoles/requiredContext/risk/validation/boundary errors |
| Write tools | `_shared/ai/write-tools/` (main) | present; audit vs §25 list pending (task 2.8) |
| Contracts | `_shared/ai/contracts.ts` | SPECIALISTS_BY_ROLE, PROTECTED_ACTIONS, OperationalAutonomy type |
| Evaluator/CQI-draft/citations/hash/config | `_shared/ai/*.ts` | live |
| Proactive intelligence | `proactive-intelligence.ts`, `proactive-worker.ts` (main) | backend only; frontend surfacing pending |
| OBE enforcement | DB constraints/triggers (see obe-hierarchy-audit.md) | live |
| Outcome RLS | split policies WITH CHECK (see outcome-security-remediation.md) | live |
| Tutor | deployed chat-with-tutor v18 | fully migrated to DeepSeek |

## 3. Design decisions & documented deviations

1. **Digital Twin shape:** single `student_learning_states` table with jsonb sections instead of the PDF's five snapshot tables. Rationale: one row per student with freshness (`fresh_until`) and `state_hash` gives cheap reads and atomic updates; snapshots can be added later for history (task 4.2 decides). Deviation accepted; document in data-model.md.
2. **Approvals folded into proposals** rather than a separate `agent_action_approvals` table. The proposal row carries approver decision fields. Revisit only if multi-step approval chains are needed.
3. **Tool naming:** live table is `agent_tool_attempts` (not `agent_tool_calls`). Either rename via migration or keep and alias in docs — decide in task 8.1; do not create a duplicate table.
4. **Generation vs embeddings separation:** generation = DeepSeek only; embeddings = Supabase-native/self-hosted. An embedding outage degrades RAG context but never routes data to another vendor (already implemented in Tutor).
5. **SSE contract preserved:** Tutor streams SSE to the browser while generation itself uses the canonical non-streaming provider call — keeps the browser contract stable across provider changes.

## Components and Interfaces

### Specialist agents (`_shared/ai/agents/*`)
Each specialist is a prompt+tool-scope configuration consumed by the orchestrator's tool loop — not an independent LLM client:
- `mastery-agent`: inputs from get_course_mastery/get_outcome_chain; outputs derived-alignment explanations (labels "derived alignment based on mapped course evidence"); never official ILO attainment.
- `habit-agent`: get_habit_context + habit tables; deterministic evidence structuring; no invented scores.
- `risk-agent`: get_at_risk_signals + OBE/habit evidence; deterministic signals only; escalation recommendation.
- `intervention-agent`: measured_intervention_effects + safe-action catalog; produces drafts/proposals only.
- `teacher-agent` / `coordinator-agent` / `admin-agent` / `parent-agent`: role-scoped read/draft behaviors per PDF §21.
- `evaluator-agent`: post-run scoring (authorization, citations, integrity, tool correctness, approval policy, safety) → agent_evaluations.

### Tool registry extensions (`_shared/ai/tools/*`)
Add PDF §18 outcome tools as read tools first (get_institution_ilos, get_ilo_detail, get_ilo_attainment, get_ilo_attainment_trend, get_ilo_mapping_coverage, get_ilo_program_contributions, get_ilo_evidence_summary, get_unmapped_program_outcomes, get_outcome_hierarchy_health). Draft/propose tools (draft_ilo, propose_create/update/delete_ilo, propose_reorder_ilos, draft_plo, propose_plo_ilo_mapping, draft_cqi_action, draft_clo, propose_clo_plo_mapping) go through write-tools boundary → agent_action_proposals. Every tool follows the existing registry pattern (allowedRoles, requiredContext, validation, boundary errors).

### Autonomy engine (`_shared/ai/policy/autonomy.ts`)
```ts
effectiveAutonomy = min(institutionCeiling, roleCeiling, pageCeiling, toolCeiling, userPreference, supervisorCeiling?)
```
A0 observe · A1 suggest/draft · A2 confirm-before-action · A3 execute pre-approved low-risk classes. PROTECTED_ACTIONS always require approval regardless of A-level. Persisted ceilings: institution_settings (new column or jsonb), user preference (profiles jsonb), page matrix, tool declaration.

### Context builders (`_shared/ai/context/*`)
actor-context (identity/role/institution from authoritative profile), page-context (route/entity IDs supplied by the client request and validated against the page-capability matrix), institution-context, outcome-context (ILO/PLO/CLO chain via read tools), student-learning-state (reads student_learning_states), conversation-memory (tutor_messages / future agent_messages), retrieval-context (RAG scope).

### Observability (`_shared/ai/observability/*`)
logger (structured, redacted), cost-tracker (DeepSeek price table already in provider), redaction (strip secrets/tokens/PII/CoT), metrics (latency/token/cost aggregates). Tables per tasks 8.1.

### Frontend (`src/ai/components/*`)
One assistant shell (EdeviserAssistantPanel) adapted by the page-capability matrix: entry point, suggested prompts, insight cards, proactive cards, evidence drawer, approval card, task inbox, autonomy control, feedback controls, learning-state summary, outcome-alignment summary. Hooks call agent-orchestrator with { route context, message }; approval decisions call the orchestrator decision endpoint. i18n namespaces `ai.*` in en/ar.

## Data Models

Full detail in data-model.md. Deltas:

New tables (RLS on all): agent_conversations, agent_messages, agent_tasks, agent_feedback, agent_evaluations, learning_interventions, intervention_outcomes, learning_state_events (+ optional student_support_states). Columns added: calculation_version/policy_version/model_version on student_learning_states (or versions jsonb). Naming reconciliation: agent_tool_attempts ↔ agent_tool_calls.

## Error Handling

See architecture.md §Failure modes: classified AIProviderError kinds with retry/backoff;
fail-closed RAG (NO_AUTHORIZED_EVIDENCE / RAG_UNAVAILABLE); ProposalBoundaryError on expired
proposals; ToolBoundaryError surfaced as safe denial. Security model summary (full detail in
security-model.md):

JWT → authenticateRequest → authoritative profile lookup → RLS under caller identity for reads; managed server key only for cross-table writes inside edge functions; tool handlers re-check scope; proposals re-validate authorization at execution; no raw SQL anywhere; advisors clean before merge.

## Testing Strategy

Full plan in evaluation-plan.md.

Unit (registry boundaries, autonomy min-ceiling, redaction), integration-RLS (outcome matrix deny-side), property tests (A3 never bypasses PROTECTED_ACTIONS; derived-alignment labeling), e2e Playwright (approval flows, role surfaces), visual/a11y/Arabic-RTL, migration replay via local Docker, advisors after every migration.