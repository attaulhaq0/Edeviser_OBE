# E Deviser pre-pilot system validation

Date: 2026-08-19

Authoritative repository baseline: `main` at `dc7d840fdb52b980fcdba2781e45cec6115c48ff`

Production Supabase: `cdlgtbvxlxjpcddjazzx`
Program verdict: **IN PROGRESS — PILOT READY: NO**

This is the living status document for the complete pre-pilot validation program. A phase is not marked PASS from source inspection alone. Production checks in this assessment were read-only.

## Prerequisite gate

| Gate | Verdict | Evidence |
|---|---|---|
| Runtime dependency governance | PASS | PR #268 is on `main`; its CI passed runtime dependency contracts, replay guards, tests, lint, typecheck, build, and ownership checks. |
| Production deployment attestation | PASS | Read-only source comparison reported 10/10 governed functions in parity, including status and `verify_jwt`. |
| Migration deployment safety | PASS | Repository and Production had the same 410 migration versions, headed by `20260830000010`; no Supabase branch reported `MIGRATIONS_FAILED`. |
| Tutor/RAG Production parity | PASS | The reviewed Tutor/Intelligence closure was deployed and five governed functions matched Production source. |
| Supabase breaking-change review | PASS WITH WATCH ITEM | No migration pins extension versions or writes to the internal Realtime schema. Data API grants remain a separate control from RLS and require explicit review. |

## Program phase status

| Phase | Status | Current evidence |
|---|---|---|
| Initial A–P inventory | COMPLETE | Routes, tests, workflows, local/Preview capabilities, Production catalog, runtime ownership, and critical closed-loop gaps were inventoried. |
| PR Boundary 1 — E2E harness truthfulness | PASS; PR #269 OPEN | Fail-closed auth/session validation, live Supabase Auth proof, route/workflow/static guards, truthful critical specs, collection isolation, and regressions are complete. The PR is open for review and has not been merged. |
| PR Boundary 2 — deterministic audit fixtures | NOT STARTED | Deliberately excluded from Boundary 1. Existing fixture schema/order drift blocks authenticated Preview execution. |
| Database/migration/data model execution | IN PROGRESS | Ledger parity and static replay guards pass; fresh reset, seed, and integration chain remain outstanding. |
| Five-role authorization/tenant proof | NOT STARTED | Complete table/RPC/Storage/Edge/browser matrix remains absent. |
| Closed-loop OBE, Learning State, intervention, CQI, and RAG proof | NOT STARTED | No complete database/API/browser causal proof exists. |
| Master regression and pilot gates | NOT STARTED | Branch protection, security policy, and deep Preview E2E are not yet enforceable pilot gates. |

## Boundary 1 result

### Fail-closed authentication and seed contract

- Missing, zero-byte, empty, tokenless, malformed-JWT, missing-role, and wrong-role storage states fail.
- Role states load both cookies and Supabase local-storage origins.
- JWT role inspection is a local integrity assertion only. Actual Preview authorization proof calls Supabase Auth `GET /auth/v1/user`, verifies the authenticated user, and checks role, expected email, and institution scope.
- Preview fixture mode aborts on seed HTTP failure, partial seed response, login redirect/failure, invalid storage state, invalid role, or failed live user proof.
- Parent linked and unlinked sessions are distinct states.
- Production is prohibited for controlled fixture mode and was not mutated.

Regression coverage includes missing file, empty file, no token, malformed JWT, wrong role, missing claim, correct role, propagation timeout, missing grading control, and stale route. Additional guard fixtures cover `test.skip`, conditional no-op actions, swallowed success fallbacks, and explicit narrow polling exceptions.

### Critical E2E truthfulness policy

Critical scope is explicit: files marked `@critical-e2e`, every `tests/e2e/cross-role/**` spec, and every `critical-path.spec.ts`. Within that scope the AST guard rejects swallowed catches, success-compatible catch fallbacks, `test.skip`, and required actions hidden behind `isVisible()` without a failing alternative. Required controls can be declared with `@critical-control`; the grader test requires an unconditional Submit Grade action. A narrowly documented `@allow-critical-catch` exception exists only for polling where the eventual assertion still fails closed.

The grade-to-XP test now visits the real teacher grading route, requires the rubric, feedback, and Submit Grade controls, measures the student's real XP history before the action, and fails if propagation does not occur within 60 seconds. Other role and cross-role smoke specs now use live authenticated users and real routes/RLS queries rather than accepting not-found pages or role-prefix URLs.

### Route and workflow contracts

Canonical route builders now bind the router and critical E2E for:

- teacher dashboard, assignments, grading queue, and grading submission;
- student dashboard, assignments, assignment detail, and XP history.

The route guard rejects stale manually typed critical paths. The workflow guard parses Playwright project declarations and rejects workflow references to nonexistent projects. It found and corrected CI's nonexistent `chromium` project reference to `legacy-smoke`.

### Collection and workspace hygiene

Playwright ignores nested `node_modules` and `runtime-governance-scratch` trees. The legacy project's broad pattern previously recollected role specs; it is now isolated to the seven legacy files. Clean collection reports **134 tests in 37 files**: 81 legacy tests plus the role/cross-role/RTL set, with no duplicate role collection.

User work under `runtime-governance-scratch` was not deleted or modified.

### Validation evidence

| Check | Result |
|---|---|
| `npx tsc --noEmit` | PASS |
| ESLint, zero warnings, tracked project scope | PASS |
| Auth fail-closed regressions and focused guard/property tests | PASS, 34/34 |
| Critical E2E no-swallow guard | PASS |
| Critical route contract guard | PASS |
| Playwright workflow project contract | PASS |
| Playwright clean collection | PASS, 134 tests / 37 files |
| Production build | PASS, 4,402 modules transformed |
| Full Vitest under pinned Node 20 | BLOCKED BY PRE-EXISTING WINDOWS ISSUES: 685 files and 6,315 tests pass; two unchanged CRLF/shebang `.mjs` imports fail during Vitest loading and one unchanged migration guard exceeds its 15-second timeout |
| Lockfile security audit | FAIL, known baseline: 41 findings (1 critical, 28 high, 6 moderate, 6 low) |
| Whitespace (`git diff --check`) | PASS |

The full-suite and security failures are recorded blockers. They are unrelated to E2E harness truthfulness and are not repaired in this PR boundary.

## Future CI relevance rule

A pull request is **critical Preview E2E relevant** when it changes authentication/session/storage-state behavior, Playwright configuration or critical specs, audit fixtures, canonical critical routes/router bindings, the grading-to-XP chain, or relevant database migrations/RPCs/Edge Functions. For a relevant change, missing Preview deployment, credentials, or deterministic fixtures is a hard failure; the critical chain must never warn, skip, or continue successfully.

A cheap frontend-only pull request outside those areas may avoid the expensive authenticated Preview chain. It must still pass the static E2E guard, route guard, workflow-project guard, clean collection, typecheck, lint, focused tests, and build. Relevance controls cost; it does not turn missing required evidence into success.

## Boundary 2 entry criteria and current fixture status

Boundary 2 begins only after Boundary 1 is reviewable and its focused checks are green. It will repair `audit-fixtures` in an isolated non-production Preview and add deterministic Institution A/B, five roles, controlled learner states, one ungraded submission, idempotent seed/teardown, and evidence sufficient for the grade-to-XP browser chain.

| Fixture proof | Current status |
|---|---|
| Current-schema compatibility | FAIL — removed/nonexistent assignment/rubric columns remain |
| Valid UUIDs | FAIL |
| Parent-before-dependent FK order | FAIL |
| Idempotent seed and teardown | NOT PROVEN |
| Five live role sessions | 0/5 |
| Two-tenant isolation data | FAIL |
| Grade → XP isolated Preview proof | NOT RUN |

## Release-governance blockers kept outside Boundary 1

- `main` has no required GitHub branch protection/status checks.
- Production review can be self-approved by the sole configured reviewer.
- Current dependency audit has 1 critical and 28 high findings; CI does not block on them.
- Pre-deployment role E2E is non-blocking or conditional, and historical missing-backend behavior could report success without execution.
- Local Realtime is unhealthy and Edge Runtime is stopped.
- Only 10 of 61 Edge Functions are source-attested; known ownership drift remains.
- 91 public `SECURITY DEFINER` functions require an explicit exposure/body/search-path review.

These are pilot blockers, but combining their remediation with harness truthfulness would make the review boundary unsafe and unauditable.

## Active findings

| ID | Severity | Finding | State |
|---|---|---|---|
| PPV-P1-001 | P1 | Critical cross-role E2E contained invalid routes, conditional no-op actions, and swallowed propagation failure. | REMEDIATED IN BOUNDARY 1 |
| PPV-P1-002 | P1 | Preview fixture setup warned and continued after seed/login failure. | FAIL-CLOSED IN BOUNDARY 1; DATA REPAIR IN BOUNDARY 2 |
| PPV-P1-003 | P1 | Main branch lacks enforced required checks and independent review. | OPEN |
| PPV-P1-004 | P1 | Lockfile has 1 critical and 28 high findings while audit is non-blocking. | OPEN |
| PPV-P1-005 | P1 | Local Realtime/Edge health blocks deterministic local chain proof. | OPEN |
| PPV-P1-006 | P1 | No real grade → state → approval → execution → measurement proof exists. | OPEN |
| PPV-P1-007 | P1 | `audit-fixtures` has fatal schema, UUID, and FK-order drift. | OPEN; BOUNDARY 2 |
| PPV-P1-008 | P1 | CI referenced nonexistent Playwright project `chromium`. | REMEDIATED IN BOUNDARY 1 |
| PPV-P1-009 | P1 | Legacy Playwright matching duplicated the role E2E tree. | REMEDIATED IN BOUNDARY 1 |
| PPV-P2-001 | P2 | Only 10/61 Edge Functions are source-attested; ownership drift remains. | OPEN |
| PPV-P2-002 | P2 | 91 public `SECURITY DEFINER` functions require exposure review. | OPEN |

## Next active work

1. Review Boundary 1 PR #269; do not merge it automatically.
2. Repair deterministic audit fixtures in Boundary 2 using an isolated Preview only.
3. Prove five live roles, two tenants, idempotent seed/teardown, and the grade-to-XP chain.
4. Continue the original program through database replay, authorization matrix, OBE/Learning State causal proofs, interventions, CQI, RAG/provider evaluations, UI/accessibility, performance, observability, security, and final pilot gates.

Pilot readiness remains **NO**.
