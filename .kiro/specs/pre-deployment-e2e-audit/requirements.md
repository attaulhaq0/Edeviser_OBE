# Requirements Document

## Introduction

This document specifies the requirements for the **Pre-Deployment End-to-End Audit** — a release-readiness gate for the Edeviser Human-Centric OBE + Gamification platform. The "deliverable" of this feature is not a new user-facing product capability, but an auditable, executable package that proves the platform is safe to deploy to production: an E2E test suite covering all five roles (Admin, Coordinator, Teacher, Student, Parent), a connectivity validation matrix between frontend and backend, property-based tests for domain invariants, an audit report, and a severity-based go/no-go decision matrix.

The audit operates as a verification layer on top of prior remediation work. It intentionally does not re-execute the audits already delivered by:

- `.kiro/specs/platform-audit-fixes/`
- `.kiro/specs/post-audit-remediation/`
- `.kiro/specs/supabase-audit-remediation/`
- `.kiro/specs/pre-deployment-deps-upgrade/`
- `.kiro/specs/i18n-rtl-support/`

Instead, this audit assumes those remediations are in place and validates end-to-end that the composed system still behaves correctly under realistic, cross-role usage.

The primary consumers of this audit are release-stakeholders who must each be able to answer a specific question from its artifacts: "Can we deploy?" (Release Engineer), "Is every critical user journey covered and green?" (QA Lead), "Does the code continue to uphold our architectural and security invariants?" (Tech Lead), "Does every role get the experience the product promises?" (Product Owner).

## Glossary

- **Audit_System**: The composite set of automated tests, connectivity probes, linters, type-checkers, and reports produced by this spec. Treated as one logical system.
- **E2E_Suite**: The Playwright/Vitest browser-level test suite exercising full user journeys per role.
- **Connectivity_Matrix**: A generated artifact mapping every frontend hook/mutation/subscription to the backend endpoint, RLS policy, and query-key invalidation it depends on.
- **Property_Suite**: The fast-check property-based test suite validating domain invariants (OBE, gamification, i18n, security).
- **Audit_Report**: The human-readable Markdown deliverable summarizing pass/fail status, severity counts, and go/no-go recommendation.
- **Severity_Ladder**: The ranked defect classification — Blocker, Critical, Major, Minor, Trivial — with defined triage rules.
- **Release_Engineer**: The human role responsible for the actual deploy and rollback procedure.
- **QA_Lead**: The human role accountable for sign-off that journeys are covered.
- **Tech_Lead**: The human role accountable for architectural and security invariants.
- **Product_Owner**: The human role accountable for confirming every user role gets the intended experience.
- **Role**: One of the five application user types — Admin, Coordinator, Teacher, Student, Parent.
- **Critical_Path**: The smallest sequence of actions a Role must successfully complete for the platform to be useful to that Role (e.g., Teacher: login → open course → grade submission → release grade → logout).
- **RouteGuard**: The client-side component at `src/router/RouteGuard.tsx` that gates routes by authenticated session and role.
- **Cron_Endpoint**: One of the ten scheduled jobs under `api/cron/*`.
- **Edge_Function**: A Deno-runtime function hosted in Supabase under `supabase/functions/`.
- **RLS_Matrix**: The per-table, per-role grid of positive (allowed) and negative (denied) access expectations verified by the audit.
- **Design_Token_Checker**: The static analyzer that scans source for prohibited design patterns (forbidden color families on cards/tabs, glassmorphism on data cards, physical margin/padding in RTL contexts).
- **Go_No_Go_Matrix**: The severity-by-count table that drives the final deploy recommendation.
- **Baseline_Budget**: The previously recorded performance numbers (bundle size, cold-start render, query latency) used as regression anchors.
- **Attainment_Rollup**: The cascade Grade → Evidence → CLO → PLO → ILO defined in `.kiro/steering/domain-knowledge.md`.
- **XP_Ledger**: The append-only `xp_transactions` table; `xp_total` is derived via `SUM()`.
- **Nova_Act_Suite**: The Amazon Nova Act browser-automation agent configured to exercise each Role's primary journey using natural-language prompts. Its output is stored as structured trajectories, screenshots, and Gherkin `.feature` files under `audit/output/nova-act/`.

## Requirements

### Requirement 1: E2E Coverage of Role-Specific Critical Paths

**User Story:** As a QA_Lead, I want an automated E2E suite that exercises every Role's Critical_Path, so that I can confirm no Role has a broken primary journey before deployment.

#### Acceptance Criteria

1. THE Audit_System SHALL include at least one E2E test per Role covering login, at least one mutation on the Role's primary workspace, and logout.
2. THE E2E_Suite SHALL exercise the Admin Critical_Path consisting of login, create/edit one ILO, create/edit one user, view the institution dashboard, review an audit log entry, and logout.
3. THE E2E_Suite SHALL exercise the Coordinator Critical_Path consisting of login, create/edit one PLO, map one PLO to one ILO, view the curriculum matrix, open one CQI action plan, and logout.
4. THE E2E_Suite SHALL exercise the Teacher Critical_Path consisting of login, open one course, create one CLO with a Bloom level, create one assignment linking that CLO, grade one submission, release the grade, and logout.
5. THE E2E_Suite SHALL exercise the Student Critical_Path consisting of login, view the learning path, submit one assignment, view XP awarded, view streak, view leaderboard, and logout.
6. THE E2E_Suite SHALL exercise the Parent Critical_Path consisting of login, view at least one linked child's progress, view XP and attainment summary, view notification feed, and logout.
7. WHEN a Role has no seeded test data for a required step, THE E2E_Suite SHALL seed that data through a dedicated Edge_Function fixture endpoint and clean it up in an afterAll hook.
8. IF any Critical_Path step fails, THEN THE Audit_Report SHALL classify the failure as at least Critical severity.

### Requirement 2: RouteGuard and Role-Based Routing Enforcement

**User Story:** As a Tech_Lead, I want every protected route verified against RouteGuard, so that I know no Role can reach a page outside its permission set.

#### Acceptance Criteria

1. THE Audit_System SHALL enumerate every route registered under `src/router/` and associate each route with its intended allowed Role set.
2. WHEN an unauthenticated user requests any route listed as protected, THE Audit_System SHALL verify a redirect to the public login route.
3. WHEN a user authenticated as Role A requests a route whose allowed Role set excludes A, THE Audit_System SHALL verify a redirect to a 403 or role-appropriate fallback route.
4. THE Audit_System SHALL execute the Role-route verification for all five Roles against all protected routes, producing a boolean matrix of size `Roles × Routes`.
5. IF any cell in the Role-route matrix disagrees with the configured RouteGuard intent, THEN THE Audit_Report SHALL classify the discrepancy as at least Critical severity.

### Requirement 3: Cross-Role Interaction Flows

**User Story:** As a Product_Owner, I want the audit to prove that actions by one Role propagate correctly to other Roles, so that the collaborative promise of the platform holds end-to-end.

#### Acceptance Criteria

1. THE E2E_Suite SHALL include a Teacher-to-Student flow where a grade released by the Teacher is visible to the Student, and the Student's XP and attainment reflect the grade within one minute.
2. THE E2E_Suite SHALL include a Student-to-Parent flow where progress visible to the Student is visible to a linked verified Parent account and not visible to an unlinked Parent account.
3. THE E2E_Suite SHALL include a Coordinator-to-Teacher flow where a PLO created and mapped by a Coordinator becomes available as a mapping target for the Teacher's CLOs.
4. THE E2E_Suite SHALL include an Admin-to-all flow where an Admin-created Bonus XP Event is respected by the gamification engine for submissions made during the event window.
5. IF a cross-Role propagation does not occur within the specified time bound, THEN THE Audit_Report SHALL classify the failure as at least Major severity.

### Requirement 4: Frontend-to-Backend Connectivity Matrix

**User Story:** As a Tech_Lead, I want a generated Connectivity_Matrix covering every TanStack Query hook, mutation, and realtime subscription, so that no client call silently points at a stale or missing backend endpoint.

#### Acceptance Criteria

1. THE Audit_System SHALL enumerate every file under `src/hooks/` exporting a TanStack Query `useQuery` or `useMutation` hook.
2. FOR every enumerated query hook, THE Audit_System SHALL verify that the queried Supabase table or Edge_Function exists in the deployed schema and responds without error under an authenticated session for at least one permitted Role.
3. FOR every enumerated mutation hook, THE Audit_System SHALL verify that the mutation resolves successfully for at least one permitted Role and that its `onSuccess` invalidates at least one non-empty set of query keys from `src/lib/queryKeys.ts`.
4. FOR every enumerated hook, THE Audit_System SHALL verify that the component consuming the hook renders a non-loading, non-error, non-empty state, an error state, and an empty state under representative fixtures.
5. THE Audit_System SHALL verify that every Edge_Function referenced by any client hook returns the expected CORS headers on `OPTIONS` and accepts an authenticated `Authorization` header.
6. THE Audit_System SHALL verify that every endpoint under `api/cron/*` is callable with the configured cron secret and returns a JSON response with an `ok: true` or equivalent success shape.
7. IF any hook references a backend endpoint that does not exist, does not respond, or omits CORS, THEN THE Audit_Report SHALL classify the finding as at least Critical severity.

### Requirement 5: Supabase RLS Enforcement Across All Roles

**User Story:** As a Tech_Lead, I want positive and negative RLS tests on every table for every Role, so that I can confirm data isolation holds in production.

#### Acceptance Criteria

1. THE Audit_System SHALL enumerate every table in the deployed Supabase schema.
2. FOR every enumerated table, THE Audit_System SHALL execute at least one positive RLS test per Role expected to have `SELECT` access, confirming a representative row is returned.
3. FOR every enumerated table, THE Audit_System SHALL execute at least one negative RLS test per Role expected to be denied `SELECT` access, confirming no row is returned.
4. FOR every table accepting `INSERT`, `UPDATE`, or `DELETE` from the client, THE Audit_System SHALL execute at least one positive and one negative test per Role for each allowed operation.
5. THE Audit_System SHALL verify that every append-only table listed in `.kiro/steering/supabase-patterns.md` — specifically `evidence`, `audit_logs`, and `xp_transactions` — rejects `UPDATE` and `DELETE` from every Role including Admin.
6. THE Audit_System SHALL verify that a Parent account linked to a Student via `parent_student_links` with `verified = true` can read that Student's data, and a Parent without such a link cannot.
7. IF any RLS test contradicts its expected outcome, THEN THE Audit_Report SHALL classify the finding as Blocker severity.

### Requirement 6: Supabase Auth, Realtime, and Storage Integration

**User Story:** As a QA_Lead, I want the auth, realtime, and storage subsystems validated end-to-end, so that the audit covers not just database reads but the live surfaces of the platform.

#### Acceptance Criteria

1. THE Audit_System SHALL execute a successful signup, login, password-reset-request, session-refresh, and logout flow for at least one account per Role.
2. WHEN a user logs in, THE Audit_System SHALL verify that the JWT contains a `role` claim matching the Role assigned in the database.
3. THE Audit_System SHALL subscribe to at least one realtime channel per subscribed table and verify that an `INSERT` in that table is delivered to the subscriber within two seconds.
4. IF the realtime connection drops during a test, THEN THE Audit_System SHALL verify that the client falls back to polling at a 30-second interval and surfaces the "Live updates paused" banner described in `.kiro/steering/supabase-patterns.md`.
5. THE Audit_System SHALL execute an authenticated upload of a representative fixture file to Storage and verify that the file is retrievable by a permitted Role and not by a denied Role.
6. IF any auth, realtime, or storage flow fails, THEN THE Audit_Report SHALL classify the failure as at least Critical severity.

### Requirement 7: OBE Correctness Invariants

**User Story:** As a Tech_Lead, I want property-based tests that validate the OBE invariants from `.kiro/steering/domain-knowledge.md`, so that I am confident the attainment engine remains mathematically sound.

#### Acceptance Criteria

1. THE Property_Suite SHALL assert that for every outcome mapping group of a given child outcome to its parents, the sum of mapping weights equals 100 for any generated valid outcome set.
2. THE Property_Suite SHALL assert that evidence records are never updated or deleted by exercising the client and Edge_Function surfaces with repeated writes and confirming that `updated_at` equals `created_at` for every row returned.
3. THE Property_Suite SHALL assert that for a generated grade, the resulting CLO attainment cascades to produce a PLO attainment and an ILO attainment whose values are consistent with the weighted-average formula defined in the domain knowledge.
4. THE Property_Suite SHALL assert that the attainment level classification function maps any input percentage in `[0, 100]` to exactly one of `Excellent`, `Satisfactory`, `Developing`, or `Not_Yet` using the configured institution thresholds.
5. THE Property_Suite SHALL assert that a student cannot successfully submit to an assignment whose prerequisite CLO attainment is below the configured gate, for any generated student and assignment pair.
6. THE Property_Suite SHALL assert that each CLO is associated with exactly one Bloom level.
7. THE Property_Suite SHALL run each property for at least one hundred iterations as required by `.kiro/steering/engineering-guardrails.md`.
8. IF any OBE property fails, THEN THE Audit_Report SHALL classify the failure as Blocker severity.

### Requirement 8: Gamification Engine Invariants

**User Story:** As a Tech_Lead, I want property-based tests for every gamification invariant, so that XP, streaks, badges, and leaderboards remain trustworthy.

#### Acceptance Criteria

1. THE Property_Suite SHALL assert that `xp_total` for any Student equals the sum of that Student's rows in `xp_transactions`, for any generated sequence of XP events.
2. THE Property_Suite SHALL assert that the XP amount written for each source type equals the base amount from the XP schedule in `.kiro/steering/domain-knowledge.md` multiplied by any active Bonus XP Event multiplier at the event timestamp.
3. THE Property_Suite SHALL assert that the Level function applied to any cumulative XP value returns a level consistent with the `XP = 50 * N^1.5` progressive formula and the known anchor points `Level 1 = 0 XP`, `Level 2 = 100 XP`, `Level 3 = 250 XP`.
4. THE Property_Suite SHALL assert that streak increments exactly once per calendar day on first login, resets to zero when a calendar day is skipped, and is preserved when a Streak Freeze is applied, for any generated login timeline.
5. THE Property_Suite SHALL assert that badge awards are idempotent — running the badge check twice for the same qualifying state SHALL produce at most one badge row.
6. THE Property_Suite SHALL assert that a Perfect Day XP award fires only when all four daily habits (Login, Submit, Journal, Read) complete before midnight in the student's local time zone.
7. WHERE a Student has opted out of leaderboard disclosure, THE Audit_System SHALL verify that no leaderboard view or Edge_Function output contains that Student's name or identifier.
8. IF any gamification property fails, THEN THE Audit_Report SHALL classify the failure as at least Critical severity.

### Requirement 9: UI/UX Design-System Conformance

**User Story:** As a Product_Owner, I want automated checks that the UI adheres to the design system rules in `.kiro/steering/design-system.md`, so that the shipped product is visually consistent across roles.

#### Acceptance Criteria

1. THE Design_Token_Checker SHALL scan all files under `src/components/` and `src/pages/` and flag any background utility class from the families `pink`, `purple`, `violet`, `rose`, or `fuchsia` applied to an element classified as a card or a tab.
2. THE Design_Token_Checker SHALL flag any occurrence of `backdrop-blur`, `bg-white/`, `bg-black/`, or equivalent transparency utilities applied to an element classified as a data card.
3. THE Design_Token_Checker SHALL flag any section whose rendered output contains more than one gradient call-to-action button, consistent with the "max 1 gradient button per section" rule.
4. THE E2E_Suite SHALL verify that every interactive control on at least one page per Role has a rendered bounding box of no less than forty-four pixels in width and forty-four pixels in height at the mobile breakpoint.
5. WHEN the test browser sets `prefers-reduced-motion: reduce`, THE E2E_Suite SHALL verify that the custom animations listed in `.kiro/steering/design-system.md` — `shimmer`, `xp-pulse`, `badge-pop`, `float`, `streak-flame`, `fade-in-up` — are disabled.
6. THE E2E_Suite SHALL verify that every list page renders a non-empty empty-state component when its query returns zero rows and a toast when its mutation fails.
7. THE Audit_System SHALL verify that every route is wrapped by the shared `ErrorBoundary` component listed in `.kiro/steering/component-patterns.md`.
8. THE Audit_System SHALL verify that component-level loading uses the shared `Shimmer` component and that no route renders a full-page skeleton.
9. IF any design-system check fails, THEN THE Audit_Report SHALL classify the finding as at least Major severity.

### Requirement 10: Internationalization and RTL Correctness

**User Story:** As a Product_Owner, I want proof that every user-facing string is translated and every layout renders correctly in RTL, so that Arabic users are not second-class citizens.

#### Acceptance Criteria

1. THE Audit_System SHALL enumerate every translation key referenced in `src/` and verify that each key is present in both `src/locales/en/` and `src/locales/ar/`.
2. THE Audit_System SHALL flag any literal user-facing string in JSX that is not wrapped in a translation call such as `t(...)` or `<Trans>`.
3. THE Audit_System SHALL scan all files under `src/components/` and `src/pages/` and flag any physical margin or padding utility of the forms `ml-*`, `mr-*`, `pl-*`, `pr-*`, `left-*`, or `right-*` that is not paired with its logical counterpart or justified by a documented exception.
4. THE E2E_Suite SHALL render at least one page per Role under the `ar` locale with `dir="rtl"` and verify that the visual layout matches a captured baseline within a documented pixel tolerance.
5. THE Audit_System SHALL verify that date and number formatting uses locale-aware formatters and produces Arabic-numeral output under `ar` and Western-numeral output under `en`.
6. IF any user-facing string is untranslated or any layout fails RTL verification, THEN THE Audit_Report SHALL classify the finding as at least Major severity.

### Requirement 11: Accessibility Baseline

**User Story:** As a Product_Owner, I want a keyboard- and screen-reader-level accessibility check on every page, so that the product meets its inclusivity commitments.

#### Acceptance Criteria

1. THE E2E_Suite SHALL navigate at least one page per Role using only keyboard interaction and verify that every actionable element receives focus in a logical order.
2. THE Audit_System SHALL verify that every `button`, `a`, or interactive element rendering only an icon exposes an accessible name via `aria-label`, `aria-labelledby`, or visually-hidden text.
3. THE E2E_Suite SHALL verify that every focused element displays a visible focus indicator distinguishable from its default state.
4. THE Audit_System SHALL verify that the color pairs used by attainment-level badges, Bloom-level badges, and outcome-type badges listed in `.kiro/steering/design-system.md` meet a contrast ratio of at least 4.5 to 1 for normal text and 3 to 1 for large text.
5. IF any accessibility check fails, THEN THE Audit_Report SHALL classify the finding as at least Major severity.

### Requirement 12: Performance and Scalability Regression Guards

**User Story:** As a Release_Engineer, I want hard regression limits on bundle size, render time, and query patterns, so that a silent performance regression cannot ship.

#### Acceptance Criteria

1. THE Audit_System SHALL measure the production Vite bundle size and fail the audit if the total gzipped bundle size exceeds the recorded Baseline_Budget by more than ten percent.
2. THE Audit_System SHALL measure the cold-start time-to-interactive for each Role's primary dashboard page and fail the audit if any value exceeds the recorded Baseline_Budget by more than twenty percent.
3. THE Audit_System SHALL verify that every list page under `src/pages/` paginates or virtualizes its primary data table and fails the audit if any list renders all rows unconditionally.
4. THE Audit_System SHALL verify that every realtime subscription created by the client specifies at least one filter clause and is never subscribed to an entire table without a filter.
5. THE Audit_System SHALL analyze the Supabase query log for the Critical_Path runs and flag any detected N+1 pattern defined as the same query template executing more than ten times within a single page transition.
6. IF any performance check exceeds its budget, THEN THE Audit_Report SHALL classify the finding as at least Major severity.

### Requirement 13: Security and Secret-Boundary Checks

**User Story:** As a Release_Engineer, I want automated guards that no secret ever reaches the client bundle and that every input is validated, so that the production build is safe.

#### Acceptance Criteria

1. THE Audit*System SHALL scan the built client bundle and fail the audit if any value matching the pattern of a Supabase service-role key, a Resend API key, or any string prefixed with `sb_secret*`, `SUPABASE_SERVICE_ROLE_KEY`, or `RESEND_API_KEY` is present.
2. THE Audit*System SHALL verify that no environment variable prefixed with `VITE*`contains a value classified as a server-only secret by`.kiro/steering/project-conventions.md`.
3. THE Audit_System SHALL verify that every form component under `src/pages/` uses `zodResolver` with a schema imported from `src/lib/schemas/`.
4. THE Audit_System SHALL verify that every Edge_Function validates its request body against a Zod schema before performing any side effect.
5. THE Audit_System SHALL verify that every Admin mutation hook writes a row to `audit_logs` whose `performed_by` equals the acting user and whose `entity_id` equals the affected entity.
6. WHEN a token-expired session makes a request, THE Audit_System SHALL verify that the client attempts one silent refresh and, on failure, redirects the user to the login route.
7. IF any security check fails, THEN THE Audit_Report SHALL classify the finding as Blocker severity.

### Requirement 14: Error Monitoring and Observability

**User Story:** As a Release_Engineer, I want proof that Sentry and structured errors are wired correctly on both the client and Edge Functions, so that production incidents are observable.

#### Acceptance Criteria

1. THE Audit_System SHALL verify that `@sentry/react` is initialized in the client entrypoint and captures a synthetic error thrown inside a component wrapped by the shared `ErrorBoundary`.
2. THE Audit_System SHALL verify that every Edge_Function captures thrown errors to Sentry and returns a JSON response of the shape `{ error: string, code?: string }` with an HTTP status code in the range 4xx or 5xx.
3. THE Audit_System SHALL verify that every route in `src/router/` is wrapped by a route-level `ErrorBoundary` and that a thrown error inside a route produces a recoverable fallback UI.
4. IF Sentry does not receive a synthetic client error or a synthetic Edge_Function error during the audit run, THEN THE Audit_Report SHALL classify the failure as at least Critical severity.

### Requirement 15: Cron Job Health

**User Story:** As a Release_Engineer, I want every scheduled job proven to execute, log, and behave idempotently, so that background work does not silently fail in production.

#### Acceptance Criteria

1. THE Audit_System SHALL invoke each of the ten Cron_Endpoints — `streak-reset`, `streak-risk`, `weekly-summary`, `compute-at-risk`, `ai-at-risk-prediction`, `leaderboard-refresh`, `notification-digest`, `perfect-day-prompt`, `exam-period-notify`, and `fee-overdue-check` — with the configured cron secret and verify each returns a success response.
2. FOR each Cron_Endpoint, THE Audit_System SHALL verify that a corresponding row is written to the audit or cron-run log table capturing start time, end time, and outcome.
3. FOR each Cron_Endpoint, THE Audit_System SHALL invoke the endpoint twice consecutively with identical input and verify that the second invocation does not produce duplicate rows in the tables it writes to, consistent with idempotent design.
4. IF a Cron_Endpoint returns a non-success response, omits its log row, or produces duplicates on the second run, THEN THE Audit_Report SHALL classify the failure as at least Critical severity.

### Requirement 16: Audit Report and Go/No-Go Decision

**User Story:** As a Release_Engineer, I want a single human-readable Audit_Report that converts findings into a go-or-no-go verdict, so that the deploy decision is unambiguous.

#### Acceptance Criteria

1. THE Audit_System SHALL produce an Audit_Report at a documented path that contains at minimum: executive summary, per-requirement pass/fail status, finding list with severity and reproduction steps, connectivity matrix, RLS matrix, and the Go_No_Go_Matrix.
2. THE Audit_Report SHALL classify every finding using exactly one severity from the Severity_Ladder: Blocker, Critical, Major, Minor, or Trivial.
3. THE Audit_Report SHALL recommend "No-Go" when any finding is classified as Blocker.
4. THE Audit_Report SHALL recommend "No-Go" when the count of Critical findings exceeds zero unless each Critical finding carries an approved, time-bounded waiver signed by the Release_Engineer, the QA_Lead, and the Tech_Lead.
5. THE Audit_Report SHALL recommend "Go with remediation backlog" when no Blocker or Critical findings remain and the Major finding count is at or below a documented threshold.
6. THE Audit_Report SHALL recommend "Go" when only Minor or Trivial findings remain.
7. THE Audit_Report SHALL include the Git commit SHA, the Supabase migration head, the audit run timestamp, and the environment identifier so that the verdict is reproducible.
8. IF the Audit_Report is not produced or is missing a required section, THEN the audit run SHALL be treated as failed and a deploy SHALL NOT proceed.

### Requirement 17: CI Gate Integration

**User Story:** As a Tech_Lead, I want the audit integrated into CI so that the same checks gate every pull request and every deploy candidate.

#### Acceptance Criteria

1. THE Audit_System SHALL expose a single CI-invokable entrypoint that runs lint, type-check, unit tests, property tests, E2E suite, connectivity matrix, RLS matrix, design-token checker, i18n checker, cron health check, and bundle/security scans in a documented order.
2. THE Audit_System SHALL fail the CI job if `npm run lint` reports any error or warning, consistent with the zero-warning policy in `.kiro/steering/pre-push-checks.md`.
3. THE Audit_System SHALL fail the CI job if `npx tsc --noEmit` reports any error.
4. THE Audit_System SHALL fail the CI job if coverage on business-logic modules under `src/lib/` falls below a documented threshold.
5. WHEN the CI job runs on a pull request targeting `main`, THE Audit_System SHALL post a comment summarizing severity counts and the Go_No_Go_Matrix verdict.
6. IF any CI gate fails, THEN the deploy pipeline SHALL NOT advance to the production stage.

### Requirement 18: Human-Perspective UX Audit via Nova Act

**User Story:** As a Product_Owner, I want an AI-driven browser-automation agent to exercise each Role's primary user journey in natural language, so that the audit surfaces UX friction and broken flows that deterministic Playwright assertions cannot.

#### Acceptance Criteria

1. THE Audit_System SHALL include a Nova_Act_Suite that executes at least one natural-language user journey per Role — Admin, Coordinator, Teacher, Student, and Parent — against the running application.
2. FOR each Role's Nova_Act journey, THE Audit_System SHALL use the Role's pre-seeded credentials from §3 to sign in and complete an end-to-end task described in plain English, not in click-by-click selectors.
3. THE Nova_Act_Suite SHALL record each journey as a structured trajectory containing: the user intent prompt, the sequence of browser actions taken, screenshots at each step, the final outcome, and any observed blockers or friction.
4. THE Nova_Act_Suite SHALL additionally run one exploratory flow-discovery pass per Role that is not scripted against a known task — the agent is instructed to "explore this role's available actions and report any confusing, broken, or redundant UI" — and record findings.
5. WHEN a Nova_Act journey cannot complete its stated intent within a documented step budget, THE Audit_Report SHALL classify the failure as at least Critical severity.
6. WHEN a Nova_Act flow-discovery pass surfaces a blocker, broken link, non-responsive control, or missing feedback, THE Audit_Report SHALL classify the finding as at least Major severity.
7. THE Audit_System SHALL store every Nova_Act run artifact — the final report, the session log, the steps YAML, and captured screenshots — under `audit/output/nova-act/<role>/` so that findings are reproducible.
8. THE Nova_Act_Suite SHALL run in `headless` mode in CI and support `headed` mode locally via a documented flag.
9. IF the Nova_Act authentication credential (API key or AWS credential) is not configured for a run, THEN the Nova_Act_Suite stage SHALL be marked `skipped` in the manifest rather than failing the audit, and the skip SHALL be recorded as a Major finding unless a documented waiver is present.
10. THE Nova_Act_Suite SHALL convert every completed journey into a reviewable Gherkin `.feature` file under `audit/output/nova-act/gherkin/<role>.feature` so that QA and Product stakeholders can read, rerun, and extend the scenarios without reading Python.

## Correctness Properties

The following properties drive the Property_Suite and are cross-referenced by their ordinal in test file comments:

1. **Outcome mapping weight invariant**: for every child outcome, the sum of its mapping weights to parents equals 100. (Ref: Requirement 7.1, `.kiro/steering/domain-knowledge.md`)
2. **Evidence immutability**: no evidence record is ever modified or deleted after insertion. (Ref: Requirement 7.2)
3. **Attainment cascade consistency**: CLO, PLO, and ILO attainment values are consistent with the weighted-average formula under any valid grade sequence. (Ref: Requirement 7.3)
4. **Attainment classification totality**: the classifier is total on `[0, 100]` and returns exactly one label. (Ref: Requirement 7.4)
5. **Prerequisite gate enforcement**: a student cannot submit to a gated assignment while below the prerequisite threshold. (Ref: Requirement 7.5)
6. **Single Bloom level per CLO**: each CLO has exactly one Bloom level. (Ref: Requirement 7.6)
7. **XP ledger sum identity**: `xp_total = SUM(xp_transactions)` per student. (Ref: Requirement 8.1)
8. **Bonus XP multiplier application**: written XP equals base schedule amount multiplied by the active multiplier at event time. (Ref: Requirement 8.2)
9. **Level formula consistency**: `level(xp)` agrees with the progressive formula and known anchors. (Ref: Requirement 8.3)
10. **Streak state machine correctness**: streak transitions match the daily-login, skip-day, and freeze-applied rules. (Ref: Requirement 8.4)
11. **Badge idempotency**: repeated badge checks produce at most one row per (student, badge). (Ref: Requirement 8.5)
12. **Perfect Day gating**: Perfect Day XP fires only when all four habits complete within the local day. (Ref: Requirement 8.6)
13. **Leaderboard opt-out privacy**: opted-out students never appear by name or identifier in any leaderboard output. (Ref: Requirement 8.7)
14. **Cron idempotency**: running a Cron_Endpoint twice with identical input produces the same side-effect set as running it once. (Ref: Requirement 15.3)
15. **Attainment classification is idempotent**: classify(classify-input-percentage) applied to the same value twice yields the same label. (Ref: Requirement 7.4)

## Out of Scope

The following items are explicitly excluded from this audit and SHALL be tracked in separate specs or deferred:

- Load testing beyond the Baseline_Budget checks; sustained concurrent-user simulation at scale is out of scope.
- Chaos engineering (random process kills, network partition injection) is out of scope.
- Penetration testing, fuzzing of authentication, and adversarial security testing beyond the static and RLS checks specified here are out of scope.
- Visual regression testing at full pixel fidelity across all pages and breakpoints is out of scope; only the RTL baseline in Requirement 10.4 is covered.
- WCAG 2.1 AA full conformance certification is out of scope; only the accessibility baseline in Requirement 11 is covered.
- Database backup, restore, and disaster-recovery drills are out of scope and are covered by `docs/operations/disaster-recovery.md`.
- Re-execution of audits already delivered by prior specs listed in the Introduction is explicitly out of scope.

## Definition of Done / Exit Criteria

The audit run is considered complete and its verdict binding when all of the following hold:

1. Every requirement in this document has a corresponding executed test or check with a recorded pass/fail outcome.
2. The Audit_Report is produced, includes every section listed in Requirement 16.1, and references the Git commit SHA, Supabase migration head, run timestamp, and environment identifier.
3. The Go_No_Go_Matrix yields one of: Go, Go with remediation backlog, or No-Go.
4. A deploy to production SHALL proceed only when the Go_No_Go_Matrix yields Go or Go with remediation backlog and every required waiver, if any, is recorded in the Audit_Report.

### Go/No-Go Matrix

| Blocker | Critical               | Major                  | Minor | Trivial | Verdict                     |
| ------- | ---------------------- | ---------------------- | ----- | ------- | --------------------------- |
| ≥ 1     | any                    | any                    | any   | any     | No-Go                       |
| 0       | ≥ 1 without waiver     | any                    | any   | any     | No-Go                       |
| 0       | ≥ 1 with signed waiver | any                    | any   | any     | Go with remediation backlog |
| 0       | 0                      | > documented threshold | any   | any     | Go with remediation backlog |
| 0       | 0                      | ≤ documented threshold | any   | any     | Go with remediation backlog |
| 0       | 0                      | 0                      | any   | any     | Go                          |

### Severity Ladder Triage Rules

- **Blocker**: data-integrity, privacy, or security violation; deploy is forbidden. Examples: RLS bypass, leaderboard leak of opted-out student, evidence mutation, service-role key in bundle.
- **Critical**: a Role's Critical_Path is broken or a primary backend connection is missing. Deploy requires a signed time-bounded waiver.
- **Major**: non-Critical functional defect, accessibility gap, i18n gap, or performance regression within twenty percent of budget. Deploy may proceed with the item on a remediation backlog.
- **Minor**: cosmetic or convenience defect with clear user workaround. Deploy may proceed.
- **Trivial**: documentation, comment, or stylistic nit. Deploy may proceed.
