# Architecture — Agentic Intelligence Platform

## Principles

1. One orchestrator, narrowly scoped specialists, typed tools — no free-form agents.
2. Authorization = tool handlers + RLS under caller identity; never LLM output.
3. Generation (DeepSeek) and embeddings (Supabase-native/self-hosted) are separate provider boundaries.
4. Official records change only through proposals → human approval → execution with re-validation.
5. Everything observable; nothing sensitive logged.

## Topology

See design.md §1 diagram. Key flows:

**Tutor flow (live):** browser SSE ⇄ chat-with-tutor → authorize (JWT→profile→enrollment→CLO scope) → embed (Supabase-native) → pgvector search (SECURITY INVOKER under caller JWT) → assemble prompt (persona + autonomy + CLO context + untrusted-evidence blocks) → DeepSeek complete → citation validation → persist messages/usage/logs → post-stream triggers (handoff, plan update).

**Agent flow (orchestrator):** request {route context, message} → authenticateRequest → identity/page context build → specialist selection via SPECIALISTS_BY_ROLE → execute-tool-loop over registered read tools (scope authorization per call) → draft/proposal creation via write-tools boundary → agent_action_proposals (pending_approval) → human decision endpoint → execution with re-validation → agent_action_executions + audit sink.

**Proactive flow:** agent-worker on schedule/event → proactive-intelligence signals → suggestions stored → surfaced in frontend behind AI_PROACTIVE_AGENTS_ENABLED.

## Module layout (target state)

```
supabase/functions/_shared/ai/
├── providers/{deepseek,mock-provider?,types→provider}.ts   [deepseek live]
├── orchestration/{orchestrator,route-agent,execute-tool-loop,context-builder,response-builder}
├── agents/{tutor,mastery,habit,risk,intervention,teacher,parent,coordinator,admin,evaluator}-agent.ts
├── tools/{registry,outcome-tools,role-tools…}.ts           [registry live w/ 12 read tools]
├── policy/{permissions,autonomy,approvals,protected-actions,outcome-governance,data-classification,academic-integrity}
├── context/{actor,page,institution,outcome,student-learning-state,conversation-memory,retrieval}-context.ts
└── observability/{logger,cost-tracker,redaction,metrics}
```

Existing flat modules (contracts/orchestrator/proposals/evaluator/cqi-draft/citations/hash/config/
embedding*/proactive*) remain the working core; new subtrees import from them rather than duplicating.

## Data flow guarantees

- Reads: caller JWT end-to-end where possible (RAG already does); aggregates via SECURITY INVOKER RPCs.
- Writes: only via existing mutation hooks/edge functions; agent writes ONLY as proposals.
- Cross-table server operations use the managed server key inside edge functions, never exposed client-side.

## Failure modes & handling

- Provider down → classified AIProviderError (auth/rate-limit/timeout/transient/budget) with retry/backoff; user sees structured error.
- Embedding/RAG unavailable → course-scoped answers fail closed (NO_AUTHORIZED_EVIDENCE / RAG_UNAVAILABLE) rather than hallucinating.
- Proposal expired → ProposalBoundaryError; re-propose required.
- Tool scope denied → ToolBoundaryError surfaced as safe denial to the model and UI.