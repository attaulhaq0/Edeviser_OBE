# Requirements Document

## Introduction

This feature turns the verified findings in `docs/QA-Partner-Review-Verification-Report.md` into an actionable, testable specification. A manual QA partner reviewed all four profiles (Admin, Coordinator, Teacher, Student) of the Edeviser OBE + gamification platform. A senior dev/QA verification pass then cross-checked every claim against the live Supabase schema (project `cdlgtbvxlxjpcddjazzx`), the current RLS policies, and the current source tree. The verification report is the single source of truth for this spec; requirements below are derived from its verified verdicts, not re-derived from the reviewer's screenshots.

The work is organized into three parts:

- **Part A — Fix confirmed BROKEN items (P0):** Four defects confirmed at the database and code level that block core workflows (Nudge, Create Challenge, Create Team, Historical Evidence).
- **Part B — Improve confirmed PARTIAL gaps (P1/P2):** Twelve items that exist but have real, verified gaps in data resolution, surfacing, drill-down, or empty-state handling.
- **Part C — Regression-Prevention Test Harness (CRITICAL):** A first-class set of guardrails (static lint, schema-contract tests, RLS insert smoke tests, declared-object checks, CI wiring) designed to catch payload-shape, RLS, and missing-object defects before they reach `main`, and to surface additional latent issues product-wide.

The spec also includes a **Do Not Regress / Out of Scope** section listing items verified as already working that must be preserved, and a **Product-scope decisions** note for non-functional scope calls.

The root-cause analysis in the verification report (§4) shows why the existing migration/test gates missed these defects: a task was checked off without an applied migration, the broken inserts are client-side payload bugs that schema linting cannot catch, the unit/property tests mock Supabase so RLS failures are invisible, and several issues are UX-contract gaps. Part C exists to close all three classes of gap.

## Glossary

- **Platform**: The Edeviser OBE + gamification web application (React 18 + TypeScript, Vite, TanStack Query, Supabase Postgres + RLS, Deno Edge Functions).
- **Nudge_Service**: The server-side `SECURITY DEFINER` RPC or service-role Edge Function that performs teacher-to-student nudge notification inserts after authorization checks.
- **Challenge_Create_Handler**: The mutation path (`useCreateChallenge` plus `ChallengeFormPage` submit handler) that inserts rows into `social_challenges`.
- **Team_Create_Handler**: The mutation path (`useCreateTeam` plus `TeamFormPage`/`TeamManager`) that inserts rows into `teams`.
- **Historical_Evidence_View**: The `mv_historical_evidence` Postgres materialized view that backs the Admin Historical Evidence dashboard.
- **Historical_Evidence_Dashboard**: The `HistoricalEvidenceDashboard.tsx` Admin component.
- **Announcement_Create_Handler**: The mutation path (`useCreateAnnouncement` plus `AnnouncementEditor`) that inserts rows into `announcements` and fans out notifications.
- **Insert_Type**: A generated TypeScript `Insert` type in `src/types/database.ts` for a given table (`Database["public"]["Tables"][T]["Insert"]`).
- **Required_Column**: A table column that is `NOT NULL` and has no database default and is not generated, therefore a value must be supplied at insert time.
- **Real_Column**: A column that exists on the target table in the live schema (and in the generated `Insert_Type`).
- **UI_Only_Field**: A field present in a client-side Zod schema or form state that is intentionally not a database column (e.g., `xp_race_acknowledged`).
- **User_Facing_Surface**: Any rendered text, table cell, badge, label, or empty state visible to an end user (Admin, Coordinator, Teacher, Student, Parent).
- **Raw_UUID**: A UUID value rendered directly in a User_Facing_Surface without resolution to a human-readable name or title.
- **Empty_State**: A user-friendly no-data presentation (heading + explanatory copy, optionally an action) shown when a metric or list has zero records, distinct from a bare `0`/`0%` value.
- **Drill_Down**: A click-through interaction on an aggregate metric, chart element, or table row that navigates to or opens a corresponding detail view.
- **Outcome_Chain**: The end-to-end OBE traceability path ILO → GA → PLO → CLO → Assessment → Rubric → Student → Attainment.
- **Static_Cast_Guard**: The Part C static check that detects Supabase calls which defeat generated-type safety via `as never` casts.
- **Schema_Contract_Test**: The Part C test that cross-references mutation payload keys against generated `Insert_Type`s.
- **RLS_Smoke_Test**: The Part C integration test that seeds real per-role users and performs real inserts/updates against a Supabase branch/preview database to assert RLS behavior.
- **Declared_Object_Check**: The Part C check that cross-references DB objects declared as created in specs/tasks against the actual live schema.
- **CI_Gate**: The pre-push / pull-request pipeline that runs lint → `tsc` → Vitest, plus the Supabase preview migration replay and the new Part C checks.
- **Allowlist**: A tracked, version-controlled file enumerating known legacy violations that the Static_Cast_Guard tolerates without failing, and which is not permitted to grow.

---

## Requirements

### Part A — Confirmed BROKEN (P0)

### Requirement 1: Teacher-to-Student Nudge delivered via authorized server-side path (B1)

**User Story:** As a teacher, I want to nudge a student in one of my courses, so that I can prompt at-risk students to act without triggering an error.

**Context:** `useSendNudge` inserts into `notifications` with `user_id = studentId`. The only policy on `notifications` is `notifications_own` (`FOR ALL USING (user_id = auth.uid())`), so the teacher's insert for a student's `user_id` is rejected by the `WITH CHECK`. The fix routes nudges through a server-side path that verifies the teaching relationship.

#### Acceptance Criteria

1. WHEN a teacher triggers a nudge for a student, THE Platform SHALL deliver the nudge through the Nudge_Service rather than a direct client insert into `notifications`.
2. WHEN the Nudge_Service receives a nudge request, THE Nudge_Service SHALL verify that the requesting teacher teaches the target student before inserting the notification.
3. WHEN the Nudge_Service confirms the teaching relationship, THE Nudge_Service SHALL insert a notification row with `user_id` set to the target student identifier.
4. IF the requesting teacher does not teach the target student, THEN THE Nudge_Service SHALL reject the request and return an authorization error without inserting a notification.
5. WHEN the Nudge_Service completes successfully, THE Platform SHALL display a success confirmation to the teacher via a toast notification.
6. IF the Nudge_Service returns an error, THEN THE Platform SHALL display an error message to the teacher via a toast notification.
7. THE Platform SHALL retain the `notifications_own` policy such that an authenticated user without a service-role or `SECURITY DEFINER` path can insert notifications only where `user_id = auth.uid()`.
8. FOR ANY teacher-student pair where the teacher does not teach the student, attempting the nudge SHALL NOT create a `notifications` row for that student (authorization correctness property).

### Requirement 2: Challenge creation inserts only real columns (B2)

**User Story:** As a teacher, I want to create a social challenge, so that my class can participate in gamified activities without the create action failing.

**Context:** `social_challenges` has 16 columns; `xp_race_acknowledged` is not one of them. It is a client-only Zod field used as a confirmation gate. `ChallengeFormPage` passes the full form object (including `xp_race_acknowledged`) into `useCreateChallenge`, which calls `.insert(input)`, so PostgREST rejects the unknown column and every create fails.

#### Acceptance Criteria

1. WHEN the Challenge_Create_Handler builds an insert payload, THE Challenge_Create_Handler SHALL include only keys that are Real_Columns of `social_challenges`.
2. THE Challenge_Create_Handler SHALL exclude `xp_race_acknowledged` from the insert payload while retaining it as a UI_Only_Field for the acknowledgment gate.
3. WHEN a teacher submits a valid challenge form, THE Platform SHALL create the `social_challenges` row successfully and confirm via a toast notification.
4. WHERE the challenge type is `xp_race` and the teacher has not acknowledged, THE Platform SHALL block submission and prompt for acknowledgment before any insert is attempted.
5. WHILE acknowledgment is required for an `xp_race` challenge, THE Platform SHALL block submission until explicit acknowledgment is received, regardless of whether the teacher was already prompted in the same session.
6. FOR ANY challenge insert payload produced by the Challenge_Create_Handler, every key in the payload SHALL be a Real_Column of `social_challenges` (whitelist correctness property).
7. THE Platform SHALL preserve the existing client-side validation behavior in `src/lib/schemas/challenge.ts` for `xp_race_acknowledged`.

### Requirement 3: Team creation populates required NOT NULL columns (B3)

**User Story:** As a teacher, I want to create a team, so that team-based health, challenges, and pages have data to operate on without the create action failing.

**Context:** `teams.institution_id` and `teams.captain_id` are `NOT NULL`, but `useCreateTeam`, `TeamFormPage`, and `TeamManager` send only `name`, `course_id`, `created_by` (plus `avatar_letter`), violating the NOT NULL constraints on every insert.

#### Acceptance Criteria

1. WHEN the Team_Create_Handler builds an insert payload, THE Team_Create_Handler SHALL populate `institution_id` from the creating user's profile institution.
2. WHEN the Team_Create_Handler builds an insert payload, THE Team_Create_Handler SHALL populate `captain_id` with the first selected team member identifier.
3. WHEN a teacher submits a valid team form with at least one member, THE Platform SHALL create the `teams` row successfully and confirm via a toast notification.
4. IF no member is selected when team creation is submitted, THEN THE Platform SHALL block submission and prompt the teacher to add at least one member before any insert is attempted.
5. FOR ANY team insert payload produced by the Team_Create_Handler, every Required_Column of `teams` (including `institution_id` and `captain_id`) SHALL be present and non-null (required-column correctness property).
6. WHEN a team is created, THE Team_Create_Handler SHALL produce a payload that satisfies the `teams_insert` RLS policy.

### Requirement 4: Historical Evidence real feature plus interim empty state (B4)

**User Story:** As an administrator, I want a working Historical Evidence dashboard, so that I can review attainment evidence over time without seeing internal developer text.

**Context:** `HistoricalEvidenceDashboard.tsx` renders the literal badge "Requires mv_historical_evidence view". The materialized view does not exist (only `leaderboard_weekly` exists); spec task `125.1` was marked complete without applying the migration.

#### Acceptance Criteria

1. THE Platform SHALL define the Historical_Evidence_View (`mv_historical_evidence`) as a materialized view via an applied migration file in `supabase/migrations/`.
2. THE Platform SHALL provide a `useHistoricalEvidence` hook that reads from the Historical_Evidence_View through a TanStack Query hook.
3. WHEN historical evidence data exists for the administrator's institution, THE Historical_Evidence_Dashboard SHALL render that data sourced from the `useHistoricalEvidence` hook.
4. WHILE the Historical_Evidence_View returns zero rows for the institution, THE Historical_Evidence_Dashboard SHALL display an Empty_State with user-friendly copy.
5. THE Historical_Evidence_Dashboard SHALL NOT render the string "Requires mv_historical_evidence view" or any other internal or developer-oriented text in a User_Facing_Surface.
6. THE Historical_Evidence_View migration SHALL replay cleanly from scratch in filename order so that the Supabase preview migration gate passes.
7. FOR ANY User_Facing_Surface in the Historical_Evidence_Dashboard, no rendered text SHALL contain internal object names, migration identifiers, or developer instructions (no-developer-text correctness property).

---

### Part B — Confirmed PARTIAL (P1/P2)

### Requirement 5: Resolve UUIDs to human-readable names in Admin and Teacher tables (P1)

**User Story:** As an administrator or teacher, I want list tables to show names instead of raw identifiers, so that I can understand the data without decoding UUIDs.

**Context:** Admin Courses renders `program_id` and `teacher_id` raw; Teacher CLOs show `course_id` truncated; Teacher Rubrics render `clo_id` raw; Teacher Assignments render `course_id` raw (rubric title and CLO count are already resolved).

#### Acceptance Criteria

1. WHEN the Admin Courses table renders, THE Platform SHALL display the resolved program name and teacher name instead of `program_id` and `teacher_id` Raw_UUIDs.
2. WHEN the Teacher CLOs table renders, THE Platform SHALL display the resolved course name instead of a `course_id` Raw_UUID.
3. WHEN the Teacher Rubrics table renders, THE Platform SHALL display the resolved CLO title instead of a `clo_id` Raw_UUID.
4. WHEN the Teacher Assignments table renders, THE Platform SHALL display the resolved course name instead of a `course_id` Raw_UUID.
5. THE Platform SHALL resolve names within the list query (via join or batched lookup) rather than issuing one lookup request per row (no N+1 query).
6. IF a referenced entity name cannot be resolved, THEN THE Platform SHALL display a defined fallback label rather than a Raw_UUID.
7. FOR ANY row in the Admin Courses, Teacher CLOs, Teacher Rubrics, and Teacher Assignments tables, no cell intended to show a name or title SHALL render a Raw_UUID (no-raw-UUID correctness property).

### Requirement 6: Surface Graduate Attribute mappings and attainment (P2)

**User Story:** As an administrator, I want to see Graduate Attribute mappings and attainment, so that Graduate Attributes function as a measurable outcome layer rather than a label.

**Context:** `GraduateAttributeManager.tsx` lists only name/description plus an Add form. The `graduate_attribute_mappings` table exists and `useGraduateAttributeAttainment` already computes weighted GA→ILO attainment but is not surfaced in the UI.

#### Acceptance Criteria

1. WHEN the Graduate Attribute manager renders, THE Platform SHALL display each Graduate Attribute's mappings sourced from `graduate_attribute_mappings`.
2. WHEN the Graduate Attribute manager renders, THE Platform SHALL display computed attainment for each Graduate Attribute sourced from `useGraduateAttributeAttainment`.
3. WHILE a Graduate Attribute has no mappings, THE Platform SHALL display an Empty_State indicating no mappings exist rather than a bare zero.
4. IF the Empty_State component fails to render, THEN THE Platform SHALL display a fallback message or error indicator rather than rendering nothing.
5. THE Platform SHALL surface the existing `useGraduateAttributeAttainment` computation without reimplementing the attainment calculation.
6. WHERE attainment data is available for a Graduate Attribute, THE Platform SHALL render it using the platform attainment-level color coding.

### Requirement 7: Real Admin PLO attainment heatmap with derivation and drill-down (P3)

**User Story:** As an administrator, I want a real PLO attainment heatmap, so that I can see and explore program-level attainment instead of an empty placeholder.

**Context:** The `AdminDashboard.tsx` PLO heatmap card body is a static empty `<p>` with no data hook and no drill-down. The Coordinator Coverage Heatmap is a separate, working component.

#### Acceptance Criteria

1. THE Platform SHALL back the Admin PLO attainment heatmap with a data hook that derives PLO attainment from stored attainment data.
2. WHEN PLO attainment data exists, THE Admin PLO attainment heatmap SHALL render cells color-coded by the platform attainment-level thresholds.
3. WHEN an administrator selects a heatmap cell, THE Platform SHALL open a Drill_Down view for the corresponding PLO.
4. WHILE no PLO attainment data exists for a legitimate no-data condition, THE Platform SHALL display an Empty_State instead of an empty paragraph or a bare zero.
5. WHEN PLO attainment data becomes available, THE Platform SHALL hide the Empty_State and render the data without requiring a page refresh.
6. IF the PLO attainment data hook fails with a system error, THEN THE Platform SHALL display an error message rather than the no-data Empty_State.
7. THE Platform SHALL document the derivation method used to compute the displayed PLO attainment values.

### Requirement 8: Distinct no-data empty state for AI Co-Pilot Performance (P4)

**User Story:** As an administrator, I want the AI Co-Pilot performance metric to distinguish "no data yet" from "0%", so that an absence of feedback does not read as a broken AI.

**Context:** `useAIPerformance` computes real rates from `ai_feedback` and returns 0 when the total is 0; the dashboard shows `0%` / "0 total" with no distinct empty state.

#### Acceptance Criteria

1. WHILE the AI feedback total is zero, THE Platform SHALL display a distinct Empty_State for AI Co-Pilot Performance instead of a bare `0%`.
2. WHEN the AI feedback total is greater than zero, THE Platform SHALL display the computed performance percentage from `useAIPerformance`, including a computed value of `0%`.
3. THE Empty_State for AI Co-Pilot Performance SHALL communicate that no feedback has been recorded yet.
4. THE Platform SHALL reuse the existing `useAIPerformance` computation without changing its rate calculation.

### Requirement 9: CQI workflow adds Root Cause, Deadline, and Evidence of Improvement (P5)

**User Story:** As a coordinator, I want to record root cause, deadline, and evidence of improvement on CQI action plans, so that the continuous-improvement loop is fully documented.

**Context:** `cqi_action_plans` already has owner (`responsible_person`), a status lifecycle (planned → in_progress → completed → evaluated), and re-evaluation result (`result_attainment`). The genuinely missing columns are `root_cause`, a deadline/due date, and `evidence_of_improvement`.

#### Acceptance Criteria

1. THE Platform SHALL add `root_cause`, a deadline/due-date column, and `evidence_of_improvement` to `cqi_action_plans` via an applied migration.
2. WHEN a coordinator creates or edits a CQI action plan, THE Platform SHALL provide form fields for root cause, deadline, and evidence of improvement.
3. WHEN a coordinator saves a CQI action plan with the new fields populated, THE Platform SHALL persist those values to `cqi_action_plans`.
4. WHEN a CQI action plan is displayed, THE Platform SHALL render root cause, deadline, and evidence of improvement when present.
5. THE Platform SHALL preserve the existing CQI owner field, status lifecycle, and re-evaluation result behavior.
6. THE new CQI columns migration SHALL replay cleanly from scratch so that the Supabase preview migration gate passes.

### Requirement 10: Coordinator Section Comparison computes real attainment with drill-down (P6)

**User Story:** As a coordinator, I want section comparison to show real attainment and let me drill into a section, so that I can compare sections and investigate differences.

**Context:** On `CoordinatorDashboard.tsx` the section comparison bars are fed `attainmentPercent: 0` (hardcoded) and `studentCount` equal to capacity, with no drill-down.

#### Acceptance Criteria

1. WHEN the Coordinator Section Comparison renders, THE Platform SHALL compute and display real attainment per section from stored attainment data instead of a hardcoded zero.
2. WHEN the Coordinator Section Comparison renders, THE Platform SHALL display the actual enrolled student count per section instead of the section capacity.
3. WHEN a coordinator selects a section in the comparison, THE Platform SHALL open a Drill_Down view for that section (teacher / CLO / evidence).
4. WHILE a section has no attainment evidence, THE Platform SHALL display an Empty_State for that section instead of a bare zero.
5. THE Platform SHALL render section attainment using the platform attainment-level color coding.

### Requirement 11: Resolve the Sankey expectation mismatch (P7)

**User Story:** As a coordinator, I want the outcome flow view to match its label, so that the displayed component meets the expectation set by its name.

**Context:** `SankeyDiagramView.tsx` renders three columns of styled divs plus a "{n} outcomes · {m} mappings" caption; the `links` array is counted but never drawn. The product decision is to either build a real flow diagram (recharts Sankey is available) or rename to "Outcome Mapping".

#### Acceptance Criteria

1. THE Platform SHALL resolve the Sankey mismatch by either rendering a real flow diagram that draws the `links` relationships or relabeling the view to "Outcome Mapping".
2. WHERE the chosen resolution is a real flow diagram, THE Platform SHALL draw each mapping in the `links` array as a visible flow connection between outcome nodes.
3. IF the `links` array is empty, THEN THE Platform SHALL use the "Outcome Mapping" relabel presentation rather than rendering an empty flow diagram.
4. WHERE the chosen resolution is a relabel, THE Platform SHALL display the title "Outcome Mapping" and SHALL NOT use the term "Sankey" in any User_Facing_Surface for that view.
5. THE Platform SHALL preserve the existing outcome and mapping counts displayed in the view.

### Requirement 12: Admin Fees uses Program and Semester dropdowns (P8)

**User Story:** As an administrator, I want to select program and semester from dropdowns when configuring fees, so that I do not have to paste UUIDs by hand.

**Context:** `FeeManager.tsx` uses free-text `<Input placeholder="UUID">` controls for `program_id` and `semester_id`.

#### Acceptance Criteria

1. WHEN the administrator configures a fee, THE Platform SHALL present a Program selection dropdown populated from existing programs instead of a free-text UUID input.
2. WHEN the administrator configures a fee, THE Platform SHALL present a Semester selection dropdown populated from existing semesters instead of a free-text UUID input.
3. WHEN the administrator selects a program and a semester, THE Platform SHALL submit the corresponding identifiers to the fee mutation.
4. WHILE program or semester is unselected, THE Platform SHALL proactively indicate the required selection and disable submission until both values are selected.
5. THE Platform SHALL keep the Fees feature scope minimal per the product-scope decision in this document.

### Requirement 13: Gradebook auto-load, CSV export, and class average (P9)

**User Story:** As a teacher, I want the gradebook to load automatically, export to CSV, and show a class average, so that I can review and share grades efficiently.

**Context:** `GradebookView` works but requires manual course selection, has no export, and has no class-average row. The Marketplace Analytics CSV export pattern already exists for reuse.

#### Acceptance Criteria

1. WHEN a teacher opens the gradebook with a course context available, THE Platform SHALL load the gradebook for that course without requiring a manual course selection.
2. WHEN a teacher requests a CSV export of the gradebook, THE Platform SHALL produce a CSV file containing the displayed grade matrix.
3. WHEN the gradebook displays grades, THE Platform SHALL display a class-average row computed from the displayed grades.
4. WHILE a course has no grades, THE Platform SHALL display the grade matrix structure (column headers and student names) with empty grade cells rather than hiding the matrix.
5. WHILE grades exist but are not yet ready to display, THE Platform SHALL display a loading indicator rather than the no-data presentation.
6. THE Platform SHALL reuse the existing CSV export pattern rather than introducing a separate export implementation.

### Requirement 14: CLO detail drill-down and rubric preview dialog (P10)

**User Story:** As a teacher, I want to open a CLO detail view and preview a rubric read-only, so that I can inspect outcomes and rubrics without entering edit mode.

**Context:** CLO list columns expose only Edit/Delete; rubric columns expose only Edit/Copy/Delete with no read-only preview.

#### Acceptance Criteria

1. WHEN a teacher selects a CLO from the CLO list, THE Platform SHALL open a CLO detail view for that CLO.
2. WHEN a teacher requests a rubric preview, THE Platform SHALL open a read-only rubric preview dialog.
3. THE rubric preview dialog SHALL display rubric criteria without providing edit controls.
4. THE Platform SHALL preserve the existing Edit, Copy, and Delete actions on the rubric list.
5. THE Platform SHALL preserve the existing Edit and Delete actions on the CLO list.

### Requirement 15: Announcement notification fan-out, attachments, and read receipts (P11)

**User Story:** As a teacher, I want announcements to notify enrolled students and support attachments and read receipts, so that students reliably receive and acknowledge announcements.

**Context:** `useCreateAnnouncement` sends the notification to `user_id = author_id` (the teacher), so enrolled students are never notified. The `announcements` table has no attachment or read columns and there is no `announcement_reads` table.

#### Acceptance Criteria

1. WHEN a teacher publishes an announcement, THE Announcement_Create_Handler SHALL fan out notifications to the students enrolled in the announcement's course rather than to the author.
2. THE Announcement_Create_Handler SHALL NOT set the notification recipient to the announcement author.
3. WHERE attachments are supported, THE Platform SHALL allow a teacher to attach files to an announcement and SHALL store attachment references.
4. WHERE read receipts are supported, THE Platform SHALL record which students have read an announcement.
5. FOR ANY published announcement, every notification recipient SHALL be a student enrolled in the announcement's course and SHALL NOT include the author (fan-out correctness property).
6. WHEN announcement notification fan-out crosses user boundaries, THE Platform SHALL deliver those notifications through an authorized server-side path consistent with Requirement 1 rather than a direct cross-user client insert.

### Requirement 16: End-to-end outcome chain view (P12)

**User Story:** As an administrator or coordinator, I want a single end-to-end outcome chain view, so that I can trace attainment from institution outcomes down to student evidence for accreditation.

**Context:** No single component renders the full chain, and Graduate Attributes are not wired into any chain view. This is the highest product-credibility item for accreditation buyers.

#### Acceptance Criteria

1. THE Platform SHALL provide a view that renders the Outcome_Chain (ILO → GA → PLO → CLO → Assessment → Rubric → Student → Attainment).
2. WHEN a user opens the outcome chain view for a selected starting outcome, THE Platform SHALL display the connected nodes at each level of the Outcome_Chain.
3. THE outcome chain view SHALL include Graduate Attributes as a level between ILO and PLO.
4. IF no level in the Outcome_Chain has linked records for the selected starting outcome, THEN THE Platform SHALL display a single unified Empty_State for the entire chain rather than per-level zeros.
5. WHEN attainment is available at a node, THE Platform SHALL display it using the platform attainment-level color coding.

---

### Part C — Regression-Prevention Test Harness (CRITICAL)

This part is a first-class requirement area. Its goal is to catch payload-shape, RLS, and missing-object defects before code reaches `main`, and to apply the checks product-wide so additional latent issues surface. The root-cause analysis (verification report §4) identifies three classes of defect the existing gates miss: a falsely completed task (missing migration), client-to-DB payload mismatches, and mocked-Supabase tests that hide RLS failures.

### Requirement 17: Static guardrail against type-safety-defeating Supabase casts (C1)

**User Story:** As a developer, I want CI to fail when new Supabase calls disable generated-type checking, so that the deeper root cause behind the challenge and team insert bugs cannot recur.

**Context:** `.from("table" as never)` and `.insert(payload as never)` / `.update(... as never)` casts disable TypeScript's generated-type checking and are the deeper root cause of B2/B3. The codebase already has narrower guards (`architectureGuards.test.ts`, `studentArchitectureGuards.test.ts`); this requirement generalizes the guard product-wide with a tracked Allowlist.

#### Acceptance Criteria

1. THE Static_Cast_Guard SHALL scan the entire `src/` tree for Supabase calls that use `as never` casts that defeat generated-type checking, including `.from(... as never)`, `.insert(... as never)`, and `.update(... as never)`.
2. WHEN the Static_Cast_Guard detects a violation that is not in the Allowlist, THE CI_Gate SHALL fail.
3. THE Static_Cast_Guard SHALL maintain an Allowlist of known legacy violations and SHALL treat the Allowlist as the maximum permitted set.
4. IF a new violation is introduced that is not present in the Allowlist, THEN THE Static_Cast_Guard SHALL report the offending file and location and fail.
5. WHEN a previously allowlisted violation is removed from the source, THE Static_Cast_Guard SHALL require manual removal of the corresponding Allowlist entry and SHALL fail the CI_Gate until the Allowlist is updated (shrinking-only Allowlist).
6. THE Static_Cast_Guard SHALL distinguish code tokens from occurrences of the same text inside comments, strings, or import paths so that documentation references do not trigger failures.
7. FOR ANY commit, the count of allowlisted violations SHALL NOT exceed the count recorded at the start of this feature (non-increasing-Allowlist correctness property).

### Requirement 18: Schema-contract test for mutation payloads (C2)

**User Story:** As a developer, I want payload keys validated against the generated database Insert types, so that unknown-column and missing-required-column bugs are caught before runtime.

**Context:** B2 sent a non-existent column; B3 omitted NOT NULL columns. Schema linting validates the schema, not how the app calls it, so a contract test is required.

#### Acceptance Criteria

1. THE Schema_Contract_Test SHALL cross-reference each mutation insert/upsert payload's keys against the target table's generated Insert_Type in `src/types/database.ts`.
2. IF a payload key is not a Real_Column of the target table, THEN THE Schema_Contract_Test SHALL fail AND identify the offending key and table, and a failure without identification SHALL be treated as an invalid test result.
3. IF a Required_Column of the target table is missing from a payload, THEN THE Schema_Contract_Test SHALL fail and identify the missing column and table.
4. WHEN the Schema_Contract_Test encounters a violation, THE Schema_Contract_Test SHALL continue checking remaining payloads and report all detected violations together rather than stopping at the first.
5. THE Schema_Contract_Test SHALL run for all RLS-protected mutation hooks, including at minimum the Nudge_Service path, Team_Create_Handler, and Challenge_Create_Handler.
6. THE Schema_Contract_Test SHALL be structured generically so that additional mutation hooks can be added to its coverage.
7. FOR ANY insert/upsert payload covered by the Schema_Contract_Test, every payload key SHALL be a Real_Column of the target table AND every Required_Column SHALL be present (payload-contract correctness property).

### Requirement 19: RLS / insert integration smoke tests against a real database (C3)

**User Story:** As a developer, I want real per-role inserts tested against a real database, so that RLS and insert-shape failures that mocks hide are caught before merge.

**Context:** Existing unit/property tests mock Supabase, so RLS and NOT NULL violations are invisible. A thin, non-mocked integration layer is required, seeding real role users and performing real inserts/updates against a Supabase branch/preview database.

#### Acceptance Criteria

1. THE RLS_Smoke_Test SHALL seed real users for the admin, coordinator, teacher, student, and parent roles in a Supabase branch or preview database.
2. THE RLS_Smoke_Test SHALL perform real inserts and updates (not mocked Supabase calls) against the seeded database.
3. WHEN a mutation path is expected to succeed for a given role, THE RLS_Smoke_Test SHALL assert that the real insert or update succeeds.
4. WHEN a mutation path is expected to be rejected by RLS for a given role, THE RLS_Smoke_Test SHALL assert that the real insert or update is rejected.
5. THE RLS_Smoke_Test SHALL cover at minimum `notifications` (nudge), `teams`, and `social_challenges`.
6. THE RLS_Smoke_Test SHALL be structured so that additional RLS-protected tables can be added to its coverage.
7. THE RLS_Smoke_Test SHALL run as a dedicated CI job with secrets, separate from the unit and property suite.
8. FOR EACH covered mutation path and role, THE RLS_Smoke_Test outcome (succeed or reject) SHALL match the table's RLS policy exactly (RLS-conformance correctness property).

### Requirement 20: "Declared DB objects exist" check (C4)

**User Story:** As a developer, I want CI to verify that DB objects declared as created by specs/tasks actually exist in the schema, so that a task cannot be marked complete without an applied migration.

**Context:** Spec task `125.1` was checked off but the `mv_historical_evidence` view was never created. The migration replay gate proves clean replay but not feature completeness.

#### Acceptance Criteria

1. THE Declared_Object_Check SHALL cross-reference DB objects declared as created in specs/tasks against the objects present in the actual schema.
2. IF a spec/task declares a DB object as created and that object is absent from the schema, THEN THE Declared_Object_Check SHALL fail and identify the missing object and its declaring task.
3. THE Declared_Object_Check SHALL cover materialized views, including `mv_historical_evidence`.
4. THE Declared_Object_Check SHALL be structured so that additional declared object types can be added to its coverage.
5. FOR ANY DB object declared as created by a completed task, that object SHALL exist in the schema (declared-object-existence correctness property).

### Requirement 21: CI wiring for all regression-prevention checks (C5)

**User Story:** As a developer, I want all the regression-prevention checks wired into the pre-push and pull-request pipeline, so that a green pipeline is proof these classes of bug cannot reach `main`.

**Context:** The existing local CI gate runs lint → `tsc` → Vitest, and the Supabase preview replays migrations on a fresh database before merge.

#### Acceptance Criteria

1. THE CI_Gate SHALL run the Static_Cast_Guard, the Schema_Contract_Test, and the Declared_Object_Check within the existing lint → `tsc` → Vitest pipeline.
2. THE CI_Gate SHALL run the RLS_Smoke_Test as a dedicated job against a Supabase preview branch before merge.
3. IF any regression-prevention check fails, THEN THE CI_Gate SHALL block the pull request from merging.
4. THE CI_Gate SHALL run the regression-prevention checks on every pull request targeting `main`.
5. WHILE all regression-prevention checks pass, THE CI_Gate SHALL report a green pipeline.
6. THE Platform SHALL NOT permit merging to `main` while any required regression-prevention check is red, consistent with the branch-protection rule.

---

### Part D — Do Not Regress / Out of Scope (Preserve Existing Behavior)

The following items were verified as already implemented correctly in current code (the reviewer's build was stale). Requirements that touch these areas must be framed as "preserve existing behavior." Reworking them is out of scope and risks regressions.

### Requirement 22: Preserve verified-working features

**User Story:** As a product owner, I want already-working features left intact, so that remediation does not introduce regressions in functioning areas.

#### Acceptance Criteria

1. THE Platform SHALL preserve the existing attendance features (`AttendanceMarker`, `AttendanceReport`, `ParentAttendancePage`, the student dashboard attendance section, and `useAttendance`) and their teacher/student/parent/admin RLS behavior.
2. THE Platform SHALL preserve the existing competency framework hierarchy (`competency_frameworks → competency_items → competency_outcome_mappings`), the `CompetencyTree`, CSV import, and indicator-to-outcome mapping behavior.
3. THE Platform SHALL preserve the existing separation between `departments` and `programs` and the `ProgramForm` department selector.
4. THE Platform SHALL preserve the existing gap-analysis recommendation behavior (`generateRecommendation()` and `GapAnalysisView`).
5. THE Platform SHALL preserve the existing Coordinator Coverage Heatmap color coding and Evidence/Attainment toggle.
6. THE Platform SHALL preserve the existing Marketplace Analytics (KPIs, popular items, category breakdown, CSV export) and XP Economist dashboard.
7. THE Platform SHALL preserve the existing bulk import features (`BulkImportPage` for users and `DataImportPage` for courses/outcomes/grades/enrollments).
8. THE Platform SHALL preserve the existing grading queue (`GradingQueuePage` with filters, data table, status badges, and Grade action).
9. THE Platform SHALL preserve the existing student-profile behaviors: password show/hide toggle, progressive onboarding, friendly self-efficacy fallback, single primary CTA, leaderboard minimum-cohort gate, empty states for challenges/marketplace/team, habit summaries, the real AI tutor backend, read-only calendar, the timetable current-class panel, private-by-default portfolio, and grouped navigation.
10. WHERE a new requirement in Part A or Part B modifies a surface adjacent to a preserved feature, THE Platform SHALL constrain the new implementation to guarantee no change to the preserved feature's existing behavior, even where that constrains the new functionality.

---

## Product-scope decisions (Non-Functional Note)

These are product-scope decisions recorded for context; they are not defects and are captured here to bound the work:

- **Fees / ERP scope:** The Fees feature is kept minimal. This spec fixes the program/semester dropdowns (Requirement 12) and explicitly de-scopes payroll, admissions, and transport for the pilot. Edeviser remains an OBE platform, not a full ERP.
- **Sankey rename vs build:** Requirement 11 leaves the choice open between building a real recharts Sankey flow diagram and renaming the view to "Outcome Mapping." Rename is the cheaper, pilot-safe option; a real flow diagram has higher demo impact. The design phase will record the chosen option.
- **Surveys / My Content navigation:** The student navigation concern is already mitigated (Surveys conditionally hidden, My Content de-emphasized). Full removal is a product decision, not part of this remediation.
