# E Deviser Pre-Agentic Product Hygiene Audit

Audit date: 2026-08-13 (read-only). Sources: `origin/main`, the live Supabase
migration ledger/advisors/function inventory, Vercel deployment metadata and
environment-variable names, GitHub metadata, and the current worktree.

## 1. Executive Verdict

NOT READY — BLOCKERS EXIST

Production's merged application baseline is healthy enough to preserve, but it
is not cleanly isolated from already-deployed agentic/proactive infrastructure.
The current primary checkout is also a mixed, dirty feature worktree and is not
a valid remediation base.

## 2. Verified Baseline

- `origin/main`: `92e3bd8e5040340b1b1df28b6abf1e07d3ea42b3` — PR #249 merged
  2026-08-12 22:52Z.
- Production Vercel deployment: `dpl_n3DXvpvN8bdzuoEEsd6hDweycrJn`, Ready,
  Production, created 2026-08-13 01:52:04Z; aliases include `edeviser.com` and
  `app.edeviser.com`. Deployment metadata confirms Vite build and main-only
  automatic Git deployment.
- Production Supabase ref: `cdlgtbvxlxjpcddjazzx`.
- Production migration ledger tail: `20260824000001`, `20260824000002`,
  `20260825000001` … `20260825000005`. The repository at `origin/main`
  contains those seven files. The current checkout does not: it is a stale
  feature branch, not the baseline.
- PR #249 is MERGED. Its CI, Preview, RLS matrix, connectivity matrix and cron
  health checks completed successfully; its pre-deploy E2E job was skipped.
- RAG source is hardened in `20260825000001_rag_authorization_hardening.sql`:
  authenticated-only, role/course/program/institution-scoped reads; public and
  anonymous execution on `search_course_materials` revoked.
- The expected embedding row count of zero was not independently queried:
  a production data export was deliberately not authorized by the sandbox. It
  remains an unverified baseline item, not evidence of drift.
- Vercel environment names are scoped to Production or Production+Preview;
  `SUPABASE_SECRET_KEY` exists and `SUPABASE_SECRET_KEYS` does not appear in
  the Vercel listing. Values were not read.

## 3. Findings by Severity

### BLOCKER

1. **Production agentic worker is already active and externally invocable.**
   Confirmed. Live function inventory contains `agent-worker`, `ACTIVE`,
   `verify_jwt: false`, version 1; Vercel has an enabled daily
   `/api/cron/ai-at-risk-prediction` that invokes it
   (`api/cron/ai-at-risk-prediction.ts:10`). The function also has a browser
   consumer in the mixed checkout (`src/hooks/useAtRiskPredictions.ts:238`).
   This conflicts with the stated frozen pre-agentic boundary and creates an
   unauthenticated externally addressable future-tool surface. **Remediation:**
   in an isolated security PR, first prove intended callers and internal
   signature validation; then either disable the route/function or require
   JWT/internal authorization and gate every action fail-closed. Production
   compatibility risk: high; verify cron and dashboard consumers before change.

2. **Mixed primary worktree contains unreviewed agentic/provider code and a
   migration.** Confirmed. `F:/Edeviser-Kiro` is on
   `feat/proactive-agentic-intelligence`, 13 commits behind and 57 ahead of
   `origin/main`, with 109 changed/untracked paths. These include
   `supabase/functions/agent-worker/`, `_shared/ai/providers/deepseek.ts`,
   `supabase/functions/bootstrap-first-admin/`, and
   `20260809143726_auth_onboarding_hardening.sql`, plus auth, prototype and
   generated audit artifacts. **Remediation:** do not merge, reset, clean,
   stash, pull, or delete. Inventory and preserve logical changes in new
   recovery branches only after hygiene blockers are fixed. Compatibility risk:
   low if preservation-only; high if this tree is used as a base.

### P0

None confirmed.

### P1

1. **Legacy provider paths remain active in production source.** Confirmed by
   `chat-with-tutor/index.ts` (OpenAI embeddings and Gemini generation),
   `embed-course-material/index.ts` (`text-embedding-ada-002`, 1536-dimension
   default), `coordinator-ai-insights/index.ts` (Gemini),
   `generate-quiz-questions/index.ts` (OpenRouter), and
   `generate-plan-update/index.ts` (OpenAI/OpenRouter). The untracked DeepSeek
   provider hardcodes `deepseek-v4-flash`, contradicting the required future
   configurable-provider boundary. **Remediation:** inventory and consolidate
   behind one server-only provider abstraction before exposing new tools; do
   not change the embedding dimension until the zero-row count is independently
   verified. Isolated remediation: yes; production compatibility risk: medium.

2. **No prototype firewall.** Confirmed: `origin/main` tracks an extensive
   `prototype/**` tree, `prototype/vercel.json`, and assets; there is no
   `.vercelignore`, no import-boundary rule, and CI only references prototype
   parity in a test comment. A normal root Vite/Vercel build does not explicitly
   exclude prototype material. **Remediation:** add a small CI path guard,
   import-boundary lint/static check (`src/**` cannot import `prototype/**`),
   root build exclusion, CODEOWNERS/path review, and a separately linked
   prototype deployment. Isolated remediation: yes; compatibility risk: low.

3. **Security Advisor exposes internal SECURITY DEFINER helpers to anon.**
   Confirmed live warnings for `auth_institution_id`, `auth_user_role`,
   `auth_user_status`, team/institution helpers, and other helpers. Those
   helpers are used by RLS and should not be PostgREST APIs. Public invitation
   and portfolio functions are different cases. **Remediation:** enumerate
   actual grants and bodies in a read-only SQL metadata review, then revoke
   `PUBLIC`/anon only for internal helpers, regression-test RLS, and retain
   deliberately public invitation/portfolio flows. Compatibility risk: medium.

### P2

1. **CI can report security problems without failing the gate.**
   `.github/workflows/ci.yml` runs `npm audit --audit-level=high || echo ...`
   with `continue-on-error: true`; pre-deploy connectivity/RLS/cron jobs also
   use `continue-on-error`. This is appropriate only if the final report blocks
   promotion reliably; it should be explicit. Remediation: make the release
   gate consume the audit verdict and distinguish advisory from required jobs.

2. **Scheduled health leaks raw Supabase branch API response into logs.**
   `.github/workflows/scheduled-health.yml` assigns `RESP` from an authenticated
   API call and echoes it. It probably contains metadata rather than secrets,
   but unnecessary raw output complicates safe observability. Remediation:
   parse only branch status/count and redact payloads.

3. **RLS policy fan-out needs measured consolidation.** Production Performance
   Advisor reports many multiple-permissive-policy warnings (for example
   `program_accreditations`, `programs`, `quiz_attempts`, `student_courses`,
   `surveys`). This is not evidence of leakage: these policies intentionally
   encode role alternatives. Remediation: EXPLAIN/measure dashboard hot paths
   and consolidate only proven expensive tables.

4. **Function deployment inventory is large and drift-prone.** Production has
   a broad active Edge Function fleet; the local deployment script must be kept
   in sync. The current branch has direct-deployed functions absent from main.
   Remediation: generate an inventory/manifest and CI-check source-to-deployed
   ownership, with explicit exceptions for public webhooks/invitations.

### P3

1. Local root contains ignored build/test artifacts and temporary audit files
   (`dist`, `coverage`, `output`, `.playwright-cli`, HAR files, `__audit_*`,
   `build-out.txt`, lint/typecheck outputs). They are not tracked, so this is a
   local hygiene issue only. Preserve until worktree recovery, then remove
   only under an approved cleanup plan.

2. `bulk-grade-export/index.ts:83` still states that full export logic is TODO.
   Classify its UI/API consumer before removing or completing it.

### INTENTIONAL

- `citext` and `vector` live in `public` and trigger Security Advisor warnings.
  Moving either only to clear an advisor warning can break types, operators and
  migration compatibility; retain unless a concrete exposure is demonstrated.
- Invitation preview/consumption and public-portfolio functions legitimately
  need anonymous access, provided token/visibility checks remain server-side.
- Multiple role-specific RLS policies are semantically valid; the advisor
  finding is performance-oriented, not automatically a security defect.

### INFORMATIONAL

- `.env` and `.env.local` are ignored and are not tracked. No tracked secret
  file was found in the sampled tracked-file audit.
- Vercel production deployment has HSTS, frame denial, MIME sniffing denial,
  referrer and permissions policies, and a CSP.

## 4. Database & Schema

Migration ledger and `origin/main` agree through the verified tail. The primary
checkout's missing tail is local-branch drift, not production drift. The
canonical OBE migration uses private reconciliation backup, hierarchy triggers,
scope checks, cycle prevention, restrictive FKs and deferred weight-sum checks.
No database mutation was performed. Full live column/index/constraint and
function-body inventory remains a remediation prerequisite because data/schema
export was out of scope for this pass.

## 5. RLS / Multi-Tenant Security

RAG production policy source is role-scoped: students require active course
enrollment; teachers require assigned course; coordinators require assigned
program; admins require institution scope. `20260825000003` binds social
challenge writes to the course/program institution; `20260825000005` makes
profile privilege protection trigger-only. PR #249 RLS Matrix succeeded.

Residual risk: live advisor execution grants show that internal RLS helpers are
still callable by anon. Treat this as P1 until per-function bodies and grants
are reviewed—not as proof of a data leak.

## 6. SECURITY DEFINER / RPC Exposure

| Function group | Security mode | Anon execute | Authenticated execute | Intended caller | Authorization inside | Risk | Classification | Recommended action |
|---|---|---:|---:|---|---|---|---|---|
| `auth_institution_id`, `auth_user_role`, `auth_user_status` | DEFINER | Yes (advisor) | Yes (advisor) | RLS helper | Identity-derived, body not exported | Unnecessary RPC surface | P1 | Revoke public/anon after RLS regression testing |
| Team/institution helper family | DEFINER | Yes (advisor) | Yes | RLS helper | Requires metadata review | Scope oracle/API surface | P1 | Same grant/body review; retain only required authenticated access |
| `preview_*`, `get_invitation_by_token`, `consume_invitation` | DEFINER | Yes | Yes | Public invite flow | Token checks required | Deliberately public, sensitive | INTENTIONAL pending contract test | Keep only minimal response fields and token expiry/single-use tests |
| `is_portfolio_publicly_accessible`, `portfolio_public_access` | DEFINER | Yes | Yes | Public portfolio flow | Visibility check required | Deliberately public | INTENTIONAL | Verify no private profile fields are returned |
| `search_course_materials` | INVOKER | No | Yes | Tutor/RAG | RLS limits query | Hardened | INFORMATIONAL | Preserve #249 grants/policies |

## 7. OBE Health

`20260824000002_canonical_obe_hierarchy_foundation.sql` establishes and guards
ILO → PLO → CLO, with Sub-CLOs in `sub_clos`; it rejects reverse edges,
cross-institution edges, cycles and non-unit child allocation. The verified
production baseline states 12 ILO→PLO and 12 PLO→CLO mappings, zero mirrors and
zero invalid groups. No conflicting production evidence was found. Do not
reapply this migration.

## 8. Habit / Risk / Intervention Health

LIVE/PARTIAL: habit logs, streak processing/risk, deterministic at-risk
signals, notification digests, weekly summaries and interventions have Edge
Function/cron paths. AGENTIC/UNAPPROVED: live `agent-worker` and its AI at-risk
cron. The codebase contains overlapping deterministic and agentic risk paths;
choose a canonical deterministic signal owner before Student Learning State.

## 9. Frontend ↔ Backend Connectivity

| Role | Status | Evidence / limitation |
|---|---|---|
| Student | PARTIAL | Tutor, course indexing and dashboard paths consume Supabase; post-merge E2E was skipped. |
| Teacher | PARTIAL | Courses, gradebook, assessments, at-risk and tutor analytics have hooks/functions; live end-to-end not re-run. |
| Parent | PARTIAL | Parent linking and progress have dedicated source/migrations; needs live multi-tenant regression. |
| Coordinator | PARTIAL | Attainment/accreditation and optional Gemini insight path exist; provider path is legacy. |
| Admin | PARTIAL | Institution/user/governance paths exist; first-admin function is deployed outside main baseline. |

No claim is made that fallback arrays are safe: source contains many `?? []`
defaults. Audit error states on agent-consumed dashboards before using them as
tool inputs.

## 10. Edge Functions

Production inventory contains 50+ functions across tutoring/RAG, imports,
attainment, notifications, cron work and public invitation/webhook flows.
Important public exceptions: `invitation-preview`, `accept-invitation`, and
`resend-webhook` have `verify_jwt: false`; these require endpoint-specific
validation. `agent-worker` is also `verify_jwt: false` and is not justified by
the frozen baseline: BLOCKER. `chat-with-tutor` and indexing are active legacy
AI provider consumers; do not expose them as generic tools.

## 11. Cron / Background Work

Vercel defines ten scheduled routes: streak-risk/reset, weekly summary,
compute-at-risk, perfect-day prompt, leaderboard refresh, AI at-risk,
notification digest, exam-period notification and warm-ping. Each route
invokes an Edge Function. `ai-at-risk-prediction` uniquely forwards to
`agent-worker`, so it must be disabled or formally approved/hardened before
new agentic work. The schedules overlap at 20:00 (streak-risk and digest) but
this is not by itself a defect. Verify idempotency keys, per-institution
iteration and dead-letter/failure observability in H3.

## 12. Vercel

Production is ready and built from `origin/main` SHA baseline. Production+Preview
share `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_URL`,
`CRON_SECRET`, and `SUPABASE_SERVICE_ROLE_KEY`; this is a cross-environment
blast-radius concern and should be separated if previews can execute writes.
`SUPABASE_SECRET_KEY` exists for Production; the stale plural Vercel variable
was not listed. Never print or rotate values during remediation without a
consumer inventory.

## 13. GitHub Actions / CI

PR #249's core CI succeeded. E2E in pre-deploy audit was skipped, so it is not
evidence of passing role flows. CI has migration replay/duplicate guards and a
Supabase Preview check. Security/RLS/connectivity/cron audit jobs are advisory
in places (`continue-on-error`), and scheduled health can skip the branch probe
when the token is absent. Make release-blocking policy explicit.

## 14. Dependencies

`package-lock.json` is present. CI audit is advisory; run and triage a fresh
high-severity audit in the approved remediation phase. No dependency upgrade
is recommended by this audit alone.

## 15. Legacy AI / Provider Inventory

OpenAI: embeddings, tutor search and plan updates. Gemini: tutor and
coordinator insights. OpenRouter: quiz generation and plan update fallback.
DeepSeek: untracked provider implementation only, with a hardcoded target
model. This is a P1 consolidation requirement before provider foundation.

## 16. RAG / Embeddings

The #249 RAG ACL source is appropriate and `search_course_materials` is
SECURITY INVOKER with anon/PUBLIC execution revoked. Current embedding code
defaults to OpenAI `text-embedding-ada-002`/1536 dimensions; the requested
future 384-dimension decision must not be made until a live zero-row count,
current Supabase capability verification, and rollback plan exist.

## 17. Existing Agentic / Proactive Infrastructure

Confirmed deployed: `agent-worker`, AI at-risk cron, UI hook invocation and
environment gates in the mixed source. `AI_PROACTIVE_AGENTS_ENABLED` and
`AI_AUTO_LOW_RISK_ENABLED` are documented false in `.env.example`, but live
Supabase secret values were not read. This is a containment failure, not a
foundation to extend.

## 18. Auth / Onboarding

The checked-out branch contains unmerged onboarding migration/function work;
Production has `bootstrap-first-admin` deployed. Invitation flows are public by
design and must preserve token-based constraints. Do not merge the current
branch as an auth fix without extraction and re-review.

## 19. Observability

Sentry, Vercel Analytics and Speed Insights dependencies exist. Cron routes
return downstream status/data, but the audit did not establish consistent
request/job/actor/institution IDs, idempotency records, proposal IDs or tool
execution audit records. H3 must define this contract before controlled writes.

## 20. Performance

Advisor warnings are mainly multiple permissive RLS policies. The dashboard
RPC/read-model work should be measured before consolidation. Avoid speculative
policy rewrites; focus on query plans for student dashboard, at-risk and
coordinator/admin aggregate paths.

## 21. Prototype Firewall

Missing. Smallest maintainable design: (1) `scripts/check-prototype-boundary`
in CI to reject `src/** → prototype/**` imports and unexpected root build
references; (2) CODEOWNERS/path-review for `prototype/**`; (3) `.vercelignore`
or explicit root build exclusion; (4) separate project/link for prototype
deployment; (5) README banner and archive branch convention. Do not implement
in this pass.

## 22. Worktree Inventory

| Path | Branch / HEAD | State | Classification |
|---|---|---|---|
| `F:/Edeviser-Kiro` | `feat/proactive-agentic-intelligence` / `4e182ed0` | 13 behind, 57 ahead of main; 109 changed/untracked files; mixed prototype/auth/agentic/migration work | DO_NOT_TOUCH / BACKUP_REQUIRED |
| `C:/tmp/edeviser-agent-orchestrator-20260810` | `agent/foundation-rag-hardening` / `8ecc417a` | remote branch exists; PR #249 merged separately | REVIEW_REQUIRED |
| `C:/tmp/edeviser-auth-pr-20260809` | `agent/auth-responsive-bidi` / `8c90c528` | upstream gone | REVIEW_REQUIRED |
| `C:/tmp/edeviser-auth-visual` | `agent/replace-arabic-auth-visual` / `2bbe192f` | upstream gone | REVIEW_REQUIRED |
| `C:/tmp/edeviser-pr250-resolve` | detached / `a7265570` | predecessor resolution state | REVIEW_REQUIRED |
| `C:/tmp/edeviser-prototype-archive-20260812` | archive branch / `6ae76459` | reference prototype | KEEP_ACTIVE (reference-only) |
| `C:/tmp/edeviser-transparent-arabic-timeline` | `agent/transparent-arabic-timeline` / `b66ab465` | remote exists | REVIEW_REQUIRED |
| `.claude/worktrees/friendly-meninsky-95c00e` | `fix/vite-console-strip` / `d4238c09` | upstream gone | REVIEW_REQUIRED |

Do not classify any as safe to remove until per-worktree `status`, unique
commit reachability, unpushed commits, secrets and PR status are inspected from
an authorized location. The sandbox could enumerate worktrees but could not
read the `C:/tmp` worktree contents directly.

## 23. Production ↔ Repository Drift

Confirmed drift: Production migration history is ahead of this checkout but
matches `origin/main`. Production has deployed `agent-worker` and
`bootstrap-first-admin`; the merged-main file inventory does not include the
former and the primary checkout contains it only as untracked work. Treat this
as deployment/source ownership drift. Vercel Production corresponds to the
main merge timestamp/commit baseline. Full function hash and policy/body drift
comparison remains pending safe metadata access.

## 24. Test Coverage Reality

Unit/property tests, migration guards, RLS property/smoke checks and Playwright
configuration exist. PR #249: core CI and RLS/connectivity/cron audit checks
passed; pre-deploy E2E was skipped. No evidence of executed production
multi-tenant tests for the newly active agent-worker/proactive flow. Required
before re-enabling it: unauthenticated rejection, role/course/institution
matrix, cron idempotency, feature-flag fail-closed and audit-log tests.

## 25. Seed / Demo Data

`supabase/noor-local-fixture.sql` is explicitly local-only and uses test UUIDs;
`supabase/seed.sql` includes Noor/demo names. Legacy production seeding scripts
remain but are guarded/disabled by source comments. Keep a strict distinction:
local fixture and test plans must never be invoked by production workflows.

## 26. Dead Code / Duplication

High-confidence duplication: risk/proactive behavior exists as deterministic
cron signals and a deployed agent worker; AI providers exist across OpenAI,
Gemini, OpenRouter and untracked DeepSeek. Canonical owners should be:
authorization in database/application guards; deterministic signals in one
server module; provider abstraction server-only; future orchestrator as the
only tool router. Investigate `bulk-grade-export` TODO and stale local output
files separately.

## 27. Recommended Remediation PRs

1. **H1 — Agentic containment and RLS/RPC hygiene:** disable or secure
   `agent-worker` and its cron; resolve internal DEFINER grants with RLS tests;
   prove public endpoint contracts.
2. **H2 — Deployment/CI/prototype firewall:** establish source-to-deployed
   function manifest, separate preview credentials where required, make the
   audit verdict promotion-relevant, and add the prototype firewall.
3. **H3 — Runtime/observability/provider inventory:** canonicalize provider
   ownership, document feature flags, add structured job/tool audit contracts
   and error-state tests. Do not migrate providers/dimensions in this PR.

## 28. Worktree Recovery Plan

1. Preserve this report and record `git status`/commit IDs for every worktree.
2. Create a new clean worktree from `origin/main` only after H1 is verified.
3. For each old worktree, compare unique commits and untracked files against
   the clean base; copy no secrets.
4. Create narrowly named recovery branches (auth, provider, prototype docs)
   only for approved, independently reviewable changes.
5. Run lint, typecheck, tests, preview and production read-only verification
   for each recovery PR.
6. Only after commit reachability and backup confirmation, seek explicit
   approval for deletion/cleanup.

## 29. Agentic Readiness Matrix

| Capability | Readiness |
|---|---|
| Provider | NOT READY |
| Embeddings | READY WITH CONDITIONS |
| Orchestrator | NOT READY |
| Typed read tools | READY WITH CONDITIONS |
| Typed writes | NOT READY |
| Approvals | NOT READY |
| Learning State | READY WITH CONDITIONS |
| Proactive engine | NOT READY |
| Five-role UI | READY WITH CONDITIONS |
| Closed-loop system | NOT READY |

Conditions: H1 containment/grant review, clean worktree recovery, provider
consolidation, live embedding count verification, and auditable deterministic
authorization/tool contracts.

## 30. Final Recommended Sequence

Audit → fix BLOCKER/P1 containment and security boundaries → verify Production
read-only → preserve/recover worktrees into clean branches → create a clean
worktree from latest main → start provider foundation.

