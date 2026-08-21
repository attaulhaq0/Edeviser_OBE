# Current-State Audit — 2026-08-21 (local + GitHub main + live Supabase)

## Verification surfaces

- Local: f:/Edeviser-Kiro (branch feat/proactive-agentic-intelligence) — **known to lag main/live in places**
- GitHub: attaulhaq0/Edeviser_OBE default branch
- Live DB: Supabase `cdlgtbvxlxjpcddjazzx` (pg_catalog introspection + deployed function sources)

> Lesson recorded: local-only audits produced 4 false P0 findings (see
> docs/audits/AGENTIC-INTELLIGENCE-CROSSCHECK-2026-08-21.md REVISION). Every claim below is
> triple-checked or explicitly marked "to verify".

## Implemented & verified

| Area | Evidence |
|---|---|
| DeepSeek-only generation (provider, factory, config hard-fail) | _shared/ai/providers/deepseek.ts; deployed chat-with-tutor v18 |
| Tutor fully migrated (SSE, RAG fail-closed, citations validation, integrity detection, autonomy L1–L3 w/ teacher ceiling, usage limits, XP, handoffs, plan updates, Big-Five persona) | deployed function source |
| Embeddings (Supabase-native gte-small v2; optional bge-m3 v3; pgvector RPCs v2/v3) | embedding-registry.ts; live RPCs |
| Orchestrator + worker | orchestrator.ts (431 ln); agent-orchestrator/agent-worker deployed v10 |
| Read tool registry (12 tools, typed boundaries) | _shared/ai/tools/registry.ts (main) |
| Write-tools boundary started | _shared/ai/write-tools/ (main) — audit pending |
| Proposals/approvals/executions | tables live; proposals.ts statuses incl. expiry |
| Digital Twin core | student_learning_states live (jsonb sections, version/freshness/state_hash, RLS) |
| OBE enforcement | shape check, weight checks, hierarchy/weight-sum/delete-guard/scope triggers — live |
| Outcome RLS split policies WITH CHECK | pg_policy — live |
| Canonical mapping direction | hooks + live trigger + 100% canonical data (12+12) |
| Proactive intelligence backend | proactive-intelligence.ts / proactive-worker.ts (main) |
| Evaluator + CQI-draft modules | evaluator.ts, cqi-draft.ts |

## Genuinely missing (the real backlog)

1. `.kiro/specs/edeviser-agentic-intelligence/` documents (this directory — being created now)
2. Specialist agent implementations beyond SPECIALISTS_BY_ROLE map (agents/ subtree)
3. PDF §18 outcome read/draft/propose tools in the registry
4. A0–A3 operational autonomy policy engine (L1–L3 exists in Tutor only)
5. Entire src/ai frontend (components, page-capability matrix, mounting, i18n)
6. Observability tables: agent_conversations/messages/tool_calls(naming)/tasks/feedback/evaluations, learning_interventions, intervention_outcomes, learning_state_events (+ versions columns on student_learning_states)
7. Background job families (§36) — none scheduled yet for agent workloads
8. MockProvider; hybrid retrieval/rerank; retrieval evaluation tests
9. Tests: outcome RLS deny-side matrix, mapping-direction regression, data-level cascade, agent authorization boundaries
10. Hygiene: stale GEMINI env lines; local checkout sync; types regeneration

## Desync record (for history)

Local branch lacked: tools/registry.ts, write-tools/, proactive-worker.ts; contained superseded
OBE migration files. Live DB contained MCP-applied OBE remediations not present as local files.
Resolution: task 8.4 (sync + regen types); standing rule — verify DB claims against live schema.
---

## Post-review addendum (2026-08-22)

This report documents the **pre-PR baseline**. Status corrections after PR #271 commits `a712262` / `50f783c`:

- The 9 outcome read tools ARE registered (`supabase/functions/_shared/ai/tools/registry.ts`) and now have full `authorizeScope` + `executeRead` dispatch implementations in `supabase/functions/agent-orchestrator/data-source.ts` (verified against live schema: learning_outcomes.type ∈ {ILO,PLO,CLO}, outcome_attainment.scope ∈ {student_course,program,course}).
- A0–A3 autonomy policy engine exists (`supabase/functions/_shared/ai/policy/autonomy.ts`, tested by `agentAutonomyPolicy.test.ts`).
- MockProvider exists (`supabase/functions/_shared/ai/providers/mock-provider.ts`, property-tested).
- Mapping-direction regression tests exist (`outcomeMappingDirection.property.test.ts`).
