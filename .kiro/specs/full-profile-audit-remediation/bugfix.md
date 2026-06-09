# Bugfix Requirements Document

## Introduction

This bugfix addresses every issue documented in the Edeviser Full-Profile Audit & Remediation Plan
(`docs/audit/EDEVISER-FULL-PROFILE-AUDIT-2026-06.html`) — across all severities (BLOCKER, HIGH,
MEDIUM, LOW) and all roles (Admin, Coordinator, Teacher, Student, Parent) plus shared
infrastructure. The audit was produced through five live-verification passes against production
(`e-deviser.vercel.app`, Supabase project `cdlgtbvxlxjpcddjazzx`) and separates real, reproducible
defects from seed artifacts.

The defects cluster into recognizable classes:

- **Role-gate class** — role-gated edge functions read the caller role from the JWT
  (`app_metadata`/`user_metadata`), which is empty on this project; the role lives in `profiles`.
  Every legitimate staff caller is rejected with `403`. One shared fix (resolve role from
  `profiles` by `user.id`) repairs the whole class.
- **Column/schema drift** — two PDF edge functions query a pre-migration vocabulary
  (`score_percent`, `child/parent_outcome_id`, PLO/ILO/CLO scopes, `graduate_attributes.title/code`,
  CQI `title/course_id`) and never check the PostgREST `error`, so they silently emit empty sections.
- **Client/DB contract mismatch** — planner writes status values the DB CHECK rejects; client
  XP sources are rejected `403` by `award-xp`'s self-trigger allow-list.
- **Student engagement loop not wired** — login does not advance the streak, the 4th-habit
  Perfect Day 50 XP is never paid, academic habit completions are never recorded, and journal/grade
  XP advertised in the UI is never awarded.
- **Parent data access** — no parent RLS SELECT policy on `student_courses` (and related tables),
  so Progress/Attendance pages short-circuit to empty.
- **Shared infrastructure** — Sentry initializes before consent (FERPA/GDPR), a CORS header typo,
  an unmounted notification realtime hook, and missing localisation.
- **Hygiene** — `as never`/`as any` casts, dead/orphaned code, audit allow-list column drift,
  fragile `.single()` reads.

A codebase scan confirmed current state before finalizing these bug conditions:

- **Already fixed locally and deployed (verify-only, must not regress):** the role resolution in
  `ai-feedback-draft` and `ai-module-suggestion` (reads from `profiles`), the
  `generate-quiz-questions` institution drift (`program_id → programs(institution_id)` join,
  `.maybeSingle()`), and the badge `scope=individual` fix. The local `main` branch is clean and in
  sync with `origin/main`, so the prior production fixes (badge/verify_jwt, F-1..F-4, N-2) are
  already committed — R-0 is largely a verification task, not a re-commit.
- **Still defective locally (confirmed by scan):** `supabase/functions/_shared/auth.ts:38-43` and
  `generate-course-file/index.ts:441` read role from JWT; `usePlannerTasks.ts:24,59,197` use
  `pending`/`completed`; `award-xp/index.ts:601-605` self-trigger allow-list is only
  `login/submission/journal`; `src/App.tsx:26` calls `initSentry()` unconditionally;
  `score-reflection-quality` and `generate-reflection-digest` CORS use `x-content-type`;
  `useNotificationRealtime` is referenced only in tests, never mounted in a component.

The overriding constraint: **fix every issue without breaking existing working functionality.**
Multi-tenant RLS isolation tested leak-free across 9 boundary probes, the XP ledger / multiplier
engine / level math are healthy (zero `xp_total` drift), and the badge system is live and working —
all must be preserved. A final deliverable is a live-verified report distinguishing what is
confirmed working via actual profile data from what remains missing.

**Post-deployment addendum (2026-08-21).** After the remediation migrations were deployed to
production (Supabase project `cdlgtbvxlxjpcddjazzx`) and verified live by impersonating real JWTs
(`set local role authenticated` + `request.jwt.claims`), three additional findings surfaced that the
source-structure property tests could not catch because they require a live RLS engine. All three
have **already been fixed and live-verified** (migrations `20260821000003` and `20260821000004`) and
are recorded here retroactively for traceability, using the same bug-condition methodology as the
rest of this document: clauses 1.33–1.35 (defect), 2.33–2.35 (expected), and 3.12 (preservation).

## Bug Analysis

### Current Behavior (Defect)

The following describe what currently happens (the original, unfixed behavior `F`).

#### Role-gate class

1.1 WHEN a genuine admin or coordinator (role stored in `profiles`) calls `generate-accreditation-report` or `generate-course-file` THEN the function reads the role from the JWT `app_metadata`/`user_metadata` (which carries only `{provider, providers}`) and returns `403 "admin or coordinator role required"` before any query runs.
1.2 WHEN any role-gated edge function relying on `_shared/auth.ts` resolves the caller role THEN it reads `user.app_metadata?.role ?? user.user_metadata?.role ?? ""`, yielding empty for every real caller.
1.3 WHEN `send-email-notification`, `check-login-rate`, or `calculate-attainment-rollup` perform a role/identity gate via the same JWT-role pattern THEN legitimate callers are rejected or mis-gated.

#### Column/schema drift (PDF edge functions)

1.4 WHEN `generate-accreditation-report` runs THEN it selects `outcome_attainment.score_percent` (real column `attainment_percent`), filters `scope='PLO'/'ILO'` (enum only has `student_course/course/program/institution`), and reads `graduate_attributes.title/code` (real columns `name/description`), and because it never checks the PostgREST `error` it returns HTTP 200 with attainment rendered as 0 / "Not Yet" and an empty Graduate Attribute section.
1.5 WHEN `generate-course-file` runs THEN four queries hit non-existent columns: `outcome_mappings.child_outcome_id/parent_outcome_id` (real `source/target`), `submissions.score_percent` (scores live on `grades`), `outcome_attainment.score_percent` + `scope='CLO'`, and `cqi_action_plans.title/gap_description/corrective_actions` filtered by `course_id` (table is keyed by `program_id` with `action_description/root_cause`); with no `error` guard the course file ships with empty mapping, sample-work, attainment, and CQI sections.

#### Client/DB contract mismatch & XP authorization

1.6 WHEN a student creates a planner task THEN `usePlannerTasks.ts:59` inserts `status:'pending'` and completion at `:197` writes `status:'completed'`, both of which violate the DB CHECK `planner_tasks_status_check` (allowed: `todo/in_progress/done/deferred`), so create and complete fail in production (hidden by `as never` casts).
1.7 WHEN a student completes a study session, logs a wellness habit, completes a planner task, meets a weekly goal, or submits a review THEN the client calls `award-xp` with the student's own JWT for a source not in the self-trigger allow-list (`login/submission/journal`), and the call is rejected `403` (silently swallowed), so that XP is never awarded.
1.8 WHEN `chat-with-tutor` (or any caller) invokes `generate-plan-update` without `recent_interaction_count` THEN the insert into `tutor_plan_updates.interaction_count` (NOT NULL, no default) fails with `null value ... violates not-null constraint` (HTTP 500).

#### Student engagement loop

1.9 WHEN a student logs in THEN `AuthProvider.signIn` only calls `logActivity({event_type:'login'})` and never invokes `process-streak`, `award-xp('login')`, or writes a `login` habit row, so `streak_current`, streak badges, and milestone XP never advance from real activity (the midnight cron posts `{type:'midnight_reset'}` with no `student_id` and 400s, processing nobody).
1.10 WHEN a student completes all 4 daily habits THEN nothing calls `award-xp({source:'perfect_day'})`; the 6 PM cron only inserts a nudge that advertises the 50 XP, so the Perfect Day reward is never paid.
1.11 WHEN a student logs in, submits, journals, or reads THEN the academic habit completion is never recorded in a habit table by the real flow (only `read_content` and session-completion write), leaving the heatmap, streak, perfect-day, and `perfect_week` badge unfed; `habit_logs` and `habit_tracking` are duplicated with `as never` reads.
1.12 WHEN a grade is released THEN `useCreateGrade` inserts the grade and relies on the DB trigger for attainment but never invokes `award-xp('grade')`, so the grade → 15 XP → badge-check path does not fire from the client.
1.13 WHEN a student saves a journal entry of ≥50 words THEN the UI advertises "+20 XP" but `useJournal` never invokes `award-xp('journal')`, so the journal XP is never awarded.
1.14 WHEN `useStudentBadges` reads badges THEN it omits the `scope='individual'` filter and is dead code (imported nowhere), and `useLearningPath` derives the Bloom level from the first CLO only, with a fragile double-`.data` cast in `useStudentDashboard`.

#### Teacher

1.15 WHEN a teacher filters the grading queue by course/assignment THEN `useSubmissions` filters on a non-`!inner` embedded join (`assignments.course_id`), so PostgREST does not restrict parent rows and the queue ignores the filter and shows everything.
1.16 WHEN grade-release XP is awarded THEN the DB trigger does a flat `UPDATE student_gamification SET xp_total = xp_total + 15` without recomputing `level` (level can lag); note `xp_total` drift is NOT occurring live.
1.17 WHEN `useGradingStats` computes the pending count THEN it counts `submissions.status='submitted'` as pending but nothing ever sets `status='graded'`, so the pending count overstates and disagrees with the KPI card.
1.18 WHEN uploaded course materials should be embedded THEN `embed-course-material` has no caller (orphaned), so the RAG store is never populated; teacher hooks carry stale `as any`/`as never` casts and silently swallow errors.

#### Parent

1.19 WHEN a parent opens the Progress or Attendance page THEN the page reads `student_courses` first, which has no parent RLS SELECT policy (count = 0), returns `[]`, and short-circuits to an empty page even though `outcome_attainment`, `attendance`, and `courses` are visible; `course_sections` and `class_sessions` also lack parent policies.
1.20 WHEN a parent views the dashboard THEN KPIs render placeholder zeros, the Parent Profile page is an orphan with no nav entry, and `ParentPlannerView` is not localised (i18n).

#### Shared infrastructure

1.21 WHEN the app loads THEN `src/App.tsx:26` calls `initSentry()` unconditionally before consent is resolved, so error/replay capture starts without analytics consent (FERPA/GDPR violation), bypassing the consent-gated path.
1.22 WHEN a browser invokes `score-reflection-quality` or `generate-reflection-digest` THEN the CORS `Access-Control-Allow-Headers` lists `x-content-type` instead of `x-client-info`, which can break the browser-invoked call.
1.23 WHEN notifications change in realtime THEN the live-update bell does not update because `useNotificationRealtime` is never mounted in `NotificationBell`/`GlobalHeader` (referenced only in tests).
1.24 WHEN `generate-reflection-digest` and the orphan Parent Profile page exist THEN they are dead/unreachable code.

#### Audit / hygiene

1.25 WHEN a bonus XP event is created/edited THEN `auditLogger.ts:31` allow-lists `["name","multiplier","start_date","end_date"]` but the table columns are `xp_multiplier/starts_at/ends_at`, so the audit diff captures only `name`.
1.26 WHEN the accreditation report semester dropdown renders THEN a local `useSemesters` stub in `ReportGeneratorPage.tsx:30-33` returns `[]` and shadows the real hook, so the dropdown is permanently empty.
1.27 WHEN the curriculum matrix and coordinator dashboard render attainment THEN they show CLO-count/active-student placeholders instead of real attainment, which can mislead an accreditation reviewer.
1.28 WHEN a "read-by-filter" query expects 0-or-1 rows (e.g. `useSessionCompletion.ts:292`, `useReplacementVotes.ts:114`, and bonus-event reads) THEN it uses `.single()` which throws on 0 rows; pervasive `as never`/`as any` casts remain across hooks now that generated types exist.

#### AI / RAG

1.29 WHEN the AI tutor needs to cite course materials (RAG) THEN `embed-course-material` is OpenAI-only with no caller, so no embeddings exist and citations are unavailable.

#### Challenges / Admin / logging

1.30 WHEN a student tries to join a team challenge THEN there is no student self-join RLS INSERT policy on `challenge_participants`, so the insert is rejected and students cannot join challenges.
1.31 WHEN an admin filters the pending-onboarding list by program THEN `useAdminDashboard` ignores the program filter (A-5), so the pending-onboarding query returns the unfiltered set.
1.32 WHEN a quiz is generated THEN `quiz_generation_logs` records a hardcoded model label rather than the actual model used, so the log misrepresents which model produced the questions.

#### Post-deployment live-audit findings

The following were discovered during post-deployment live-SQL verification (impersonating real JWTs
against `cdlgtbvxlxjpcddjazzx`) and have already been fixed and re-verified live; they are documented
here for traceability.

1.33 WHEN the parent course-access SELECT policies added for `student_courses` / `course_sections` / `class_sessions` / `assignments` use an INLINE `EXISTS (... parent_student_links ...)` subquery THEN evaluating RLS on `student_courses` closes a cycle `student_courses → parent_student_links (parent_links_admin_manage → profiles) → profiles (profiles_teacher_read_students → student_courses)`, so Postgres aborts ANY authenticated read of `student_courses` / `profiles` with `ERROR: 42P17 infinite recursion detected in policy` — confirmed live for BOTH parent and admin callers (a production-outage-class defect introduced by the naive inline policy).
1.34 WHEN a verified parent opens the parent planner view (`useWeeklyPlannerData(studentId)`) THEN the "deadlines" lane reads `assignments`, which had NO parent SELECT RLS policy (sessions/tasks/goals already had `parent_select_linked_*` policies), so the deadlines lane is silently empty for the linked child even though the rest of the planner populates.
1.35 WHEN the remediation migrations are applied to the hosted database via the MCP `apply_migration` path THEN the DDL executes but no version row is recorded in `supabase_migrations.schema_migrations` (latest recorded stays `20260820100003`), so a future `supabase db diff` could report drift even though the schema is correct.

### Expected Behavior (Correct)

The following describe what should happen after the fix (the fixed behavior `F'`). Each clause
corresponds to the same condition as the matching `1.Y` defect clause.

#### Role-gate class

2.1 WHEN a genuine admin or coordinator calls `generate-accreditation-report` or `generate-course-file` THEN the system SHALL resolve role and `institution_id` from the `profiles` table by `user.id` and authorize the caller (no `403` for valid roles).
2.2 WHEN any role-gated edge function resolves the caller role via the shared helper THEN the system SHALL prefer the `profiles` role (ideally via a `custom_access_token_hook` that injects `role` + `institution_id` into the JWT), falling back to a `profiles` lookup, so legitimate callers are authorized.
2.3 WHEN `send-email-notification`, `check-login-rate`, or `calculate-attainment-rollup` perform a role/identity gate THEN the system SHALL use the corrected role source AND the service-role/cron paths SHALL CONTINUE TO authorize via the `isServiceRole` branch.

#### Column/schema drift

2.4 WHEN `generate-accreditation-report` runs THEN the system SHALL query `attainment_percent`, use only the live `outcome_attainment` scopes, read `graduate_attributes.name/description`, derive PLO/ILO attainment via `outcome_id` joins (not scope), and add `if (error) throw` guards so a future drift fails loudly and real attainment + Graduate Attributes render.
2.5 WHEN `generate-course-file` runs THEN the system SHALL query `outcome_mappings.source_outcome_id/target_outcome_id`, read scores from `grades`, query `attainment_percent` with valid scopes (`student_course`/`course`), query `cqi_action_plans.action_description/root_cause` by `program_id`, and add `if (error) throw` guards, so mapping, sample-work, attainment, and CQI sections render with real data.

#### Client/DB contract mismatch & XP authorization

2.6 WHEN a student creates or completes a planner task THEN the hook SHALL write DB-valid status values (`todo` on create, `done` on complete), `src/types/planner.ts` `PlannerTask["status"]` SHALL be a union of `todo/in_progress/done/deferred`, the UI badges SHALL map those values, and the `as never` casts SHALL be removed.
2.7 WHEN a student completes a study session, logs a wellness habit, completes a planner task, meets a weekly goal, or submits a review THEN the system SHALL award XP correctly — either by adding those sources to `award-xp`'s self-trigger allow-list WITH server-enforced canonical amounts, or by routing them through a trusted (service-role) path — so the XP is granted (no silent `403`).
2.8 WHEN `generate-plan-update` is invoked without `recent_interaction_count` THEN the system SHALL validate and default `interaction_count` so the insert succeeds (no NOT NULL violation).

#### Student engagement loop

2.9 WHEN a student logs in THEN the system SHALL advance the streak (invoke `process-streak` on login, or add a batch cron mode) AND write the `login` habit row, so `streak_current`, streak badges, and milestone XP advance from real activity.
2.10 WHEN a student completes all 4 daily habits THEN the system SHALL award the idempotent `perfect_day` 50 XP on the 4th-habit completion AND fire `check-badges`.
2.11 WHEN a student logs in, submits, journals, or reads THEN the real flow SHALL record the academic habit completion in a single chosen habit table (one of `habit_logs`/`habit_tracking`), unblocking the heatmap, streak, perfect-day, and `perfect_week` badge.
2.12 WHEN a grade is released THEN `useCreateGrade` SHALL invoke `award-xp('grade')` so the 15 XP and badge-check path fire from the client.
2.13 WHEN a student saves a journal entry of ≥50 words THEN the system SHALL invoke `award-xp('journal')` so the advertised +20 XP is granted.
2.14 WHEN badges are read THEN `useStudentBadges` SHALL apply the `scope='individual'` filter (or dead code SHALL be removed), `useLearningPath` SHALL consider all CLOs for Bloom ordering, and the fragile double-`.data` cast SHALL be replaced with a typed access.

#### Teacher

2.15 WHEN a teacher filters the grading queue THEN `useSubmissions` SHALL use `assignments!inner` so the course/assignment filter restricts results.
2.16 WHEN grade-release XP is awarded THEN the trigger (or path) SHALL recompute `level` (and align with multiplier handling) so the level does not lag; this SHALL NOT introduce any `xp_total` drift.
2.17 WHEN `useGradingStats` computes counts THEN the system SHALL set/track `status='graded'` (or compute pending from a correct source) so the pending count matches the KPI card.
2.18 WHEN course materials are uploaded THEN either `embed-course-material` SHALL be wired to a caller (RAG enabled) or the orphan SHALL be explicitly removed/documented; stale casts SHALL be removed and swallowed errors SHALL be logged/surfaced.

#### Parent

2.19 WHEN a parent opens the Progress or Attendance page THEN the system SHALL return the linked children's course data — either by adding parent SELECT RLS policies scoped to verified linked children (`parent_student_links.verified=true`) on `student_courses` (and `course_sections`, `class_sessions`), OR by deriving courses from the already-visible `outcome_attainment` path — without broadening access.
2.20 WHEN a parent views the dashboard THEN KPIs SHALL reflect real linked-child data, the Parent Profile page SHALL be reachable via parent nav, and `ParentPlannerView` SHALL be localised.

#### Shared infrastructure

2.21 WHEN the app loads THEN Sentry SHALL initialize only through the consent-gated path (the unconditional `initSentry()` in `App.tsx` SHALL be removed), preserving the `isInitialized()` ordering guard, so no capture occurs before consent.
2.22 WHEN a browser invokes `score-reflection-quality` or `generate-reflection-digest` THEN the CORS `Access-Control-Allow-Headers` SHALL list `x-client-info` (not `x-content-type`).
2.23 WHEN notifications change in realtime THEN `useNotificationRealtime()` SHALL be mounted in `NotificationBell`/`GlobalHeader` so the bell updates live.
2.24 WHEN dead/orphan code is identified (`generate-reflection-digest`, orphan Parent Profile page) THEN it SHALL be either wired in or removed, with no broken references.

#### Audit / hygiene

2.25 WHEN a bonus XP event is created/edited THEN `auditLogger` SHALL allow-list the real columns (`xp_multiplier/starts_at/ends_at`) so the audit diff captures the actual changes.
2.26 WHEN the accreditation report semester dropdown renders THEN the local `useSemesters` stub SHALL be removed so the real hook populates the dropdown.
2.27 WHEN the curriculum matrix and coordinator dashboard render attainment THEN they SHALL compute real attainment (C-2) rather than placeholders.
2.28 WHEN a read-by-filter query expects 0-or-1 rows THEN it SHALL use `.maybeSingle()`, and the `as never`/`as any` casts SHALL be removed now that generated types exist.

#### AI / RAG

2.29 WHEN the AI tutor needs RAG citations THEN the system SHALL configure an embeddings provider for `embed-course-material` (add `OPENAI_API_KEY` or an OpenRouter-compatible embedding model) so citations become available; the tutor SHALL CONTINUE TO answer gracefully (persona + CLO context) when RAG is unavailable.

#### Challenges / Admin / logging

2.30 WHEN a student tries to join a team challenge THEN the system SHALL add a student self-join RLS INSERT policy on `challenge_participants` (scoped to the student's own `student_id` within their institution) so students can join challenges, without broadening access to other students' rows.
2.31 WHEN an admin filters the pending-onboarding list by program THEN `useAdminDashboard` SHALL apply the program filter so the pending-onboarding query returns only matching records.
2.32 WHEN a quiz is generated THEN `quiz_generation_logs` SHALL record the actual model used (not a hardcoded label) so the log accurately reflects the generating model.

#### Post-deployment live-audit findings

2.33 WHEN the parent course-access policies are evaluated THEN they SHALL use the existing `public.parent_has_verified_link(uuid)` SECURITY DEFINER helper (which bypasses RLS on `parent_student_links` and breaks the cycle — the same pattern the long-standing `profiles_parent_read_linked` policy uses) so authenticated reads of `student_courses` / `profiles` succeed for all roles with NO recursion, while preserving exact verified-linked-child scoping (no broadening).
2.34 WHEN a verified parent opens the planner view THEN the system SHALL expose `assignments` for the linked child's enrolled courses via a parent SELECT policy (`parent_read_linked_assignments`, course-scoped through `student_courses` using `parent_has_verified_link`), so the deadlines lane populates; unverified/non-parent callers still get [].
2.35 WHEN remediation migrations are applied THEN the migration history SHALL be reconciled (version rows backfilled in `schema_migrations`, or migrations re-applied via the Supabase CLI) so `supabase db diff` reports no drift; all migrations remain idempotent (DROP POLICY IF EXISTS / CREATE OR REPLACE).

### Unchanged Behavior (Regression Prevention)

The following existing, healthy behaviors MUST be preserved (for all non-buggy inputs,
`F(X) = F'(X)`).

3.1 WHEN any user reads data across role or institution boundaries THEN the system SHALL CONTINUE TO enforce leak-free multi-tenant RLS isolation (all 9 boundary probes must still pass; do not broaden any policy beyond verified linked children).
3.2 WHEN XP is awarded for any source THEN the system SHALL CONTINUE TO keep `xp_total` equal to `SUM(xp_transactions)` (zero drift) and apply the multiplier engine and level math correctly.
3.3 WHEN the badge system runs THEN it SHALL CONTINUE TO award badges idempotently with `scope=individual` (the live, working badge fix must not regress).
3.4 WHEN `award-xp` or `check-badges` is invoked THEN they SHALL CONTINUE TO run with `verify_jwt=false` + in-handler auth (exact `x-internal-auth` match for service-role AND user-JWT ownership for self-triggered sources), and SHALL CONTINUE TO reject cross-user writes with `403`.
3.5 WHEN `ai-feedback-draft`, `ai-module-suggestion`, and `generate-quiz-questions` are called by their legitimate roles THEN they SHALL CONTINUE TO work (role resolved from `profiles`; quiz institution via `program_id → programs`) — these are already deployed and must not regress.
3.6 WHEN the AI tutor and `generate-plan-update` run on the configured OpenRouter/Kimi model THEN they SHALL CONTINUE TO return real LLM responses, with the academic-integrity guard CONTINUING TO refuse and redirect homework-completion requests.
3.7 WHEN a grade is submitted THEN the existing `grade → evidence → outcome_attainment` cascade via the SQL trigger `trigger_attainment_rollup` SHALL CONTINUE TO run unchanged, and `calculate-attainment-rollup` SHALL CONTINUE TO remain disconnected (re-enabling it would violate `evidence.plo_id/ilo_id NOT NULL`).
3.8 WHEN a non-buggy XP source (e.g. submission with a real assignment, marketplace purchase, bonus-event multiplier) is exercised THEN it SHALL CONTINUE TO behave exactly as today (e.g. submission +25/+15 late, level multiplier applied, idempotent per assignment).
3.9 WHEN the leaderboard is read THEN `get_leaderboard_page(p_institution_id, p_limit, p_offset)` SHALL CONTINUE TO return correct rows and respect anonymous opt-out server-side.
3.10 WHEN any migration is added for the parent RLS policies or trigger changes THEN the full migration history SHALL CONTINUE TO replay cleanly from scratch on Supabase Preview (per migration-replay-integrity steering), with `npm run lint`, `npx tsc --noEmit`, and `npm test` all passing.
3.11 WHEN working features touched incidentally (study/goal/wellness/discussion CRUD, attendance entry, OBE CRUD, marketplace, challenges read, submission flow) are exercised THEN they SHALL CONTINUE TO work unchanged.
3.12 WHEN the recursion fix is applied THEN the 9 RLS isolation probes and the verified-linked-child scoping SHALL CONTINUE TO hold (a verified parent sees only their child's rows — e.g. 3 of 250 student_courses, 12 of 28 assignments — and unverified/non-parent/cross-institution callers still get []), confirmed by live impersonation tests including a challenge self-join positive+negative test.

## Final Deliverable Requirement

After all fixes are applied and verified, the system SHALL produce a **live-verified report** that,
using the demo accounts (per `docs/QA-Demo-Credentials-and-Testing-Guide.md`), authenticates as a
real user in each role against production and distinguishes:

- **Confirmed working via actual live profile data** — each feature exercised through its real flow
  with the observed result (XP awarded, streak advanced, PDF sections populated, parent pages
  showing data, notifications updating live, etc.).
- **Still missing or needs fixing** — any item not fully resolved, with the precise reason
  (e.g. RAG citations pending an embeddings provider, free-tier Kimi token caps).

The report MUST clearly separate real, reproducible results from seed artifacts, consistent with the
audit's five-pass methodology.

## Bug Condition Summary (Methodology)

The remediation spans multiple defect classes; the dominant bug conditions are expressed below.

```pascal
FUNCTION isRoleGateBug(X)
  INPUT: X = { caller, function }  // caller has role in profiles, function is role-gated
  OUTPUT: boolean
  // Bug triggers whenever role is read from the JWT instead of profiles
  RETURN X.function.readsRoleFrom = 'jwt_app_metadata'
         AND X.caller.jwt.app_metadata.role = NULL
         AND X.caller.profileRole IN {'admin','coordinator','teacher'}
END FUNCTION

FUNCTION isEngagementXpBug(X)
  INPUT: X = { source, callerIdentity }
  OUTPUT: boolean
  // Bug triggers when a client awards XP for a source outside the self-trigger allow-list,
  // or when login/grade/journal/perfect-day flows never invoke award-xp at all
  RETURN (X.callerIdentity = 'student_jwt'
          AND X.source NOT IN {'login','submission','journal'})
         OR X.source IN {'login_streak','perfect_day','grade','journal'} AND NOT invoked
END FUNCTION
```

```pascal
// Property: Fix Checking (role-gate class)
FOR ALL X WHERE isRoleGateBug(X) DO
  result ← F'(X)   // function now resolves role from profiles / custom_access_token_hook
  ASSERT result.status ≠ 403 AND result.authorized = true
END FOR

// Property: Fix Checking (engagement XP)
FOR ALL X WHERE isEngagementXpBug(X) DO
  result ← F'(X)
  ASSERT xp_awarded(result) = canonical_server_amount(X.source)
         AND no_silent_403(result)
END FOR

// Property: Preservation Checking
FOR ALL X WHERE NOT (isRoleGateBug(X) OR isEngagementXpBug(X) OR isSchemaDriftBug(X)) DO
  ASSERT F(X) = F'(X)   // RLS isolation, xp_total invariant, badges, leaderboard unchanged
END FOR
```

- **F**: the platform as it exists before this remediation (with the open defects above).
- **F'**: the platform after every audit finding is fixed.
- **Counterexamples (live-observed):** a coordinator calling `generate-course-file` → `403`;
  a student creating a planner task with `status:'pending'` → CHECK violation;
  a student completing a study session → `award-xp` `403`; login leaving `streak_current` stale.
