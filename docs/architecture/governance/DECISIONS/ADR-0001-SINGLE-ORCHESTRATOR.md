# ADR-0001: Single Orchestrator + Specialist Intelligence Architecture

**Status:** ACCEPTED
**Date:** 2026-09-12
**Deciders:** Principal Architect (codebase reverse-engineering audit, Phases 14-22)

## Context

Edeviser's agentic intelligence system was originally specified as "multi-agent" in `.kiro/specs/edeviser-agentic-intelligence/`. The implementation evolved into a single `agent-orchestrator` Edge Function that routes requests to 10 specialist protocol/prompt variants, all sharing a common tool registry and execution context.

An independent codebase reverse-engineering audit (Phase 14) confirmed:
- 1 orchestrator (`agent-orchestrator`)
- 10 specialists implemented as protocol/prompt configurations
- 1 shared tool registry (21 read + 10 write tools)
- 1 background worker (`agent-worker`, cron-driven)
- 1 evaluation worker (`agent-evaluation-jobs`, cron-driven)
- Specialists do NOT have: independent memory, independent goals, independent lifecycles, agent-to-agent messaging

## Decision

**Edeviser will use a SINGLE ORCHESTRATOR + SPECIALIST INTELLIGENCE architecture.**

The orchestrator is responsible for:
- Request routing
- Context construction (canonical AgentExecutionContext)
- Specialist selection (based on request context)
- Tool authorization (role-gated, tenant-scoped)
- Execution coordination (synchronous + asynchronous)
- Proposal generation (protected actions → human approval)
- Human approval integration
- Audit trail (agent_runs, agent_messages, agent_tool_calls)
- Failure handling (retry with dead-letter after 3 attempts)

Specialist capabilities are currently represented as specialized protocols/prompt configurations, NOT as independent autonomous agents.

## Rationale

The single orchestrator model is preferred for Edeviser's current context:

1. **Lower operational complexity** — One execution path to debug, monitor, and optimize
2. **Lower AI cost** — One LLM call per request rather than multi-agent chains
3. **Easier authorization** — Single point of tool permission enforcement
4. **Easier context consistency** — Canonical AgentExecutionContext shared by all specialists
5. **Easier observability** — Single audit trail (agent_runs) covers all specialist activity
6. **Easier debugging** — One request → one run → one response trace
7. **Easier QA** — Deterministic specialist selection based on context
8. **Easier tenant isolation** — Single institution_id scope per request
9. **Easier human approval** — All write tools require human approval, gated at one point
10. **Solo-developer maintainable** — Current engineering team is small

## Consequences

### Positive
- Architecture matches implementation — no documentation drift
- Simplified cost tracking and budgeting
- Clearer security boundaries
- Easier onboarding for new developers
- Honest product representation to customers

### Negative
- Specialist capabilities are bounded by a single LLM call
- No parallel specialist execution for complex multi-domain queries
- No specialist-to-specialist handoff for multi-step reasoning
- May become insufficient for genuinely independent long-running tasks

### Future Migration Criteria
A multi-agent redesign should ONLY be considered when there is DEMONSTRATED NEED:

1. Genuinely independent long-running tasks that benefit from parallel execution
2. Specialized tool permissions that require separate authorization scopes
3. Independent planning loops for different domains
4. Independent memory/state requirements per specialist
5. Orchestration complexity exceeding the single orchestrator's capability
6. Measurable quality or latency improvement from multi-agent architecture
7. Acceptable additional AI cost with budget justification
8. Manageable security and tenant isolation complexity

**No migration based on branding or terminology preferences.**

## References
- `supabase/functions/agent-orchestrator/index.ts` — Orchestrator implementation
- `supabase/functions/_shared/ai/contracts.ts` — Agent types and context
- `supabase/functions/_shared/ai/orchestrator.ts` — Orchestration logic
- `supabase/functions/_shared/ai/tools/registry.ts` — Read tool registry
- `supabase/functions/_shared/ai/write-tools/registry.ts` — Write tool registry
- `supabase/functions/_shared/ai/specialists/protocols.ts` — Specialist protocol definitions
- `PHASE15_ARCHITECTURE_RECONCILIATION.md` — Architecture decision documented
- `AGENT_SYSTEM_MAP.md` — Agent system architecture map (Phase 14)