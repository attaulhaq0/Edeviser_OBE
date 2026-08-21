# Rollout Plan — Phases & Gates

## Current position (2026-08-21)

Phases 0–2 substantially DONE and live-verified (see current-state-audit.md). Remaining:
finish Phase 2 loose ends → Phases 3–7.

## Phase gates

| Phase | Scope | Exit criteria |
|---|---|---|
| 0 Audits/specs | repository + live-schema + ILO + direction + RLS audits; specifications | ✅ done (this directory) |
| 1 OBE reconciliation | direction canonical, data clean, constraints, RLS, hooks verified, cascade verified | ✅ live-verified; ⏳ certification tests (1.6) + reorder/delete verification (1.8) |
| 2 DeepSeek/orchestrator/read-tools/logging | provider, tutor migration, orchestrator+worker, read registry, proposals, twin core table | ✅ largely done; ⏳ MockProvider (2.3), write-tools audit (2.8), observability breadth (8.x) |
| 3 Assistant frontend | src/ai components, page matrix, student/teacher/admin mounting, approval UX, proactive surfacing | component+e2e tests green; flags default-off then staged on |
| 4 Digital Twin + M/H/R agents + interventions | versions columns, snapshot decision, four agents, intervention loop jobs | agent tests + intervention approval-path tests green |
| 5 Teacher/Coordinator copilots | copilots, outcome context, CQI drafts | role-boundary tests green |
| 6 Parent + full Admin + governance dashboard | parent agent, admin §18 tools, cost/safety dashboards | approval-flow e2e green |
| 7 A3 automation | autonomy engine rollout, institution flags, thresholds, rollback | property test invariant + evaluation thresholds met per institution |

## Rollout mechanics

- Feature flags: AI_FEATURE_ENABLED (master), AI_PROACTIVE_AGENTS_ENABLED, AI_AUTO_LOW_RISK_ENABLED,
  AI_PROTECTED_WRITES_ENABLED, per-institution A3 flag (Phase 7). Default OFF; staged enablement.
- Every phase ships behind flags; rollback = flag flip (+ documented migration reverse where schema changed).
- Preview-first: no production apply outside PR Preview gates; MERGE ≠ DEPLOYMENT ≠ ATTESTATION
  (runtime-governance rules apply to edge-function deploys).
- Post-deploy smoke per phase on production (read-only checks first).

## Risk register

| Risk | Mitigation |
|---|---|
| Local/main/live drift causes false audits | sync task 8.4 + standing live-verification rule |
| Cost overrun | daily budget gate + per-run cost logging + advisor review |
| Approval fatigue | batch low-risk drafts; keep PROTECTED_ACTIONS list tight per PDF |
| Agent quality regressions | evaluator scoring + thresholds + auto-revert to A2 |