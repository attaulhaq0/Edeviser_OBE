# Traceability — PDF requirement → spec → implementation → tests

> Requirement IDs map to requirements.md (R#), tasks.md (task #), and evidence files.

| PDF § | Requirement | Spec file(s) | Implementation | Tests | Status |
|---|---|---|---|---|---|
| §1 | DeepSeek primary; Gemini not required | R1.1–1.2 | providers/deepseek.ts; provider-factory; deployed tutor v18 | provider unit tests; config hard-fail test | ✅ (env-doc cleanup pending 8.4) |
| §5 | Audit, don't rebuild ILO pages | R4 | ilo-frontend-backend-audit.md | e2e intelligence-chain (shallow) | 🟡 certify (1.8) |
| §6 | Canonical hierarchy | R2.1 | obe-hierarchy-audit.md | — | ✅ live |
| §7 | Canonical mapping direction | R2.2 | outcome-mapping-direction-audit.md | regression test pending (1.6) | ✅ live; test pending |
| §8 | Data reconciliation | R2.4 | outcome-data-reconciliation.md | — | ✅ clean; archive (1.7) |
| §9 | Structural constraints | R2.3 | obe-hierarchy-audit.md (CHECKs) | replay + constraint tests (1.6) | ✅ live |
| §10 | Mapping validation | R2.3 | hierarchy/weight-sum triggers | cycle/weight tests (1.6) | ✅ live |
| §11 | Outcome RLS split policies | R3.1–3.2 | outcome-security-remediation.md | deny-side matrix pending (1.6) | ✅ live; tests pending |
| §12 | Helper function audit | R3.3 | security-model.md | — | ✅ prior hardening |
| §13–14 | Admin ILO verify/complete | R4.2–4.3 | ilo-frontend-backend-audit.md | e2e additions (1.8) | 🟡 |
| §15 | Coordinator workflow | R5.1 | page-capability-matrix.md | role-boundary tests (5.4) | 🟡 pages exist |
| §16 | Teacher workflow | R5.2 | page-capability-matrix.md | role-boundary tests (5.4) | 🟡 pages exist |
| §17 | Attainment cascade | R2.5 | rollup trigger (live) | data-level cascade tests (1.6) | ✅ logic; tests pending |
| §18 | ILO-aware agent tools | R6.4 | tool-registry.md (planned additions) | allow-list tests (6.4) | ❌ to build |
| §19 | Page-aware context | R12.2 | page-capability-matrix.md | — | ❌ skeleton only |
| §20 | Shared architecture | R6.1 | architecture.md | orchestrator tests | ✅ core; subtrees pending |
| §21 | Specialist agents | R6.4 | design.md §4.1 | per-agent tests (4.8/5.4/6.4) | ❌ to build |
| §22 | Tool safety interface | R6.2–6.3 | tool-registry.md | boundary tests | ✅ pattern live; extensions pending |
| §23 | Autonomy A0–A3 | R7 | autonomy-policy.md | min-ceiling + invariant property tests (7.3) | ❌ engine to build (L1–L3 live) |
| §24–25 | Automatic vs approval actions | R7.3–7.4 | autonomy-policy.md; PROTECTED_ACTIONS | approval-path tests (3.6/4.8) | 🟡 enum live; enforcement breadth to verify |
| §26–28 | Digital Twin | R9 | data-model.md | twin tests (4.x) | 🟡 core table live; breadth pending |
| §29 | DeepSeek integration | R1.1 | design.md §2 | — | ✅ (MockProvider pending 2.3) |
| §30 | Tutor migration | R10-adj | current-state-audit.md | tutor contract tests | ✅ deployed v18 |
| §31 | RAG strategy | R10 | design.md §2 | retrieval eval (evaluation-plan) | 🟢 largely; hybrid pending |
| §32 | Shared frontend | R12.1 | frontend-plan.md | component tests (3.6) | ❌ to build |
| §33 | Page-capability matrix | R12.2 | page-capability-matrix.md | — | ❌ skeleton |
| §34 | Role frontend requirements | R12.3 | frontend-plan.md mounting plan | e2e (3.6) | ❌ to build |
| §35 | Approval system | R8 | design.md §3.2 | approval e2e (3.4/3.6) | 🟡 core live |
| §36 | Background jobs | R11.2 | migration-plan.md; tasks 8.2 | job idempotency tests | ❌ to build |
| §37 | Observability | R11.1 | data-model.md deltas | redaction tests | 🟡 partial |
| §38 | Testing requirements | R13.1 | evaluation-plan.md | — | 🟡 gaps listed |
| §39 | Rollout phases | — | rollout-plan.md | phase gates | 🟡 Ph0–2 done |
| §40–41 | Deliverables & DoD | — | tasks.md | per-phase gates | 🟡 in progress |
| §42 | Conduct rules | — | AGENTS.md/.clinerules + this spec | — | ✅ standing |

## Synchronization rule

Any change to requirements.md/design.md/tasks.md must be reflected here (and vice versa).
Supporting audit files update whenever live schema or implementation changes.