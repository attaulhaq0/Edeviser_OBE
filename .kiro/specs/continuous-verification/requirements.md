# Requirements — Continuous Product Verification

EARS-style (WHEN/THE SYSTEM SHALL). IDs: FR (functional), DR (data/quality).

## R1 — Account identity & seed tagging
- FR-1.1 WHEN a user is identified to PostHog, THE SYSTEM SHALL attach person
  properties: `account_type` (`seed`|`real`), `environment` (`production`|`preview`|
  `development`), `role`, `institution_id`, `email`.
- FR-1.2 THE SYSTEM SHALL classify `account_type=seed` via the locked registry in
  `src/lib/seedAccounts.ts` (domains `demo.com`, `noor-international.edu`; demo
  institution `00000000-0000-0000-0000-000000000001`). No user IDs may be hardcoded.
- FR-1.3 THE SYSTEM SHALL NOT send analytics events for users who have not granted
  analytics consent (existing behavior — preserve).
- DR-1.1 Seed accounts SHALL remain visually legitimate (`*.edu`/`*.com`), never
  `*.test`; login for all 73 seed accounts SHALL continue to work after any rename.

## R2 — PostHog projects (US region)
- FR-2.1 THERE SHALL exist two US-hosted PostHog projects: `edeviser-prod` and
  `edeviser-qa`, selected at build time via `VITE_POSTHOG_PROJECT_TOKEN` +
  `VITE_POSTHOG_HOST` per environment (Vercel env vars).
- FR-2.2 BOTH projects SHALL define "filter internal and test users" = person
  property `account_type = seed`, applied to existing and new insights.
- FR-2.3 Session replay SHALL be enabled with input+text masking (education/privacy).
- FR-2.4 Autocapture SHALL be ON in prod (pageviews, clicks) with SPA history-change
  pageview tracking.

## R3 — Dashboards (all built in PostHog; no Slack yet)
- FR-3.1 THE SYSTEM SHALL provision 4 dashboards (definitions in design.md):
  1) `Investor — Users & Engagement`, 2) `Engine Health — OBE`, 3) `Engine Health —
  Habit/Gamification`, 4) `QA & Broken Chains` (+ AI/Agent health panel set).
- FR-3.2 Dashboard provisioning SHALL be reproducible via
  `scripts/posthog-provision.mjs` (PostHog API + personal API key), not hand-clicked.
- FR-3.3 Broken-chain detection SHALL rely on paired events (e.g. `assignment_graded`
  without later `xp_grade_awarded` same reference) surfaced as "has value < 1" alerts.

## R4 — Chain verification (e2e of the product)
- FR-4.1 THE SYSTEM SHALL have Playwright chain tests that perform a user action and
  then assert DB consequences via the staging Supabase client: grade→evidence→
  CLO/PLO/ILO attainment→XP→level→notification; submit→queue; purchase→balance.
- FR-4.2 Chain tests SHALL run against staging/Preview ONLY, never Production.
- FR-4.3 THE SYSTEM SHALL run the full route×role matrix (from `criticalRoutes.ts`)
  nightly in `scheduled-health.yml`; failures post a run summary (Slack later).
- FR-4.4 pgTAP invariant suites SHALL cover: XP idempotency, rollup bounds
  (attainment ∈ [0,100]), evidence immutability, mapping weight sums, mapping
  direction pairs (ILO→PLO, PLO→CLO, CLO→SUB_CLO), streak no-double-count.

## R5 — Drift & promise tracking
- FR-5.1 A promise→proof matrix SHALL live in `docs/specs/continuous-verification/
  promise-matrix.md`, seeded from the QA manual PASS/BLOCKED/SUSPECTED statuses,
  reviewed after each verification run.

## R6 — Quality gates
- FR-6.1 Any change in this spec's scope SHALL pass `npm run lint`, `npx tsc --noEmit`,
  `npm test`, and the targeted test files before commit.
