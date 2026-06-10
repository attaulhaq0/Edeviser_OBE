# Implementation Plan

## Overview

This plan remediates every finding in the Full-Profile Audit using the bug-condition methodology:
first surface counterexamples that prove each defect class on UNFIXED code (exploration), then
capture existing healthy behavior (preservation), then apply the targeted fixes, then re-run the
SAME tests to confirm each bug is fixed and nothing regressed.

Property numbering mirrors the design's Correctness Properties:

- Property 1 — Role-gate bug condition (`isRoleGateBug`)
- Property 2 — Schema-drift bug condition (`isSchemaDriftBug`)
- Property 3 — Engagement-XP bug condition (`isEngagementXpBug`)
- Property 4 — Planner-status bug condition (`isPlannerStatusBug`)
- Property 5 — Parent-access bug condition (`isParentAccessBug`)
- Property 6 — Preservation (NOT any bug condition)

Steering constraints that apply to every task: never hand-edit `src/types/database.ts` (regenerate
via `pwsh scripts/regen-types.ps1` after any migration); run `npm run lint`, `npx tsc --noEmit`, and
`npm test` before any push; never push to `main` (feature branch + PR); RLS on all tables;
append-only invariants (evidence, audit_logs, xp_transactions) intact; migration-replay-integrity
(`npm run db:check-replay`) before pushing any migration.

## Task Dependency Graph

```json
{
  "waves": [
    {
      "wave": 1,
      "description": "Exploration + preservation tests written and run on UNFIXED code before any fix",
      "tasks": ["1", "2", "3", "4", "5", "6"]
    },
    {
      "wave": 2,
      "description": "Sprint A blockers - role-gate, schema drift, planner/XP contract",
      "tasks": ["7", "8", "9"]
    },
    {
      "wave": 3,
      "description": "Sprint B - engagement loop, parent RLS, teacher fixes",
      "tasks": ["10", "11", "12"]
    },
    {
      "wave": 4,
      "description": "Sprint C - shared infra, hygiene, RAG, reconciliation, report",
      "tasks": ["13", "14", "15", "16", "17"]
    },
    {
      "wave": 5,
      "description": "Final checkpoint - all tests pass, CI gates green",
      "tasks": ["18"]
    }
  ]
}
```

Notes on ordering:

- Tasks 1–6 (exploration + preservation) have no dependencies and come first.
- Each verify sub-task (7.2/7.3, 8.3, 9.4/9.5, 10.6/10.7, 11.3/11.4, 12.3) depends on its implementation sub-task.
- Task 10 (engagement loop) depends on 9.2 (award-xp allow-list); within it, 10.1 (perfectDay helper) precedes 10.2/10.3.
- Migrations (11.1, 12.2, 14.6 challenge-RLS INSERT policy) each require `npm run db:check-replay` + type regeneration before the next dependent task.
- Task 18 (checkpoint) depends on every implementation and verify task.

## Tasks

### Phase 1 — Exploration tests (write BEFORE any fix; expected to FAIL / demonstrate the defect)

- [x] 1. Write role-gate bug condition exploration test

  - **Property 1: Bug Condition** - Role-gated functions reject real staff (JWT-role read)
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate role-gated edge functions read the caller role from JWT `app_metadata`/`user_metadata` (empty on this project) instead of `profiles`
  - **Scoped PBT Approach**: scope the property to the concrete failing case(s) — a caller whose `app_metadata.role` is empty but whose `profiles.role ∈ {admin, coordinator, teacher}` and `isServiceRole = false` (matches `isRoleGateBug`)
  - Test `_shared/auth.ts` `authenticateRequest` resolving role for such a caller returns `""` (root cause), and assert the post-fix expectation: role/`institution_id` resolved from `profiles` and `authorized = true` (status ≠ 403)
  - Add a case asserting the service-role / `x-internal-auth` branch still authorizes (must be preserved)
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (coordinator calling `generate-course-file` → `403 "admin or coordinator role required"` before any query)
  - Document counterexamples found (e.g. `curriculum@gulf-academy.test` → 403)
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3 (validates 2.1, 2.2, 2.3)_

- [x] 2. Write schema-drift bug condition exploration test

  - **Property 2: Bug Condition** - PDF generators query a pre-migration vocabulary and fail silently
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples where `generate-accreditation-report` / `generate-course-file` select dead columns/scopes (`score_percent`, `child/parent_outcome_id`, `scope IN {PLO,ILO,CLO}`, `graduate_attributes.title/code`, `cqi_action_plans.title/gap_description/corrective_actions` by `course_id`) with no `if (error) throw`, so sections render empty at HTTP 200
  - **Scoped PBT Approach**: scope to the concrete failing selects enumerated in `isSchemaDriftBug`
  - Assert post-fix expectation: queries use live columns/scopes (`attainment_percent`, `source/target_outcome_id`, `graduate_attributes.name/description`, `cqi_action_plans.action_description/root_cause` by `program_id`), each guarded by `if (error) throw`, and PLO/ILO/GA/CQI/sample-work sections are populated
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (HTTP 200 with PLO/ILO = 0 / "Not Yet" and empty GA/CQI sections)
  - Document counterexamples found
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.4, 1.5 (validates 2.4, 2.5)_

- [x] 3. Write engagement-XP bug condition exploration test

  - **Property 3: Bug Condition** - Self-triggered engagement XP rejected / never invoked
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples where a student-JWT `award-xp` call for a source outside the allow-list (`login/submission/journal`) returns `403`, and where `login_streak/perfect_day/grade/journal` flows never invoke `award-xp` at all (matches `isEngagementXpBug`)
  - **Scoped PBT Approach**: enumerate the affected sources (`study_session`, `wellness_habit`, `planner_task`, `weekly_goal`, `review_session`, `review_cycle_complete`) and assert each returns `403` today
  - Assert post-fix expectation: XP awarded equals the server-enforced canonical amount per source (`study_session` clamp 0–60, `wellness_habit` institution-configured, `planner_task` 10, `weekly_goal` 25, `review_session` 15, `review_cycle_complete` 25; login 10, journal 20, grade 15, perfect_day 50), no silent `403`, and a student-supplied arbitrary `xp_amount` is IGNORED (server value wins)
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (study_session by student JWT → 403, XP never awarded)
  - Document counterexamples found
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.7, 1.8, 1.9, 1.10, 1.12, 1.13 (validates 2.7, 2.9, 2.10, 2.12, 2.13)_

- [x] 4. Write planner-status bug condition exploration test

  - **Property 4: Bug Condition** - Planner writes violate the DB CHECK
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface the counterexample where `usePlannerTasks` writes `status:'pending'` (create) / `status:'completed'` (complete), violating `planner_tasks_status_check` (allowed: `todo/in_progress/done/deferred`), hidden today by `as never` casts
  - **Scoped PBT Approach**: property over the valid DB status set — for all statuses in `{todo,in_progress,done,deferred}` the write succeeds and maps to a UI badge; the legacy `pending/completed` values are rejected by the CHECK
  - Assert post-fix expectation: create writes `todo`, complete writes `done`, `PlannerTask["status"]` is the four-value union, badge mapping covers all four, no `as never`
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (`planner_tasks_status_check` violation on `pending`)
  - Document counterexamples found
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.6 (validates 2.6)_

- [x] 5. Write parent-access bug condition exploration test
  - **Property 5: Bug Condition** - Parents cannot read verified linked children's course data
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface the counterexample where a verified parent selecting `student_courses` / `course_sections` / `class_sessions` gets `[]` (no parent SELECT RLS policy), so Progress/Attendance short-circuit to empty (matches `isParentAccessBug`)
  - **Scoped PBT Approach**: property over `(parent, child, verified?)` tuples — assert that today a verified-linked parent still receives `[]` from `student_courses`
  - Assert post-fix expectation: a verified-linked parent receives the child's rows; an unverified link / non-parent / cross-institution caller still receives `[]` (no broadening)
  - Run test on UNFIXED code (against a verified parent demo account or seeded link)
  - **EXPECTED OUTCOME**: Test FAILS (verified parent → `[]` → empty page)
  - Document counterexamples found
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.19 (validates 2.19, 2.20)_

---

### Phase 2 — Preservation tests (write BEFORE any fix; observe UNFIXED behavior, expected to PASS)

- [x] 6. Write preservation property tests (BEFORE implementing any fix)
  - **Property 6: Preservation** - Non-buggy inputs are unchanged
  - **IMPORTANT**: Follow observation-first methodology — run UNFIXED code with inputs where NO bug condition holds (`NOT (isRoleGateBug OR isSchemaDriftBug OR isEngagementXpBug OR isPlannerStatusBug OR isParentAccessBug)`), record actual outputs, then write property-based tests (fast-check, ≥100 iterations) that assert those observed outputs
  - Observe + assert: **RLS isolation (9 boundary probes)** — a non-parent, an unverified link, and a cross-institution caller all return `[]`
  - Observe + assert: **XP ledger invariant** — for random sequences of XP awards (including currently-working sources: submission +25 / +15 late, marketplace purchase, bonus-event multiplier), `xp_total = SUM(xp_transactions)` and `level = calculateLevel(xp_total)` (zero drift)
  - Observe + assert: **badges idempotent** — repeated `check-badges` awards each `scope='individual'` badge at most once
  - Observe + assert: **`award-xp`/`check-badges` auth** — `verify_jwt=false` + exact `x-internal-auth` service-role match + user-JWT ownership for self sources; cross-user writes still `403`
  - Observe + assert: **leaderboard** — `get_leaderboard_page(p_institution_id, p_limit, p_offset)` rows + anonymous opt-out unchanged
  - Observe + assert: **grade→evidence→attainment cascade** via `trigger_attainment_rollup` unchanged; `calculate-attainment-rollup` stays disconnected
  - Observe + assert: **tutor without RAG** — with no `OPENAI_API_KEY`, persona + CLO answers still return and homework-completion requests are refused
  - Observe + assert: **already-deployed functions** — `ai-feedback-draft`, `ai-module-suggestion`, `generate-quiz-questions` continue to authorize via `profiles` / `program_id → programs`
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms the baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11_

---

### Phase 3 — Implementation (Sprint A: blockers / highest leverage)

- [x] 7. Class 1 — Role-gate fix (resolve role from profiles)

  - [x] 7.1 Fix `_shared/auth.ts` and the two PDF functions to read role from profiles

    - In `supabase/functions/_shared/auth.ts` `authenticateRequest`: after `getUser()`, create a service-role admin client and resolve `role` + `institution_id` from `profiles` by `user.id`; keep JWT-metadata as fallback (`profiles ?? app_metadata ?? user_metadata ?? ""`)
    - Leave `authenticateCronRequest` / `isServiceRole` / `x-internal-auth` path untouched (must be first/preserved)
    - In `generate-accreditation-report/index.ts` and `generate-course-file/index.ts`: replace the inline `user.app_metadata?.role ?? …` block with a `profiles` lookup mirroring `ai-feedback-draft` EXACTLY (`.select("role, institution_id").eq("id", caller.id).maybeSingle()`); gate on `["admin","coordinator"]`; use the resolved `institution_id`; preserve the 401 branches
    - In `send-email-notification`, `check-login-rate`, `calculate-attainment-rollup`: route any role/identity gate through the corrected source, keep the `isServiceRole` branch first; `calculate-attainment-rollup` stays disconnected (only its auth source is corrected)
    - _Bug_Condition: isRoleGateBug(input) — JWT role empty, profiles role ∈ {admin,coordinator,teacher}, not service role_
    - _Expected_Behavior: resolve role + institution_id from profiles; authorized=true (status ≠ 403); service-role/cron branch preserved_
    - _Preservation: ai-feedback-draft/ai-module-suggestion/generate-quiz-questions unchanged; isServiceRole/x-internal-auth path unchanged (3.4, 3.5)_
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 7.2 Verify role-gate exploration test now passes

    - **Property 1: Expected Behavior** - Role-gated functions authorize by profiles role
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - Run the role-gate exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (coordinator → 200/PDF; student → 403; service-role/cron still authorized)
    - _Requirements: validates 2.1, 2.2, 2.3_

  - [x] 7.3 Verify preservation tests still pass
    - **Property 6: Preservation** - Non-buggy inputs unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 6 - do NOT write new tests
    - Confirm `award-xp`/`check-badges` auth, RLS isolation, and the already-deployed AI functions are unchanged
    - **EXPECTED OUTCOME**: Tests PASS (no regressions)

- [x] 8. Class 2 — Column/schema drift fix (query live schema, fail loudly)

  - [x] 8.1 Fix `generate-accreditation-report/index.ts`

    - `score_percent` → `attainment_percent`; select `outcome_id, scope, attainment_percent, student_id, course_id`
    - Remove `scope === 'PLO'/'ILO'` filters; derive PLO/ILO attainment via `outcome_id` join against `learning_outcomes` using live scopes (`.in("scope", ["program","institution"])`), mirroring `useDepartmentAnalytics`
    - `graduate_attributes.select("id, title, code")` → `.select("id, name, description")`; PDF reads `name`/`description`; drop `code`
    - Add `if (error) throw` to program, semester, courses, outcomes, survey, CQI, sections, GA, and competency selects
    - _Bug_Condition: isSchemaDriftBug(input) — dead columns/scopes, no error guard_
    - _Expected_Behavior: live columns/scopes + if(error)throw; attainment + GA sections populated_
    - _Preservation: grade→attainment cascade unchanged (3.7)_
    - _Requirements: 2.4_

  - [x] 8.2 Fix `generate-course-file/index.ts`

    - `outcome_mappings`: `child_outcome_id/parent_outcome_id` → `source_outcome_id/target_outcome_id` (update `MappingRow` and all references)
    - Sample student work: scores live on `grades` — fetch submissions for the assignment IDs, then `grades.select("submission_id, score_percent")` keyed by those submission IDs; aggregate best/avg/worst from grade rows (mirror `useGrades`)
    - `outcome_attainment`: `attainment_percent` + `.in("outcome_id", cloIds)` filtered to `student_course` scope (drop `scope='CLO'`)
    - CQI: `.select("id, action_description, root_cause, status").eq("program_id", c.program_id)` (was `title/gap_description/corrective_actions` by `course_id`); drop `title`
    - Add `if (error) throw` to CLOs, PLOs, mappings, assignments, submissions, grades, attainment, reflections, CQI selects (leave bucket handling as-is — out of scope)
    - _Bug_Condition: isSchemaDriftBug(input)_
    - _Expected_Behavior: source/target_outcome_id, grades scores, attainment_percent + student_course scope, CQI by program_id; mapping/sample-work/attainment/CQI sections populated_
    - _Preservation: no behavior change for non-drift queries (3.7, 3.11)_
    - _Requirements: 2.5_

  - [x] 8.3 Verify schema-drift exploration test now passes
    - **Property 2: Expected Behavior** - PDF generators query the live schema and fail loudly
    - **IMPORTANT**: Re-run the SAME test from task 2 - do NOT write a new test
    - **EXPECTED OUTCOME**: Test PASSES (PLO/ILO non-zero, GA/CQI/sample-work/mapping sections populated; a deliberately bad column now throws)
    - _Requirements: validates 2.4, 2.5_

- [x] 9. Class 3 — Client/DB contract & XP authorization

  - [x] 9.1 N-1 Planner status union (hook + types + UI)

    - `src/types/planner.ts`: `TaskStatus = "todo" | "in_progress" | "done" | "deferred"` (replaces `"pending"|"completed"`)
    - `src/hooks/usePlannerTasks.ts`: `mapTask` default `"todo"`; create insert `status:"todo"`; complete update `status:"done"`; optimistic `"completed" as const` → `"done"`; remove the `as never` casts
    - Planner badge/label UI: map `todo`→neutral, `in_progress`→blue, `done`→green, `deferred`→amber (replace any `pending/completed` switch)
    - _Bug_Condition: isPlannerStatusBug(input) — status ∈ {pending, completed}_
    - _Expected_Behavior: DB-valid status written; four-value union; no CHECK violation; no `as never`_
    - _Preservation: planner CRUD otherwise unchanged (3.11)_
    - _Requirements: 2.6_

  - [x] 9.2 N-3 `award-xp` self-trigger allow-list with server-enforced amounts

    - In `award-xp/index.ts`, add `study_session, wellness_habit, planner_task, weekly_goal, review_session, review_cycle_complete` to `selfTriggeredSources`
    - For the newly self-allowed sources, add idempotent `reference_id` derivation (e.g. `${source}:${student_id}:${reference_id||today}`) so replays cannot farm XP; the per-source `cappedXpAmount` block keeps enforcing the canonical amount; the student-supplied `xp_amount` is ignored
    - _Bug_Condition: isEngagementXpBug(input) — student JWT source outside allow-list_
    - _Expected_Behavior: server-enforced canonical amount, no silent 403, arbitrary xp_amount ignored, idempotent reference_
    - _Preservation: existing self sources (login/submission/journal), service-role auth, cross-user 403, xp_total invariant unchanged (3.2, 3.4, 3.8)_
    - _Requirements: 2.7_

  - [x] 9.3 N-5 `generate-plan-update` interaction_count + blooms_level drift

    - Validate/default `const interactionCount = Number.isFinite(recent_interaction_count) && recent_interaction_count >= 0 ? recent_interaction_count : 0;` and insert `interaction_count: interactionCount`
    - Fix latent drift: `select("id, title, bloom_level")` → `select("id, title, blooms_level")`; read `cloData?.blooms_level`
    - _Bug_Condition: invoke without recent_interaction_count → NOT NULL violation_
    - _Expected_Behavior: interaction_count defaults to a number; insert succeeds (no 500)_
    - _Preservation: tutor/plan-update LLM behavior + integrity guard unchanged (3.6)_
    - _Requirements: 2.8_

  - [x] 9.4 Verify engagement-XP and planner-status exploration tests now pass

    - **Property 3: Expected Behavior** - Engagement XP awarded with server-enforced canonical amounts
    - **Property 4: Expected Behavior** - Planner status values satisfy the DB CHECK
    - **IMPORTANT**: Re-run the SAME tests from tasks 3 and 4 - do NOT write new tests
    - **EXPECTED OUTCOME**: Both PASS (study_session by student JWT → +canonical XP not 403; arbitrary xp_amount ignored; create/complete planner task succeed; tsc clean)
    - _Requirements: validates 2.6, 2.7, 2.8_

  - [x] 9.5 Verify preservation tests still pass
    - **Property 6: Preservation** - Non-buggy inputs unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 6
    - Confirm xp_total invariant, existing self sources, service-role auth, and cross-user 403 unchanged
    - **EXPECTED OUTCOME**: Tests PASS (no regressions)

---

### Phase 4 — Implementation (Sprint B: engagement loop + parent + teacher)

- [x] 10. Class 4 — Student engagement loop (canonical habit table = `habit_logs`)

  - [x] 10.1 S-2 Perfect Day idempotent award helper

    - Create `src/lib/perfectDay.ts` `awardPerfectDayIfComplete(studentId)` (business logic in `src/lib/` per clean-architecture): read today's `habit_logs`; when all 4 habits present, invoke `award-xp` `{source:'perfect_day', xp_amount:50, reference_id:'perfect_day:{student_id}:{date}', is_milestone:true}` then `check-badges` `{trigger:'perfect_day'}`
    - _Bug_Condition: isEngagementXpBug — perfect_day never invoked_
    - _Expected_Behavior: idempotent perfect_day 50 XP on 4th habit + badge check_
    - _Preservation: 6 PM nudge cron unchanged; badge idempotency (3.3)_
    - _Requirements: 2.10_

  - [x] 10.2 S-1 Login streak + login habit in `AuthProvider.signIn`

    - After successful student login (keep existing `logActivity`), fire-and-forget: upsert `habit_logs` `{student_id, habit_type:'login', date: todayUTC, completed_at: now}`; invoke `process-streak` `{student_id}` (idempotent same-day); invoke `award-xp` `{student_id, source:'login', xp_amount:10}`; then `awardPerfectDayIfComplete`
    - Leave the broken midnight `{type:'midnight_reset'}` cron disconnected (documented no-op)
    - _Bug_Condition: isEngagementXpBug — login never advances streak / awards XP_
    - _Expected_Behavior: streak_current advances, +10 login XP, login habit recorded_
    - _Preservation: logActivity unchanged; process-streak idempotent (3.2)_
    - _Requirements: 2.9_

  - [x] 10.3 S-1/S-3 Canonical habit table writes (submit/journal/read/login → `habit_logs`)

    - `useReadHabitTimer.ts`: change `read_content` upsert target from `habit_tracking` to `habit_logs` (`habit_type:'read'`)
    - `useSessionCompletion.ts`: keep `habit_logs` (`habit_type:'read'`) upsert; remove the `as never` cast
    - `useSubmissions.ts` `useCreateSubmission`: upsert `habit_logs` (`habit_type:'submit'`) then `awardPerfectDayIfComplete`
    - `useJournal.ts` `useCreateJournalEntry`: upsert `habit_logs` (`habit_type:'journal'`) then `awardPerfectDayIfComplete`
    - `useHeatmapData.ts` + `check-badges` `habit_master`/`full_spectrum`: repoint academic-habit reads to `habit_logs` (derive per-day completed-count); wellness stays in `wellness_habit_logs`
    - Use idempotent `onConflict: "student_id,habit_type,date"` upserts
    - _Bug_Condition: academic habit completions never recorded by real flow_
    - _Expected_Behavior: single canonical `habit_logs` feeds heatmap/streak/perfect-day/perfect_week_
    - _Preservation: wellness_habit_logs unchanged; heatmap readers stay correct (3.11)_
    - _Requirements: 2.11_

  - [x] 10.4 S-4 grade badge-check + S-5 journal XP

    - `useGrades.ts` `useCreateGrade.onSuccess`: invoke `check-badges` `{student_id, trigger:'grade'}` and invalidate badge queries (the DB trigger OWNS the grade XP — do NOT insert a second `award-xp('grade')`)
    - `useJournal.ts` `useCreateJournalEntry`: when content ≥50 words (computed client-side), invoke `award-xp` `{source:'journal', xp_amount:20}` (server enforces 20 + daily idempotent reference) then `check-badges` `{trigger:'journal'}`
    - _Bug_Condition: isEngagementXpBug — grade badge-check / journal XP never invoked_
    - _Expected_Behavior: grade fires badge check (no double XP); ≥50-word journal grants +20 XP_
    - _Preservation: grade→evidence→attainment trigger unchanged; xp_total invariant (3.2, 3.7)_
    - _Requirements: 2.12, 2.13_

  - [x] 10.5 R-7 badges/path/dashboard hygiene

    - `useStudentBadges.ts`: add `scope='individual'` filter (or remove — it is dead code/imported nowhere)
    - `useLearningPath.ts`: derive Bloom ordering from ALL CLOs (min/representative), not the first CLO
    - `useStudentDashboard.ts`: replace the fragile double-`.data` cast with typed access against the generated row type
    - _Bug_Condition: badge scope omitted; Bloom from first CLO; fragile cast_
    - _Expected_Behavior: scope filter applied; all-CLO Bloom order; typed access_
    - _Preservation: dashboard data otherwise unchanged (3.11)_
    - _Requirements: 2.14_

  - [x] 10.6 Verify engagement exploration test now passes

    - **Property 3: Expected Behavior** - Engagement XP awarded with server-enforced canonical amounts
    - **IMPORTANT**: Re-run the SAME test from task 3 - do NOT write a new test
    - **EXPECTED OUTCOME**: Test PASSES (login → streak +1 / +10 XP; 4th habit → +50 once; journal ≥50 words → +20)
    - _Requirements: validates 2.9, 2.10, 2.11, 2.12, 2.13_

  - [x] 10.7 Verify preservation tests still pass
    - **Property 6: Preservation** - Non-buggy inputs unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 6
    - Confirm xp_total invariant, idempotent badges, leaderboard, and wellness habit flow unchanged
    - **EXPECTED OUTCOME**: Tests PASS (no regressions)

- [x] 11. Class 5 — Parent access RLS + dashboard/profile/i18n

  - [x] 11.1 Add parent SELECT RLS policies (new migration)

    - New migration (next timestamp, e.g. `20260821000000_add_parent_course_access_rls.sql`) adding three parent SELECT policies on `student_courses`, `course_sections`, `class_sessions` scoped to `parent_student_links.verified=true`, mirroring the existing `outcome_attainment` parent policy EXACTLY (do NOT broaden)
    - References only long-existing objects (`auth_user_role()`, `parent_student_links`, `student_courses`, `course_sections`, `class_sessions`) — function-before-reference ordering holds
    - Run `npm run db:check-replay` before push; regenerate types via `pwsh scripts/regen-types.ps1`
    - _Bug_Condition: isParentAccessBug — verified parent gets [] (no SELECT policy)_
    - _Expected_Behavior: verified-linked parent reads child rows; unverified/non-parent/cross-institution still []_
    - _Preservation: 9 RLS isolation probes still leak-free; no policy broadened (3.1, 3.10)_
    - _Requirements: 2.19_

  - [x] 11.2 P-2 parent dashboard KPIs, profile nav, i18n

    - Parent dashboard hook/page: compute real KPIs from now-visible linked-child data (courses + attainment + attendance)
    - Wire the orphan Parent Profile page into the parent nav (route + nav entry)
    - Localise `ParentPlannerView` (replace hardcoded strings with `t(...)`; add keys to `src/locales/{en,ar}`)
    - _Expected_Behavior: KPIs reflect linked child; profile reachable; en/ar render_
    - _Preservation: other parent pages unchanged (3.11)_
    - _Requirements: 2.20_

  - [x] 11.3 Verify parent-access exploration test now passes

    - **Property 5: Expected Behavior** - Parents read verified linked children's course data
    - **IMPORTANT**: Re-run the SAME test from task 5 - do NOT write a new test
    - **EXPECTED OUTCOME**: Test PASSES (verified parent → child rows; unverified/non-parent → still [])
    - _Requirements: validates 2.19, 2.20_

  - [x] 11.4 Verify RLS isolation preservation still passes
    - **Property 6: Preservation** - RLS isolation unchanged
    - **IMPORTANT**: Re-run the 9 boundary probes from task 6 after the migration
    - **EXPECTED OUTCOME**: Tests PASS (non-parent, unverified link, cross-institution still get [])

- [x] 12. Teacher fixes (T-1, T-2/R-12, T-3)

  - [x] 12.1 T-1 `useSubmissions.ts` `!inner` join

    - Change embedded join to `assignments!inner(...)` in both `useSubmissions` and `usePendingSubmissions` so the `assignments.course_id` filter restricts parent rows
    - _Bug_Condition: non-!inner join ignores course/assignment filter_
    - _Expected_Behavior: filter restricts the grading queue_
    - _Preservation: unfiltered queue results unchanged (3.11)_
    - _Requirements: 2.15_

  - [x] 12.2 T-2/R-12 grade trigger level recompute + T-3 graded status (new migration)

    - New migration: `CREATE OR REPLACE` the attainment-rollup trigger function so the `UPDATE student_gamification SET xp_total = COALESCE(xp_total,0) + 15` ALSO recomputes `level` (same threshold formula as `award-xp`'s `calculateLevel`, in SQL) — no second `+15`, no drift
    - Same trigger sets `submissions.status = 'graded'` alongside the XP insert so `useGradingStats` pending count (counts `status='submitted'`) matches the KPI card
    - Harden at the CREATE site per migration-replay steering; `npm run db:check-replay`; regenerate types
    - _Bug_Condition: level lags xp_total; status never set to graded_
    - _Expected_Behavior: level matches xp_total; pending count matches KPI_
    - _Preservation: xp_total = SUM(xp_transactions), idempotent ON CONFLICT, cascade unchanged (3.2, 3.7)_
    - _Requirements: 2.16, 2.17_

  - [x] 12.3 Verify teacher fixes + preservation
    - **Property 6: Preservation** - XP invariant + cascade unchanged
    - Add/run targeted tests: `useGradingStats` pending count matches after `status='graded'`; level recompute introduces no `xp_total` drift; grading queue respects course filter
    - **EXPECTED OUTCOME**: New assertions PASS; task 6 preservation tests still PASS
    - _Requirements: validates 2.15, 2.16, 2.17_

---

### Phase 5 — Implementation (Sprint C: hygiene, infra, AI, reconciliation, report)

- [x] 13. Class 6 — Shared infrastructure (I-1..I-5)

  - I-1: remove the unconditional top-level `initSentry()` in `src/App.tsx` (keep only the consent-gated path + `isInitialized()` guard)
  - I-2: change CORS `Access-Control-Allow-Headers` `x-content-type` → `x-client-info` in `score-reflection-quality/index.ts` and `generate-reflection-digest/index.ts`
  - I-3: mount `useNotificationRealtime()` in `NotificationBell` (or `GlobalHeader`) so the bell updates live
  - I-4: localise `ParentPlannerView` (covered with 11.2) and sweep other flagged hardcoded strings into locales
  - I-5: `generate-reflection-digest` orphan + orphan Parent Profile duplicate — wire or remove with no broken references; document the choice in the final report
  - _Bug_Condition: Sentry before consent; CORS typo; unmounted realtime; orphans_
  - _Expected_Behavior: no capture before consent; browser invoke succeeds; bell live; no dangling refs_
  - _Preservation: consent-gated Sentry path + notification data unchanged (3.11)_
  - _Requirements: 2.21, 2.22, 2.23, 2.24_

- [x] 14. Class 7 — Audit / hygiene

  - [x] 14.1 A-3 `auditLogger.ts` bonus-event allow-list drift

    - In `src/lib/auditLogger.ts`, change the `bonus_xp_event` allow-list to the live columns `["name","xp_multiplier","starts_at","ends_at"]` (was `["name","multiplier","start_date","end_date"]`)
    - _Bug_Condition: auditLogger bonus_xp_event allow-list references dead columns (`multiplier/start_date/end_date`), so the diff captures only `name`_
    - _Expected_Behavior: audit diff captures the real changed columns (`xp_multiplier/starts_at/ends_at`)_
    - _Preservation: other entity allow-lists and audit-log append-only behavior unchanged (3.11)_
    - _Requirements: 2.25_

  - [x] 14.2 A-2 remove `useSemesters` stub in `ReportGeneratorPage.tsx`

    - Delete the local `useSemesters` stub at `ReportGeneratorPage.tsx:30-33` (returns `[]`) so the imported real hook populates the semester dropdown
    - _Bug_Condition: local `useSemesters` stub shadows the real hook and returns `[]`, leaving the dropdown permanently empty_
    - _Expected_Behavior: the real `useSemesters` hook populates the accreditation-report semester dropdown_
    - _Preservation: report generation flow otherwise unchanged (3.11)_
    - _Requirements: 2.26_

  - [x] 14.3 C-2 real attainment in curriculum matrix + coordinator dashboard

    - Replace the CLO-count/active-student placeholders in the curriculum matrix and coordinator dashboard with real attainment, reusing the `useDepartmentAnalytics` aggregation (no new aggregation logic)
    - _Bug_Condition: curriculum matrix + coordinator dashboard render placeholder metrics instead of real attainment, which can mislead an accreditation reviewer_
    - _Expected_Behavior: both surfaces compute and render real attainment via the shared `useDepartmentAnalytics` aggregation_
    - _Preservation: `useDepartmentAnalytics` output and other dashboard sections unchanged (3.11)_
    - _Requirements: 2.27_

  - [x] 14.4 S-6..S-11 `.single()` → `.maybeSingle()` + remove casts

    - Convert 0-or-1-row reads to `.maybeSingle()` (`useSessionCompletion.ts:292`, `useReplacementVotes.ts:114`, and the bonus-event reads)
    - Remove the `as never`/`as any` casts across these hooks now that generated types exist
    - _Bug_Condition: read-by-filter queries use `.single()` (throws on 0 rows) and carry `as never`/`as any` casts that hide type drift_
    - _Expected_Behavior: 0-or-1-row reads use `.maybeSingle()` (no throw on 0 rows); typed access with the casts removed_
    - _Preservation: existing reads that already return a row behave unchanged; no behavior change for non-empty results (3.11)_
    - _Requirements: 2.28_

  - [x] 14.5 A-5 `usePendingOnboardingStudents` program filter

    - In `src/hooks/useAdminDashboard.ts`, apply the `programId` filter inside `usePendingOnboardingStudents` so the pending-onboarding query returns only matching records
    - _Bug_Condition: `usePendingOnboardingStudents` ignores the `programId` filter and returns the unfiltered set_
    - _Expected_Behavior: the program filter is applied so only matching pending-onboarding students are returned_
    - _Preservation: unfiltered (no-program) behavior and other admin-dashboard queries unchanged (3.11)_
    - _Requirements: 2.31_

  - [x] 14.6 Challenges (1.30) student self-join INSERT policy (new migration)

    - New migration (next timestamp) adding a student self-join RLS INSERT policy on `challenge_participants`: `WITH CHECK (auth_user_role() = 'student' AND student_id = auth.uid())`; do NOT broaden any SELECT/read access
    - Reference only long-existing objects (`auth_user_role()`, `challenge_participants`) — function-before-reference ordering holds; harden per migration-replay-integrity steering
    - Run `npm run db:check-replay` (CLEAN) before push; regenerate types via `pwsh scripts/regen-types.ps1`
    - _Bug_Condition: no student self-join INSERT policy on `challenge_participants`, so students cannot join team challenges_
    - _Expected_Behavior: a student can INSERT their own participation row (scoped to their own `student_id`); other students' rows remain inaccessible_
    - _Preservation: RLS not broadened (reads unchanged), 9 isolation probes still leak-free, migration history replays cleanly (3.1, 3.10, 3.11)_
    - _Requirements: 2.30_

  - [x] 14.7 Quiz log (1.32) record resolved model
    - In `generate-quiz-questions`, log the resolved `model` variable to `quiz_generation_logs` instead of a hardcoded label
    - _Bug_Condition: `quiz_generation_logs` records a hardcoded model label rather than the model actually used_
    - _Expected_Behavior: the log records the resolved `model` variable so it accurately reflects the generating model_
    - _Preservation: `generate-quiz-questions` auth (`program_id → programs`) and generation behavior unchanged (3.5)_
    - _Requirements: 2.32_

- [x] 15. Class 9 — AI / RAG config (N-4)

  - Configure an embeddings provider for `embed-course-material` (add `OPENAI_API_KEY` Supabase secret or an OpenRouter-compatible embedding model env) and wire a caller (teacher material-upload hook invokes `embed-course-material` after successful upload) so `course_material_embeddings` populates
  - Preserve tutor graceful degradation: with no provider, RAG block is skipped (persona + CLO context still answer). If no provider is provisioned in this environment, report RAG citations as "still missing — pending embeddings provider"
  - _Expected_Behavior: uploads populate embeddings when provider configured_
  - _Preservation: tutor degrades gracefully without RAG; integrity guard intact (3.6)_
  - _Requirements: 2.18, 2.29_

- [x] 16. Class 8 — Deployment reconciliation (R-0; verification only)

  - Confirm via `git log`/`git diff` against deployed functions (`docs/Edge-Function-Deployment-Guide.md` / `Manual-Edge-Function-Deploy-Steps.md`) that deployed `award-xp`, `check-badges`, `ai-feedback-draft`, `ai-module-suggestion`, `generate-quiz-questions` match HEAD — no code change; record parity in the final report
  - _Preservation: already-deployed function behavior unchanged (3.4, 3.5)_
  - _Requirements: 3.4, 3.5_

- [x] 17. Class 10 — Final live-verified report
  - Produce `docs/audit/FULL-PROFILE-REMEDIATION-LIVE-REPORT.md` authenticating as a real user per role against production using `docs/QA-Demo-Credentials-and-Testing-Guide.md` accounts
  - Sections: **Confirmed working via actual live profile data** (real flow + observed result per feature) and **Still missing / needs fixing** (precise reason — RAG pending provider, free-tier Kimi token caps, `custom_access_token_hook` deferred); clearly separate real results from seed artifacts
  - _Requirements: Final Deliverable Requirement_

---

### Phase 6 — Checkpoint

- [x] 18. Checkpoint - Ensure all tests pass and CI gates are green
  - Re-run ALL exploration tests (tasks 1–5) — every one now PASSES (bugs fixed)
  - Re-run preservation tests (task 6) — all PASS (no regressions; 9 RLS probes leak-free, xp_total invariant, idempotent badges, leaderboard, cascade, tutor)
  - Run `npm run db:check-replay` (CLEAN) for the parent-RLS, grade-trigger, and challenge-RLS migrations; confirm Supabase Preview replays from scratch
  - Run `npm run lint`, `npx tsc --noEmit`, `npm test` — all green; regenerate types via `pwsh scripts/regen-types.ps1` after migrations
  - Ensure all tests pass; ask the user if questions arise

---

### Phase 7 — Post-Deployment Live-Audit Fixes (Class 11)

These three findings surfaced during post-deployment live verification (impersonating real JWTs via
`set local role authenticated` + `request.jwt.claims` against production `cdlgtbvxlxjpcddjazzx`) —
they could not be caught by the source-structure property tests because they require a live RLS
engine. They map to design's **Correctness Property 7** and bugfix clauses 1.33–1.35 / 2.33–2.35 /
3.12. Two are already implemented, deployed, and live-verified (marked complete); the third
(migration-history reconciliation) remains open.

- [x] 19. Class 11 / Finding 1.33 — Fix parent RLS recursion (CRITICAL) — use SECURITY DEFINER helper

  - Rewrite the four parent SELECT policies (`student_courses`, `course_sections`, `class_sessions`, `assignments`) to resolve the verified link via the existing `public.parent_has_verified_link(uuid)` SECURITY DEFINER helper instead of an inline `parent_student_links` subquery, breaking the `student_courses → parent_student_links → profiles → student_courses` 42P17 recursion cycle. Implemented in migration `20260821000004_fix_parent_rls_recursion_use_helper.sql`; deployed to production and verified live.
  - Live verification: admin reads of `student_courses` / `profiles` no longer recurse; a verified parent reads 3 of 250 `student_courses` and 12 of 28 `assignments` (scoped to the linked child only).
  - _Bug_Condition: 42P17 infinite recursion for parent AND admin reads of `student_courses` / `profiles` (inline `parent_student_links` subquery closes a policy cycle)_
  - _Expected_Behavior: authenticated reads succeed for all roles with no recursion; verified parent scoped to exactly their linked child's rows (no broadening)_
  - _Preservation: 9 RLS isolation probes still leak-free; no policy broadened beyond `parent_student_links.verified=true` (3.1, 3.12)_
  - _Requirements: 2.33, 3.12_

- [x] 20. Class 11 / Finding 1.34 — Add parent assignments SELECT policy

  - Add `parent_read_linked_assignments` on `assignments`, course-scoped via the linked child's `student_courses` enrollment using `parent_has_verified_link`, so the parent planner deadlines lane (`useWeeklyPlannerData`) populates. Introduced in `20260821000003_add_parent_assignments_read_rls.sql`, folded into the recursion-safe form in `20260821000004`; deployed and live-verified (verified parent sees 12 of 28 assignments; non-parent → `[]`).
  - _Bug_Condition: `assignments` had no parent SELECT policy → verified parent's deadlines lane silently empty_
  - _Expected_Behavior: verified parent reads the linked child's course assignments via `parent_read_linked_assignments`; unverified/non-parent callers still get `[]` (no broadening)_
  - _Preservation: 9 RLS isolation probes leak-free; verified-linked-child scoping preserved (3.1, 3.12)_
  - _Requirements: 2.34_

- [x] 21. Class 11 / Finding 1.35 — Reconcile migration history (schema_migrations)
  - The MCP `apply_migration` path executed the five Class-5/Class-11 migrations' DDL directly but did NOT record version rows in `supabase_migrations.schema_migrations` (latest recorded stays `20260820100003`). Reconcile so `supabase db diff --linked` reports no drift: either backfill the five version rows (`20260821000000`–`20260821000004`) into `schema_migrations`, OR re-apply via the Supabase CLI (`supabase migration repair --status applied <version>` for each, and/or `supabase db push`). All five migrations are idempotent (`DROP POLICY IF EXISTS` / `CREATE OR REPLACE`), so reconciliation is non-destructive.
  - Acceptance: `supabase db diff --linked` clean AND `npm run db:check-replay` CLEAN; the five versions appear in `schema_migrations`.
  - **DONE (2026-08-21):** backfilled the five version rows (`20260821000000`–`20260821000004`) into `supabase_migrations.schema_migrations` via an idempotent `ON CONFLICT DO NOTHING` insert; verified all five are now recorded. `npm run db:check-replay` CLEAN (300 migrations).
  - _Bug_Condition: DDL applied without `schema_migrations` rows → potential false drift on `supabase db diff`_
  - _Expected_Behavior: migration history reconciled; `db diff` clean; the five versions recorded in `schema_migrations`_
  - _Preservation: migrations remain idempotent and replay cleanly from scratch (3.10)_
  - _Requirements: 2.35_

## Notes

- **Methodology:** Exploration tests (Properties 1–5) MUST be written and run on UNFIXED code first
  and MUST fail — failure proves the bug exists. The preservation test (Property 6) MUST pass on
  UNFIXED code — it captures the baseline behavior to preserve. After each fix, the SAME tests are
  re-run (never rewritten): exploration tests flip to PASS (bug fixed), preservation stays PASS.
- **Property-based testing:** Use fast-check with ≥100 iterations for the XP-invariant, planner
  status round-trip, Perfect Day idempotency, and parent-RLS properties (per project conventions).
- **Steering compliance (every task):** never hand-edit `src/types/database.ts` (regenerate via
  `pwsh scripts/regen-types.ps1` after a migration); run `npm run lint` + `npx tsc --noEmit` +
  `npm test` before any push; never push to `main` (feature branch + PR); migrations follow
  migration-replay-integrity (`npm run db:check-replay`, harden at CREATE site).
- **Do-not-broaden:** No RLS policy may extend beyond `parent_student_links.verified=true` linked
  children. Re-run the 9 isolation probes after the parent migration.
- **XP ledger:** the grade-trigger change adds a `level` recompute only — no second `+15`, no
  `xp_total` drift; `xp_total = SUM(xp_transactions)` must hold.
- **Sequencing** follows the design's Sprint A/B/C; each sprint ends with lint + tsc + test green
  and a PR to a feature branch.
