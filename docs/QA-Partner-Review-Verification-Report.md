# QA Partner Review — Senior Dev/QA Verification Report

**Date:** 2026-06-03
**Scope:** Cross-check of the manual QA reviews in `docs/pdf/QA/` (Admin, Admin2.0, Coordinator, Coordinator2.0, Teacher) plus `docs/pdf/Student Profile - Google Docs.pdf`, verified against the **actual current codebase, live Supabase schema (project `cdlgtbvxlxjpcddjazzx`), and RLS policies** — not against the reviewer's screenshots.
**Method:** Live SQL schema/RLS inspection via Supabase MCP + source reads of hooks, pages, columns, migrations, and specs. No application code was modified during verification.

> **Headline:** Your partner has strong product instincts. But he reviewed an **older build**. After verification, most of the Student-profile items and several Admin/Coordinator items are **already fixed in current code**. A smaller set of **genuinely broken / missing** items remain — and three of them are confirmed at the database level. This report separates fact from stale observation so we only build what actually needs building.

---

## Legend

- 🔴 **BROKEN** — Confirmed defect in current code. Fix required.
- 🟠 **PARTIAL** — Exists but has a real gap. Improvement required.
- 🟢 **WORKING** — Already implemented correctly in current code. Do **not** rework (reviewer's build was stale).
- ⚪ **WONT/SCOPE** — Subjective or product-scope decision, not a defect.

---

## 1. Confirmed BROKEN (must fix) — verified at code + DB level

### B1 🔴 Teacher → Student "Nudge" fails (RLS violation)

- **Reviewer (Teacher #31):** "Nudge button exists, clicking throws error." **Accurate.**
- **Root cause (DB-confirmed):** `useSendNudge` (`src/hooks/useTeacherDashboard.ts`) inserts into `notifications` with `user_id = studentId`. The only policy on `notifications` is `notifications_own` = `FOR ALL USING (user_id = auth.uid())` (migration `20260428000003_optimize_rls_policies.sql`). On INSERT the WITH CHECK resolves to `user_id = auth.uid()`, so a teacher writing a row for a **student** is rejected. There is no teacher→student notification policy and no Edge Function (service-role) path.
- **Fix direction:** Route nudges through a `SECURITY DEFINER` RPC or Edge Function (service role) that validates the teacher teaches that student, then inserts the notification. Do **not** loosen `notifications` RLS to allow arbitrary cross-user inserts.

### B2 🔴 Teacher "Create Challenge" fails (`xp_race_acknowledged` column does not exist)

- **Reviewer (Teacher, Challenges):** "Could not find the 'xp_race_acknowledged' column of 'social_challenges'." **Accurate.**
- **Root cause (DB-confirmed):** `social_challenges` has 16 columns; `xp_race_acknowledged` is **not** one of them. It is a **client-only Zod field** (`src/lib/schemas/challenge.ts`). `ChallengeFormPage` create branch passes `{...data}` (including `xp_race_acknowledged`) into `useCreateChallenge`, which does `.insert(input)`. PostgREST rejects the unknown column → every create fails.
- **Fix direction:** Strip non-column fields before insert (whitelist DB columns) in `useCreateChallenge`/`ChallengeFormPage`. No schema change needed — `xp_race_acknowledged` is legitimately UI-only (gate/confirmation).

### B3 🔴 "Create Team" fails (NOT NULL on `institution_id` / `captain_id`)

- **Reviewer (Teacher #2):** "Creating Team shows error / Teams non-functional." **Accurate (root cause differs from his guess).**
- **Root cause (DB-confirmed):** `teams.institution_id` and `teams.captain_id` are **NOT NULL** (migration `20260502102903_enforce_teams_not_null_constraints.sql`). But `useCreateTeam`, `TeamFormPage`, and `TeamManager` send only `name`, `course_id`, `created_by` (+ `avatar_letter`). Every insert violates NOT NULL.
- **Downstream impact:** Because team creation fails, Team Health / Team Challenges / Team-based pages have nothing to operate on — matching the reviewer's "Team Health has no value / not testable."
- **Fix direction:** Populate `institution_id` (from `profile.institution_id`) and `captain_id` (first selected member, per `teams_insert` RLS and the team-creation property test) in the create payload.

### B4 🔴 Historical Evidence shows developer text + the materialized view was never created

- **Reviewer (Admin #3):** "Screen says 'Requires mv_historical_evidence view' — developer language, institutions should never see this." **Accurate.**
- **Root cause (DB + spec confirmed):** `HistoricalEvidenceDashboard.tsx` renders the literal badge "Requires mv*historical_evidence view". The view **does not exist** — the only materialized view in the DB is `leaderboard_weekly`. See §4 for \_why* this slipped through (spec task `125.1` was marked complete but never applied).
- **Fix direction:** Two parts — (a) build the `mv_historical_evidence` materialized view + `useHistoricalEvidence` hook (the real feature), and (b) until then, replace developer text with a proper empty state.

---

## 2. Confirmed PARTIAL (real gaps to improve)

### P1 🟠 UUIDs exposed in teacher/admin tables

- **Reviewer (Admin/Teacher, repeated):** raw UUIDs in Courses, CLOs, Rubrics, Assignments. **Accurate where cited.**
- **Verified:**
  - Admin Courses: `program_id` and `teacher_id` rendered raw (`src/pages/admin/courses/columns.tsx`).
  - Teacher CLOs: `course_id` shown as `slice(0,8)+'…'` (`src/pages/teacher/clos/columns.tsx`).
  - Teacher Rubrics: `clo_id` rendered raw (`src/pages/teacher/rubrics/columns.tsx`).
  - Teacher Assignments: `course_id` raw UUID, **but** rubric column already resolves `rubrics.title` and CLOs shows a count (partial).
- **Fix direction:** Join/resolve names in the list queries (program name, teacher name, course name, CLO title) and render those. This is the single highest-credibility-per-effort fix.

### P2 🟠 Graduate Attributes UI doesn't surface mappings/attainment (backend exists)

- **Reviewer (Admin #1):** "Attribute = Label, not a measurable outcome layer." **Accurate for the UI.**
- **Verified:** `GraduateAttributeManager.tsx` only lists name/description + Add form. **However** `graduate_attribute_mappings` table exists and `useGraduateAttributeAttainment` already computes weighted GA→ILO attainment — it's just **not surfaced** on the page. So this is "wire up existing capability," not "build from scratch."

### P3 🟠 Admin PLO Attainment Heatmap is a hardcoded empty placeholder

- **Reviewer (Admin #4):** "Looks good but empty; no formula/derivation." **Accurate.**
- **Verified:** `AdminDashboard.tsx` PLO heatmap card body is a static empty `<p>`, no data hook, no drill-down. (The **Coordinator** Coverage Heatmap is real and color-coded — different component.)

### P4 🟠 AI Co-Pilot Performance shows bare 0% with no no-data state

- **Reviewer (Admin #5):** "0% reads as 'AI broken' vs 'no data yet'." **Fair UX critique.**
- **Verified:** `useAIPerformance` computes real rates from `ai_feedback`; returns 0 when total = 0. Dashboard shows `0%` / "0 total" with no distinct empty state → ambiguous. Fix = empty-state messaging when totals are zero.

### P5 🟠 CQI workflow missing Root Cause / Deadline / Evidence-of-Improvement

- **Reviewer (Coordinator #2):** missing Root Cause, Owner, Deadline, Evidence, Re-evaluation. **Half right.**
- **Verified:** `cqi_action_plans` **already has** owner (`responsible_person`), status lifecycle (planned→in_progress→completed→evaluated), and re-eval result (`result_attainment`). **Genuinely missing columns:** `root_cause`, `deadline/due_date`, `evidence_of_improvement`. Fix = add 3 columns + form fields + migration.

### P6 🟠 Coordinator Section Comparison shows 0% and has no drill-down

- **Reviewer (Coordinator #5):** "no drill-down to teacher/CLO/evidence." **Accurate, and worse:** on `CoordinatorDashboard.tsx` the bars feed `attainmentPercent: 0` (hardcoded, "populated once evidence exists") and `studentCount` = capacity. Fix = compute real section attainment + add drill-down.

### P7 🟠 "Sankey Diagram" is not a flow diagram

- **Reviewer (Coordinator #1, Admin):** "It's a list of CLOs/PLOs/ILOs, not a Sankey." **Accurate.**
- **Verified:** `SankeyDiagramView.tsx` renders 3 columns of styled divs + a "{n} outcomes · {m} mappings" caption; the `links` array is counted but **never drawn**. Decision needed: build a real flow (recharts Sankey is available) **or** rename to "Outcome Mapping." Either resolves the expectation mismatch.

### P8 🟠 Admin Fees uses free-text UUID inputs; ERP-scope question

- **Reviewer (Admin #7):** "Program ID / Semester ID should be dropdowns, not manual entry; why is Fees here at all?" **Dropdown critique accurate.**
- **Verified:** `FeeManager.tsx` uses `<Input placeholder="UUID">` for `program_id`/`semester_id`. Fix = replace with Program/Semester `Select`s. The ERP-scope question is a product decision (see §5).

### P9 🟠 Gradebook: no auto-load, no CSV export, no class-average

- **Reviewer (Teacher #5):** **Accurate.** `GradebookView` matrix works but requires manual course select, no export, no class-average row. (Note: Marketplace Analytics already has CSV export — pattern exists to reuse.)

### P10 🟠 No CLO detail drill-down / no rubric preview

- **Reviewer (Teacher #1, #2, #26):** **Accurate.** CLO columns = Edit/Delete only; Rubric columns = Edit/Copy/Delete only (no read-only preview). Fix = add CLO detail page + rubric preview dialog.

### P11 🟠 Announcements: no attachments, no read receipts (+ notification bug)

- **Reviewer (Teacher #4, Announcements):** attachments + read receipts missing. **Accurate.** `announcements` table has no attachment/read columns; no `announcement_reads` table. **Bonus bug found:** `useCreateAnnouncement` sends the notification to `user_id = author_id` (the teacher), so enrolled students are never notified. Fix = fan-out notifications to enrolled students + (optionally) attachments/read receipts.

### P12 🟠 No end-to-end outcome chain view

- **Reviewer (Admin #7, Admin2.0 #1):** "Can't trace ILO→…→Attainment end-to-end." **Accurate** — no single component renders the full chain (GA isn't wired into any chain view). This is the biggest _product-credibility_ item for accreditation buyers.

---

## 3. Already WORKING — do NOT rework (reviewer's build was stale)

These were reported as broken/missing but are **implemented correctly in current code**. Reworking them would waste effort and risk regressions.

| #   | Reviewer claim                                                          | Current reality (evidence)                                                                                                                                                                                                                                         |
| --- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| W1  | "Attendance is the biggest missing feature" (Teacher)                   | **Fully built**: `AttendanceMarker`, `AttendanceReport`, `ParentAttendancePage`, student dashboard attendance section, `useAttendance` (class_sessions, attendance_records) + RLS for teacher/student/parent/admin.                                                |
| W2  | "Competency Frameworks = flat text entry" (Admin)                       | **Hierarchy built**: `competency_frameworks → competency_items(parent_id) → competency_outcome_mappings`; `CompetencyTree` (domain/competency/indicator, expand/collapse, Unmapped flags) + CSV import + indicator→outcome mapping UI.                             |
| W3  | "Programs mislabeled as Departments" (Admin #2)                         | **Incorrect** — `departments` and `programs` are separate tables; `programs.department_id` FK; separate `DepartmentManager`/`ProgramListPage`; `ProgramForm` has a Department selector. (Hierarchy is correct; the reviewer saw seed data named like departments.) |
| W4  | "Gap analysis reports problems but no recommendations" (Coordinator #3) | **Built**: `gapAnalysis.ts` `generateRecommendation()` produces action text; `GapAnalysisView` renders flag + recommendation.                                                                                                                                      |
| W5  | "Coverage Heatmap has no R/Y/G" (Coordinator #4)                        | **Color-coded** via `getEvidenceCountColor`/`getAttainmentColor` + Evidence/Attainment toggle. (Only a single aggregate "coverage score" header is absent.)                                                                                                        |
| W6  | "Marketplace has no analytics" (Admin)                                  | **Built**: `MarketplaceAnalyticsPage` (KPIs, popular items, category breakdown, CSV export) + `XPEconomistDashboard` (earn/spend ratio, inflation status, XP velocity).                                                                                            |
| W7  | "Bulk import missing" (Admin #9)                                        | **Built**: `BulkImportPage` (CSV users, Zod validation, preview, ≤1000 rows) + `DataImportPage` (courses/outcomes/grades/enrollments with templates). CSV only (not Excel).                                                                                        |
| W8  | "Grading Queue empty/non-functional" (Teacher #4)                       | **Built**: `GradingQueuePage` with filters, DataTable, status badges, Grade action.                                                                                                                                                                                |
| S1  | Password no show/hide toggle                                            | **Built**: `PasswordInput` + `PasswordVisibilityGroup` on login + signup.                                                                                                                                                                                          |
| S2  | Too many forced profiling assessments                                   | **Progressive**: Day-1 = welcome/personality(3)/self-efficacy(2)/summary; rest via micro-assessments days 2–14; steps skippable.                                                                                                                                   |
| S3  | "No self-efficacy questions… contact admin" looks broken                | **Fixed**: friendly `FallbackPanel` with Continue; old string only in remediation spec.                                                                                                                                                                            |
| S4  | Dashboard lacks single next action                                      | **Built**: priority-ranked `PrimaryCTA`.                                                                                                                                                                                                                           |
| S5  | Leaderboard ranks #1 with one student                                   | **Fixed**: min-cohort gate (default 5) → `LeaderboardLockedState`, entries hidden until unlocked.                                                                                                                                                                  |
| S6  | Challenges/Marketplace/My Team empty pages                              | **Fixed**: `NoChallenges` / `NoMarketplaceItems` / `NoTeams` empty states.                                                                                                                                                                                         |
| S7  | Habits heatmap hard to read                                             | **Fixed**: summary stats + best-habit + plain-language summary for younger students.                                                                                                                                                                               |
| S8  | "AI Tutor NOT WORKING"                                                  | **Built**: `chat-with-tutor` Edge Function (RAG, personas, autonomy, integrity, usage limits) + SSE streaming frontend with error states. (Worth a live smoke test, but it is not a stub.)                                                                         |
| S9  | Calendar duplicates Planner/Today                                       | **Fixed**: read-only `CalendarView` with notice + dedupe.                                                                                                                                                                                                          |
| S10 | Timetable mostly empty                                                  | **Fixed**: `CurrentClassPanel` (now / up next + countdown) + `NoTimetable`.                                                                                                                                                                                        |
| S11 | Portfolio public risky for minors                                       | **Fixed**: private by default + admin-permission gate.                                                                                                                                                                                                             |
| S12 | Too many nav items                                                      | **Fixed**: grouped Learn/Growth/Community/Tools sections.                                                                                                                                                                                                          |

---

## 4. Why didn't our migrations / DB specs catch these? (your direct question)

This is the important part. Five distinct gaps explain it:

1. **A spec task was checked off without the migration actually being applied.**
   `.kiro/specs/edeviser-platform/tasks.md` task **125.1** — _"Apply historical evidence materialized view migration via Supabase MCP apply_migration"_ — is marked `[x]`. **No such migration exists** in `supabase/migrations/` (only `leaderboard_weekly` is created). The task was marked complete but the DDL was never run. **Lesson:** "task complete" ≠ "migration in `supabase/migrations/` + replays clean." We should treat a task as done only when the migration file exists and the replay checker passes.

2. **The broken inserts are client-side payload bugs, which migrations cannot catch.**
   B2 (challenge) and B3 (team) are not schema problems — the schema is _correct_. They are the **frontend sending columns that don't exist** (`xp_race_acknowledged`) or **omitting NOT NULL columns** (`institution_id`, `captain_id`). Migration linting/replay validates the schema, not how the app calls it. **Lesson:** these need **integration tests that hit the real PostgREST/RLS layer**, not unit tests that mock `supabase`.

3. **Tests mock Supabase, so RLS/insert-shape failures are invisible.**
   The team property test (`teamCreation.property.test.ts`) builds a plain JS object and asserts captain logic — it never performs a real insert, so it can't see the NOT NULL violation. The nudge tests mock the mutation. **Lesson:** add a thin layer of **RLS/insert smoke tests** (seeded roles, real insert) for the mutation paths that touch RLS-protected tables (`notifications`, `teams`, `social_challenges`).

4. **The migration replay/lint gate only checks ordering & function refs, not feature completeness.**
   Per `migration-replay-integrity.md`, the Supabase Preview gate proves migrations _replay cleanly from scratch_ — it does **not** prove that a feature's expected object (like `mv_historical_evidence`) was ever authored. A missing view passes replay just fine. **Lesson:** add a "declared objects exist" check that cross-references spec-declared DB objects against the actual schema.

5. **UUID exposure / empty-state / no-drill-down are UX-contract gaps, not DB gaps.**
   P1, P3, P4, P6 are presentation-layer issues. No DB spec would flag them. **Lesson:** these belong to a UI-contract checklist (no raw UUIDs in user-facing tables; every metric has a no-data state; every aggregate row supports drill-down), enforceable with lint rules / component tests.

**Net:** the database specs _did_ their job for what they cover (schema correctness + clean replay). The misses fall into three buckets they were never designed to catch: (a) a falsely-completed task, (b) client→DB payload mismatches, and (c) UX contracts. The remediation plan adds guardrails for all three.

---

## 5. Product-scope decisions (not defects — need your call)

- **Fees / ERP scope (Admin #7):** Reviewer asks whether Edeviser is an OBE platform or a full ERP. Recommend keeping Fees minimal (fix the dropdowns) and explicitly de-scoping payroll/admissions/transport for the pilot.
- **Sankey (P7):** build a real flow diagram **or** rename to "Outcome Mapping." Rename is the cheaper pilot-safe option; real Sankey is higher impact for demos.
- **Marketplace strategic loop (Admin):** reviewer's "if I remove Marketplace, does attainment drop?" is a design question for the economy, not a bug.
- **Surveys / My Content in student nav (Student #15):** currently mitigated (Surveys conditionally hidden, My Content de-emphasized). Decide whether full removal is wanted.

---

## 6. Recommended remediation priority (for the spec)

**P0 — Broken, blocks core workflows (this sprint):**

- B1 Nudge RLS path, B2 Challenge insert whitelist, B3 Team insert required fields, B4 Historical Evidence (empty-state now + MV migration).

**P1 — Credibility & accreditation (high ROI):**

- P1 UUID→name resolution (all tables), P2 GA mappings/attainment surfacing, P12 outcome-chain view, P5 CQI fields, P11 announcement notification fan-out.

**P2 — Decision-support polish:**

- P3 admin PLO heatmap, P4 AI no-data states, P6 section comparison real data + drill-down, P9 gradebook auto-load/export/average, P10 CLO detail + rubric preview, P8 fee dropdowns, P7 Sankey decision.

**Guardrails (from §4) to add alongside:**

- RLS insert smoke tests for `notifications`/`teams`/`social_challenges`.
- "Declared DB objects exist" check vs spec.
- UI-contract lint: no raw UUIDs in user-facing tables; mandatory no-data states.

---

_Verification performed against live schema and current source. Application code unchanged. This report is the input to the `qa-partner-review-remediation` feature spec._

---

# Addendum — UI/UX Suggestions Verification (separate from functional bugs)

Your partner made many **UI/UX polish** suggestions in addition to the functional issues. Each was verified against current code. Same legend: 🔴 MISSING · 🟠 PARTIAL · 🟢 DONE.

## Teacher UI/UX (9 missing, 1 partial, 0 done)

| #    | Suggestion                                                                                                   | Verdict    | Evidence                                                                                                                     |
| ---- | ------------------------------------------------------------------------------------------------------------ | ---------- | ---------------------------------------------------------------------------------------------------------------------------- |
| TU1  | KPI cards should visually prioritize action-required metrics (Pending, At-Risk) over Avg Attainment / Graded | 🔴 MISSING | All 4 use identical `KPICard` styling; no color/size/emphasis differentiation (`TeacherDashboard.tsx:108-122, 486-507`)      |
| TU2  | CLO attainment bars should be click-to-drill-down                                                            | 🔴 MISSING | Recharts Bar has hover tooltip only, no onClick (`TeacherDashboard.tsx:560-600`)                                             |
| TU3  | Bloom's distribution should filter/show tagged assessments on click                                          | 🔴 MISSING | Pie has Legend+Tooltip, no onClick (`TeacherDashboard.tsx:612-655`)                                                          |
| TU4  | Student heatmap cells should open student detail                                                             | 🔴 MISSING | Static divs with `title` tooltip only (`TeacherDashboard.tsx:660-710`)                                                       |
| TU5  | Grading Stats too large; surface pending/late/turnaround                                                     | 🟠 PARTIAL | Pending + avg turnaround + streak already shown; large velocity chart remains, no "late" metric (`GradingStats.tsx:118-175`) |
| TU6  | At-Risk needs full workflow (View Details/Message/Notify Parent/Create Intervention/Assign Tutor)            | 🔴 MISSING | Only "Nudge" action exists (`AtRiskStudentRow.tsx:99-118`, `AIAtRiskWidget`, `TeacherDashboard.tsx:222-230`)                 |
| TU7  | CLO list Status should show Attainment % / Students Achieved / Linked Assessments                            | 🔴 MISSING | Only Active/Inactive badge (`teacher/clos/columns.tsx:79-99`)                                                                |
| TU8  | Rubric list needs usage info ("Used in N assignments", "Last used")                                          | 🔴 MISSING | Title/CLO/Type/Actions only (`teacher/rubrics/columns.tsx:24-104`)                                                           |
| TU9  | Assignment list needs submission stats + row quick-actions                                                   | 🔴 MISSING | No submitted/pending/late; actions = Edit/Delete only (`teacher/assignments/columns.tsx:55-167`)                             |
| TU10 | Announcements need audience info, read tracking, scheduling                                                  | 🔴 MISSING | Schema = course_id/title/content/is_pinned; no audience/read/scheduled fields (`AnnouncementEditor.tsx:48-54`)               |
| TU11 | Teacher nav: group analytics items (Team Health, Tutor Analytics/Handoffs, Baseline)                         | 🔴 MISSING | `teacherNavItems` is a flat list, no `group` field (`navItems.ts:149-195`)                                                   |

## Student UI/UX (8 done, 3 partial, 3 missing)

| #    | Suggestion                                               | Verdict    | Evidence                                                                                                                                         |
| ---- | -------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| SU1  | Mascot on auth screens                                   | 🔴 MISSING | `Mascot` component + "password" moment exist but unused on login/signup (`mascotGuidance.ts:25-46`; no `moment="password"` usage)                |
| SU2  | Mascot during onboarding/empty/firstXP/firstEnrollment   | 🟠 PARTIAL | Wired for welcome + assessmentIntro only (`WelcomeStep.tsx:46`, `AssessmentIntro.tsx:63`); emptyState/firstXp/firstEnrollment defined but unused |
| SU3  | Benefit-oriented assessment titles                       | 🟢 DONE    | "Discover How You Learn Best", "Academic Confidence Check" etc. (`student.json:212-247`). Residual raw terms only on deep sub-pages              |
| SU4  | Show assessment value before asking                      | 🟢 DONE    | Estimated time + benefits gate the body (`AssessmentIntro.tsx:66-92`)                                                                            |
| SU5  | Explain WHY profile completion matters (vs XP)           | 🟠 PARTIAL | Explanation only on `CompleteProfilePage` sub-page; dashboard bar has no why/tooltip (`ProfileCompletenessBar.tsx`)                              |
| SU6  | Habits reward/progress explanations                      | 🟠 PARTIAL | Perfect-Day +XP shown only in habit-page tooltips; dashboard habit grid has no reward copy (`HabitTracker.tsx`)                                  |
| SU7  | Course cards: teacher/progress/color/next assignment     | 🟢 DONE    | All present (`CourseCard.tsx:45-150`)                                                                                                            |
| SU8  | Attainment % explanation tooltip                         | 🟢 DONE    | `AttainmentInfo.tsx:153-191` popover on course card                                                                                              |
| SU9  | Duplicate Session/Task vs Quick-Add buttons              | 🟢 DONE    | Consistent labels; no global add buttons (`student.json:356-359`, `GlobalHeader.tsx`)                                                            |
| SU10 | Empty weekly planner "No items" x7                       | 🟢 DONE    | Suggested sessions + deadlines per day (`weeklyPlannerContent.ts buildPlannerWeek`)                                                              |
| SU11 | Weekly Goals examples when empty                         | 🟢 DONE    | `getExampleGoals()` + `WeeklyGoalPanel.tsx:250-300`                                                                                              |
| SU12 | Calendar monthly/weekly toggle too small                 | 🔴 MISSING | Still `text-xs` triggers, no enlarged touch target (`CalendarView.tsx:127-138`)                                                                  |
| SU13 | Timetable single-color legend feels disconnected         | 🔴 MISSING | Legend always maps all course colors, no single-color handling (`TimetableView.tsx:205-230`)                                                     |
| SU14 | Portfolio CLO wording → Strengths/Skills/Areas improving | 🟢 DONE    | `splitByFriendlyGroup` + friendly strings (`StudentPortfolio.tsx`, `student.json:190-196`)                                                       |
| SU15 | Journal quick reflection templates                       | 🟢 DONE    | `reflectionPrompts.ts` + journal quick-picks (`student.json:144-146`)                                                                            |

## Admin / Coordinator UI/UX (mostly missing — these are the "record vs decision-system" gaps)

| #   | Suggestion                                                                               | Verdict    | Evidence                                                                                                                                              |
| --- | ---------------------------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| AU1 | Department click-through profile (HoD/Programs/Faculty/Students/Courses/Attainment/Risk) | 🔴 MISSING | List + edit/delete only, row not clickable (`DepartmentManager.tsx:222-289`)                                                                          |
| AU2 | Course click-through profile                                                             | 🔴 MISSING | Only edit/enrollment routes exist (`courses/columns.tsx:40-128`, `AppRouter.tsx:522-529`)                                                             |
| AU3 | Semester impact snapshot                                                                 | 🔴 MISSING | Name/code/dates/active toggle only (`SemesterManager.tsx:211-281`)                                                                                    |
| AU4 | Governance (created/modified by, version, approval) on entities                          | 🟠 PARTIAL | Only `created_at` on outcomes; global AuditLogPage exists but not bound to entities                                                                   |
| AU5 | "No data yet" messaging vs bare 0%                                                       | 🟠 PARTIAL | Rich EmptyState system exists & used on dedicated pages; dashboards still show bare 0%/0 (AI metrics, PLO heatmap, recovery KPIs, section comparison) |
| AU6 | Admin dashboard guided actions                                                           | 🟠 PARTIAL | Only Pending-Onboarding CTA + 3 static nav cards; no data-driven recommendations                                                                      |
| CU1 | Coverage Heatmap aggregate score + recommended actions                                   | 🔴 MISSING | Colored matrix only, no score header/recommendations (`CoverageHeatmapView.tsx:95-160`)                                                               |
| CU2 | Section Comparison: risk highlight, trends, drill-down                                   | 🟠 PARTIAL | Per-index colors only (not risk-based); no trends/drill-down; fed hardcoded 0% (`SectionComparisonChart.tsx:24-54`)                                   |
| CU3 | Risk-based gap tiers (Critical/High/Medium)                                              | 🔴 MISSING | Only fully/partially/unmapped/no_evidence (`gapAnalysis.ts:3-37`)                                                                                     |
| CU4 | CQI AI-assisted recommendations / decision-support                                       | 🔴 MISSING | Manual CRUD + status only, no AI cause analysis (`CQIManager.tsx:58-88`)                                                                              |

## Cross-cutting UI/UX theme (the reviewer's strongest insight)

His recurring point — _"screens look institution-grade but behave like record-management, not decision-making systems"_ — is **substantiated by code**. The pattern is real and consistent:

- **No drill-downs**: CLO bars, Bloom pie, student heatmap, departments, courses, semesters, section comparison — all are read-only displays with no click-through.
- **Bare zeros on dashboards**: the EmptyState system exists and is excellent, but several dashboard tiles bypass it and render `0%`/`0`, which reads as "broken."
- **Lists over actions**: teacher list pages lack the inline actions (grade, view submissions, intervene) that make them workflow centers.

This is the highest-leverage UX theme for the pilot and belongs in the requirements as a first-class concern, not scattered tweaks.

## Why the UI/UX gaps weren't caught before (extends §4)

6. **No "interaction contract" in specs or tests.** Specs described _what data_ a screen shows, not _what a user can do next_ (drill-down, act, intervene). Component tests assert rendering, not click-through navigation. So "displays the heatmap" passed while "clicking a cell opens the student" was never a requirement. **Lesson:** add interaction-contract acceptance criteria (every metric is either actionable or explicitly terminal; every aggregate supports drill-down where a detail view exists).

7. **Empty-state usage isn't enforced.** The `EmptyState` library is strong but optional — dashboards regressed to `?? 0`. **Lesson:** lint/review rule: zero-valued metric tiles must use a no-data state, not a bare `0`.

8. **Mascot/coaching moments were built but only partially wired.** The `mascotGuidance` system defines 6 moments; only 2 are used. **Lesson:** when a system defines N states, a test should assert each declared state has at least one render site (prevents "built but unused").
