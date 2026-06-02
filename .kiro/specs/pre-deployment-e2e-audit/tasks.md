# Implementation Plan: Pre-Deployment E2E Audit

## Overview

This plan builds the Pre-Deployment E2E Audit as an additive, release-gate pipeline. It follows the layered architecture in `design.md` §Architecture: foundation and tooling first, then the fixture Edge Function and seed data that every other layer depends on, then Playwright scaffolding, then per-role E2E specs, cross-role propagation specs, the property suite, the contract/static scanners, the report aggregator, CI wiring, baselines, and a final verification run.

Five roles — **Admin, Coordinator, Teacher, Student, Parent** — each receive explicit, named sub-tasks under every role-facing layer (E2E critical paths, role-specific feature specs, RLS probes, seed users, a11y dashboard specs, i18n/RTL screen baselines). No role is collapsed into a generic task.

**Setup ordering (strict):**

- §1 (foundation), §2 (fixture Edge Function), and §3 (seeds) MUST run before any other section.
- §4 (Playwright helpers) MUST complete before §5, §6, §11.3, §14.2, §15.
- §7 (properties) can run in parallel with §4–§6 once §1 is done.
- §8–§13 can run in parallel after §1–§3.
- §16 (report aggregator) MUST complete before §17 (CI) can be wired.
- §20 (verification) is the final gate and runs last.

**Authoring rules applied throughout:**

- Tests are sub-tasks of the implementation they test, never standalone.
- Test-related sub-tasks historically used `- [ ]*` to mark them optional, but the user has promoted every task in this plan to mandatory; no task below is optional regardless of the checkbox rendering.
- Property-test sub-tasks carry `Feature: pre-deployment-e2e-audit, Property N: <title>` and reference the requirement(s) they validate.
- Schema/migration changes go through Supabase MCP `apply_migration`, never manual edits to `supabase/migrations/`.
- `src/types/database.ts` is regenerated via `pwsh scripts/regen-types.ps1`, never by hand or shell redirection.

## Tasks

- [x] 1. Foundation and tooling setup

  - Establishes the package-level tooling every downstream layer needs. Must run before §2 and all later sections.
  - _Design: §Architecture, §Directory and File Plan_

  - [x] 1.1 Install Playwright, axe-core, and pixelmatch devDependencies

    - Run `npm install --save-dev @playwright/test @axe-core/playwright pixelmatch pngjs ts-morph` (ts-morph may already be transitive; pin it explicitly).
    - Run `npx playwright install chromium webkit --with-deps` locally and document the command for CI.
    - Add `@playwright/test` and the axe/pixelmatch packages to `package.json` under `devDependencies` with pinned exact versions.
    - _Requirements: 1.1, 6.1, 11.1, 17.1_
    - _Design: §Assumptions item 1, §Playwright Runner_

  - [x] 1.2 Create `playwright.config.ts` with seven projects

    - Six role + cross-role + one RTL project: `admin`, `coordinator`, `teacher`, `student`, `parent`, `cross-role`, `rtl-ar`.
    - Wire `use.contextOptions.reducedMotion = 'reduce'` on every project.
    - Configure desktop viewport `1440×900` for admin/coordinator/teacher/cross-role/rtl-ar, mobile `390×844` for student + parent (parent uses WebKit).
    - Set `retries: process.env.CI ? 2 : 0` per `design.md` §Error Handling.
    - Configure `globalSetup: './tests/e2e/_fixtures/seed.ts'` and `globalTeardown: './tests/e2e/_fixtures/teardown.ts'`.
    - Wire per-project `storageState: './tests/e2e/_fixtures/storage-states/<role>.json'`.
    - _Requirements: 1.1, 6.2, 9.4, 9.5, 10.4_
    - _Design: §Playwright Runner, §Browser and Viewport Matrix_

  - [x] 1.3 Create `audit/` directory skeleton with baseline placeholders

    - Create `audit/baselines/` with placeholder JSON files: `bundle.json`, `tti.json`, `rls-expectations.json`, `rls-exclude.json`, `cron-idempotency.json`, `secret-patterns.json`, `vite-env.allowlist.json`, `i18n-allowlist.json`, `n-plus-one-threshold.json`, `rtl-exceptions.json`, `cross-role-timing.json`.
    - Create `audit/baselines/rtl-screens/` (empty; populated by §18).
    - Create `audit/output/` and add it to `.gitignore`.
    - Seed each JSON with `{ "createdAt": null, "lockedByCommit": null }` so §18 can populate later.
    - _Requirements: 12.1, 12.2, 16.7_
    - _Design: §Directory and File Plan, §Assumptions item 3_

  - [x] 1.4 Add `npm run audit` entrypoint script and `scripts/audit/run.ts` orchestrator skeleton
    - Create `scripts/audit/run.ts` with `--stage`, `--role`, `--skip`, `--incremental`, `--env`, `--pr` CLI flags parsed via a lightweight arg parser (no new dep).
    - Stub each stage function (`runLint`, `runTsc`, `runPropertyTests`, `runBuild`, `runSecurity`, `runConnectivity`, `runRls`, `runCron`, `runE2E`, `runStatic`, `runReport`) as `async () => ({ status: 'skipped' })` for now.
    - Implement `audit/output/manifest.json` writer per the `design.md` §Data Models schema.
    - Add `"audit": "tsx scripts/audit/run.ts --env=ci"` to `package.json` scripts.
    - _Requirements: 17.1_
    - _Design: §Audit Runner, §CI Pipeline Integration_

- [x] 2. Fixture Edge Function (`audit-fixtures`)

  - The seed/teardown/impersonate surface every E2E spec depends on. MUST be created and deployed before §3 can run.
  - _Design: §Fixture Endpoint, §Assumptions item 2 and 4_

  - [x] 2.1 Create `supabase/functions/audit-fixtures/index.ts` with four routes

    - Routes: `POST /seed`, `POST /teardown`, `POST /impersonate`, `POST /event/bonus-xp`.
    - Use the standard Edge Function scaffold from `.kiro/steering/supabase-patterns.md` (Deno + `serve` + CORS preflight).
    - Use `SUPABASE_SERVICE_ROLE_KEY` for all writes (bypasses RLS inside the audit namespace only).
    - _Requirements: 1.7, 3.4, 5.6, 6.1_

  - [x] 2.2 Add ENV_ID gating that rejects every request outside `audit-staging`

    - On every request: read `Deno.env.get('ENV_ID')`; if not `audit-staging`, return `403 { error: 'fixture endpoint disabled' }` before any other logic.
    - Add a smoke assertion that rejects if `Deno.env.get('ENV_ID') === 'production'` even if some misconfiguration let it through.
    - _Requirements: 13.2, 13.7_
    - _Design: §Fixture Endpoint gating, §Review Notes item 3_

  - [x] 2.3 Define Zod schemas for every request body

    - Create `supabase/functions/audit-fixtures/schemas.ts` with `SeedRequestSchema`, `TeardownRequestSchema` (`{ runId: string }`), `ImpersonateRequestSchema` (`{ role: UserRole }`), `BonusXpEventRequestSchema` (`{ multiplier, startsAt, endsAt }`).
    - Parse every body with `.safeParse` and return `400 { error, issues }` on failure per §Req 13.4.
    - _Requirements: 13.4_
    - _Design: §Security and Secret-Boundary Scan layer 4_

  - [x] 2.4 Deploy `audit-fixtures` Edge Function to staging (version-tagged)
    - Deploy once via Supabase MCP `deploy_edge_function` with the staging project id; tag the deploy slug `audit-fixtures-v1`.
    - Record the deployed function name in `audit/baselines/deployed-fixtures.json` so §8 (connectivity matrix) can probe it.
    - Do NOT redeploy on every CI run — `design.md` §Open Question 1 recommendation.
    - _Requirements: 1.7_
    - _Design: §Open Questions item 1_

- [x] 3. Seed accounts, OBE chain, and linked-parent relationships

  - Every role-facing layer of the audit depends on these seed fixtures. Each role gets its own sub-task so none is skipped.
  - _Design: §Seed Accounts, §Seed OBE Chain, §Per-Run Namespace_

  - [x] 3.1 Implement `/seed` route — Admin seed user

    - Upsert `audit+admin@edeviser.test` with role `admin`, institution `audit-inst`.
    - Use `supabase.auth.admin.createUser` with `email_confirm: true`; idempotent upsert on conflict.
    - _Requirements: 1.2, 6.1_
    - _Design: §Seed Accounts row 1_

  - [x] 3.2 Implement `/seed` route — Coordinator seed user

    - Upsert `audit+coordinator@edeviser.test` with role `coordinator`, institution `audit-inst`, linked to program `audit-prog-1`.
    - _Requirements: 1.3, 6.1_
    - _Design: §Seed Accounts row 2_

  - [x] 3.3 Implement `/seed` route — Teacher seed user

    - Upsert `audit+teacher@edeviser.test` with role `teacher`, assigned to course `audit-course-1`.
    - _Requirements: 1.4, 6.1_
    - _Design: §Seed Accounts row 3_

  - [x] 3.4 Implement `/seed` route — Student seed user

    - Upsert `audit+student@edeviser.test` with role `student`, enrolled in course `audit-course-1`.
    - _Requirements: 1.5, 6.1_
    - _Design: §Seed Accounts row 4_

  - [x] 3.5 Implement `/seed` route — Parent (linked, verified)

    - Upsert `audit+parent-linked@edeviser.test` with role `parent`; insert a row in `parent_student_links` linking to `audit-student` with `verified = true`.
    - _Requirements: 1.6, 5.6, 6.1_
    - _Design: §Seed Accounts row 5_

  - [x] 3.6 Implement `/seed` route — Parent (unlinked)

    - Upsert `audit+parent-unlinked@edeviser.test` with role `parent`; insert NO row in `parent_student_links`.
    - _Requirements: 3.2, 5.6_
    - _Design: §Seed Accounts row 6_

  - [x] 3.7 Seed the ILO → PLO → CLO chain with mapping weights summing to 100

    - Insert `audit-ilo-1` (institution-scoped).
    - Insert `audit-plo-1` under `audit-prog-1`; insert `outcome_mappings` row (plo → ilo) with `weight = 100`.
    - Insert `audit-clo-0` (prerequisite) and `audit-clo-1` on `audit-course-1`, each with one Bloom level (`Remembering` and `Applying`); insert mapping rows to `audit-plo-1` with weights summing to 100.
    - _Requirements: 7.1, 7.6_
    - _Design: §Seed OBE Chain_

  - [x] 3.8 Seed the assignment with a prerequisite gate and a rubric

    - Insert `audit-assign-1` linking `audit-clo-1`, declaring `audit-clo-0` as prerequisite with `gate_percentage = 60`.
    - Insert a rubric with a single criterion weighted 100.
    - _Requirements: 7.5_
    - _Design: §Seed OBE Chain last row_

  - [x] 3.9 Implement `/teardown` route with namespaced truncation

    - Accept `{ runId }`; delete rows whose PK or tag column starts with `audit-<runId>-`.
    - Respect the append-only rule: do NOT delete from `evidence`, `audit_logs`, `xp_transactions`. Leaving namespaced rows there is acceptable — their invariants still hold.
    - Delete in FK-safe order (leaves first): grades → submissions → rubric_scores → evidence_indexes → assignments → outcome_mappings → clo → plo → ilo → enrollments → courses → programs.
    - _Requirements: 1.7_
    - _Design: §Teardown Strategy_

  - [x] 3.10 Implement `/impersonate` route for password-blocked environments

    - Accept `{ role }` where role ∈ `UserRole`; return a short-lived signed JWT for the matching seed user via `supabase.auth.admin.generateLink({ type: 'magiclink' })` or equivalent.
    - Gate on `ENV_ID == 'audit-staging'` at the top (redundant with §2.2 but explicit).
    - _Requirements: 6.1, 6.2_
    - _Design: §Authentication Strategy bullet 4, §Assumptions item 4_

  - [x] 3.11 Implement `/event/bonus-xp` route for Req 3.4 cross-role flow
    - Accept `{ multiplier, startsAt, endsAt }`; insert a namespaced row into `bonus_xp_events`.
    - _Requirements: 3.4, 8.2_

- [x] 4. Playwright global setup, storage states, and helper modules

  - Creates the authentication + helper foundation every E2E spec imports. Each role gets its own helper module.
  - _Design: §Per-Role Test Helpers, §Authentication Strategy_

  - [x] 4.1 Implement `tests/e2e/_fixtures/seed.ts` as Playwright `globalSetup`

    - POST to `audit-fixtures/seed` with a per-run `runId` (UUID) and wait for 200.
    - For each role, log in (or call `/impersonate`) and persist `storageState` to `tests/e2e/_fixtures/storage-states/<role>.json`.
    - Add `tests/e2e/_fixtures/storage-states/` to `.gitignore`.
    - _Requirements: 1.7, 6.1, 6.2_

  - [x] 4.2 Implement `tests/e2e/_fixtures/teardown.ts` as Playwright `globalTeardown`

    - POST to `audit-fixtures/teardown` with the same `runId` captured in globalSetup (passed via `process.env.AUDIT_RUN_ID`).
    - _Requirements: 1.7_

  - [x] 4.3 Implement `tests/e2e/_helpers/auth.ts` with `assertRoleClaim(page, expectedRole)`

    - Decode the Supabase auth JWT from the session cookie; assert `jwt.role === expectedRole`.
    - Export a `loadStorageState(role)` helper for specs that need to switch role mid-test.
    - _Requirements: 6.2_
    - _Design: §Authentication Strategy bullet 3_

  - [x] 4.4 Implement `tests/e2e/_helpers/adminHelpers.ts`

    - Export: `createIlo`, `createUser`, `openAuditLog`, `createBonusXpEvent`, `openInstitutionDashboard`.
    - Each helper namespaces created entities with `audit-<runId>-`.
    - _Requirements: 1.2, 3.4, 13.5_
    - _Design: §Per-Role Test Helpers row Admin_

  - [x] 4.5 Implement `tests/e2e/_helpers/coordinatorHelpers.ts`

    - Export: `createPlo`, `mapPloToIlo`, `openCurriculumMatrix`, `openCqiActionPlan`.
    - _Requirements: 1.3, 3.3_
    - _Design: §Per-Role Test Helpers row Coordinator_

  - [x] 4.6 Implement `tests/e2e/_helpers/teacherHelpers.ts`

    - Export: `openCourse`, `createCloWithBloom`, `createAssignment`, `gradeSubmission`, `releaseGrade`.
    - _Requirements: 1.4, 3.1_
    - _Design: §Per-Role Test Helpers row Teacher_

  - [x] 4.7 Implement `tests/e2e/_helpers/studentHelpers.ts`

    - Export: `openLearningPath`, `submitAssignment`, `readXpTotal`, `readStreak`, `openLeaderboard`, `toggleLeaderboardOptOut`.
    - _Requirements: 1.5, 8.1, 8.7_
    - _Design: §Per-Role Test Helpers row Student_

  - [x] 4.8 Implement `tests/e2e/_helpers/parentHelpers.ts`

    - Export: `selectLinkedChild`, `readChildProgress`, `readXpAndAttainmentSummary`, `readNotificationFeed`.
    - _Requirements: 1.6, 5.6_
    - _Design: §Per-Role Test Helpers row Parent_

  - [x] 4.9 Implement `tests/e2e/_helpers/crossRoleHelpers.ts`

    - Export: `waitForGradePropagation`, `waitForXpUpdate`, `waitForPloAvailable`, `waitForBonusXpWindow`.
    - Uses `propagation.ts` polling utility under the hood.
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
    - _Design: §Per-Role Test Helpers row Cross-Role, §Error Handling Timing Bounds_

  - [x] 4.10 Implement `tests/e2e/_helpers/axe.ts` axe-core injection helper

    - Wraps `@axe-core/playwright` with a `scanPage(page, options)` helper that returns violations filtered by severity.
    - Aggregates violations into an in-memory buffer that `tests/e2e/_fixtures/teardown.ts` flushes to `audit/output/a11y-findings.json`.
    - _Requirements: 11.1, 11.2, 11.3_
    - _Design: §Accessibility Baseline, §15 below_

  - [x] 4.11 Implement `tests/e2e/_helpers/propagation.ts` polling utility
    - Export `pollUntil(fn, { intervalMs, timeoutMs })` with exponential-backoff-free uniform polling.
    - Used by cross-role specs for the 60s grade → XP bound and 2s realtime bound.
    - _Requirements: 3.1, 6.3_
    - _Design: §Error Handling Timing Bounds_

- [x] 5. Per-role E2E specs

  - Each role gets its own parent sub-task. Every role-specific critical path, feature spec, and a11y dashboard spec is named explicitly. No role is collapsed into a generic "per-role loop".
  - _Design: §E2E Test Suite Design, §Per-Role Coverage Matrix_

  - [x] 5.1 Admin E2E specs

    - Implements every Admin-facing E2E flow listed in `design.md` §E2E Test Suite Design.
    - _Requirements: 1.2, 2.1, 2.2, 2.3, 2.4, 5.5, 13.5, 14.3_

    - [x] 5.1.1 `tests/e2e/admin/critical-path.spec.ts`

      - Log in → create/edit ILO → create/edit user → institution dashboard → review audit-log entry → logout.
      - Assert `audit_logs` row is written with `performed_by = admin.id` after the user-create step.
      - _Requirements: 1.2, 13.5_
      - _Design: §Per-Role Spec File Coverage Admin_

    - [x] 5.1.2 `tests/e2e/admin/ilo-crud.spec.ts`

      - Full CRUD cycle on ILOs: create, edit, list, view, delete. Assert audit-log entry per mutation.
      - _Requirements: 1.2, 13.5_

    - [x] 5.1.3 `tests/e2e/admin/audit-log.spec.ts`

      - Verifies audit-log viewer pagination, filter by actor, filter by entity type.
      - _Requirements: 13.5_

    - [x] 5.1.4 `tests/e2e/admin/a11y-dashboard.spec.ts`
      - Run axe-core scan on Admin dashboard and ILO form; keyboard navigation traversal; focus-indicator visible check.
      - _Requirements: 11.1, 11.2, 11.3, 11.4_

  - [x] 5.2 Coordinator E2E specs

    - Implements every Coordinator-facing E2E flow.
    - _Requirements: 1.3, 2.1, 2.2, 2.3, 2.4, 3.3_

    - [x] 5.2.1 `tests/e2e/coordinator/critical-path.spec.ts`

      - Log in → create/edit PLO → map PLO to ILO → curriculum matrix → open CQI action plan → logout.
      - _Requirements: 1.3_
      - _Design: §Per-Role Spec File Coverage Coordinator_

    - [x] 5.2.2 `tests/e2e/coordinator/plo-mapping.spec.ts`

      - Create a PLO, open mapping dialog, map to two ILOs with weights summing to 100, assert the mapping is persisted.
      - _Requirements: 7.1_

    - [x] 5.2.3 `tests/e2e/coordinator/curriculum-matrix.spec.ts`

      - Open the PLO × Course matrix; assert seeded PLOs and courses render; assert coverage gap cells are visually flagged.
      - _Requirements: 1.3_

    - [x] 5.2.4 `tests/e2e/coordinator/cqi.spec.ts`

      - Open a CQI action plan, assert detail view renders, advance status `planned → in_progress`.
      - _Requirements: 1.3_

    - [x] 5.2.5 `tests/e2e/coordinator/a11y-dashboard.spec.ts`
      - axe scan on Coordinator dashboard, PLO form, curriculum matrix; keyboard navigation; focus indicators.
      - _Requirements: 11.1, 11.2, 11.3, 11.4_

  - [x] 5.3 Teacher E2E specs

    - Implements every Teacher-facing E2E flow.
    - _Requirements: 1.4, 2.1, 2.2, 2.3, 2.4, 7.6_

    - [x] 5.3.1 `tests/e2e/teacher/critical-path.spec.ts`

      - Log in → open course → create CLO with Bloom → create assignment linking CLO → grade submission → release grade → logout.
      - _Requirements: 1.4_
      - _Design: §Per-Role Spec File Coverage Teacher_

    - [x] 5.3.2 `tests/e2e/teacher/clo-bloom.spec.ts`

      - Create a CLO picking each of the six Bloom levels; assert exactly one Bloom badge renders per CLO (surface check; Property 6 proves the invariant).
      - _Requirements: 7.6_

    - [x] 5.3.3 `tests/e2e/teacher/assignment-create.spec.ts`

      - Create an assignment linking one or more CLOs; assert CLO selector shows only CLOs from the teacher's courses.
      - _Requirements: 1.4_

    - [x] 5.3.4 `tests/e2e/teacher/grade-release.spec.ts`

      - Grade the seed student's submission against the rubric; release the grade; assert an `evidence` row is inserted (immutable surface check).
      - _Requirements: 1.4, 7.2_

    - [x] 5.3.5 `tests/e2e/teacher/a11y-dashboard.spec.ts`
      - axe scan on Teacher dashboard, CLO form, assignment form, grading page; keyboard navigation; focus indicators.
      - _Requirements: 11.1, 11.2, 11.3, 11.4_

  - [x] 5.4 Student E2E specs

    - Implements every Student-facing E2E flow.
    - _Requirements: 1.5, 2.1, 2.2, 2.3, 2.4, 8.1, 8.7_

    - [x] 5.4.1 `tests/e2e/student/critical-path.spec.ts`

      - Log in → learning path → submit assignment → view XP → view streak → view leaderboard → logout.
      - _Requirements: 1.5_
      - _Design: §Per-Role Spec File Coverage Student_

    - [x] 5.4.2 `tests/e2e/student/learning-path.spec.ts`

      - Assert assignments are ordered by Bloom (Remembering → Creating); assert a prerequisite-gated assignment is locked when prereq attainment is below gate.
      - _Requirements: 1.5, 7.5_

    - [x] 5.4.3 `tests/e2e/student/submit-assignment.spec.ts`

      - Submit `audit-assign-1`; assert submission succeeds only when `audit-clo-0` attainment ≥ 60%; assert submission blocked otherwise.
      - _Requirements: 7.5_

    - [x] 5.4.4 `tests/e2e/student/xp-and-streak.spec.ts`

      - Open XP page; assert `xp_total` equals sum of visible `xp_transactions` (surface check; Property 7 proves the invariant).
      - Open streak page; assert streak counter matches seed state.
      - _Requirements: 8.1, 8.4_

    - [x] 5.4.5 `tests/e2e/student/leaderboard-opt-out.spec.ts`

      - Assert student's own position is visible when opted in; toggle opt-out; reload; open leaderboard from a peer student context; assert self-row is anonymized for the peer.
      - _Requirements: 8.7_

    - [x] 5.4.6 `tests/e2e/student/a11y-dashboard.spec.ts`
      - axe scan on Student dashboard, learning path, submit page, leaderboard; keyboard navigation; focus indicators; 44×44 touch target check on mobile viewport.
      - _Requirements: 9.4, 11.1, 11.2, 11.3, 11.4_

  - [x] 5.5 Parent E2E specs

    - Implements every Parent-facing E2E flow. Both linked and unlinked parent flows are explicit.
    - _Requirements: 1.6, 2.1, 2.2, 2.3, 2.4, 3.2, 5.6_

    - [x] 5.5.1 `tests/e2e/parent/critical-path.spec.ts`

      - Log in as linked parent → view linked child progress → view XP + attainment summary → view notification feed → logout.
      - _Requirements: 1.6_
      - _Design: §Per-Role Spec File Coverage Parent_

    - [x] 5.5.2 `tests/e2e/parent/linked-child.spec.ts`

      - Linked parent opens child's detail page; assert attainment, XP, and recent activity render.
      - _Requirements: 1.6, 5.6_

    - [x] 5.5.3 `tests/e2e/parent/unlinked-denied.spec.ts`

      - Log in as unlinked parent; navigate directly to the seed child's URL; assert 403 / access denied UI; assert no child data is returned via network tab inspection.
      - _Requirements: 3.2, 5.6_

    - [x] 5.5.4 `tests/e2e/parent/a11y-dashboard.spec.ts`
      - axe scan on Parent dashboard and child progress page; keyboard navigation; focus indicators; mobile Safari (WebKit) viewport.
      - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [x] 6. Cross-role E2E propagation specs

  - Four named sub-tasks, one per cross-role flow in `design.md` §Cross-Role Specs.
  - _Requirements: 3.1, 3.2, 3.3, 3.4_
  - _Design: §Cross-Role Specs_

  - [x] 6.1 `tests/e2e/cross-role/teacher-to-student.spec.ts`

    - Teacher context releases a grade → Student context polls XP page every 5s up to 60s → assert `xp_total` increased by the base-schedule amount and CLO attainment rose.
    - _Requirements: 3.1_

  - [x] 6.2 `tests/e2e/cross-role/student-to-parent.spec.ts`

    - Student submits assignment → linked-parent context sees progress update within 60s → unlinked-parent context asserts child endpoint returns 403.
    - _Requirements: 3.2, 5.6_

  - [x] 6.3 `tests/e2e/cross-role/coordinator-to-teacher.spec.ts`

    - Coordinator creates a PLO → Teacher context refetches CLO mapping target list → assert the new PLO is selectable within the same session.
    - _Requirements: 3.3_

  - [x] 6.4 `tests/e2e/cross-role/admin-bonus-xp.spec.ts`
    - Admin creates a Bonus XP Event with `multiplier = 2` covering the next 5 minutes → Student submits an assignment during the window → assert `xp_transactions.amount === base × 2`.
    - _Requirements: 3.4, 8.2_

- [x] 7. Property suite (fast-check)

  - Fifteen properties, each its own sub-task with `Feature: pre-deployment-e2e-audit, Property N` reference. Generators first, then OBE, Gamification, System.
  - _Design: §Correctness Properties, §Property Suite Design, §Property-to-Generator-to-Invariant Map_

  - [x] 7.1 Generators module `src/__tests__/properties/_generators/`

    - Create `outcomes.ts`, `xpEvents.ts`, `loginTimeline.ts`, `habits.ts`, `findings.ts`, `cronInputs.ts`.
    - Each exports arbitraries used by multiple property files to guarantee consistent definitions of "valid outcome tree", "valid XP event", etc.
    - Unit-test each generator for non-emptiness and type safety.
    - _Requirements: 7.7_
    - _Design: §Property Suite Design File Layout_

  - [x] 7.2 Property 1: Outcome-mapping weights sum to 100

    - File: `src/__tests__/properties/obe/outcome-mapping-weights.property.test.ts`
    - `Feature: pre-deployment-e2e-audit, Property 1: Outcome-mapping weights sum to 100`
    - Min iterations: 100. Generator: `arbitraryOutcomeTree`.
    - _Requirements: 7.1, 7.7_
    - _Design: §Property 1_

  - [x] 7.3 Property 2: Evidence records are immutable

    - File: `src/__tests__/properties/obe/evidence-immutability.property.test.ts`
    - `Feature: pre-deployment-e2e-audit, Property 2: Evidence records are immutable`
    - Min iterations: 200 (security-sensitive). Generator: `arbitraryEvidenceOpSequence`.
    - _Requirements: 7.2, 7.7_
    - _Design: §Property 2_

  - [x] 7.4 Property 3: Attainment cascade consistency

    - File: `src/__tests__/properties/obe/attainment-cascade.property.test.ts`
    - `Feature: pre-deployment-e2e-audit, Property 3: Attainment cascade consistency`
    - Min iterations: 100. Oracle: reference weighted-average implementation.
    - _Requirements: 7.3, 7.7_
    - _Design: §Property 3_

  - [x] 7.5 Property 4: Attainment classifier is total and deterministic

    - File: `src/__tests__/properties/obe/attainment-classifier.property.test.ts`
    - `Feature: pre-deployment-e2e-audit, Property 4: Attainment classifier is total and deterministic`
    - Min iterations: 100. Generator: `fc.double({ min: 0, max: 100, noNaN: true })`.
    - _Requirements: 7.4, 7.7_
    - _Design: §Property 4_

  - [x] 7.6 Property 5: Prerequisite gate enforcement

    - File: `src/__tests__/properties/obe/prerequisite-gate.property.test.ts`
    - `Feature: pre-deployment-e2e-audit, Property 5: Prerequisite gate enforcement`
    - Min iterations: 100.
    - _Requirements: 7.5, 7.7_
    - _Design: §Property 5_

  - [x] 7.7 Property 6: Single Bloom level per CLO

    - File: `src/__tests__/properties/obe/single-bloom-per-clo.property.test.ts`
    - `Feature: pre-deployment-e2e-audit, Property 6: Single Bloom level per CLO`
    - Min iterations: 100.
    - _Requirements: 7.6, 7.7_
    - _Design: §Property 6_

  - [x] 7.8 Property 7: XP ledger sum identity

    - File: `src/__tests__/properties/gamification/xp-sum-identity.property.test.ts`
    - `Feature: pre-deployment-e2e-audit, Property 7: XP ledger sum identity`
    - Min iterations: 100.
    - _Requirements: 8.1_
    - _Design: §Property 7_

  - [x] 7.9 Property 8: Bonus XP multiplier application

    - File: `src/__tests__/properties/gamification/bonus-xp-multiplier.property.test.ts`
    - `Feature: pre-deployment-e2e-audit, Property 8: Bonus XP multiplier application`
    - Min iterations: 100.
    - _Requirements: 8.2_
    - _Design: §Property 8_

  - [x] 7.10 Property 9: Level formula consistency

    - File: `src/__tests__/properties/gamification/level-formula.property.test.ts`
    - `Feature: pre-deployment-e2e-audit, Property 9: Level formula consistency`
    - Min iterations: 100. Domain: `fc.integer({ min: 0, max: 10_000_000 })`.
    - _Requirements: 8.3_
    - _Design: §Property 9_

  - [x] 7.11 Property 10: Streak state machine correctness

    - File: `src/__tests__/properties/gamification/streak-state-machine.property.test.ts`
    - `Feature: pre-deployment-e2e-audit, Property 10: Streak state machine correctness`
    - Min iterations: 100. Generator: `arbitraryLoginTimeline` with freeze applications.
    - _Requirements: 8.4_
    - _Design: §Property 10_

  - [x] 7.12 Property 11: Badge awards are idempotent

    - File: `src/__tests__/properties/gamification/badge-idempotency.property.test.ts`
    - `Feature: pre-deployment-e2e-audit, Property 11: Badge awards are idempotent`
    - Min iterations: 100.
    - _Requirements: 8.5_
    - _Design: §Property 11_

  - [x] 7.13 Property 12: Perfect Day gating

    - File: `src/__tests__/properties/gamification/perfect-day-gating.property.test.ts`
    - `Feature: pre-deployment-e2e-audit, Property 12: Perfect Day gating`
    - Min iterations: 100. Generator: `arbitraryHabitTimeline` with IANA timezones.
    - _Requirements: 8.6_
    - _Design: §Property 12_

  - [x] 7.14 Property 13: Leaderboard opt-out privacy

    - File: `src/__tests__/properties/gamification/leaderboard-opt-out.property.test.ts`
    - `Feature: pre-deployment-e2e-audit, Property 13: Leaderboard opt-out privacy`
    - Min iterations: 200 (security-sensitive). Covers all four leaderboard rendering shapes.
    - _Requirements: 8.7_
    - _Design: §Property 13_

  - [x] 7.15 Property 14: Cron idempotency

    - File: `src/__tests__/properties/system/cron-idempotency.property.test.ts`
    - `Feature: pre-deployment-e2e-audit, Property 14: Cron idempotency`
    - Min iterations: 100. Generator: `arbitraryCronInput` per endpoint schema.
    - Note: extract the pure-reducer slice of each cron handler into a testable function — do NOT hit the network from this property test.
    - _Requirements: 15.3_
    - _Design: §Property 14_

  - [x] 7.16 Property 15: Severity-to-verdict function
    - File: `src/__tests__/properties/system/severity-to-verdict.property.test.ts`
    - `Feature: pre-deployment-e2e-audit, Property 15: Severity-to-verdict function`
    - Min iterations: 100. Generator: `arbitraryFindingVector` with optional waivers.
    - Test matches the Go_No_Go_Matrix in `requirements.md` §Definition of Done verbatim.
    - _Requirements: 16.3, 16.4, 16.5, 16.6_
    - _Design: §Property 15_

- [x] 8. Connectivity matrix generator

  - AST-driven enumeration of every hook + mutation + subscription, cross-referenced against the deployed schema and the query-key invalidation graph.
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_
  - _Design: §Connectivity Matrix Generator_

  - [x] 8.1 AST extractor for `.from`, `.rpc`, `supabase.functions.invoke`, realtime channels

    - Use `ts-morph` to walk `src/hooks/**/*.ts` `CallExpression` nodes.
    - Record table names, RPC names, edge-function invoke names, and realtime channel `on({ table, filter })` tuples.
    - _Requirements: 4.1, 12.4_

  - [x] 8.2 QueryKeys invalidation cross-reference

    - For each `useMutation`, walk its `onSuccess` body for `queryClient.invalidateQueries({ queryKey: queryKeys.X.Y })` calls.
    - Join against `src/lib/queryKeys.ts` to confirm each referenced path exists; flag unknown keys.
    - Flag mutations whose `onSuccess` invalidates zero keys.
    - _Requirements: 4.3_

  - [x] 8.3 Deployed-schema probe (tables + Edge Functions)

    - Query `information_schema.tables` via Supabase MCP `execute_sql`.
    - List deployed Edge Functions via Supabase MCP `list_edge_functions`.
    - Flag any AST-extracted target missing from the deployed surface.
    - _Requirements: 4.2, 4.5, 4.7_

  - [x] 8.4 Per-role authenticated CORS + auth probe

    - For each hook, derive permitted roles from file path (`src/hooks/admin*.ts` → admin, etc.) or from `@audit-role` JSDoc.
    - Use the pre-seeded Role storageState to issue one probe per permitted role.
    - On `OPTIONS` to each Edge Function: assert expected CORS headers.
    - _Requirements: 4.2, 4.3, 4.5, 6.2_

  - [x] 8.5 Migration-keyed probe cache at `audit/output/.cache/connectivity-probe-cache.json`

    - Key cache entries by `migrationHead`. Invalidate all entries when migration head changes.
    - Keeps incremental runs under 30s per `design.md` §Parallelism.
    - _Requirements: 4.2_
    - _Design: §Connectivity Matrix Implementation Details item 6_

  - [x] 8.6 JSON + Markdown output emitters

    - `audit/output/connectivity-matrix.json` per the `design.md` schema.
    - `audit/output/connectivity-matrix.md` as a per-hook table: File, Hook, Target, Role(s), CORS, Auth, QueryKey, Invalidates.
    - _Requirements: 4.1, 16.1_

  - [x] 8.7 Cron endpoint connectivity probe (Req 4.6)
    - Enumerate `api/cron/*.ts` dynamically; invoke each with `CRON_SECRET` header; assert JSON success response shape.
    - Note: full health + idempotency is §12; this sub-task only covers "endpoint is reachable and returns success".
    - _Requirements: 4.6_

- [x] 9. RLS matrix runner

  - Per-(table, role, op) positive and negative probes across all five roles, plus append-only denial checks and parent linkage probes.
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_
  - _Design: §RLS Matrix Runner_

  - [x] 9.1 Table enumeration and exclude list

    - Enumerate all tables from `information_schema.tables` via Supabase MCP `execute_sql`.
    - Honor `audit/baselines/rls-exclude.json` (internal-only tables like `schema_migrations`).
    - _Requirements: 5.1_

  - [x] 9.2 Expectations file loader + first-run seeder

    - Load `audit/baselines/rls-expectations.json`. On first run, seed it from `CREATE POLICY` statements in `supabase/migrations/`.
    - After first run, diff expectations against actual — do NOT auto-sync; surface the diff as a finding.
    - _Requirements: 5.2, 5.3, 5.4_

  - [x] 9.3 Per-(table, role, op) probe runner — Admin row

    - Issue SELECT/INSERT/UPDATE/DELETE probes using the Admin JWT for every enumerated table.
    - _Requirements: 5.2, 5.3, 5.4_

  - [x] 9.4 Per-(table, role, op) probe runner — Coordinator row

    - Same as 9.3 for Coordinator JWT.
    - _Requirements: 5.2, 5.3, 5.4_

  - [x] 9.5 Per-(table, role, op) probe runner — Teacher row

    - Same for Teacher JWT.
    - _Requirements: 5.2, 5.3, 5.4_

  - [x] 9.6 Per-(table, role, op) probe runner — Student row

    - Same for Student JWT, including the self-scoped positive probes and peer-data negative probes.
    - _Requirements: 5.2, 5.3, 5.4_

  - [x] 9.7 Per-(table, role, op) probe runner — Parent row (both linked and unlinked)

    - Issue probes using both `audit+parent-linked` and `audit+parent-unlinked` JWTs.
    - Linked parent: positive SELECT on student-owned tables must return rows.
    - Unlinked parent: negative SELECT on the same tables must return zero rows.
    - _Requirements: 5.2, 5.3, 5.6_

  - [x] 9.8 Append-only denial probes on `evidence`, `audit_logs`, `xp_transactions`

    - For each of the three tables and each of the five roles (including Admin), assert UPDATE and DELETE return Postgres error `42501`.
    - _Requirements: 5.5, 7.2_

  - [x] 9.9 JSON + Markdown output pivoted by role
    - `audit/output/rls-matrix.json` per the `design.md` schema.
    - `audit/output/rls-matrix.md` as a `role × table` grid with `✅ / ❌ / ➖` cells and per-role pass/fail summary.
    - _Requirements: 5.7, 16.1_

- [x] 10. Design token checker

  - AST-driven static scan enforcing the design-system prohibitions from `.kiro/steering/design-system.md`.
  - _Requirements: 9.1, 9.2, 9.3, 9.7, 9.8_
  - _Design: §Design Token Checker_

  - [x] 10.1 AST visitor — forbidden color families on cards/tabs

    - Regex on `className`: `/\b(bg|from|via|to)-(pink|purple|violet|rose|fuchsia)-\d+/`.
    - Apply only when element classified as Card or Tab (see 10.5 classifier).
    - _Requirements: 9.1_

  - [x] 10.2 AST visitor — glassmorphism on data cards

    - Regex on `className`: `/backdrop-blur/` OR `/bg-(white|black)\/\d+/`.
    - Apply only when element classified as data Card.
    - _Requirements: 9.2_

  - [x] 10.3 AST visitor — max one gradient CTA button per `<section>`

    - Count elements whose `className` contains `/bg-gradient/` AND component is `Button`. Flag if count > 1 within a single `<section>`.
    - _Requirements: 9.3_

  - [x] 10.4 AST visitor — physical margin/padding scan

    - Regex: `/\b(ml|mr|pl|pr|left|right)-\d+/` without an accompanying `ms|me|ps|pe|start|end` counterpart.
    - Honor an allowlist at `audit/baselines/i18n-allowlist.json` for documented exceptions.
    - _Requirements: 10.3_

  - [x] 10.5 AST visitor — no full-page skeleton

    - Flag `<Skeleton className="h-screen">` or equivalent full-viewport shapes.
    - _Requirements: 9.8_

  - [x] 10.6 AST visitor — every `<Route element={...}>` wrapped by `ErrorBoundary`

    - Walk `src/router/**/*.tsx`; for each `<Route>`, assert its element tree is wrapped by `<ErrorBoundary>` or a `<RouteGuard>` that itself wraps `<ErrorBoundary>`.
    - _Requirements: 9.7, 14.3_

  - [x] 10.7 Card/Tab classifier
    - Two-heuristic classifier per `design.md` §"Card" vs "Tab" Classification: Shadcn import check + CVA variant name check.
    - Emit JSON + Markdown findings at `audit/output/design-token-findings.{json,md}`.
    - _Requirements: 9.1, 9.2_

- [x] 11. i18n / RTL checker

  - Key-parity diff, untranslated-literal scan, per-role RTL screenshot baseline, locale-aware formatter tests.
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_
  - _Design: §i18n and RTL Checker_

  - [x] 11.1 Key-parity diff `en ↔ ar`

    - Flatten `src/locales/en/**/*.json` and `src/locales/ar/**/*.json` into dotted-path sets. Compute `en - ar` and `ar - en`; any non-empty diff is a finding.
    - _Requirements: 10.1_

  - [x] 11.2 Untranslated JSX literal AST scan with allowlist

    - Walk JSX text nodes and non-ARIA prop string literals. Ignore `<Trans>` children and `t('...')` arguments.
    - Honor `audit/baselines/i18n-allowlist.json` (brand names, email placeholders).
    - _Requirements: 10.2_

  - [x] 11.3 RTL Playwright spec per role — Admin

    - `tests/e2e/rtl/layout.spec.ts` — Admin dashboard under `ar` locale with `dir="rtl"`. Capture full-page screenshot, pixel-diff vs `audit/baselines/rtl-screens/admin.png` at 0.3% tolerance.
    - _Requirements: 10.4_

  - [x] 11.4 RTL Playwright spec per role — Coordinator

    - Coordinator curriculum matrix under `ar` / `rtl`. Pixel-diff vs `audit/baselines/rtl-screens/coordinator.png`.
    - _Requirements: 10.4_

  - [x] 11.5 RTL Playwright spec per role — Teacher

    - Teacher grading page under `ar` / `rtl`. Pixel-diff vs `audit/baselines/rtl-screens/teacher.png`.
    - _Requirements: 10.4_

  - [x] 11.6 RTL Playwright spec per role — Student

    - Student learning path under `ar` / `rtl`. Pixel-diff vs `audit/baselines/rtl-screens/student.png`.
    - _Requirements: 10.4_

  - [x] 11.7 RTL Playwright spec per role — Parent

    - Parent child-progress page under `ar` / `rtl`. Pixel-diff vs `audit/baselines/rtl-screens/parent.png`.
    - _Requirements: 10.4_

  - [x] 11.8 Locale-aware number and date formatter tests
    - Unit test that `Intl.NumberFormat('ar-QA').format(1234.5)` produces Arabic-Indic digits and `en-US` produces Western-Arabic digits; same for `DateTimeFormat`.
    - _Requirements: 10.5_

- [x] 12. Cron health probe

  - Dynamic endpoint enumeration, first + second invocation, log-row assertion, idempotency delta check. One baseline per endpoint.
  - _Requirements: 15.1, 15.2, 15.3, 15.4_
  - _Design: §Cron Health Probe_

  - [x] 12.1 Dynamic cron endpoint enumeration from `api/cron/*.ts`

    - Do NOT hardcode the endpoint list. Use `globby` or equivalent to enumerate; fail if zero endpoints found.
    - Record `CRON_SECRET` from env; refuse to start without it.
    - _Requirements: 15.1_

  - [x] 12.2 First-invocation + log-row assertion

    - For each endpoint: POST with CRON_SECRET, assert 200 + `{ ok: true }` (or equivalent success shape), SELECT the latest row from `cron_runs` and assert it references the endpoint with `start_time`, `end_time`, and `outcome = 'success'`.
    - _Requirements: 15.1, 15.2_

  - [x] 12.3 Second-invocation + idempotency delta assertion

    - Invoke the same endpoint again with identical input. Measure row delta in every table it writes to.
    - Assert delta ≤ expected value from `audit/baselines/cron-idempotency.json`.
    - _Requirements: 15.3_

  - [x] 12.4 Per-endpoint baseline at `audit/baselines/cron-idempotency.json`
    - Structure: `{ "<endpoint>": { "targetTables": [...], "expectedDelta": { "<table>": N } } }`.
    - First run seeds the baseline; subsequent runs enforce it.
    - Emit findings to `audit/output/cron-health.json` per the `design.md` schema.
    - _Requirements: 15.3, 15.4_

- [x] 13. Security and secret-boundary scan

  - Built-bundle pattern scan, VITE\_ env allowlist, zodResolver presence, Edge Function body validation, admin mutation audit-log coverage.
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7_
  - _Design: §Security and Secret-Boundary Scan_

  - [x] 13.1 Built-bundle secret pattern scan

    - After `npm run build`, walk `dist/` and apply the pattern set: `sb_secret_[A-Za-z0-9_-]{20,}`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `re_[A-Za-z0-9]{20,}`, decoded JWTs with `role: service_role`, plus `audit/baselines/secret-patterns.json`.
    - Any hit is a Blocker finding.
    - _Requirements: 13.1, 13.7_

  - [x] 13.2 VITE\_ env allowlist enforcement

    - AST-scan `src/**/*.{ts,tsx}` for `process.env.VITE_*` and `import.meta.env.VITE_*` references.
    - Assert every referenced name is in `audit/baselines/vite-env.allowlist.json`.
    - _Requirements: 13.2_

  - [x] 13.3 `zodResolver` presence scan on every `useForm`

    - AST-scan `src/pages/**/*.tsx` for `useForm(` call sites; assert the options object contains `resolver: zodResolver(...)`.
    - _Requirements: 13.3_

  - [x] 13.4 Edge Function body validation scan (conditional on `supabase/functions/` presence)

    - If `supabase/functions/` exists: AST-scan every `.ts` file; confirm `req.json()` or `req.text()` flows into a `<schema>.safeParse` / `.parse` before any side-effect call.
    - If the directory does not exist: emit a single severity-Trivial informational finding per `design.md` §Assumptions item 2 and skip.
    - _Requirements: 13.4_

  - [x] 13.5 Admin mutation audit-log coverage scan

    - AST-scan `src/hooks/admin*.ts`; for each exported `useMutation` hook, assert `mutationFn` body contains `auditLogger.log(...)` or an equivalent wrapper.
    - _Requirements: 13.5_

  - [x] 13.6 Token-expired silent-refresh E2E probe
    - Playwright spec: force JWT expiry via cookie mutation; make a request; assert the client performs one silent refresh; on simulated failure assert redirect to `/login`.
    - _Requirements: 13.6_

- [x] 14. Performance budget

  - Bundle size measurement, per-role TTI spec, pagination AST scan, realtime filter AST scan, N+1 detection.
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6_
  - _Design: §Performance Regression Guards_

  - [x] 14.1 Bundle size measurement + baseline

    - Measure total gzipped bundle from `npm run build` output; compare to `audit/baselines/bundle.json`; fail if > 110%.
    - _Requirements: 12.1_

  - [x] 14.2 Per-role cold-start TTI Playwright spec at `tests/e2e/perf/tti.spec.ts`

    - One sub-test per role dashboard (admin, coordinator, teacher, student, parent). Clear `localStorage`, `sessionStorage`, service-worker cache before each.
    - Record five samples per role; median wins. Compare to `audit/baselines/tti.json`; fail if any median > 120%.
    - _Requirements: 12.2_

  - [x] 14.3 List-page pagination/virtualization AST scan

    - Walk `src/pages/**/*.tsx`; for every page component whose primary hook is a list hook, assert presence of `.limit(...)` in the query or `useVirtualizer` in the render.
    - _Requirements: 12.3_

  - [x] 14.4 Realtime subscription filter AST scan

    - Walk `src/hooks/**/*.ts`; for every `supabase.channel(...).on(...)` call, assert the event config object contains a `filter:` key.
    - _Requirements: 12.4_

  - [x] 14.5 N+1 detection from Supabase query log
    - During the per-role critical-path run, route all Supabase REST calls through a normalizer that strips row-identifier query params and counts templates per page transition.
    - Flag any template with > 10 hits in a single transition; honor per-template overrides in `audit/baselines/n-plus-one-threshold.json`.
    - _Requirements: 12.5_

- [x] 15. Accessibility shared infrastructure

  - Per-role a11y dashboard specs are owned by §5 (`5.1.4`, `5.2.5`, `5.3.5`, `5.4.6`, `5.5.4`). This section is for shared infrastructure only.
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_
  - _Design: §Accessibility Baseline_

  - [x] 15.1 Wire `tests/e2e/_helpers/axe.ts` aggregation into `audit/output/a11y-findings.json`

    - Each per-role a11y spec (§5.x.4/5/6) writes into a run-scoped buffer; globalTeardown flushes the buffer to JSON.
    - _Requirements: 11.1_

  - [x] 15.2 Icon-only button aria-label AST scan

    - Walk `src/components/**` and `src/pages/**`; for every `<Button>` or `<a>` whose children consist solely of a Lucide icon component, assert `aria-label`, `aria-labelledby`, or a visually-hidden text child is present.
    - _Requirements: 11.2_

  - [x] 15.3 Color contrast check on Bloom, outcome, and attainment badges
    - Parameterized test that computes WCAG contrast ratio for every color pair listed in `.kiro/steering/design-system.md` Domain Color Coding.
    - Assert ≥ 4.5:1 for normal text, ≥ 3:1 for large text (Bloom badges are uppercase `text-xs font-bold` → treat as normal).
    - _Requirements: 11.4_

- [x] 16. Report aggregator and verdict emitter

  - Single pure function `severityToVerdict` (Property 15) + a Markdown report generator.
  - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7, 16.8_
  - _Design: §Audit Report and Go/No-Go Aggregator_

  - [x] 16.1 Finding ingestion from every `audit/output/*.json`

    - Load every JSON artifact produced by §8–§15. Normalize each finding into `{ severity, requirementId, message, reproductionSteps, artifact }`.
    - Fail the aggregator if any finding lacks a severity — prevents silent "unknown" bucket leaks.
    - _Requirements: 16.1, 16.2_

  - [x] 16.2 `severityToVerdict` pure function

    - File: `scripts/audit/verdict.ts`. Exported function matches the Go_No_Go_Matrix in `requirements.md` §Definition of Done verbatim.
    - Signature per `design.md` §Verdict Function: `(counts, waivers, thresholds) => 'Go' | 'Go-with-backlog' | 'No-Go'`.
    - MUST pass Property 15 (§7.16).
    - _Requirements: 16.3, 16.4, 16.5, 16.6_

  - [x] 16.3 Markdown report generator with all required sections

    - Produce `audit/output/audit-report.md` with every section listed in Req 16.1: executive summary, per-requirement pass/fail table, findings grouped by severity, connectivity matrix summary, RLS matrix summary, cron health summary, performance summary, Go/No-Go Matrix.
    - _Requirements: 16.1_

  - [x] 16.4 `verdict.json` emitter with commit SHA, migration head, timestamp, env id

    - Produce `audit/output/verdict.json` matching the schema in `design.md` §Data Models.
    - Fail the run if any of the four reproducibility stamps cannot be resolved — do NOT emit a partial stamp.
    - _Requirements: 16.7, 16.8_

  - [x] 16.5 PR-comment template
    - `scripts/audit/pr-comment.ts` reads `verdict.json` and produces the Markdown body: verdict line, severity counts, top-3 findings, link to full report.
    - _Requirements: 17.5_

- [x] 17. Checkpoint — ensure every stage runs and every artifact is produced

  - Ensure all tests pass, ask the user if questions arise.

- [x] 18. CI pipeline integration

  - GitHub Actions workflow wiring the audit into PR + pre-deploy modes.
  - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 17.6_
  - _Design: §CI Pipeline Integration_

  - [x] 18.1 `.github/workflows/pre-deploy-audit.yml` with stage ordering

    - Implement the stage DAG from `design.md` §Stage Ordering and Policy.
    - Fail-fast on lint, tsc, unit+property, build, security-scan.
    - Continue-on-error on contract, static, E2E stages so the report surfaces a full picture.
    - Always run the report aggregator; treat missing artifacts as Critical findings.
    - _Requirements: 17.1, 17.2, 17.3_

  - [x] 18.2 PR mode vs pre-deploy mode entrypoints

    - PR mode (`on: pull_request`): static + contract + property layers; skip E2E to stay under 10 min.
    - Pre-deploy mode (`on: workflow_dispatch` and `on: push: tags: v*`): full pipeline.
    - Expose both via `npm run audit` with `--pr` flag per §1.4.
    - _Requirements: 17.1_

  - [x] 18.3 PR-comment bot job (idempotent edit)

    - Use `actions/github-script` to post/edit a comment on the PR. On re-runs, edit the existing comment rather than append.
    - _Requirements: 17.5_

  - [x] 18.4 Playwright browser cache + node_modules cache

    - `actions/cache` on `~/.cache/ms-playwright` keyed by Playwright version; on `node_modules` keyed by `package-lock.json` hash.
    - _Requirements: 17.1_

  - [x] 18.5 `SUPABASE_ACCESS_TOKEN` secret wiring and fail-fast auth check

    - Audit runner refuses to start if `SUPABASE_ACCESS_TOKEN` is unset. Connectivity matrix + RLS matrix depend on it.
    - Add a `Preflight` step that verifies `npx supabase projects list` succeeds before any stage runs.
    - _Requirements: 17.1_
    - _Design: §Assumptions item 5_

  - [x] 18.6 Coverage threshold enforcement on `src/lib/`
    - Fail CI if vitest coverage on `src/lib/` falls below the threshold baselined on first run (initial target 80% line coverage).
    - _Requirements: 17.4_

- [x] 19. Baselines establishment (first-run bootstrap)

  - First-audit-run bootstrap: populate every baseline file with current values and lock by commit. No baseline file is populated outside this task.
  - _Requirements: 12.1, 12.2, 15.3, 16.7_
  - _Design: §Assumptions item 3_

  - [x] 19.1 First-run baseline creation — bundle + TTI + RLS + cron idempotency + RTL screens + secret patterns + n+1 thresholds

    - Run the full pipeline against staging once. For each empty baseline file (detected via `createdAt === null`), write the current run's values and set `createdAt + lockedByCommit`.
    - RTL screens: capture all five role screenshots into `audit/baselines/rtl-screens/`.
    - _Requirements: 12.1, 12.2, 15.3_

  - [x] 19.2 Lock-by-commit metadata in every baseline file

    - Every baseline JSON carries `{ "createdAt": ISO-8601, "lockedByCommit": sha }`.
    - Subsequent runs enforce the baseline; updates require a deliberate PR that bumps `createdAt` and `lockedByCommit`.
    - _Requirements: 16.7_

  - [x] 19.3 Historical `audit_runs` / `audit_findings` tables for trend analysis
    - Per `design.md` §Open Question 2: tables enabling historical analysis of audit runs over time. Scoped to an `audit-` prefix so they can't collide with runtime tables.
    - If built: apply via Supabase MCP `apply_migration` (never hand-edit `supabase/migrations/`). Regenerate `src/types/database.ts` via `pwsh scripts/regen-types.ps1` (never by hand or shell redirection).
    - _Requirements: 16.1_

- [x] 20. Documentation and waiver process

  - Documentation enabling release stakeholders to use the audit independently. Now mandatory so CI + release engineers can triage findings without tribal knowledge.
  - _Requirements: 16.4_
  - _Design: §Open Questions item 3_

  - [x] 20.1 Waiver file format at `audit/waivers.yml`

    - YAML schema: `{ id, severity: Critical, findingId, signers: { releaseEngineer, qaLead, techLead }, expiresAt, rationale }`.
    - Audit runner reads the file and enforces the three-signer rule before relaxing a Critical to Go-with-backlog.
    - _Requirements: 16.4_

  - [x] 20.2 Documentation at `docs/operations/pre-deployment-audit-howto.md`

    - How to read the audit report, how to triage findings by severity, how to submit a waiver.

  - [x] 20.3 Runbook for CI failure modes
    - Document what each stage's common failure modes look like and how to diagnose. Cross-link to `design.md` §"Most Likely Breakage Points" sections.

- [x] 21. Nova Act human-perspective UX audit

  - AI-driven browser automation that exercises each role's primary journey in natural language and flags UX friction Playwright cannot see. Runs after the Playwright E2E layer in the pipeline so Nova Act operates against an app already proven functional.
  - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 18.7, 18.8, 18.9, 18.10_
  - _Design: §Nova Act Human-Perspective UX Audit_

  - [x] 21.1 Install Nova Act Python SDK and add orchestrator entry point

    - Create `scripts/audit/nova-act/requirements.txt` with a pinned `nova-act[cli]` version (look up the latest stable on PyPI at task execution time and pin exactly).
    - Document the install step (`pip install -r scripts/audit/nova-act/requirements.txt`) in `audit/README.md` under a new "Nova Act setup" section.
    - Add an `"audit:nova-act"` npm script that shells out to `tsx scripts/audit/nova-act/run.ts` so the stage can be invoked standalone.
    - Create placeholder `scripts/audit/nova-act/run.ts` that parses `--role`, `--headed`, `--env`, probes for `NOVA_ACT_API_KEY` then falls back to AWS credentials, and exits 0 with a skipped-stage manifest entry if neither is found (Req 18.9).
    - _Requirements: 18.8, 18.9_

  - [x] 21.2 Authentication probe and env wiring in `scripts/audit/nova-act/run.ts`

    - Read `NOVA_ACT_API_KEY` first; fall back to AWS credentials via `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` (or AWS profile) per the Nova Act authentication steering.
    - Read `NOVA_ACT_BASE_URL` (defaults to `http://localhost:5173`) and refuse to start if the URL cannot be reached within 10s.
    - For each role, call `audit-fixtures/impersonate?role=<role>` to retrieve a fresh seed credential and inject it into the subprocess env as `NOVA_ACT_<ROLE>_PW`.
    - Refuse `--headed --env=ci`; fail fast with an explanatory error (headed browsers do not attach in CI).
    - _Requirements: 18.8, 18.9_
    - _Design: §Authentication, §Failure modes_

  - [x] 21.3 Scripted journey — Admin (`scripts/audit/nova-act/journeys/admin.py`)

    - Implements the scripted prompt from `design.md` §Per-Role Journey Catalog row Admin.
    - Uses `NovaAct` context manager with `record_video=True` and `logs_directory=<OUTPUT>/admin`.
    - Final assertions: ILO created, teacher user created, audit log entry visible.
    - _Requirements: 18.1, 18.2, 18.3_

  - [x] 21.4 Scripted journey — Coordinator (`scripts/audit/nova-act/journeys/coordinator.py`)

    - Implements the scripted prompt from `design.md` §Per-Role Journey Catalog row Coordinator.
    - Final assertions: PLO created, PLO→ILO mapping with weight 100 exists, PLO visible in curriculum matrix.
    - _Requirements: 18.1, 18.2, 18.3_

  - [x] 21.5 Scripted journey — Teacher (`scripts/audit/nova-act/journeys/teacher.py`)

    - Implements the scripted prompt from `design.md` §Per-Role Journey Catalog row Teacher.
    - Final assertions: CLO created at Applying Bloom level, assignment created using that CLO, seed student submission graded and released.
    - _Requirements: 18.1, 18.2, 18.3_

  - [x] 21.6 Scripted journey — Student (`scripts/audit/nova-act/journeys/student.py`)

    - Implements the scripted prompt from `design.md` §Per-Role Journey Catalog row Student.
    - Final assertions: next unlocked assignment submitted, XP visible, streak visible, leaderboard position visible.
    - _Requirements: 18.1, 18.2, 18.3_

  - [x] 21.7 Scripted journey — Parent (`scripts/audit/nova-act/journeys/parent.py`)

    - Implements the scripted prompt from `design.md` §Per-Role Journey Catalog row Parent.
    - Final assertions: child progress page loads, attainment summary surfaces a value, notification feed renders, one-sentence progress summary extracted via `act_get`.
    - _Requirements: 18.1, 18.2, 18.3_

  - [x] 21.8 Flow-discovery pass — one per role

    - Create `scripts/audit/nova-act/flow-discovery/prompts.ts` that exports the per-role flow-discovery directive from `design.md` §Per-Role Journey Catalog.
    - Extend each `journeys/{role}.py` with a second test that runs the flow-discovery directive for that role with a higher step budget.
    - Each flow-discovery pass writes findings to `audit/output/nova-act/flow-discovery/{role}.md` as bulleted friction observations.
    - _Requirements: 18.4, 18.6_

  - [x] 21.9 Session-to-Gherkin converter (`scripts/audit/nova-act/session-to-gherkin.ts`)

    - For each completed journey, read `audit/output/nova-act/{role}/session.yaml` and convert to `audit/output/nova-act/gherkin/{role}.feature`.
    - Uses the `goto → Given`, `execute → When`, `verify → Then`, `extract → Then` mapping from `nova-act/steering/gherkin_testing.md`.
    - Runs once per role after the subprocess exits; non-zero exit from a journey skips conversion for that role.
    - _Requirements: 18.10_

  - [x] 21.10 Report aggregator integration

    - Extend `scripts/audit/report.ts` (§16.1) to ingest `audit/output/nova-act/{role}/report.md` and `audit/output/nova-act/flow-discovery/{role}.md`.
    - Apply severity mapping per `design.md` §Artifact layout:
      - Journey incomplete within step budget → Critical.
      - Flow-discovery blocker, dead link, unresponsive control, or missing feedback → Major.
      - Cosmetic or copy-level issue → Minor.
    - De-duplicate findings by text similarity (edit distance ≤ 5) so the same complaint phrased two ways is counted once.
    - _Requirements: 18.5, 18.6_

  - [x] 21.11 CI workflow stage for Nova Act
    - Add a `nova-act` stage to `.github/workflows/pre-deploy-audit.yml` after the Playwright E2E stage.
    - `continue-on-error: true` per the design's policy for post-E2E stages — artifacts still flow to the report aggregator.
    - Gate on `vars.NOVA_ACT_ENABLED == 'true'` so teams without Nova Act credentials can disable without editing the workflow.
    - Wire secrets: `NOVA_ACT_API_KEY` or `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`.
    - Upload `audit/output/nova-act/**` as a workflow artifact named `nova-act-session-logs`.
    - _Requirements: 18.7, 18.8_
    - _Design: §Execution Architecture_

- [x] 22. Final verification

  - The go/no-go gate for the audit itself: run the full pipeline against staging, review the produced artifacts, confirm every requirement traces to a produced artifact.
  - _Requirements: all (1–18)_

  - [x] 22.1 Run full audit against staging end-to-end

    - `npm run audit` on a clean checkout of the branch. Capture wall-time per stage.
    - _Requirements: 17.1_

  - [x] 22.2 Review generated `audit/output/audit-report.md`

    - Confirm executive summary renders.
    - Confirm per-requirement table covers Requirements 1–18.
    - Confirm findings are grouped by severity.
    - Confirm connectivity, RLS, cron, performance, and Nova Act summaries are present.
    - _Requirements: 16.1, 18.7_

  - [x] 22.3 Confirm every requirement maps to a produced artifact

    - Walk Requirements 1–18 against the "Per-Requirement Coverage Confirmation" table in `design.md` §Review Notes item 6.
    - For each requirement, locate the corresponding JSON/MD artifact under `audit/output/` (including `audit/output/nova-act/`) or the test file under `tests/e2e/`, `src/__tests__/properties/`, or `scripts/audit/nova-act/journeys/`.
    - Any gap is a Critical finding that must be resolved before sign-off.
    - _Requirements: all (1–18)_

  - [x] 22.4 Final checkpoint — ensure all tests pass
    - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks in this plan are all mandatory. The authoring history kept some as optional (`- [ ]*`) while the scope was being stabilised; those have all been promoted. A deploy cannot proceed until the property suite (§7), token-expired probe (§13.6), locale-aware formatter tests (§11.8), historical `audit_runs` tables (§19.3), and documentation + waiver process (§20) are complete.
- Every task carries a `_Requirements:_` footer and most carry a `_Design:_` footer for direct traceability.
- Property-test tasks carry `Feature: pre-deployment-e2e-audit, Property N: <title>` in their body and reference both the requirement clause and the correctness-property ordinal.
- Setup tasks §1, §2, §3 are strict prerequisites for every other section. §4 is a prerequisite for §5, §6, §11.3–§11.7, §14.2, §15.
- Schema changes (if §19.3 is implemented) go through Supabase MCP `apply_migration`. `src/types/database.ts` regenerates via `pwsh scripts/regen-types.ps1`. Never hand-edit migrations or the types file.
- The audit is additive — no runtime code under `src/pages/`, `src/components/`, `src/hooks/`, `src/lib/`, `src/providers/`, or `src/router/` is modified. The only runtime-adjacent artifact is `supabase/functions/audit-fixtures/index.ts`, gated by `ENV_ID == 'audit-staging'`.
- Every one of the five roles (Admin, Coordinator, Teacher, Student, Parent) has explicit named sub-tasks in every role-facing section: seed users (§3.1–§3.6), Playwright helpers (§4.4–§4.8), E2E specs (§5.1–§5.5), RLS probe rows (§9.3–§9.7), a11y dashboard specs (inside §5.x.4/5/6), and RTL screen baselines (§11.3–§11.7).
- This workflow only creates design and planning artifacts. Implementation begins when a task is executed via `spec-task-execution` — open this file and click "Start task" on the first task you want to run.
