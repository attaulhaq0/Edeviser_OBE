# Evaluation Plan — Agentic Intelligence Platform

## Test layers (exact commands from package.json — verify before running)

| Layer | What | Gate |
|---|---|---|
| Type check | `npx tsc --noEmit` | every PR |
| Lint | `npm run lint` (zero warnings) | every PR |
| Unit | `npm test` (vitest --run) incl. new AI/OBE units | every PR |
| Property | src/__tests__/properties/* (fast-check ≥100 iters): A3-never-bypasses-PROTECTED_ACTIONS; derived-alignment labeling; autonomy min-ceiling; redaction completeness | per feature |
| RLS integration | deny-side matrix for outcomes + all new agent tables (allow AND deny per role × action) | per migration |
| Edge function tests | orchestrator/proposals/tutor contract tests; edge-fn schema check vs database.ts | per change |
| E2E Playwright | approval flows, role surfaces, ILO flows, intelligence-chain (upgrade assertions to data-level) | pre-merge |
| Visual regression | screen-map rows for new AI surfaces at 4 viewports | per UI slice |
| Accessibility | axe/Lighthouse, keyboard, focus order, contrast, touch targets, reduced motion | per UI slice |
| Arabic/RTL | en+ar snapshots, logical props audit, i18n key parity (`npm run i18n:check`) | per UI slice |
| Migration replay | local Docker from-scratch replay clean | per migration |
| Advisors | Security Advisor + Performance Advisor clean of NEW findings | per migration |

## Agent quality evaluation (Phase 7 gate)

- agent_evaluations scoring per run: authorization correctness, citation validity, academic
  integrity, tool-correctness, approval-policy compliance, response safety.
- Thresholds before enabling A3 per institution: e.g. ≥98% approval-policy compliance,
  ≥99% citation validity over a rolling window; thresholds configurable, failures auto-revert A3→A2.
- Retrieval evaluation: en+ar query sets against course_material_embeddings measuring hit@k and
  citation faithfulness; required before any embedding-model change.

## Acceptance harness

Each Phase in tasks.md lists its own tests; a phase is DONE only when its tests are green on the
merge commit AND advisors are clean. Known-limitations report updated whenever a deviation ships.