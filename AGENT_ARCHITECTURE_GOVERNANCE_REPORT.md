# AGENT ARCHITECTURE GOVERNANCE REPORT
**Date:** 2026-09-12 | **ADR:** ADR-0001

## ACTUAL ARCHITECTURE

**Single Orchestrator + Specialist Intelligence + Shared Tools**

One `agent-orchestrator` Edge Function routes requests to 10 specialist protocol/prompt variants through a shared tool registry (21 read + 10 write tools). All protected writes require human approval. The deterministic platform (grades, attainment, authorization) remains authoritative.

## TERMINOLOGY DECISION

| Term | Status | Definition |
|------|--------|-----------|
| "Edeviser Agentic Intelligence" | ✅ CANONICAL | The overall system |
| "Single Orchestrator" | ✅ CANONICAL | The architecture model |
| "Specialist Intelligence" | ✅ CANONICAL | Role-specific protocols |
| "Agent Specialist" | ✅ CANONICAL | A protocol/prompt variant |
| "Tool-Augmented Agentic System" | ✅ CANONICAL | Accurate technical description |
| "Agent Orchestration" | ✅ CANONICAL | The routing/coordination layer |
| "Multi-agent" | ⚠️ HISTORICAL | Used in `.kiro/specs/` — predates implementation |
| "Independent autonomous agents" | ❌ INCORRECT | Not implemented |
| "Agent swarm" | ❌ INCORRECT | Not implemented |
| "Agent-to-agent architecture" | ❌ INCORRECT | Not implemented |

## FILES CHANGED

| File | Change |
|------|--------|
| `docs/architecture/governance/DECISIONS/ADR-0001-SINGLE-ORCHESTRATOR.md` | **CREATED** — Canonical ADR |
| `docs/architecture/AGENTIC_ARCHITECTURE_CANONICAL.md` | **CREATED** — Architecture diagram + rules |
| `AGENTS.md` | **UPDATED** — Added Agentic Architecture Governance section with hard rules |
| `PRODUCT_CONSTITUTION.md` | **UPDATED** — Added AGENTIC ARCHITECTURE section |

## FILES MARKED AS HISTORICAL (not modified — remain as historical record)

| File | Note |
|------|------|
| `.kiro/specs/edeviser-agentic-intelligence/` | Spec language predates implementation; "multi-agent" was aspirational |
| `PHASE14_AGENTIC_RUNTIME_CERTIFICATION.md` | Phase 14 report — predates architecture clarification in Phase 15 |
| `PHASE14_*` | All Phase 14 audit reports — historical findings, not modified |

## FILES ALREADY RECONCILED (no change needed)

| File | Status |
|------|--------|
| `PHASE15_AGENT_RUNTIME_CERTIFICATION.md` | ✅ Already says "SINGLE ORCHESTRATOR + SPECIALIST INTELLIGENCE" |
| `PHASE15_ARCHITECTURE_RECONCILIATION.md` | ✅ Already documents the decision |
| `PHASE15_FINAL_VERDICT.md` | ✅ Already notes "Architecture clarity: Multi-agent claim → Single orchestrator" |
| `AGENT_SYSTEM_MAP.md` (Phase 14) | ✅ Already documents "NOT genuinely multi-agent" |
| `supabase/functions/_shared/ai/specialists/protocols.ts` | ✅ Code already correct — specialists are protocol blocks |

## ARCHITECTURE FITNESS RULES

The following trigger an architecture review if introduced without an ADR:
1. New orchestrator or agent runtime
2. New independent execution loop
3. Specialist-specific memory system
4. Specialist-specific authorization (separate from shared registry)
5. Agent-to-agent messaging
6. Autonomous write without human approval

## FUTURE MULTI-AGENT MIGRATION CRITERIA

A multi-agent redesign should ONLY be considered when:
1. Demonstrated need for genuinely independent long-running parallel tasks
2. Specialized tool permissions requiring separate authorization scopes
3. Independent planning loops for different domains
4. Independent memory/state requirements per specialist
5. Orchestration complexity exceeding single orchestrator capability
6. Measurable quality/latency improvement >20%
7. Acceptable additional AI cost (within defined budget)
8. Manageable security/tenant isolation complexity

**No migration based on branding or terminology preferences.**

## SECURITY IMPLICATIONS

- Single orchestrator = single point of authorization enforcement → simpler to audit
- Shared tool registry = all tools governed in one place → no shadow tool risk
- Human approval gated at one point → no bypass paths
- Deterministic core boundary clear → AI cannot mutate grades/attainment/authorization

## COST IMPLICATIONS

- Single orchestrator = 1 LLM call per request → lower cost than multi-agent chains
- If multi-agent: each "agent" = 1+ additional LLM calls → cost multiplies
- Agent-worker (cron every 5 min) + agent-evaluation-jobs (cron every 20 min) = predictable background cost
- DeepSeek pricing: ~$0.0002/1K tokens — single orchestrator keeps cost in $10-200/month range

## ACCEPTANCE CHECKLIST

- [x] Single orchestrator is canonical
- [x] Specialist terminology is consistent
- [x] No false multi-agent claims in current docs
- [x] AgentExecutionContext remains canonical
- [x] Shared tool registry remains canonical
- [x] Human approval remains enforced
- [x] Deterministic core remains authoritative
- [x] AGENTS.md updated with hard rule
- [x] PRODUCT_CONSTITUTION.md updated
- [x] Architecture docs created
- [x] ADR-0001 created
- [x] Architecture fitness rules exist
- [x] Future multi-agent migration criteria documented