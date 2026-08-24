# ADR 0003 — Agentic Autonomy Model (L1–L3 Pedagogical, A0–A3 Operational)

**Status:** Accepted · **Date:** 2026-08 · **Deciders:** Engineering Lead, Product

## Context

Agents act inside a platform holding official academic records. Unbounded autonomy risks
unauthorized grade/outcome mutations; over-restriction kills the product's value.

## Decision

Two autonomy axes:

- **Pedagogical (tutor):** L1 hints → L2 guided discovery → L3 direct explanation.
  Resolution order: assignment-level > CLO-level > default L2; student may lower to L1;
  L3 capped by teacher ceiling.
- **Operational (agents):** A0 observe → A1 suggest/draft → A2 confirm-before-action →
  A3 pre-approved low-risk automation. Platform ceiling is currently A2 (A3 gated behind
  Phase-7 evaluation thresholds + feature flags).

Effective autonomy = `min(institutionCeiling, roleCeiling, pageCeiling, toolCeiling,
userPreference, supervisorCeiling)`. Users may LOWER their autonomy, never raise it above
any ceiling. PROTECTED_ACTIONS (grades, deadlines, attendance, outcome CRUD/mappings,
messaging, institutional policy, financials) ALWAYS require human approval regardless of A3;
a property test asserts they can never auto-execute. Protected writes flow through
`agent_action_proposals` (approval changes proposal state only) followed by registered typed
tools with execution-time authorization rechecks and exactly-once receipts
(`agent_action_executions`). Agent bounds default to 4 tool steps / 6 calls / 2 specialist
transfers; unknown tools and cross-scope requests fail closed.

## Consequences

- Every new agent tool must declare allowedRoles, actionType, approval, dataCategories,
  inputSchema before registration.
- Approval UX is mandatory for A1/A2 surfaces shipped today.
- Governance UI: Admin → AI Governance (`ai_governance_policies`).
