# Agentic Intelligence Spec — Formal 8.5 Gate Run (2026-09-01)

Formal per-merge gate pass for `.kiro/specs/edeviser-agentic-intelligence` task 8.5,
executed on top of main `8afb40e3` (Wave A–E closure). This is the certification pass
that closes tasks 4.3–4.6 (end-to-end specialist certification) and 6.2 (execution-path
proof), recorded with exact command names and honest environment scoping.

## Gate results (local, this machine)

| #   | Gate (exact script/command)                  | Result                                                                                                                                                                                                                                                                                                        |
| --- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `npm run lint` (eslint `--max-warnings 0`)   | ✅ 0 errors, 0 warnings                                                                                                                                                                                                                                                                                       |
| 2   | `npx tsc --noEmit`                           | ✅ clean (exit 0)                                                                                                                                                                                                                                                                                             |
| 3   | `npm test` (`vitest --run`)                  | ✅ 722 files / **6,631 tests passed**, 0 failed                                                                                                                                                                                                                                                               |
| 4   | `npm run db:check-replay`                    | ✅ CLEAN — 426 migrations, no too-early references                                                                                                                                                                                                                                                            |
| 5   | `npm run db:check-dup-names`                 | ✅ CLEAN — 11 grandfathered dup base-names, no new collisions                                                                                                                                                                                                                                                 |
| 6   | `npm run i18n:check`                         | ✅ all namespaces in parity (`ai`: 230 keys)                                                                                                                                                                                                                                                                  |
| 7   | `npm run check:runtime-dependencies`         | ✅ valid — no affected groups, `deploymentRequired: false`                                                                                                                                                                                                                                                    |
| 8   | `npm run test:rls` (pgTAP/integration)       | ⏭️ skip-manifest: all suites skipped — no Preview env configured locally (tracked in deferral ledger #278: gate must fail loudly on configured-but-invalid Preview)                                                                                                                                           |
| 9   | Playwright E2E (`npx playwright test`)       | ◻️ **partially environment-gated** — see E2E scoping below                                                                                                                                                                                                                                                    |
| 10  | `npm run test:visual` (visual regression)    | ✅ **21 passed** (prototype-reference comparisons)                                                                                                                                                                                                                                                            |
| 11  | a11y (axe-core suites inside `tests/e2e/`)   | ⏭️ preview-seeded (requires auth storageState)                                                                                                                                                                                                                                                                |
| 12  | Arabic/RTL (`tests/e2e/rtl/layout.spec.ts`)  | ⏭️ preview-seeded (requires auth storageState)                                                                                                                                                                                                                                                                |
| 13  | Security Advisor (Supabase, live project)    | ✅ executed — no ERROR-level findings; INFO/WARN groups pre-existing & tracked (deny-all `rls_enabled_no_policy` on agent tables incl. `agent_runs`/`agent_action_proposals` is the intentional deny-all posture; security-definer WARNs + multiple-permissive-policy WARNs are ledger #278 post-pilot items) |
| 14  | Performance Advisor (Supabase, live project) | ✅ executed — unindexed-FK INFOs + multiple-permissive-policy WARNs, all pre-existing, tracked in #278 for the post-pilot hardening migration                                                                                                                                                                 |

## E2E scoping (honest record)

- **Local pass:** public/legacy smoke routes, login flow, and the fixed legacy auth
  selectors — 66 passed, 10 preview-gated skipped.
- **Local fix shipped:** legacy `e2e/*.spec.ts` used `getByLabel(/password/i)`, which
  now resolves to 2 elements (password input + `PasswordInput` visibility-toggle
  `aria-label`) → strict-mode violation. All 7 legacy specs migrated to
  `page.locator('#login-password')`.
- **Environment-gated (not claimed locally):** authenticated suites (student/teacher/
  parent/coordinator critical paths, a11y axe scans, RTL layout 11.3–11.7, cross-role)
  require seeded Supabase users + auth storageState that only exist in the CI/Preview
  environment (`[auth] … storageState does not contain a Supabase session` locally).
- **Exact-head CI evidence:** CI run [#1080](https://github.com/attaulhaq0/Edeviser_OBE/actions/runs/33505015783)
  on main `8afb40e3` = success (lint/tsc/vitest gates).

## Certification suites landed (this gate)

`src/__tests__/unit/agentSpecialistLoopCertification.test.ts` — 15 tests, all green:

- **4.3 Mastery** — conforming path surfaces strict parsed analysis via the REAL
  orchestrator loop (real read registry, scripted deterministic provider); adversarial
  ILO row without the exact `derived alignment` label is rejected.
- **4.4 Habit** — conforming cited signals surface; uncited (invented) signals rejected.
- **4.5 Risk** — teacher-scoped conforming categorical assessment surfaces (evidence
  cited, escalation recorded, audit trail `read/not_required`); numeric `riskScore`
  emitted by the model is REJECTED (categorical-only guardrail).
- **4.6 Intervention** — conforming measured-effect plan surfaces
  (`approvalRequired: true` enforced); falsified `approvalRequired: false` rejected;
  drafts map onto a **pending** human-approval proposal through the real
  `propose_protected_action` path (student approver per `requiredApproverRole`,
  teacher rejected by `assertMayDecideProposal`, audit records
  `protected/pending/proposalId`).
- **6.2 execution-path proof** — admin `propose_create_ilo` through the real
  orchestrator loop → `createHumanApprovalProposal` (pending, admin approver, protected,
  audit `protected/pending`); non-admin callers blocked (`unauthorized_role`, nothing
  stored); `executeApprovedProposal` executes an APPROVED `create_ilo` through the
  protected-write boundary with a validated receipt, and REFUSES pending proposals
  (`not_approved`) and non-exact executors (`unauthorized_approver`).

## Residual for 8.5 full ✅

Only the preview-seeded authenticated E2E portion (a11y / RTL / cross-role) — one run on
the Git-linked Preview completes the combined pass. Everything else above is formally
executed and recorded.
