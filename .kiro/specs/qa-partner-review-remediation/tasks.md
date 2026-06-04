# Implementation Plan: QA Partner Review Remediation

## Overview

This plan converts the approved design into an ordered, test-driven coding sequence. Implementation
language is **TypeScript (strict)** for app code and **SQL** for migrations/RPCs — the design uses
concrete code, not pseudocode, so no language selection is required.

Execution strategy mirrors the design's root-cause analysis:

- **Part C harness is scaffolded first** where it is independent of Part A artifacts, so the guards
  are in place to _prove_ the P0 fixes. The required-columns manifest and the cast-guard allowlist
  baseline are generated against the **current** schema before any Part A change, then shrunk as the
  P0 fixes remove casts and correct payloads.
- **Every DB-backed change is sequenced** as: (a) apply migration via Supabase MCP `apply_migration`,
  (b) regenerate types with `pwsh scripts/regen-types.ps1` (never hand-edit `src/types/database.ts`),
  (c) update the hook/UI and drop `as never` casts now that the new objects are typed, (d) tests.
- **Part A P0 fixes (Req 1–4)** execute immediately after the minimum harness they need.
- **Part B P1/P2 (Req 5–16)** follow, then **final verification** runs the full local gate and shrinks
  the harness baselines to their final state.

### ⚠️ Do Not Regress (Req 22)

Every task below is scoped to preserve the verified-working features enumerated in Req 22 (attendance,
competency framework, departments/programs separation, gap-analysis, Coordinator Coverage Heatmap,
Marketplace Analytics + XP Economist, bulk import, grading queue, all student-profile behaviors). Do
**not** rework these. Shared helpers (`pickColumns`, `insertColumns`, `resolveName`) are additive; the
new cast guard is additive and must not relax `architectureGuards.test.ts` /
`studentArchitectureGuards.test.ts`. Legacy `as never` casts outside Part A's two hooks stay in the
allowlist at baseline — do not remove unrelated casts in this feature. See task 27.

### Migration / steering rules (apply to every migration task)

- Apply DDL with Supabase MCP `apply_migration` against project `cdlgtbvxlxjpcddjazzx`, then **sync** the
  file into `supabase/migrations/` and run `npm run db:check-replay` (migration-replay-integrity:
  CREATE before reference, `SET search_path = ''`, `public.`-qualified, harden GRANT/REVOKE at the
  CREATE site).
- After each migration, run the **regenerate types** task (`pwsh scripts/regen-types.ps1`) which also
  re-runs `scripts/gen-required-columns.mjs`. Only after regen do hooks drop `as never`.
- RLS smoke tests (Req 19) run only against a Supabase **preview branch** with CI secrets — never
  against production.

---

## Tasks

## Part C — Regression-Prevention Harness Scaffolding (Req 17–21, independent-first)

- [x] 1. Shared DB foundations (consumed by both the harness and Part A)

  - [x] 1.1 Create the generic column-picker helper
    - Add `src/lib/db/pickColumns.ts` exporting `pickColumns<T, K>(payload, allowed)` (type-safe, drops
      `undefined`, returns `Pick<T, K>`) exactly as specified in the design
    - Pure function in `src/lib/` so it is directly unit/property testable; used by challenge + team fixes
    - _Requirements: 2.1, 3.1_
  - [x] 1.2 Create per-table allowed-column constants
    - Add `src/lib/db/insertColumns.ts` with `SOCIAL_CHALLENGES_INSERT_COLUMNS` and
      `TEAMS_INSERT_COLUMNS` declared `as const satisfies readonly InsertKeys<T>[]` against
      `src/types/database.ts` so a renamed/removed column fails `tsc`
    - _Requirements: 2.6, 3.5_

- [x] 2. Required-column manifest generator (C2 tooling)

  - [x] 2.1 Create the manifest generator and produce the baseline
    - Add `scripts/gen-required-columns.mjs` querying `information_schema.columns` for
      `table_schema = 'public'` where `is_nullable = 'NO' AND column_default IS NULL AND is_generated = 'NEVER'`
    - Write `src/__tests__/fixtures/requiredColumns.json` against the **current** live schema and commit it
    - Document that this runs alongside `scripts/regen-types.ps1` after every migration
    - _Requirements: 18.3_

- [x] 3. Static cast guard (C1)

  - [x] 3.1 Implement the cast-guard verdict + test + baseline allowlist
    - Add `src/lib/db/castGuard.ts` (pure verdict: scan source for `.from(... as never)`,
      `.insert(... as never)`, `.update(... as never)`, `.upsert(... as never)`, reusing the
      `blankCommentsAndStrings` tokenizer so comment/string/import hits are ignored)
    - Add `src/__tests__/unit/supabaseCastGuard.test.ts` scanning the whole `src/` tree
    - Add `src/__tests__/fixtures/supabaseCastAllowlist.json` recording **current** violations
      (including `useChallenges.ts` and `useTeams.ts`) plus `maxCount` = baseline count; treat the
      allowlist as the maximum permitted set (fail on new violation, fail on stale entry)
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.6_
  - [x]\* 3.2 Write property test for the non-increasing allowlist
    - `src/__tests__/properties/castGuardAllowlist.property.test.ts`
    - `// Feature: qa-partner-review-remediation, Property 7` (non-increasing allowlist)
    - **Validates: Requirements 17.2, 17.4, 17.5, 17.7**

- [x] 4. Schema-contract test (C2)

  - [x] 4.1 Implement the contract validator, descriptor registry, and test harness
    - Add `src/lib/db/schemaContract.ts` (pure validator: flags non-Real_Column keys and missing
      Required_Columns, accumulates all violations, always names key/column + table)
    - Add `src/__tests__/fixtures/mutationDescriptors.ts` with the `MutationDescriptor` type and an
      extensible (initially seed-only) registry referencing the `insertColumns` constants
    - Add `src/__tests__/unit/schemaContract.test.ts` reading `requiredColumns.json` as the authority
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.6_
  - [x]\* 4.2 Write property test for the contract validator
    - `src/__tests__/properties/schemaContract.property.test.ts`
    - `// Feature: qa-partner-review-remediation, Property 6` (schema-contract validation soundness)
    - **Validates: Requirements 18.1, 18.2, 18.3, 18.7**

- [x] 5. RLS smoke harness scaffold (C3) — integration suite

  - [x] 5.1 Create the isolated integration test project + production guard
    - Add `vitest.integration.config.ts` (separate project, no jsdom, longer timeout,
      `test.include = ["src/__tests__/integration-rls/**/*.test.ts"]`)
    - Add a config-level guard that aborts unless `SUPABASE_DB_ENV === "preview"` and the project ref is
      not the production ref
    - Add `test:rls` npm script (`vitest --run --config vitest.integration.config.ts`) to `package.json`
    - _Requirements: 19.7_
  - [x] 5.2 Build seeding/teardown + per-role sign-in + table-driven runner
    - Add `src/__tests__/integration-rls/seed.ts` (Admin API/service-role, preview only) seeding one
      user per role (admin/coordinator/teacher/student/parent) with `profiles`, a teacher-taught course,
      a student enrollment, and a parent-student link; namespaced fixtures torn down in `afterAll`
    - Add a fresh-anon-client `signInAs` helper and the `RLSCase`/`RLS_CASES` runner skeleton
    - _Requirements: 19.1, 19.2, 19.6_
  - [x] 5.3 Add baseline RLS cases for `teams` and `social_challenges`
    - `src/__tests__/integration-rls/inserts.rls.test.ts`: teacher creates team with required columns
      (success); teacher creates challenge with whitelisted payload (success); student creates challenge
      (rejected) — realizes part of Property 8
    - _Requirements: 19.3, 19.4, 19.5_

- [x] 6. Declared-objects checker (C4)

  - [x] 6.1 Implement the checker script + manifest structure
    - Add `scripts/check-declared-objects.mjs` (modeled on `check-migration-replay-order.mjs`; queries
      `pg_matviews` for materialized views and `pg_proc`/`information_schema.routines` for functions via
      `SUPABASE_DB_URL`; missing object → exit 1 naming the object + declaring task; `type` switch is
      extensible)
    - Add `scripts/declared-objects.json` with the object schema (Part A migration tasks append their
      entries to prove completeness)
    - _Requirements: 20.1, 20.2, 20.3, 20.4_
  - [x]\* 6.2 Write property test for the declared-object verdict
    - `src/__tests__/properties/declaredObjects.property.test.ts`
    - `// Feature: qa-partner-review-remediation, Property 9` (declared-object existence)
    - **Validates: Requirements 20.1, 20.2, 20.5**

- [x] 7. CI wiring (C5)

  - [x] 7.1 Wire all Part C checks into the pipeline
    - In `.github/workflows/ci.yml`: C1 + C2 ride the existing `test` job (Vitest); add
      `node scripts/check-declared-objects.mjs` to the `sql-lint` job after the replay-order step; add a
      dedicated `rls-smoke` job running `npm run test:rls` against the Supabase preview branch with
      `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_ENV=preview` secrets
    - Document branch protection: `lint`, `typecheck`, `test`, `sql-lint`, `rls-smoke`, `Supabase Preview`
      must be green to merge to `main`
    - _Requirements: 21.1, 21.2, 21.3, 21.4, 21.5, 21.6_

- [x] 8. Checkpoint — harness scaffolding in place
  - Ensure all tests pass (`npm test`) and `npm run db:check-replay` is clean. The cast guard,
    schema-contract test, and declared-objects checker now exist to prove the P0 fixes. Ask the user if
    questions arise.

---

## Part A — Confirmed BROKEN (P0, Req 1–4)

### Req 1 — Teacher-to-Student Nudge via authorized RPC (B1)

- [x] 9. Nudge RPC, types, hook, and proof
  - [x] 9.1 Add a failing RLS smoke case for the nudge (red first)
    - In `src/__tests__/integration-rls/inserts.rls.test.ts` add: teacher nudges own student via
      `rpc('send_teacher_nudge', …)` (expect success) and teacher nudges a non-taught student (expect
      rejected). These fail until 9.2–9.4 land — proving the fix
    - _Requirements: 1.8, 19.3, 19.4, 19.5_
  - [x] 9.2 Create the `send_teacher_nudge` SECURITY DEFINER RPC migration
    - New migration `supabase/migrations/<ts>_create_send_teacher_nudge.sql` per the design DDL:
      `SET search_path = ''`, `public.`-qualified, verifies `courses ⋈ student_courses` for `auth.uid()`,
      inserts the `notifications` row, `RAISE EXCEPTION … ERRCODE '42501'` when unauthorized; REVOKE from
      PUBLIC/anon, GRANT to authenticated at the CREATE site. Leave `notifications_own` untouched
    - Apply via MCP `apply_migration`, sync to `supabase/migrations/`, run `npm run db:check-replay`
    - Add `{ type: "function", name: "send_teacher_nudge", declaringTask: "qa-partner-review-remediation 9.2" }`
      to `scripts/declared-objects.json`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.7, 20.1_
  - [x] 9.3 Regenerate types
    - Run `pwsh scripts/regen-types.ps1` (refreshes `src/types/database.ts` + `requiredColumns.json`).
      Never hand-edit `database.ts`
    - _Requirements: 1.1_
  - [x] 9.4 Route `useSendNudge` through the RPC and add the error toast
    - In `src/hooks/useTeacherDashboard.ts`: replace the direct `notifications` insert with
      `supabase.rpc("send_teacher_nudge", { p_student_id, p_message })` (no `as never`); throw on error;
      `onError` → `toast.error`; preserve the existing success toast in `AtRiskStudentRow`
    - Remove the corresponding `useTeacherDashboard.ts` entry from the cast-guard allowlist if present
    - _Requirements: 1.1, 1.5, 1.6_
  - [x]\* 9.5 Write property test for nudge authorization
    - `src/__tests__/properties/nudgeAuthorization.property.test.ts` against the extracted
      teaches-predicate model (pure, not mocked Supabase)
    - `// Feature: qa-partner-review-remediation, Property 1` (nudge authorization)
    - **Validates: Requirements 1.4, 1.8**
  - [x]\* 9.6 Add nudge descriptor to the schema-contract registry
    - Append the `sendTeacherNudge → notifications` descriptor (keys: `user_id, type, title, body, is_read`)
      to `src/__tests__/fixtures/mutationDescriptors.ts`
    - _Requirements: 18.5_

### Req 2 — Challenge insert column whitelist (B2)

- [x] 10. Challenge whitelist fix
  - [x] 10.1 Narrow the input type and apply the whitelist in `useCreateChallenge`
    - In `src/hooks/useChallenges.ts`: replace the `[key: string]: unknown` payload with a typed
      `CreateChallengeInput`; drop both `as never` casts; build the row via
      `pickColumns(input, SOCIAL_CHALLENGES_INSERT_COLUMNS)` so `xp_race_acknowledged` is excluded;
      `.from("social_challenges").insert(row)` is now typed
    - Remove `useChallenges.ts` from the cast-guard allowlist
    - _Requirements: 2.1, 2.2, 2.6_
  - [x] 10.2 Harden the `xp_race` acknowledgment gate in `ChallengeFormPage`
    - In `src/pages/teacher/challenges/ChallengeFormPage.tsx`: enforce acknowledgment on **every** submit
      of an `xp_race` challenge before any insert; keep `xp_race_acknowledged` in
      `src/lib/schemas/challenge.ts` as a UI-only field
    - _Requirements: 2.3, 2.4, 2.5, 2.7_
  - [x]\* 10.3 Write property test for the challenge payload whitelist
    - `src/__tests__/properties/challengeWhitelist.property.test.ts` over arbitrary form objects with
      extra UI-only keys, asserting every output key is a Real_Column and `xp_race_acknowledged` is absent
    - `// Feature: qa-partner-review-remediation, Property 2` (challenge payload whitelist)
    - **Validates: Requirements 2.1, 2.2, 2.6**
  - [x]\* 10.4 Add challenge descriptor to the schema-contract registry
    - Append `useCreateChallenge → social_challenges` (keys = `SOCIAL_CHALLENGES_INSERT_COLUMNS`) to
      `mutationDescriptors.ts`
    - _Requirements: 18.5_

### Req 3 — Team insert populates required NOT NULL columns (B3)

- [x] 11. Team required-column fix
  - [x] 11.1 Make `CreateTeamInput` required and whitelist in `useCreateTeam`
    - In `src/hooks/useTeams.ts`: make `institution_id` and `captain_id` required on `CreateTeamInput`;
      drop `as never`; build the row via `pickColumns(input, TEAMS_INSERT_COLUMNS)`
    - Remove `useTeams.ts` from the cast-guard allowlist
    - _Requirements: 3.1, 3.2, 3.5, 3.6_
  - [x] 11.2 Populate the new fields at all call sites
    - `TeamFormPage.tsx`: pass `institution_id` from `useAuth().institutionId` and
      `captain_id = selectedMembers[0]`; keep the existing member-count guard blocking submission when no
      member is selected
    - `TeamManager.tsx`: add the same two fields to its create payload
    - `useAutoGenerateTeams` (in `useTeams.ts`): add `institution_id: string` to the signature and set
      `captain_id = teamBuckets[i][0]` per generated team
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  - [x]\* 11.3 Write property test for team required-column presence
    - `src/__tests__/properties/teamRequiredColumns.property.test.ts` over arbitrary valid inputs
      (institution, non-empty ordered members, name, course), asserting every Required_Column is present
      and non-null and `captain_id === members[0]`
    - `// Feature: qa-partner-review-remediation, Property 3` (team required-column presence)
    - **Validates: Requirements 3.1, 3.2, 3.5**
  - [x]\* 11.4 Add team descriptor to the schema-contract registry
    - Append `useCreateTeam → teams` (keys = `TEAMS_INSERT_COLUMNS`) to `mutationDescriptors.ts`
    - _Requirements: 18.5_

### Req 4 — Historical Evidence MV + hook + dashboard (B4)

- [x] 12. Historical evidence materialized view + refresh function

  - [x] 12.1 Add a failing declared-object entry (red first)
    - Add `{ type: "materialized_view", name: "mv_historical_evidence", declaringTask: "qa-partner-review-remediation 12.2" }`
      to `scripts/declared-objects.json`; `node scripts/check-declared-objects.mjs` fails until 12.2 lands
    - _Requirements: 20.1, 20.3_
  - [x] 12.2 Create the `mv_historical_evidence` MV + refresh function migration
    - New migration `supabase/migrations/<ts>_create_mv_historical_evidence.sql`: the MV per the design
      (verify `outcome_attainment.semester_id`/`learning_outcomes.blooms_level` against live schema; derive
      via `semesters` if absent), the required `UNIQUE INDEX` for `REFRESH … CONCURRENTLY`, and
      `refresh_mv_historical_evidence()` (SECURITY DEFINER, `SET search_path = ''`, public-qualified,
      REVOKE PUBLIC/anon, GRANT service_role/postgres). Referenced tables pre-exist → replay-clean
    - Apply via MCP `apply_migration`, sync to `supabase/migrations/`, run `npm run db:check-replay`
    - _Requirements: 4.1, 4.6_
  - [x] 12.3 Regenerate types
    - Run `pwsh scripts/regen-types.ps1`
    - _Requirements: 4.2_
  - [x] 12.4 Add `useHistoricalEvidence` hook + filter schema
    - New `src/hooks/useHistoricalEvidence.ts` (TanStack Query reading `mv_historical_evidence`, typed,
      `HistoricalEvidenceRow`, optional `outcomeType`/`bloomsLevel` filters) and
      `historicalEvidenceFilterSchema` in `src/lib/schemas/`
    - _Requirements: 4.2_
  - [x] 12.5 Rewrite `HistoricalEvidenceDashboard.tsx` (remove developer text)
    - In `src/pages/admin/historical-evidence/HistoricalEvidenceDashboard.tsx`: delete the
      `"Requires mv_historical_evidence view"` badge; render shimmer while loading, the shared empty state
      on zero rows, and the trend/level-breakdown charts on data — sourced from `useHistoricalEvidence`
    - _Requirements: 4.3, 4.4, 4.5_
  - [x]\* 12.6 Write unit test asserting no developer-oriented text renders
    - `src/__tests__/unit/historicalEvidenceDashboard.test.tsx`: assert the dashboard never renders
      internal object names, migration ids, or developer instructions across loading/empty/data states
    - **Validates: Requirements 4.5, 4.7**

- [x] 13. Checkpoint — P0 fixes proven
  - Ensure all tests pass, including the nudge/team/challenge RLS smoke cases (against preview) and the
    declared-objects check (now green for `mv_historical_evidence`). Ask the user if questions arise.

---

## Part B — Confirmed PARTIAL (P1/P2, Req 5–16)

### Req 5 — Resolve UUIDs to names in Admin/Teacher tables (P1)

- [x] 14. UUID→name resolution via embedded joins
  - [x] 14.1 Add the shared `resolveName` fallback helper
    - New `src/lib/db/resolveName.ts` (`resolveName(value, fallback = "—")`) used by all name cells and
      keyed on by the no-raw-UUID guard test
    - _Requirements: 5.6_
  - [x] 14.2 Embed relations in the four list queries and render names
    - `useCourses` (`src/hooks/useCourses.ts`): embed `programs!courses_program_id_fkey(name)` and
      `teacher:profiles!courses_teacher_id_fkey(full_name)`; Admin Courses `columns.tsx` renders resolved
      names
    - `useLearningOutcomes` (CLOs): embed `courses!learning_outcomes_course_id_fkey(name)`
    - `useRubrics` (`src/hooks/useRubrics.ts`): embed `learning_outcomes!rubrics_clo_id_fkey(title)`
    - `useAssignments` (`src/hooks/useAssignments.ts`): embed `courses!assignments_course_id_fkey(name)`
      (preserve existing rubric title + CLO count). All resolution in one round trip per list (no N+1)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_
  - [x]\* 14.3 Write property test for no-raw-UUID name cells
    - `src/__tests__/properties/noRawUuidCells.property.test.ts` over rows with missing/null embedded
      relations, asserting name cells render a resolved name or the fallback, never a Raw_UUID
    - `// Feature: qa-partner-review-remediation, Property 4` (no raw UUID in resolved name cells)
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.6, 5.7**

### Req 6 — Surface GA mappings & attainment (P2)

- [x] 15. Graduate Attribute mappings + attainment
  - [x] 15.1 Surface mappings and attainment in `GraduateAttributeManager`
    - In `src/pages/admin/graduate-attributes/GraduateAttributeManager.tsx`: per attribute, show mapped
      outcomes from `useGraduateAttributeMappings` and computed attainment from the existing
      `useGraduateAttributeAttainment` (reused, not reimplemented); apply `getAttainmentColor`; show an
      inline empty state when zero mappings; wrap in `ErrorBoundary`/defensive conditional for a fallback
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_
  - [x]\* 15.2 Write unit test for GA mappings/attainment/empty-state rendering
    - `src/__tests__/unit/graduateAttributeManager.test.tsx`
    - _Requirements: 6.1, 6.2, 6.3_

### Req 7 — Real Admin PLO heatmap with derivation + drill-down (P3)

- [x] 16. Admin PLO attainment heatmap
  - [x] 16.1 Add `useAdminPLOHeatmap` deriving PLO attainment
    - New `src/hooks/useAdminPLOHeatmap.ts` aggregating `outcome_attainment ⋈ learning_outcomes`
      (`type = 'PLO'`, institution-scoped); document the derivation method (mean of `scope = 'program'`
      rows, rolled up from CLO scope where absent) in a header comment
    - _Requirements: 7.1, 7.7_
  - [x] 16.2 Render the color-coded grid + drill-down + distinct states in `AdminDashboard`
    - In `src/pages/admin/AdminDashboard.tsx`: replace the static `<p>` with a `getAttainmentColor` cell
      grid; cell click opens a new `PLODrillDownDialog` (contributing CLOs/courses); keep loading/error/
      empty/data states distinct (error ≠ no-data); cache update re-renders without refresh
    - _Requirements: 7.2, 7.3, 7.4, 7.5, 7.6_
  - [x]\* 16.3 Write unit test for heatmap states + drill-down
    - `src/__tests__/unit/adminPLOHeatmap.test.tsx` (loading/error/empty/data; cell click opens dialog)
    - _Requirements: 7.2, 7.3, 7.4, 7.6_

### Req 8 — AI Co-Pilot no-data empty state (P4)

- [x] 17. AI Co-Pilot distinct empty state
  - [x] 17.1 Distinguish "no feedback yet" from 0%
    - In `src/pages/admin/AdminDashboard.tsx`: when the relevant total is 0, render an inline empty state
      ("No AI feedback recorded yet"); when total > 0 render the computed percentage (incl. a real 0%);
      leave `useAIPerformance` unchanged
    - _Requirements: 8.1, 8.2, 8.3, 8.4_
  - [x]\* 17.2 Write unit test for the AI empty-state vs computed-0% distinction
    - `src/__tests__/unit/adminDashboardAI.test.tsx` (extend existing)
    - _Requirements: 8.1, 8.2_

### Req 9 — CQI Root Cause, Deadline, Evidence of Improvement (P5)

- [x] 18. CQI new fields (DB-backed)
  - [x] 18.1 Add CQI columns migration
    - New migration `supabase/migrations/<ts>_cqi_action_plans_add_fields.sql` adding `root_cause text`,
      `due_date date`, `evidence_of_improvement text` (all nullable, additive `IF NOT EXISTS`,
      replay-clean). Apply via MCP `apply_migration`, sync, run `npm run db:check-replay`
    - _Requirements: 9.1, 9.6_
  - [x] 18.2 Regenerate types
    - Run `pwsh scripts/regen-types.ps1`
    - _Requirements: 9.1_
  - [x] 18.3 Wire fields through hook and form
    - `src/hooks/useCQIPlans.ts`: add the three fields to `CQIActionPlan`/`CreateCQIPlanInput`/
      `UpdateCQIPlanInput`; pass through create/update mutations (typed, no `as never`)
    - `src/pages/coordinator/cqi/CQIManager.tsx`: add Root Cause (textarea), Deadline (date), Evidence of
      Improvement (textarea); render on display when present; preserve owner/status/re-eval behavior
    - _Requirements: 9.2, 9.3, 9.4, 9.5_
  - [x]\* 18.4 Write unit test for CQI fields persistence + display
    - `src/__tests__/unit/cqiManager.test.tsx` (extend existing)
    - _Requirements: 9.2, 9.3, 9.4_

### Req 10 — Coordinator Section Comparison real data + drill-down (P6)

- [x] 19. Section comparison real attainment
  - [x] 19.1 Add `useSectionAttainment` and wire into `CoordinatorDashboard`
    - New `src/hooks/useSectionAttainment.ts`: real attainment per section (mean of `outcome_attainment`,
      `scope = 'student_course'`) and actual enrolled count (`student_courses` per section), replacing the
      hardcoded `attainmentPercent: 0` / capacity in `src/pages/coordinator/CoordinatorDashboard.tsx`
    - _Requirements: 10.1, 10.2_
  - [x] 19.2 Make section bars clickable with drill-down + empty/color states
    - Extend `SectionComparisonChart`: clickable bars open a new `SectionDrillDownDialog`
      (teacher/CLO/evidence); inline empty state for a section with no evidence; bar color via
      `getAttainmentColor`
    - _Requirements: 10.3, 10.4, 10.5_
  - [x]\* 19.3 Write unit test for section comparison data + drill-down
    - `src/__tests__/unit/sectionComparison.test.tsx`
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

### Req 11 — Sankey real flow (rename fallback) (P7)

- [x] 20. Outcome flow diagram
  - [x] 20.1 Render a real recharts Sankey with the "Outcome Mapping" empty fallback
    - In `src/pages/coordinator/sankey/SankeyDiagramView.tsx`: map `useSankeyData` `nodes`/`links` to the
      recharts `Sankey` shape (index-based source/target) with node tooltips; when `links.length === 0`
      render the existing column layout titled "Outcome Mapping" with no "Sankey" wording; preserve the
      outcome/mapping counts caption
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_
  - [x]\* 20.2 Write unit test for both Sankey branches
    - `src/__tests__/unit/sankeyDiagramView.test.tsx` (flow when links present; relabel + no "Sankey" when
      empty)
    - _Requirements: 11.2, 11.3, 11.4_

### Req 12 — Admin Fees Program/Semester dropdowns (P8)

- [x] 21. Fee dropdowns
  - [x] 21.1 Replace UUID inputs with Select dropdowns in `FeeManager`
    - In `src/pages/admin/fees/FeeManager.tsx`: replace the two `<Input placeholder="UUID">` with Shadcn
      `Select`s from `usePrograms()` and `useSemesters()`; feed selected ids to `useCreateFeeStructure`;
      disable submit with a hint until both are selected; keep scope minimal
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_
  - [x]\* 21.2 Write unit test for fee dropdowns + disabled-until-selected
    - `src/__tests__/unit/feeManager.test.tsx`
    - _Requirements: 12.1, 12.2, 12.4_

### Req 13 — Gradebook auto-load, CSV export, class average (P9)

- [x] 22. Gradebook polish
  - [x] 22.1 Auto-load, CSV export, class-average row, and matrix/loading states
    - In `src/pages/teacher/gradebook/GradebookView.tsx`: auto-select course from route/context; add an
      "Export CSV" button reusing `downloadCsv` from `src/lib/exportCurriculumMatrixCsv.ts`; append a
      computed class-average row; render the matrix structure (headers + names, empty cells) when no
      grades; show a shimmer while loading. Do not alter Marketplace export (Req 22.6)
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6_
  - [x]\* 22.2 Write unit test for auto-load, export, class average, empty/loading
    - `src/__tests__/unit/gradebookView.test.tsx`
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

### Req 14 — CLO detail page + rubric preview dialog (P10)

- [x] 23. CLO/rubric drill-downs
  - [x] 23.1 Add `CLODetailPage` and a "View" action on the CLO list
    - New `src/pages/teacher/clos/CLODetailPage.tsx` (route `/teacher/clos/:id` in
      `src/router/AppRouter.tsx`) showing the CLO with mapped PLOs, linked assignments, attainment;
      preserve existing Edit/Delete on the CLO list
    - _Requirements: 14.1, 14.5_
  - [x] 23.2 Add a read-only `RubricPreviewDialog` and a "Preview" action
    - New `src/components/shared/RubricPreviewDialog.tsx` rendering criteria/levels with no edit controls,
      opened from a "Preview" rubric-list action; preserve existing Edit/Copy/Delete
    - _Requirements: 14.2, 14.3, 14.4_
  - [x]\* 23.3 Write unit tests for CLO detail + rubric preview
    - `src/__tests__/unit/cloDetailPage.test.tsx` and extend `src/__tests__/unit/rubricPreview.test.tsx`
    - _Requirements: 14.1, 14.2, 14.3_

### Req 15 — Announcement fan-out (+ optional attachments/read receipts) (P11)

- [x] 24. Announcement notification fan-out (not optional)

  - [x] 24.1 Add a failing RLS/fan-out smoke case (red first) - Add an integration-rls case: teacher publishes an announcement, then `rpc('fan_out_announcement_
notifications', …)` notifies enrolled students and never the author; non-author caller is rejected - _Requirements: 15.5, 15.6, 19.6_
  - [x] 24.2 Create the `fan_out_announcement_notifications` SECURITY DEFINER RPC migration
    - New migration `supabase/migrations/<ts>_create_fan_out_announcement_notifications.sql` per the
      design DDL (verifies caller authored the announcement; inserts one notification per active enrolled
      student excluding the author; `SET search_path = ''`, public-qualified, REVOKE PUBLIC/anon, GRANT
      authenticated at CREATE site). Apply via MCP, sync, run `npm run db:check-replay`
    - Append `{ type: "function", name: "fan_out_announcement_notifications", declaringTask: "qa-partner-review-remediation 24.2" }`
      to `scripts/declared-objects.json`
    - _Requirements: 15.1, 15.2, 15.6, 20.1_
  - [x] 24.3 Regenerate types
    - Run `pwsh scripts/regen-types.ps1`
    - _Requirements: 15.1_
  - [x] 24.4 Call the fan-out RPC from `useCreateAnnouncement`
    - In `src/hooks/useAnnouncements.ts`: after the announcement insert, call
      `supabase.rpc("fan_out_announcement_notifications", { p_announcement_id })`; remove the buggy
      `user_id = author_id` direct notification insert (no `as never`)
    - _Requirements: 15.1, 15.2_
  - [x]\* 24.5 Write property test for fan-out recipients
    - `src/__tests__/properties/announcementFanOut.property.test.ts` over arbitrary rosters (author
      enrolled, duplicates, empty), asserting recipients = distinct active students minus author
    - `// Feature: qa-partner-review-remediation, Property 5` (announcement fan-out)
    - **Validates: Requirements 15.1, 15.2, 15.5**

- [x]\* 25. Announcement attachments + read receipts (optional — "WHERE supported")
  - [x]\* 25.1 Create `announcement_reads` + `announcement_attachments` migration
    - New migration per the design DDL (RLS enabled; student-own + teacher-author-read policies; storage
      bucket `announcement-attachments`). Apply via MCP, sync, run `npm run db:check-replay`; then run
      `pwsh scripts/regen-types.ps1`
    - _Requirements: 15.3, 15.4_
  - [x]\* 25.2 Wire attachment upload + read-receipt upsert into hooks/UI
    - Extend `useAnnouncements.ts` + `AnnouncementEditor` for client-validated attachment upload (signed
      URLs) and a student mark-as-read upsert
    - _Requirements: 15.3, 15.4_

### Req 16 — End-to-end outcome chain view (P12)

- [x] 26. Outcome chain view
  - [x] 26.1 Add `useOutcomeChain` walking the full graph
    - New `src/hooks/useOutcomeChain.ts` walking `outcome_mappings` (CLO↔PLO↔ILO) and
      `graduate_attribute_mappings` (GA↔ILO), assignments (`clo_ids`/`clo_weights`), rubrics (`clo_id`),
      and `outcome_attainment`, assembling ILO → GA → PLO → CLO → Assessment → Rubric → Student →
      Attainment
    - _Requirements: 16.1, 16.2, 16.3_
  - [x] 26.2 Add `OutcomeChainView` with GA level, unified empty state, color coding
    - New `src/pages/shared/OutcomeChainView.tsx` (+ route) rendering connected nodes per level with GA
      between ILO and PLO; a single unified empty state when no level has linked records;
      `getAttainmentColor` at nodes with attainment
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5_
  - [x]\* 26.3 Write unit test for chain assembly + unified empty state
    - `src/__tests__/unit/outcomeChainView.test.tsx`
    - _Requirements: 16.1, 16.3, 16.4_

---

## Final Verification

- [x] 27. Shrink harness baselines to final state

  - [x] 27.1 Update the cast-guard allowlist + declared-objects to their final shrunk state
    - Remove `useChallenges.ts` and `useTeams.ts` entries from
      `src/__tests__/fixtures/supabaseCastAllowlist.json` and lower `maxCount` to the new (smaller)
      baseline; confirm no stale entries remain. Confirm `scripts/declared-objects.json` lists every
      object created in Part A/B (`send_teacher_nudge`, `fan_out_announcement_notifications`,
      `mv_historical_evidence`) and that `node scripts/check-declared-objects.mjs` passes
    - Regenerate `src/__tests__/fixtures/requiredColumns.json` via `scripts/gen-required-columns.mjs` so
      it reflects the final schema (CQI columns, new tables)
    - _Requirements: 17.5, 17.7, 20.5_

- [x] 28. Final checkpoint — run the full local gate + replay/declared checks
  - Run `npm run lint`, then `npx tsc --noEmit`, then `npm test` (pre-push-checks order); run
    `npm run db:check-replay` and `node scripts/check-declared-objects.mjs`; run `npm run test:rls`
    against the Supabase preview branch (never production). Fix any failures before completing. Ask the
    user if questions arise.

## Notes

- Tasks marked with `*` are optional. Optional sub-tasks are test sub-tasks (unit/property/integration)
  plus the announcement attachments/read-receipts work (task 25), which the design flags as "WHERE
  supported". The announcement **fan-out** fix (task 24) is **not** optional.
- Each DB-backed change follows migrate (MCP `apply_migration`) → sync + `db:check-replay` → regen types
  (`pwsh scripts/regen-types.ps1`) → update hook/UI (drop `as never`) → tests. `src/types/database.ts` is
  never hand-edited.
- Property tests (fast-check, ≥100 iterations) are tagged `// Feature: qa-partner-review-remediation,
Property N` and run against extracted pure functions — never mocked Supabase. RLS truth is covered by
  the non-mocked smoke harness (Property 8, realized as the table-driven matrix in tasks 5, 9, 24).
- Do Not Regress (Req 22) is binding throughout: no attendance/competency/department/gap-analysis/
  coverage-heatmap/marketplace/bulk-import/grading-queue/student-profile file is modified; shared helpers
  are additive; unrelated legacy `as never` casts stay allowlisted at baseline.
- Property 8 (RLS conformance, Req 19.3/19.4/19.8) is validated by the integration-rls matrix, not a
  fast-check property file.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "2.1", "6.1", "14.1"] },
    { "id": 1, "tasks": ["3.1", "4.1", "5.1", "14.2"] },
    { "id": 2, "tasks": ["3.2", "4.2", "5.2", "6.2", "7.1", "14.3"] },
    {
      "id": 3,
      "tasks": [
        "5.3",
        "12.1",
        "18.1",
        "15.1",
        "16.1",
        "19.1",
        "20.1",
        "21.1",
        "22.1",
        "23.1",
        "26.1"
      ]
    },
    {
      "id": 4,
      "tasks": [
        "18.2",
        "12.2",
        "16.2",
        "19.2",
        "23.2",
        "26.2",
        "15.2",
        "20.2",
        "21.2",
        "22.2"
      ]
    },
    {
      "id": 5,
      "tasks": ["12.3", "18.3", "9.1", "17.1", "16.3", "19.3", "23.3", "26.3"]
    },
    { "id": 6, "tasks": ["12.4", "9.2", "18.4", "17.2"] },
    { "id": 7, "tasks": ["12.5", "9.3", "24.1"] },
    { "id": 8, "tasks": ["9.4", "24.2", "12.6"] },
    { "id": 9, "tasks": ["24.3", "10.1", "9.5", "9.6"] },
    { "id": 10, "tasks": ["24.4", "11.1", "10.2"] },
    { "id": 11, "tasks": ["11.2", "10.3", "10.4", "24.5", "25.1"] },
    { "id": 12, "tasks": ["11.3", "11.4", "25.2"] },
    { "id": 13, "tasks": ["27.1"] }
  ]
}
```
