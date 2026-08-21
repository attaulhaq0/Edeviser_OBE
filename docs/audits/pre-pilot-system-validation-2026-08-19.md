# E Deviser pre-pilot system validation

Date: 2026-08-19  
Authoritative repository state: `main` at `dc7d840fdb52b980fcdba2781e45cec6115c48ff`  
Production Supabase: `cdlgtbvxlxjpcddjazzx`  
Program verdict: **IN PROGRESS — PILOT READY: NO**

This is the living status document for the complete pre-pilot validation program. A phase is not marked PASS from source inspection alone. Production checks in this assessment were read-only.

## Prerequisite gate

| Gate | Verdict | Evidence |
|---|---|---|
| Runtime dependency governance | PASS | PR #268 merged to `main`; main CI run `32195698679` passed, including runtime dependency contracts, SQL/replay checks, tests, lint, typecheck, build, and ownership checks. |
| Production deployment attestation | PASS | Read-only source download from Production compared with reviewed `main`; repository attestation reported `PASS (10/10 governed functions)`, including status and `verify_jwt` parity. |
| Migration deployment safety | PASS | Production branch is `ACTIVE_HEALTHY` / `FUNCTIONS_DEPLOYED`; repository and Production contain the same 410 migration versions with head `20260830000010`. Main CI replay-order, duplicate-name, schema-contract, and declared-object guards passed. |
| Tutor/RAG Production parity | PASS | Production deployment run `32171093575` deployed the reviewed Tutor/Intelligence closure. Read-only source parity passed for `chat-with-tutor`, `embed-course-material`, `generate-plan-update`, `agent-worker`, and `agent-orchestrator`. |
| Supabase branch health | PASS | The only listed branch is `main`; no branch is `MIGRATIONS_FAILED`. |

Current Supabase changelog items relevant to this program were checked. No migration pins an extension version and no migration writes to Supabase's internal Realtime migration schema. New Data API grants must continue to be audited explicitly because RLS and API grants are separate controls.

## Phase status

| Phase | Status | Current evidence |
|---|---|---|
| Prerequisite gate | PASS | Direct GitHub, production ledger, branch, function inventory, and source-parity evidence above. |
| Initial A–P inventory | COMPLETE | Routes, tests, workflows, local/Preview capabilities, Production catalog, Supabase runtime ownership, and critical closed-loop gaps are inventoried below. |
| 1 — Database/migration/data model | IN PROGRESS | Ledger parity and static replay guards pass. Fresh reset + seed + integration chain has not yet been rerun for this program. |
| 2 — Five-role authorization/tenant proof | NOT STARTED | Existing RLS tests are inventoried below; complete table/RPC/function/browser matrix is absent. |
| 3–18 — Product and closed-loop chains | NOT STARTED | Unit-level fragments exist, but no complete database/API/browser causal proof exists. |
| 19–27 — UI, contracts, consistency, failure, performance, observability, security, privacy, accessibility | NOT STARTED | Existing automation is inventoried below; program-grade execution has not occurred. |
| 28 — Master regression matrix | NOT STARTED | No machine-readable master matrix exists. |
| 29–33 — Continuous quality through pilot gates | NOT STARTED | Existing CI is incomplete as a pilot gate; findings below are blocking. |

## A. Existing test inventory

Authoritative `main` contains:

- 413 tests under `src/__tests__/unit`.
- 231 property-test files under `src/__tests__/properties`.
- 1 conventional integration test and 12 real Preview RLS integration tests.
- 31 role-oriented Playwright specifications under `tests/e2e` and 7 legacy Playwright smoke specifications under `e2e`.
- 2 visual Playwright specifications.
- Four k6 scripts: login, submission, grading pipeline, and leaderboard.

The latest main CI test job passed. Test count is not treated as product proof because much of the suite is hermetic, source-contract, or mocked.

## B. Existing CI and release gates

Workflows on `main`:

- CI: lint, typecheck, Vitest coverage, build, bundle size, Lighthouse, SQL/replay/schema guards, static RLS guard, conditional Preview RLS smoke, conditional runtime impact/deploy, and a legacy Chromium E2E job.
- Pre-Deployment Audit: lint, typecheck, unit/property, build, security/static scanners, connectivity, RLS, cron, optional E2E/Nova Act, and report aggregation.
- Supabase Preview: Git-linked fresh migration replay and conditional Preview runtime closure.
- Production Edge Runtime deployment, read-only bootstrap attestation, manual reconciliation, and manual migration break-glass workflows.
- Scheduled health, CodeQL, Dependabot, dependency graph, and Changesets release.

Release-governance gaps:

- `main` has no GitHub branch protection or required status checks.
- The Production environment has a required reviewer, but self-review is allowed and the sole configured reviewer is the repository owner.
- The CI E2E job skips Playwright when a backend is unavailable and runs only the legacy `chromium` project.
- Role E2E is not run on pull requests in Pre-Deployment Audit and is `continue-on-error` when manually run.
- Connectivity, RLS, cron, static scanners, coverage threshold, and several security signals are non-blocking or continue-on-error.
- Current authoritative lockfile audit fails with 41 findings: 1 critical, 28 high, 6 moderate, and 6 low. CI's high/critical audit currently warns instead of blocking. The latest scheduled-health workflow is red for this reason.

## C. Existing Docker/local capabilities

- Supabase CLI `2.114.0` is installed and the project is linked.
- Local Postgres, Studio, pg-meta, Storage, REST, Inbucket, Auth, and Kong containers are present.
- Migrations, Auth, Storage, Realtime, Edge Runtime, and local email are configured in `supabase/config.toml`; database major version is 17.
- `supabase/seed.sql` provides one demo institution, admin/coordinator/teacher, 50 students, four courses, OBE data, grades, attainment, habits, activity, and gamification.

Local environment blockers observed during this assessment:

- Realtime, Vector, and Analytics containers report unhealthy.
- Edge Runtime is stopped.
- Seed execution is disabled by default in `config.toml`.
- The local seed has only one institution and does not provide the required deterministic five-role/two-tenant/six-learning-state fixture matrix.

## D. Existing Supabase Preview capabilities

- Git-linked Preview is used as the authoritative fresh migration replay.
- A production-ref guard prevents the real RLS suite from running against Production.
- Twelve real Preview RLS files cover smoke, inserts, profiles, team members, timetable, dashboards, nudges, habit logs, outcome governance, and RAG authorization.
- CI resolves Preview project credentials and deploys the exact manifest-derived runtime closure when relevant files change.
- `audit-fixtures` is explicitly disabled outside `ENV_ID=audit-staging` and hard-blocked in Production.

Preview fixture gaps:

- Fixture setup was best-effort: seed errors and failed sign-ins warned and continued. PR boundary 1 now fails closed when Preview fixture mode is enabled.
- It seeds one institution, one student state, and no complete intervention/intelligence measurement scenario.
- It does not provide Institution B for malicious cross-tenant browser/API tests.
- The fixture implementation is incompatible with the current schema: its fixed entity IDs are not valid UUIDs; it writes removed/nonexistent columns such as `rubrics.course_id`, `rubrics.institution_id`, `rubrics.criteria`, `assignments.institution_id`, `assignments.clo_ids`, and `assignments.max_score`; and it creates FK-dependent profiles/courses before their institution/program parents. The previous warn-and-continue behavior concealed these failures.

## E. Five-role route inventory

`AppRouter.tsx` declares approximately:

| Role | Route declarations | Path-bearing routes |
|---|---:|---:|
| Admin | 54 | 52 |
| Coordinator | 28 | 26 |
| Teacher | 55 | 53 |
| Student | 56 | 54 |
| Parent | 15 | 14 |

Page source inventory contains 52 admin, 16 coordinator, 50 teacher, 71 student, and 9 parent files, plus shared/auth/public pages. Route existence is broad; route quality and real-data behavior remain unproved.

## F. Core database/RPC/Edge Function inventory

Read-only Production catalog:

- 170 public tables; all 170 have RLS enabled.
- 398 public RLS policies.
- 284 public functions, including 91 `SECURITY DEFINER` functions requiring explicit privilege/body/search-path review.
- 2 views, 1 materialized view, 5 cron jobs, and 8 Realtime publication tables.
- 61 repository Edge Functions; 10 are covered by the new governed runtime manifest.

Core tables include assignments, submissions, grades, evidence, learning outcomes, outcome mappings/attainment/snapshots, habit logs/levels/correlations, student learning states, agent runs/tool attempts/proposals/executions/jobs, intervention measurements, course materials/embeddings, and CQI patterns/plans/measurements.

Core RPC/function families include attainment rollup, Learning State refresh/read/staleness, proactive job claim/complete/fail, protected agent/CQI execution, intervention/CQI measurement, course-material search/replacement, hierarchy/weight validation, and notification triggers.

## G. Existing OBE tests

Strengths:

- Deterministic attainment classifier/rollup tests.
- OBE property tests for cascade, mappings/weights, evidence immutability, prerequisite gates, and Bloom/CLO constraints.
- Preview RLS coverage for outcome governance.
- Teacher grade page, coordinator PLO/matrix, and grade-to-XP browser specifications exist.

Gaps:

- No single real fixture proves ILO → PLO → CLO → assessment → submission → released grade → evidence → attainment → Learning State → teacher/coordinator UI.
- Missing independent mathematical oracle across released/unreleased, updates, duplicate evidence, rounding, semester/cohort, and cross-tenant cases.
- The browser grade-release spec only proves a heading renders.

## H. Existing Habit/Learning State tests

Habit unit/property coverage is broad: logs, streak/recovery, difficulty, heatmap, correlations, wellness, level history, and Preview habit-log RLS. Learning State has migrations, refresh/read/staleness RPCs, proactive worker logic, and measured-intervention unit contracts.

No real database/browser test changes one signal at a time and proves before-state → event → recalculation → after-state. Duplicate, delayed, out-of-order, timezone, stale-cache, and cross-student convergence remain unproved as one chain.

## I. Existing Agent/RAG/eval tests

Existing tests cover provider configuration, DeepSeek response/error parsing, orchestrator/tool registry, authorization data sources, proposal approval rules, protected execution contracts, RAG authorization, prompt-injection contracts, embedding provider/versioning, multilingual benchmark logic, citation parsing, and CQI drafting.

The multilingual benchmark is a deterministic unit benchmark, not a fixed non-production corpus executed against a real vector index/provider. No permanent provider latency/cost/error budget run or real A0/A1/A2 browser/API/database evaluation exists.

## J. Existing E2E coverage

Role projects exist for admin, coordinator, teacher, student, parent, cross-role, and RTL. Coverage includes dashboards, ILO/PLO/CLO, assignments, grade page, XP/streak, parent linked/unlinked, CQI page, and basic propagation.

Credibility blockers:

- `teacher-to-student.spec.ts` navigates to nonexistent `/teacher/assignments/:id/grade`, conditionally clicks only if a button appears, catches propagation failure, and still passes.
- Its helper polls nonexistent `/student/xp`; the real route is `/student/xp-history`.
- `teacherHelpers.ts` contains additional stale routes such as `/teacher/outcomes/clos` and `/teacher/courses/:id`.
- Several specs accept not-found/no-op behavior as success or only assert that a role prefix remains in the URL.
- Empty storage-state files are considered present, so unauthenticated runs can look like seeded E2E runs.

## K. Existing visual/accessibility coverage

- Axe Playwright scans exist for each role dashboard and selected major pages; admin includes a basic Tab-navigation check.
- Unit/property accessibility tests cover landmarks, focus, ARIA, contrast tokens, reduced motion, and selected complex widgets.
- RTL screenshots and prototype parity tooling exist.

Gaps:

- Standard role projects use 1440×900 and 390×844, not the required 360/768/1024/1440 matrix.
- Visual parity is not a release-blocking all-route regression suite.
- Modal focus, screen-reader semantics, zoom, keyboard-only completion, and error/empty/loading states are not comprehensively exercised.

## L. Existing performance/observability coverage

- k6 scripts define p95 budgets for login, submission, grading/rollup, and leaderboard.
- Lighthouse runs three throttled desktop samples; accessibility/best-practice/SEO and byte weight block, while performance metrics warn.
- A student TTI Playwright spec and static performance audit exist.
- Agent contracts carry request, run, and session IDs; tables exist for agent runs/tool attempts and provider/tool timing fields.

Gaps:

- No stored recent k6 baseline or CI/scheduled execution was found.
- No p50/p95/p99 baseline for Learning State, at-risk teacher view, coordinator aggregation, Tutor retrieval/TTFT/full response, embeddings, or proposal execution.
- No automated browser → Edge → orchestrator → provider → tool/RPC → proposal → execution → measurement correlation proof exists.

## M. Missing critical chains

1. `CLOSED-LOOP-001`: declining released grade → evidence → attainment → Learning State → recommendation → teacher approval → one protected execution → measurement → refreshed state → changed next recommendation.
2. `HABIT-LOOP-001`: out-of-order/duplicate habit events → streak/risk → Learning State → bounded action → recovery.
3. `CQI-LOOP-001`: student evidence → comparable cohort aggregation → CQI finding/proposal/approval/execution → new measurement cycle.
4. `TENANT-NEG-001`: malicious cross-tenant table/RPC/storage/function/browser IDs across all five roles.
5. `RAG-EVAL-001`: fixed Arabic/English golden corpus with authorization, citation, injection, and no-context metrics.
6. `FAILURE-001`: provider/database/queue/network failure with audit, bounded retry, and exactly-once protected action.

## N. Known stale/legacy architecture

- Browser helpers and specs contain stale route contracts and no-op success paths.
- Dashboard unit tests commonly mock RPCs; they do not prove frontend/backend contracts.
- Preview fixture setup is best-effort instead of fail-closed.
- Production ownership inventory still reports known drift: repository-only `coordinator-ai-insights` and deployed-only `fee-overdue-check`; neither is in the governed runtime manifest.
- Only 10 of 61 Edge Functions are covered by runtime source attestation.
- Public `SECURITY DEFINER` surface is large and needs a callable-role/search-path/body audit before pilot.
- The main branch and Production approval model do not provide independent enforced review.

## O. Proposed execution order

1. Restore test credibility: fail-closed Preview fixtures, correct stale routes, remove swallowed E2E failures, and make the first closed-loop test produce database/UI evidence.
2. Build deterministic two-institution, five-role, six-student-state fixtures with teardown and idempotency.
3. Fresh local reset/replay/seed/integration and upgrade-path checks; repair local Realtime/Edge health.
4. Complete five-role RLS/RPC/storage/Edge/browser negative matrix.
5. Prove deterministic OBE and Learning State chains.
6. Prove A0/A1/A2 intervention and CQI loops.
7. Run multilingual RAG, prompt-injection, DeepSeek, and tool-contract evals under explicit budgets.
8. Expand role/UI/accessibility/responsive/failure/realtime/performance/observability coverage.
9. Make validated critical chains blocking in PR or scheduled/manual deep gates.
10. Re-run all pilot gates and issue the final YES/NO verdict.

## P. Proposed focused PR boundaries

1. **E2E harness truthfulness** — fail-closed fixture setup, authenticated storage-state validation, route-contract corrections, and removal of swallowed propagation failures.
2. **Deterministic audit fixtures** — Institution A/B plus six controlled learner states and cleanup/idempotency.
3. **Database replay and five-role authorization matrix** — local/Preview integration only.
4. **OBE grade-to-state chain** — mathematical oracle plus API/database/browser proof.
5. **A2 intervention closed loop** — proposal/approval/exactly-once execution/measurement/next recommendation.
6. **CQI comparable-cohort loop**.
7. **RAG multilingual/security golden evaluation**.
8. **DeepSeek/tool/failure evaluation with budgets**.
9. **All-role route, responsive, visual, and accessibility completion**.
10. **Performance, observability, release protection, and final pilot gate automation**.

## Initial severity findings

| ID | Severity | Finding | Pilot impact |
|---|---|---|---|
| PPV-P1-001 | P1 | Critical closed-loop browser test is a false positive (invalid routes, conditional no-op, swallowed timeout). | Blocking |
| PPV-P1-002 | P1 | Preview fixtures warn and continue after seed/login failure; no two-tenant controlled fixture set. | Blocking |
| PPV-P1-003 | P1 | Main branch is unprotected; production review can be self-approved by the sole reviewer. | Blocking |
| PPV-P1-004 | P1 | Current lockfile has 1 critical and 28 high audit findings; CI warning policy does not block. | Blocking pending reachability/upgrade triage |
| PPV-P1-005 | P1 | Local Realtime is unhealthy and Edge Runtime is stopped, preventing deterministic full-chain validation. | Blocks local chain proof |
| PPV-P1-006 | P1 | No real grade → Learning State → approval → execution → measurement → changed recommendation proof exists. | Blocking |
| PPV-P1-007 | P1 | `audit-fixtures` has fatal schema/order drift (invalid UUID identifiers, removed columns, and parent rows created after dependents). | Blocks every controlled Preview role/closed-loop run |
| PPV-P2-001 | P2 | Only 10/61 Edge Functions are source-attested; two known ownership drifts remain. | Must be classified/closed before final gate |
| PPV-P2-002 | P2 | 91 public `SECURITY DEFINER` functions require explicit exposure review. | Security audit queue; severity may increase |

## Next active work

PR boundary 1 is in progress. Completed in the working tree:

- Preview seed HTTP/partial failures and role-login failures now abort setup.
- Stored role sessions are validated and their Supabase local-storage origins are loaded into cross-role contexts.
- Missing/invalid JWTs now fail role assertions.
- The teacher-to-student test uses `/teacher/grading/:submissionId` and `/student/xp-history`, requires the actual grading action, and no longer swallows propagation timeout.
- Focused regression: `src/__tests__/unit/e2eHarnessFailClosed.test.ts` passes (2/2); `npx tsc --noEmit` passes.

The strict browser regression is intentionally blocked before execution by PPV-P1-007. The next focused boundary is to repair `audit-fixtures` against the generated schema, add a deterministic ungraded submission with a valid UUID, and prove idempotent seed/teardown in an isolated Preview environment.
