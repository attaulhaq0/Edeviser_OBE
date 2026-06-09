# Full-Profile Audit Remediation — Bugfix Design

## Overview

This design remediates every finding in the Edeviser Full-Profile Audit & Remediation Plan
(`docs/audit/EDEVISER-FULL-PROFILE-AUDIT-2026-06.pdf`) across all severities and roles, plus shared
infrastructure. The defects cluster into recognizable classes, and the fixes are deliberately
**targeted and minimal** so that the platform's healthy subsystems — leak-free multi-tenant RLS,
the XP ledger/multiplier/level engine, the live badge system, the grade→evidence→attainment
cascade, and the OpenRouter tutor — are preserved exactly (`F(X) = F'(X)` for all non-buggy inputs).

The remediation strategy is organized by defect class, each with its own bug condition, root-cause
hypothesis, and fix:

1. **Role-gate class** — role-gated edge functions read the caller role from the JWT
   (`app_metadata`/`user_metadata`), which is empty on this project. The fix resolves role +
   `institution_id` from `profiles` by `user.id`, mirroring the already-deployed pattern in
   `ai-feedback-draft` / `ai-module-suggestion`, while preserving every service-role / cron
   (`isServiceRole` / `x-internal-auth`) branch.
2. **Column/schema drift** — two PDF edge functions query a pre-migration vocabulary and never
   check the PostgREST `error`. The fix maps every bad column/scope to its live-schema equivalent
   and adds `if (error) throw` guards.
3. **Client/DB contract mismatch & XP authorization** — planner status union alignment, an
   expanded `award-xp` self-trigger allow-list with **server-enforced canonical amounts**, and
   `generate-plan-update` `interaction_count` validation.
4. **Student engagement loop** — login streak advance, idempotent Perfect Day award, a single
   canonical habit table, and client grade/journal XP awards.
5. **Parent access** — additive parent SELECT RLS policies on `student_courses` /
   `course_sections` / `class_sessions` scoped to verified linked children, mirroring the existing
   `outcome_attainment` parent policy exactly.
6. **Shared infrastructure** — Sentry consent gating, CORS header typo, realtime mount, i18n,
   orphan cleanup.
7. **Audit/hygiene** — allow-list column drift, stub removal, placeholder metrics, fragile reads,
   stale casts, trigger level recompute, graded status, `!inner` join filters, challenge self-join
   RLS, quiz model label.
8. **Deployment reconciliation (R-0)** — verification only; local `main` is synced with
   `origin/main`, so badge/verify_jwt/F-1..F-4/N-2 are already committed.
9. **AI/RAG (N-4)** — embeddings provider config for `embed-course-material`; the tutor must
   continue to degrade gracefully without RAG.
10. **Final deliverable** — a live-verified report distinguishing confirmed-working-via-live-data
    from still-missing, tied to the demo accounts in `docs/QA-Demo-Credentials-and-Testing-Guide.md`.

This is a multi-class bugfix; the dominant bug conditions are formalized below, and the
**Correctness Properties** section is the single source of truth for property-based-testing
traceability.

## Glossary

- **Bug_Condition (C)**: An input that triggers one of the audit defects (e.g. a coordinator
  calling a role-gated function, a planner status write, a login that should advance a streak).
- **Property (P)**: The desired post-fix behavior for inputs satisfying C (authorize the caller,
  award the canonical XP, render real data).
- **Preservation**: Existing healthy behavior that must remain unchanged for all inputs NOT
  satisfying any bug condition (RLS isolation, `xp_total` invariant, badges, leaderboard, grade
  cascade, tutor responses).
- **F / F'**: The platform before / after this remediation.
- **`authenticateRequest`**: The shared helper in `supabase/functions/_shared/auth.ts` that
  resolves the caller's `{ id, role, institution_id }`. Currently reads role from JWT metadata.
- **`isServiceRole` / `x-internal-auth`**: The in-handler service-role authentication path used by
  cron jobs and edge-to-edge callers. The modern `sb_secret_…` key is not a JWT, so internal
  callers send the anon JWT as the bearer and the service-role secret in `x-internal-auth`. This
  branch MUST be preserved everywhere.
- **Self-triggered XP source**: An `award-xp` source a student may trigger with their own JWT. The
  server enforces the canonical XP amount; the student cannot pass an arbitrary `xp_amount`.
- **Canonical habit table**: The single table the real flow writes academic habit completions to.
  This design selects **`habit_logs`** (long-format) and reconciles all readers (see Bug Details S-class).
- **`parent_student_links.verified=true`**: The only scope under which a parent may read a linked
  child's data. No policy in this remediation broadens beyond this.

## Bug Details

### Bug Condition

The remediation spans multiple defect classes. The dominant bug conditions, in pseudocode:

```
FUNCTION isRoleGateBug(input)
  INPUT: input = { caller, fn }   // caller.role lives in profiles; fn is role-gated
  OUTPUT: boolean
  RETURN fn.readsRoleFrom = 'jwt_app_metadata'
         AND input.caller.jwt.app_metadata.role = NULL
         AND input.caller.profileRole IN {'admin','coordinator','teacher'}
         AND NOT input.caller.isServiceRole
END FUNCTION

FUNCTION isSchemaDriftBug(input)
  INPUT: input = { fn, query }    // fn is a PDF generator
  OUTPUT: boolean
  RETURN query.column IN {'score_percent','child_outcome_id','parent_outcome_id',
                          'graduate_attributes.title','graduate_attributes.code',
                          'cqi_action_plans.title','cqi_action_plans.gap_description',
                          'cqi_action_plans.corrective_actions'}
         OR query.scope IN {'PLO','ILO','CLO'}
         OR query.filtersCqiBy = 'course_id'
END FUNCTION

FUNCTION isEngagementXpBug(input)
  INPUT: input = { source, callerIdentity, invoked }
  OUTPUT: boolean
  RETURN (callerIdentity = 'student_jwt'
          AND source IN {'study_session','wellness_habit','planner_task',
                         'weekly_goal','review_session','review_cycle_complete'}
          AND source NOT IN award_xp.selfTriggeredSources)
         OR (source IN {'login_streak','perfect_day','grade','journal'} AND NOT invoked)
END FUNCTION

FUNCTION isPlannerStatusBug(input)
  INPUT: input = { status }
  OUTPUT: boolean
  RETURN status IN {'pending','completed'}   // DB CHECK allows todo/in_progress/done/deferred
END FUNCTION

FUNCTION isParentAccessBug(input)
  INPUT: input = { parent, table, child }
  OUTPUT: boolean
  RETURN table IN {'student_courses','course_sections','class_sessions'}
         AND parent linked-and-verified to child
         AND NOT exists parent SELECT policy on table   // query returns []
END FUNCTION
```

### Examples (live-observed counterexamples)

- A coordinator (`curriculum@gulf-academy.test`) calling `generate-course-file` → `403 "admin or
coordinator role required"` before any query runs (role-gate bug).
- `generate-accreditation-report` returns HTTP 200 but PLO/ILO attainment renders 0 / "Not Yet" and
  the Graduate Attribute section is empty (`score_percent` / `scope='PLO'` / `graduate_attributes.title`
  drift, no `error` guard).
- A student creating a planner task with `status:'pending'` → `planner_tasks_status_check` CHECK
  violation (hidden today by `as never` casts).
- A student completing a study session → `award-xp` returns `403` (silently swallowed); the XP is
  never awarded (`study_session` not in the self-trigger allow-list).
- A student logs in → `streak_current` stays stale; the midnight cron posts `{type:'midnight_reset'}`
  with no `student_id` and 400s, processing nobody.
- A parent opens the Progress page → `student_courses` count = 0 → `[]` → empty page, even though
  `outcome_attainment` / `attendance` / `courses` are visible.

## Expected Behavior

### Preservation Requirements

**Unchanged behaviors (MUST hold for all non-buggy inputs):**

- Leak-free multi-tenant RLS isolation across all 9 boundary probes. No policy is broadened beyond
  verified linked children.
- `xp_total = SUM(xp_transactions)` (zero drift), the multiplier engine, and level math.
- The badge system awards idempotently with `scope='individual'` (the live fix must not regress).
- `award-xp` / `check-badges` run with `verify_jwt=false` + in-handler auth (exact `x-internal-auth`
  match for service-role AND user-JWT ownership for self-triggered sources), and reject cross-user
  writes with `403`.
- `ai-feedback-draft`, `ai-module-suggestion`, `generate-quiz-questions` continue to work (role from
  `profiles`; quiz institution via `program_id → programs`) — already deployed.
- The AI tutor and `generate-plan-update` continue to return real OpenRouter/Kimi responses, with the
  academic-integrity guard intact; the tutor degrades gracefully (persona + CLO context) without RAG.
- The `grade → evidence → outcome_attainment` cascade via `trigger_attainment_rollup` runs unchanged;
  `calculate-attainment-rollup` stays disconnected (re-enabling it violates `evidence.plo_id/ilo_id
NOT NULL`).
- Non-buggy XP sources (submission +25/+15 late, marketplace purchase, bonus-event multiplier) behave
  exactly as today, idempotent per reference.
- `get_leaderboard_page(p_institution_id, p_limit, p_offset)` returns correct rows and respects
  anonymous opt-out server-side.
- The full migration history replays cleanly from scratch on Supabase Preview; `npm run lint`,
  `npx tsc --noEmit`, and `npm test` all pass.
- Working features touched incidentally (study/goal/wellness/discussion CRUD, attendance, OBE CRUD,
  marketplace, challenges read, submission flow) continue to work unchanged.

**Scope:** Any input that does NOT satisfy a bug condition above is completely unaffected. In
particular: requests with a valid JWT-metadata role (none exist on this project, but the fallback
chain preserves them), service-role/cron callers, planner statuses already in the valid set, and all
non-engagement XP sources.

## Hypothesized Root Cause

1. **Role read from the wrong source (A-0 / C-0).** `_shared/auth.ts` and the two PDF functions read
   `user.app_metadata?.role ?? user.user_metadata?.role ?? ""`. On this Supabase project, sign-up
   never writes role into JWT metadata (it lives only in `profiles`), so the expression is always
   `""`. The two AI functions already worked around this by querying `profiles`; the others were
   never updated.

2. **Pre-migration column vocabulary (A-1 / C-1).** The PDF generators were written against an older
   schema (`score_percent`, `child/parent_outcome_id`, PLO/ILO/CLO attainment scopes, GA `title/code`,
   CQI `title/course_id`). A later migration renamed columns (`attainment_percent`,
   `source/target_outcome_id`, scopes `student_course/course/program/institution`, GA `name/description`,
   CQI `action_description/root_cause` keyed by `program_id`). Because neither function checks the
   PostgREST `error`, the failed selects return `null` and the PDF renders empty sections at HTTP 200.

3. **Client/DB contract drift (N-1, N-3, N-5).** The planner hook/types predate the DB CHECK
   (`todo/in_progress/done/deferred`) and were silenced with `as never`. `award-xp`'s self-trigger
   allow-list (`login/submission/journal`) was never expanded as new student-triggered sources were
   added. `generate-plan-update` trusts callers to pass `recent_interaction_count` but the column is
   NOT NULL with no default.

4. **Engagement loop never wired (S-1..S-5, R-7).** `signIn` only calls `logActivity`; nothing
   invokes `process-streak` / `award-xp('login')` / writes a login habit row. The Perfect Day cron
   only nudges; nothing pays the 50 XP. Two habit tables (`habit_logs` long-format, `habit_tracking`
   wide-format) coexist with divergent readers, so academic completions are recorded inconsistently.
   Grade and journal XP are advertised in the UI but never awarded from the client.

5. **Missing parent policies (P-1, P-2).** Parent pages read `student_courses` first, which has only
   student/teacher/admin SELECT policies — no parent policy — so the query returns `[]` and the page
   short-circuits. `course_sections` and `class_sessions` are similarly unpoliced for parents.

6. **Shared infra oversights (I-1..I-5).** `initSentry()` is called unconditionally in `App.tsx`
   before consent resolves; two functions list `x-content-type` instead of `x-client-info` in CORS;
   `useNotificationRealtime` is never mounted; localisation and orphan cleanup were missed.

## Correctness Properties

Property 1: Bug Condition — Role-gated functions authorize by profiles role

_For any_ input where the role-gate bug condition holds (`isRoleGateBug` returns true — a real
admin/coordinator/teacher caller whose JWT metadata role is empty), the fixed function SHALL resolve
role and `institution_id` from `profiles` by `user.id` and authorize the caller (HTTP status ≠ 403,
`authorized = true`), while continuing to authorize service-role/cron callers via the
`isServiceRole` / `x-internal-auth` branch.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Bug Condition — PDF generators query the live schema and fail loudly

_For any_ input where the schema-drift bug condition holds (`isSchemaDriftBug` returns true), the
fixed function SHALL query the live columns/scopes (`attainment_percent`,
`source/target_outcome_id`, `student_course`/`course`/`program`/`institution` scopes,
`graduate_attributes.name/description`, `cqi_action_plans.action_description/root_cause` by
`program_id`), guard each query with `if (error) throw`, and render real attainment, mapping,
sample-work, GA, and CQI sections.

**Validates: Requirements 2.4, 2.5**

Property 3: Bug Condition — Engagement XP is awarded with server-enforced canonical amounts

_For any_ input where the engagement-XP bug condition holds (`isEngagementXpBug` returns true), the
fixed system SHALL award XP equal to the server-enforced canonical amount for that source
(`study_session` capped 0–60, `wellness_habit` institution-configured, `planner_task` 10,
`weekly_goal` 25, `review_session` 15, `review_cycle_complete` 25; login 10, journal 20, grade 15,
perfect_day 50) with no silent `403`, and a student SHALL NOT be able to set an arbitrary
`xp_amount`.

**Validates: Requirements 2.7, 2.9, 2.10, 2.12, 2.13**

Property 4: Bug Condition — Planner status values satisfy the DB CHECK

_For any_ planner task create or complete where the planner-status bug condition holds
(`isPlannerStatusBug` returns true on the pre-fix path), the fixed hook SHALL write a DB-valid status
(`todo` on create, `done` on complete), the `PlannerTask["status"]` union and UI badge mapping SHALL
include `todo/in_progress/done/deferred`, and the operation SHALL succeed without a CHECK violation
or `as never` cast.

**Validates: Requirements 2.6**

Property 5: Bug Condition — Parents read verified linked children's course data

_For any_ input where the parent-access bug condition holds (`isParentAccessBug` returns true), the
fixed system SHALL return the linked child's rows from `student_courses` / `course_sections` /
`class_sessions` via a parent SELECT RLS policy scoped to `parent_student_links.verified=true`, so the
Progress/Attendance pages render data.

**Validates: Requirements 2.19, 2.20**

Property 6: Preservation — Non-buggy inputs are unchanged

_For any_ input where NO bug condition holds (`NOT (isRoleGateBug OR isSchemaDriftBug OR
isEngagementXpBug OR isPlannerStatusBug OR isParentAccessBug)`), the fixed system SHALL produce the
same result as the original system, preserving RLS isolation (9 probes), the `xp_total =
SUM(xp_transactions)` invariant, idempotent `scope='individual'` badges, the leaderboard, the
grade→evidence→attainment cascade, tutor responses, and all incidentally-touched CRUD flows.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11**

Property 7: Bug Condition + Preservation — Recursion-free, scoped parent reads (post-deployment)

_For any_ authenticated caller (parent, admin, teacher, student), reading `student_courses` /
`profiles` (and the parent-scoped `course_sections` / `class_sessions` / `assignments`) SHALL return
rows WITHOUT a `42P17 infinite recursion` error, because every parent SELECT policy resolves the
verified link through the `public.parent_has_verified_link(uuid)` SECURITY DEFINER helper rather than
an inline `parent_student_links` subquery. _For any_ verified parent the result SHALL be scoped to
exactly their linked child's rows (e.g. 3 of 250 `student_courses`, 12 of 28 `assignments`), and _for
any_ unverified-link / non-parent / cross-institution caller the parent policies SHALL return `[]` —
preserving the 9-probe isolation guarantee with no broadening. This is the live-RLS-engine analogue
of Property 5 (which the source-structure tests could not catch) plus its preservation obligation.

**Validates: Requirements 2.33, 2.34, 3.12**

## Fix Implementation

The remediation is decomposed into a per-issue fix map. Each row lists the issue ID, the files
touched, the change, and the verification method. Issue IDs follow the audit's taxonomy
(A=Admin/Accreditation, C=Coordinator/Course-file, N=cross-cutting, S=Student, P=Parent,
I=Infrastructure, T=Teacher, R=Reconciliation).

### Class 1 — Role-gate (A-0 / C-0; Requirements 2.1–2.3)

**Decision: primary fix = shared `_shared/auth.ts` profiles-lookup (option a); `custom_access_token_hook`
documented as an optional follow-up.**

Rationale: the profiles-lookup is lower blast radius (no auth-token-format change, no risk to the
`sb_secret_…` key paths), works for all 6 functions immediately, and mirrors the already-deployed,
already-verified pattern in `ai-feedback-draft` / `ai-module-suggestion`. The
`custom_access_token_hook` (injecting `role` + `institution_id` into the JWT) is the audit's
highest-leverage long-term fix but is deferred because it changes token shape for every caller and
would need its own isolation re-probe; it is recorded in the final report as a follow-up.

**Change A — `supabase/functions/_shared/auth.ts` `authenticateRequest`:** after `getUser()` succeeds,
create a service-role admin client and resolve role + `institution_id` from `profiles`:

```ts
const role =
  (callerProfile?.role as string) ??
  user.app_metadata?.role ??
  user.user_metadata?.role ??
  "";
const institutionId =
  (callerProfile?.institution_id as string) ??
  user.app_metadata?.institution_id ??
  user.user_metadata?.institution_id ??
  "";
```

The profiles value takes precedence; the JWT-metadata fallback is retained so any future token that
DOES carry the role still works (preservation). The `authenticateCronRequest` service-role/cron path
is untouched.

**Change B — `generate-accreditation-report/index.ts` and `generate-course-file/index.ts`:** replace
the inline `user.app_metadata?.role ?? …` block with a `profiles` lookup that mirrors
`ai-feedback-draft` EXACTLY (service-role admin client → `.from("profiles").select("role,
institution_id").eq("id", caller.id).maybeSingle()`), then gate on `["admin","coordinator"]`. Use the
resolved `institution_id` instead of the (empty) JWT one. Preserve the `Missing authorization header`
→ 401 and `Unauthorized` → 401 branches.

**Change C — `send-email-notification`, `check-login-rate`, `calculate-attainment-rollup`:** audit each
for the JWT-role pattern. Where a role/identity gate exists, route it through the corrected
`authenticateRequest` (or an inline profiles lookup) AND keep the `isServiceRole` branch first so
cron/edge-to-edge callers authorize without a profiles row. `calculate-attainment-rollup` stays
disconnected per preservation 3.7 — only its auth source is corrected if it gates by role.

| Issue                | Files                                                                        | Change                                                   | Verify                                                      |
| -------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------- | ----------------------------------------------------------- |
| A-0/C-0 role source  | `_shared/auth.ts`                                                            | profiles-lookup precedence + JWT fallback                | golden-path: coordinator calls `generate-course-file` → 200 |
| A-0 accred gate      | `generate-accreditation-report/index.ts`                                     | profiles role + institution_id, mirror ai-feedback-draft | admin/coordinator → PDF; student → 403                      |
| C-0 course-file gate | `generate-course-file/index.ts`                                              | same                                                     | coordinator → PDF; teacher → 403                            |
| A-0 shared callers   | `send-email-notification`, `check-login-rate`, `calculate-attainment-rollup` | corrected role source, preserve `isServiceRole`          | cron path still 200; bad role 403                           |

### Class 2 — Column/Schema drift (A-1, C-1; Requirements 2.4–2.5)

Mirror the working query shapes already proven in `useAdminDashboard`/`useDepartmentAnalytics`
(accreditation) and `useCQIPlans`/`usePLOMappings` (course-file). Add `if (error) throw` to every
select so future drift fails loudly.

**`generate-accreditation-report/index.ts`:**

- `AttainmentRow.score_percent` → `attainment_percent`. The select becomes
  `.select("outcome_id, scope, attainment_percent, student_id, course_id")` with
  `if (attainmentErr) throw attainmentErr`.
- Remove `scope === 'PLO'` / `scope === 'ILO'` filters. PLO/ILO attainment is derived by
  `outcome_id` join against `learning_outcomes` (type PLO/ILO) using the live scopes
  (`program`/`institution`), exactly as `useDepartmentAnalytics` does (`.in("scope",
["program","institution"])`).
- `graduate_attributes.select("id, title, code")` → `.select("id, name, description")`; the PDF GA
  table reads `name` (title) and `description` (subtitle); the `code` column reference is removed.
- Add `if (error) throw` to the program, semester, courses, outcomes, survey, CQI, sections, GA, and
  competency selects (currently unguarded).

**`generate-course-file/index.ts`:**

- `outcome_mappings.select("child_outcome_id, parent_outcome_id, weight")` →
  `.select("source_outcome_id, target_outcome_id, weight")`; `MappingRow` and the
  `ploMap.has(m.parent_outcome_id)` / `cloMap.get(m.child_outcome_id)` references become
  `target_outcome_id` / `source_outcome_id`.
- Sample student work: scores live on `grades`, not `submissions`. Replace the
  `submissions.select("…, score_percent")` with a join from submissions to `grades.score_percent`
  (mirror `useGrades`' `grades + submissions!inner(assignment_id)` shape): fetch submissions for the
  assignment IDs, then fetch `grades.select("submission_id, score_percent")` keyed by those
  submission IDs, and aggregate best/avg/worst from the grade rows.
- `outcome_attainment.select("…, score_percent").eq("scope","CLO")` →
  `.select("outcome_id, scope, attainment_percent, student_id").in("outcome_id", cloIds)` filtered to
  the valid scope `student_course` (CLO-level attainment is stored at `student_course` scope keyed by
  `outcome_id`). `AttainmentRow.score_percent` → `attainment_percent`.
- CQI: `.select("id, title, gap_description, corrective_actions, status").eq("course_id", course_id)`
  → `.select("id, action_description, root_cause, status").eq("program_id", c.program_id)` (the table
  is keyed by `program_id`). `CQIPlanRow` and the PDF mapping use `action_description` (actions) and
  `root_cause` (gap); the `title` column is dropped (use `outcome_id` slice or a static label).
- Remove the runtime `createBucket("reports")` fallback path? No — leave bucket handling as-is
  (out of scope); only add `if (error) throw` to the data selects (CLOs, PLOs, mappings, assignments,
  submissions, grades, attainment, reflections, CQI).

| Issue                    | Files                                    | Change                                                   | Verify                                  |
| ------------------------ | ---------------------------------------- | -------------------------------------------------------- | --------------------------------------- |
| A-1 attainment col/scope | `generate-accreditation-report/index.ts` | `attainment_percent`, outcome_id joins, `if(error)throw` | PDF shows non-zero PLO/ILO + GA section |
| A-1 GA columns           | same                                     | `name/description`                                       | GA rows render names                    |
| C-1 mappings             | `generate-course-file/index.ts`          | `source/target_outcome_id`                               | CLO-PLO mapping populated               |
| C-1 sample work          | same                                     | scores from `grades`                                     | best/avg/worst populated                |
| C-1 attainment           | same                                     | `attainment_percent` + `student_course` scope            | CLO attainment populated                |
| C-1 CQI                  | same                                     | `action_description/root_cause` by `program_id`          | CQI section populated                   |

### Class 3 — Client/DB contract & XP authorization (N-1, N-3, N-5; Requirements 2.6–2.8)

**N-1 Planner status union (one coherent change across hook + types + UI):**

- `src/types/planner.ts`: `TaskStatus = "todo" | "in_progress" | "done" | "deferred"` (discriminated
  union, replaces `"pending" | "completed"`).
- `src/hooks/usePlannerTasks.ts`: `mapTask` default `status` → `"todo"`; create insert `status:
"todo"`; complete update `status: "done"`; remove the `as never` casts (generated types now cover
  the insert/update shapes). The optimistic-update `status: "completed" as const` becomes `"done"`.
- UI badge mapping: locate the planner task badge/label component (planner board / today view) and
  map the four statuses to badge variants (`todo`→neutral, `in_progress`→blue, `done`→green,
  `deferred`→amber), replacing any `pending/completed` switch.

**N-3 `award-xp` self-trigger allow-list with server-enforced amounts:**

- In `award-xp/index.ts`, expand `selfTriggeredSources` to include `study_session`, `wellness_habit`,
  `planner_task`, `weekly_goal`, `review_session`, `review_cycle_complete` (in addition to
  `login`, `submission`, `journal`).
- **Critical:** the server already enforces canonical amounts for these sources in the per-source
  `cappedXpAmount` block (`planner_task`→10, `weekly_goal`→25, `review_session`→15,
  `review_cycle_complete`→25, `study_session`→clamp 0–60, `wellness_habit`→institution setting). For
  the newly self-allowed sources that do not yet have a deterministic `reference_id` set on the
  self-path, add idempotent `reference_id` derivation (e.g. `${source}:${student_id}:${reference_id}`
  or `:${today}`) so a student replaying the call cannot farm XP. The student-supplied `xp_amount` is
  ignored for all of these — the server value wins. This closes the "arbitrary xp_amount" hole.
- Add a unit assertion that for each newly-allowed self source the resolved amount equals the
  canonical constant regardless of the request `xp_amount`.

**N-5 `generate-plan-update` interaction_count:**

- In `generate-plan-update/index.ts`, validate/default: `const interactionCount =
Number.isFinite(recent_interaction_count) && recent_interaction_count >= 0 ?
recent_interaction_count : 0;` and insert `interaction_count: interactionCount`. Also default the
  CLO bloom read defensively (the function reads `bloom_level`; confirm column exists — the live
  column is `blooms_level`, so this is also a latent drift: change `select("id, title, bloom_level")`
  → `select("id, title, blooms_level")` and read `cloData?.blooms_level`). The NOT NULL insert now
  always receives a number.

| Issue             | Files                                                          | Change                                                                  | Verify                                      |
| ----------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------- |
| N-1 status union  | `src/types/planner.ts`, `usePlannerTasks.ts`, planner badge UI | todo/in_progress/done/deferred, drop `as never`                         | create+complete task succeed; tsc clean     |
| N-3 XP allow-list | `award-xp/index.ts`                                            | add 6 sources to `selfTriggeredSources`, idempotent ref, server amounts | study_session by student JWT → +XP, not 403 |
| N-5 plan update   | `generate-plan-update/index.ts`                                | default `interaction_count`, fix `blooms_level`                         | invoke without count → 200                  |

### Class 4 — Student engagement loop (S-1..S-5, R-7; Requirements 2.9–2.13)

**Habit table decision: use `habit_logs` (long-format) as the canonical academic-habit table.**

Justification: `habit_logs` is the table read by the most engagement-critical consumers —
`process-streak` (streak driver), `perfect-day-prompt`, `check-badges` (`perfect_week`/habit checks),
`compute-habit-correlations`, `update-challenge-progress`, `export-student-data`, and `useTodayView`.
Its `(student_id, habit_type, date)` long format also matches how completions actually arrive (one
event per habit) and supports an idempotent `onConflict: "student_id,habit_type,date"` upsert. The
wide-format `habit_tracking` is read by only `useHeatmapData` and `useReadHabitTimer` and the
`habit_master`/`full_spectrum` badges. Rather than migrate data, the design **writes to `habit_logs`
in the real flow** and adds a thin reconciliation so the `habit_tracking`-only readers stay correct:

- Write path (single source of truth): login/submit/journal/read write a `habit_logs` row
  (`habit_type` ∈ `login/submit/journal/read`, `date` = today UTC, `completed_at` = now) via
  idempotent upsert.
- `useReadHabitTimer.ts`: change the `read_content` upsert target from `habit_tracking` to
  `habit_logs` (`habit_type:'read'`), so reads feed the same table the streak/perfect-day logic uses.
  (This removes the long/wide split for the real flow.)
- `useSessionCompletion.ts`: already upserts `habit_logs` (`habit_type:'read'`) for ≥15-min sessions —
  keep; remove the `as never` cast now that the table is canonical.
- `useHeatmapData.ts` + `check-badges` `habit_master`/`full_spectrum`: keep reading their current
  tables but document that academic habits now live in `habit_logs`; where they read `habit_tracking`
  for academic days, repoint the academic-habit read to `habit_logs` (derive a per-day completed-count
  from the long rows). Wellness stays in `wellness_habit_logs` unchanged.

**S-1 Login streak + login habit (`AuthProvider.signIn`):** after a successful student login, in
addition to the existing `logActivity({event_type:'login'})`, fire-and-forget:

1. upsert a `habit_logs` row `{student_id, habit_type:'login', date: todayUTC, completed_at: now}`;
2. invoke `process-streak` with `{ student_id }` (the function authorizes the student's own JWT and is
   idempotent same-day — `dayDiff === 0` is a no-op);
3. invoke `award-xp` with `{ student_id, source:'login', xp_amount:10 }` (server enforces 10 and a
   `login:{id}:{date}` idempotent reference).

Streak driver decision: **invoke `process-streak` on login** (per-user, idempotent) rather than a
batch cron. The broken midnight `{type:'midnight_reset'}` cron is left disconnected; the design notes
it as orphan/no-op (does not process anyone) and the streak now advances from real per-user login.

**S-2 Perfect Day idempotent award + check-badges:** add a shared helper
`awardPerfectDayIfComplete(studentId)` (in `src/lib/` per clean-architecture) invoked after each habit
write (login/submit/journal/read). It reads today's `habit_logs` for the student; when all 4 habits
are present, it invokes `award-xp` with `{source:'perfect_day', xp_amount:50, reference_id:
'perfect_day:{student_id}:{date}', is_milestone:true}` (idempotent — `perfect_day` is a milestone
source, and the reference_id dedupes) and then `check-badges` with `{trigger:'perfect_day'}`. The 6 PM
nudge cron is unchanged (it still nudges 3/4 students).

**S-3 academic habit recording:** covered by the write path above — submit (in `useCreateSubmission`),
journal (in `useCreateJournalEntry`), read (`useReadHabitTimer`/`useSessionCompletion`), login
(`signIn`) each upsert their `habit_logs` row, then call `awardPerfectDayIfComplete`.

**S-4 grade XP (N? client):** the DB trigger already inserts the `grade` XP transaction idempotently
(`xp_transactions … 'grade' … ON CONFLICT DO NOTHING`) and updates `xp_total`. The audit asks the
**client** path to also fire so the badge-check runs. `useCreateGrade.onSuccess` will invoke
`check-badges` with `{student_id, trigger:'grade'}` and invalidate badge queries. It will NOT
duplicate the XP insert (the trigger owns XP; calling `award-xp('grade')` with the same
`reference_id = grade.id` is also idempotent, but to avoid double-counting we rely on the trigger and
only trigger the badge check). See T-2/R-12 below for the level-recompute fix that makes the trigger's
`xp_total` update also recompute `level`.

**S-5 journal XP (`useJournal`):** in `useCreateJournalEntry.onSuccess` (or mutationFn after insert),
when the entry content is ≥50 words, invoke `award-xp` with `{student_id, source:'journal',
xp_amount:20}` (server enforces 20 and a daily idempotent reference) and then `check-badges`
`{trigger:'journal'}`. Word count computed client-side from `input.content`.

**R-7 / S-class hygiene:** `useStudentBadges` — add the `scope='individual'` filter; since it is dead
code (imported nowhere), prefer removing it, but if retained it must filter by scope.
`useLearningPath` — derive Bloom ordering from ALL CLOs (min/representative Bloom across the course's
CLOs) instead of the first CLO only. `useStudentDashboard` — replace the fragile double-`.data` cast
with a typed access against the generated row type.

| Issue            | Files                                                                 | Change                                                         | Verify                                  |
| ---------------- | --------------------------------------------------------------------- | -------------------------------------------------------------- | --------------------------------------- |
| S-1 login streak | `AuthProvider.tsx`                                                    | upsert login habit + invoke process-streak + award-xp('login') | login advances `streak_current`, +10 XP |
| S-1 habit table  | `useReadHabitTimer.ts`, `useSessionCompletion.ts`                     | write `habit_logs`, drop `as never`                            | heatmap/streak fed from one table       |
| S-2 perfect day  | `src/lib/perfectDay.ts` (new), habit writers                          | idempotent perfect_day 50 XP + check-badges                    | 4th habit → +50 XP once                 |
| S-3 submit habit | `useSubmissions.ts` `useCreateSubmission`                             | upsert submit habit                                            | submit marks habit                      |
| S-4 grade badge  | `useGrades.ts` `useCreateGrade`                                       | check-badges on grade (trigger owns XP)                        | grade → badge check fires               |
| S-5 journal XP   | `useJournal.ts`                                                       | award-xp('journal') ≥50 words + check-badges                   | +20 XP on qualifying entry              |
| R-7 badges/path  | `useStudentBadges.ts`, `useLearningPath.ts`, `useStudentDashboard.ts` | scope filter / all-CLO Bloom / typed access                    | tsc clean; correct Bloom order          |

### Class 5 — Parent access (P-1, P-2; Requirements 2.19–2.20)

**Decision: RLS-policy approach (add parent SELECT policies), NOT a page rewrite.** It is additive,
mirrors four existing parent policies, and keeps the page logic intact.

New migration (next timestamp after `20260820100003`, e.g.
`20260821000000_add_parent_course_access_rls.sql`) adds three parent SELECT policies that mirror the
existing `outcome_attainment` parent policy EXACTLY (same `auth_user_role() = 'parent' AND … IN
(SELECT psl.student_id FROM parent_student_links psl WHERE psl.parent_id = auth.uid() AND psl.verified
= true)` shape — does NOT broaden):

```sql
-- student_courses: scoped to verified linked children
CREATE POLICY "parent_select_linked_student_courses" ON student_courses
  FOR SELECT TO authenticated
  USING (
    auth_user_role() = 'parent'
    AND student_id IN (
      SELECT psl.student_id FROM parent_student_links psl
      WHERE psl.parent_id = auth.uid() AND psl.verified = true
    )
  );

-- course_sections: visible when the parent has a verified child enrolled in that section
CREATE POLICY "parent_select_linked_course_sections" ON course_sections
  FOR SELECT TO authenticated
  USING (
    auth_user_role() = 'parent'
    AND id IN (
      SELECT sc.section_id FROM student_courses sc
      JOIN parent_student_links psl ON psl.student_id = sc.student_id
      WHERE psl.parent_id = auth.uid() AND psl.verified = true
    )
  );

-- class_sessions: visible for sections the parent's verified child is enrolled in
CREATE POLICY "parent_select_linked_class_sessions" ON class_sessions
  FOR SELECT TO authenticated
  USING (
    auth_user_role() = 'parent'
    AND section_id IN (
      SELECT sc.section_id FROM student_courses sc
      JOIN parent_student_links psl ON psl.student_id = sc.student_id
      WHERE psl.parent_id = auth.uid() AND psl.verified = true
    )
  );
```

Migration-replay-integrity steering: this migration only references long-existing objects
(`auth_user_role()`, `parent_student_links`, `student_courses`, `course_sections`, `class_sessions`),
so function-before-reference ordering holds. Run `npm run db:check-replay` before push. Re-run the 9
RLS isolation probes after (a non-parent or unverified link must still get `[]`).

**P-2 dashboard/profile/i18n:** parent dashboard KPIs read from the now-visible linked-child data
(courses + attainment + attendance); the orphan Parent Profile page is wired into the parent nav (add
the route + nav entry); `ParentPlannerView` is localised (replace hardcoded strings with `t(...)`
keys, add to `src/locales/{en,ar}`).

| Issue           | Files                        | Change                                         | Verify                                                    |
| --------------- | ---------------------------- | ---------------------------------------------- | --------------------------------------------------------- |
| P-1 RLS         | new migration                | 3 parent SELECT policies, verified-linked only | parent Progress/Attendance render; probes still leak-free |
| P-2 dashboard   | parent dashboard hook/page   | real linked-child KPIs                         | KPIs non-zero for linked parent                           |
| P-2 profile nav | parent layout/router         | wire orphan Parent Profile                     | profile reachable                                         |
| P-2 i18n        | `ParentPlannerView`, locales | localise strings                               | en/ar render                                              |

### Class 6 — Shared infrastructure (I-1..I-5; Requirements 2.21–2.24)

- **I-1 Sentry consent:** remove the unconditional `initSentry()` call at module scope in
  `src/App.tsx`. Sentry initialization remains only through the existing consent-gated path (which
  already calls `initSentry()` after consent and relies on `isInitialized()` to avoid double init).
  No capture occurs before consent.
- **I-2 CORS:** in `score-reflection-quality/index.ts` and `generate-reflection-digest/index.ts`,
  change the `Access-Control-Allow-Headers` value `x-content-type` → `x-client-info`.
- **I-3 realtime mount:** mount `useNotificationRealtime()` in `NotificationBell` (or `GlobalHeader`)
  so the bell updates live. Add the hook call near the top of the `NotificationBell` component
  (it returns `{isLive, retryCount}`; we can ignore the return or surface a "live paused" affordance).
- **I-4 i18n:** covered under P-2 for `ParentPlannerView`; sweep any other hardcoded strings flagged
  by the audit into locale files.
- **I-5 orphans:** `generate-reflection-digest` — if it has no scheduled/edge caller, either wire it
  (cron) or remove it with no broken references; the audit's reconciliation says it is dead. Decision:
  remove the orphan function and the orphan Parent Profile duplicate IF P-2 wiring supersedes it;
  otherwise wire. Document the choice in the final report.

| Issue | Files                                                    | Change                            | Verify                        |
| ----- | -------------------------------------------------------- | --------------------------------- | ----------------------------- |
| I-1   | `src/App.tsx`                                            | remove top-level `initSentry()`   | no Sentry init before consent |
| I-2   | `score-reflection-quality`, `generate-reflection-digest` | `x-client-info`                   | browser invoke succeeds       |
| I-3   | `NotificationBell.tsx`                                   | mount `useNotificationRealtime()` | bell updates live             |
| I-4   | `ParentPlannerView`, locales                             | localise                          | en/ar                         |
| I-5   | orphan fn/page                                           | wire or remove                    | no dangling refs              |

### Class 7 — Audit / hygiene

- **A-2 useSemesters stub:** remove the local `useSemesters` stub in `ReportGeneratorPage.tsx` so the
  real `@/hooks/useSemesters` hook populates the dropdown.
- **A-3 auditLogger columns:** in `src/lib/auditLogger.ts`, change the `bonus_xp_event` allow-list
  from `["name","multiplier","start_date","end_date"]` to `["name","xp_multiplier","starts_at",
"ends_at"]` so the diff captures real changes.
- **A-5 admin program filter:** in `useAdminDashboard.ts` `usePendingOnboardingStudents`, apply the
  `programId` filter (the param exists but is ignored). Filter via the profiles→program relation used
  elsewhere (e.g. `.eq("program_id", filters.programId)` if present on profiles, else join through
  enrollments) consistent with the existing working query shape.
- **C-2 placeholder metrics:** curriculum matrix + coordinator dashboard compute real attainment
  (reuse the `useDepartmentAnalytics` aggregation over `outcome_attainment.attainment_percent`)
  instead of CLO-count/active-student placeholders.
- **S-6/S-8/S-9/S-10/S-11:** remove `as never`/`as any` casts now that generated types exist; convert
  `.single()` reads that may return 0 rows (`useSessionCompletion.ts:292`, `useReplacementVotes.ts:114`,
  bonus-event reads) to `.maybeSingle()`; fix Bloom derivation (S-class, see useLearningPath) and the
  double-`.data` access (useStudentDashboard).
- **T-1 `!inner`:** in `useSubmissions.ts`, change the embedded join to `assignments!inner(...)` so the
  `assignments.course_id` filter restricts parent rows (both `useSubmissions` and
  `usePendingSubmissions`).
- **T-2 / R-12 grade trigger level recompute:** new migration that `CREATE OR REPLACE`s the attainment
  rollup trigger function so the `UPDATE student_gamification SET xp_total = COALESCE(xp_total,0) + 15`
  also recomputes `level` from the new `xp_total` (using the same threshold formula as `award-xp`'s
  `calculateLevel`, implemented in SQL). Must NOT introduce `xp_total` drift (the `+15` and the
  idempotent `ON CONFLICT DO NOTHING` insert stay; only `level` is additionally set). Harden at the
  CREATE site per migration-replay steering.
- **T-3 graded status:** set `submissions.status = 'graded'` when a grade is created (either in
  `useCreateGrade` after the grade insert, or via the same grade trigger) so `useGradingStats`
  pending count (which counts `status='submitted'`) matches the KPI card. Decision: set it in the DB
  trigger alongside the XP insert to keep client and server consistent and avoid a race.
- **T-4 / I-5 orphans:** `embed-course-material` caller — see N-4.
- **challenges self-join RLS (1.30/2.30):** new migration adds a student self-join INSERT policy on
  `challenge_participants` scoped to the student's own `student_id` within their institution
  (`WITH CHECK (auth_user_role() = 'student' AND student_id = auth.uid())`), without broadening read
  access to other students' rows.
- **quiz_generation_logs model label (1.32/2.32):** in `generate-quiz-questions`, record the actual
  model used (the resolved `model` variable) instead of a hardcoded label.

| Issue     | Files                                    | Change                                  | Verify                               |
| --------- | ---------------------------------------- | --------------------------------------- | ------------------------------------ |
| A-2       | `ReportGeneratorPage.tsx`                | remove stub                             | semester dropdown populates          |
| A-3       | `auditLogger.ts`                         | real bonus_xp_event columns             | audit diff captures multiplier/dates |
| A-5       | `useAdminDashboard.ts`                   | apply program filter                    | filtered pending list                |
| C-2       | curriculum matrix, coordinator dashboard | real attainment                         | non-placeholder metrics              |
| S-6..S-11 | various hooks                            | maybeSingle + drop casts                | tsc/lint clean, no 0-row throw       |
| T-1       | `useSubmissions.ts`                      | `assignments!inner`                     | course filter restricts queue        |
| T-2/R-12  | new migration (trigger)                  | recompute level, no drift               | level matches xp_total               |
| T-3       | grade trigger                            | set status='graded'                     | pending count matches KPI            |
| 1.30      | new migration                            | challenge_participants self-join INSERT | student joins challenge              |
| 1.32      | `generate-quiz-questions`                | actual model label                      | log shows real model                 |

### Class 8 — Deployment reconciliation (R-0; verification only)

Local `main` is clean and synced with `origin/main`, so badge/`verify_jwt`/F-1..F-4/N-2 are already
committed. R-0 is **verification, not re-commit**: confirm via `git log`/`git diff` against deployed
functions (`docs/Edge-Function-Deployment-Guide.md` / `Manual-Edge-Function-Deploy-Steps.md`) that the
deployed versions match HEAD for `award-xp`, `check-badges`, `ai-feedback-draft`,
`ai-module-suggestion`, `generate-quiz-questions`. No code change; the final report records the
confirmed parity.

### Class 9 — AI / RAG (N-4; Requirement 2.29)

Configure an embeddings provider for `embed-course-material` (currently OpenAI-only and orphaned):
add `OPENAI_API_KEY` as a Supabase secret (or an OpenRouter-compatible embedding model env), and wire
a caller so uploads populate `course_material_embeddings` (the teacher material-upload hook invokes
`embed-course-material` after a successful upload). The tutor and `generate-plan-update` already
degrade gracefully when `OPENAI_API_KEY` is absent (RAG block is skipped; persona + CLO context still
answer) — that fallback is preserved (3.6). If no provider is provisioned in this environment, RAG
citations are reported as "still missing — pending embeddings provider" in the final report.

### Class 10 — Final live-verified report

Produce `docs/audit/FULL-PROFILE-REMEDIATION-LIVE-REPORT.md` after fixes, authenticating as a real
user in each role against production using the demo accounts in
`docs/QA-Demo-Credentials-and-Testing-Guide.md` (universal password `DemoQatar2026!`; e.g.
`principal@gulf-academy.test`, `curriculum@gulf-academy.test`, `anderson@gulf-academy.test`,
`student01@gulf-academy.test`, and a verified parent account). Structure:

- **Confirmed working via actual live profile data** — per feature, the real flow exercised and the
  observed result (XP awarded, streak advanced, PDF sections populated, parent pages showing data,
  notifications updating live).
- **Still missing / needs fixing** — each unresolved item with the precise reason (RAG citations
  pending embeddings provider, free-tier Kimi token caps, `custom_access_token_hook` deferred).
- A clear separation of real, reproducible results from seed artifacts, consistent with the audit's
  five-pass methodology.

## Testing Strategy

### Validation Approach

Two phases: first surface counterexamples that demonstrate each bug class on unfixed code, then
verify the fix works (fix checking) and preserves existing behavior (preservation checking). For the
classes where it adds value, property-based tests (fast-check, ≥100 iterations) generate inputs across
the domain; otherwise targeted unit/integration tests are used. All work respects the steering: never
hand-edit `src/types/database.ts` (use `pwsh scripts/regen-types.ps1` after any migration), run
`npm run lint` + `npx tsc --noEmit` + `npm test` before push, never push to `main` (feature branch +
PR), RLS on all tables, append-only invariants intact.

### Exploratory Bug Condition Checking

**Goal:** surface counterexamples on UNFIXED code and confirm/refute the root-cause hypotheses.

Test cases (expected to fail / demonstrate the defect on current code):

1. **Role-gate:** simulate a coordinator JWT (role only in `profiles`) calling
   `generate-course-file` → expect `403` (confirms JWT-role read).
2. **Schema drift:** run `generate-accreditation-report` against seeded attainment → expect 0/"Not
   Yet" PLO/ILO and empty GA section at HTTP 200 (confirms missing `error` guard + bad columns).
3. **Planner status:** insert a planner task with `status:'pending'` → expect
   `planner_tasks_status_check` violation.
4. **Engagement XP:** student JWT calls `award-xp({source:'study_session'})` → expect `403`.
5. **Login streak:** log in as a student, read `streak_current` before/after → expect unchanged.
6. **Parent access:** as a verified parent, select `student_courses` → expect `[]`.

**Expected counterexamples:** 403s for valid staff/students, empty PDF sections, CHECK violations,
stale streaks, empty parent pages — matching the live-observed counterexamples in Bug Details.

### Fix Checking

**Goal:** for all inputs where a bug condition holds, the fixed function produces the expected
behavior.

```
FOR ALL input WHERE isRoleGateBug(input) DO
  result := authenticateRequest_fixed(input);  ASSERT result.status ≠ 403 AND result.authorized
END FOR
FOR ALL input WHERE isSchemaDriftBug(input) DO
  result := pdfFn_fixed(input);  ASSERT result.sections.populated AND query.errorGuarded
END FOR
FOR ALL input WHERE isEngagementXpBug(input) DO
  result := awardXp_fixed(input);  ASSERT xp_awarded(result) = canonical(input.source) AND no_403
END FOR
FOR ALL input WHERE isPlannerStatusBug(input) DO
  ASSERT plannerWrite_fixed(input) ∈ {todo,in_progress,done,deferred} AND succeeds
END FOR
FOR ALL input WHERE isParentAccessBug(input) DO
  ASSERT parentSelect_fixed(input) = linkedChildRows
END FOR
```

### Preservation Checking

**Goal:** for all inputs where NO bug condition holds, `F(X) = F'(X)`.

```
FOR ALL input WHERE NOT (isRoleGateBug ∨ isSchemaDriftBug ∨ isEngagementXpBug
                         ∨ isPlannerStatusBug ∨ isParentAccessBug) DO
  ASSERT F(input) = F'(input)
END FOR
```

Property-based testing is recommended here: it generates many inputs across the domain and catches
edge cases. Observe behavior on UNFIXED code first, then write tests that capture it.

Test cases:

1. **RLS isolation (9 probes):** re-run all 9 boundary probes after the parent migration — a
   non-parent, an unverified link, and a cross-institution caller must still get `[]`.
2. **xp_total invariant:** property test — for random sequences of XP awards (including the newly
   self-allowed sources), `xp_total = SUM(xp_transactions)` and `level = calculateLevel(xp_total)`.
3. **Badges idempotent:** repeated `check-badges` invocations award each `scope='individual'` badge
   at most once.
4. **Submission XP unchanged:** on-time +25 / late +15 per assignment, idempotent — unchanged.
5. **Leaderboard:** `get_leaderboard_page` rows + anonymous opt-out unchanged.
6. **Tutor without RAG:** with no `OPENAI_API_KEY`, the tutor still returns persona + CLO answers and
   refuses homework-completion requests.
7. **Migration replay:** `npm run db:check-replay` CLEAN; full replay from scratch passes on Supabase
   Preview.

### Unit Tests

- `_shared/auth.ts`: profiles precedence, JWT fallback, service-role branch preserved.
- `award-xp`: each newly-allowed self source resolves the canonical server amount regardless of
  request `xp_amount`; idempotent reference dedupe.
- Planner: status union type, `mapTask` default, create/complete writes, badge mapping.
- `auditLogger`: `bonus_xp_event` diff captures `xp_multiplier/starts_at/ends_at`.
- `useGradingStats`: pending count matches once `status='graded'` is set.
- `generate-plan-update`: missing `recent_interaction_count` defaults to 0; insert succeeds.

### Property-Based Tests

- xp_total/level invariant across random award sequences (≥100 iterations).
- Planner status round-trip: any DB-valid status maps to a UI badge and back.
- Perfect Day idempotency: random habit-completion orders award `perfect_day` exactly once per day.
- Parent RLS: random (parent, child, verified?) tuples — only verified links return rows.

### Integration Tests

- Golden-path per role using demo accounts: admin/coordinator generate populated PDFs; teacher grading
  queue respects course filter and pending count; student login→streak→XP→perfect-day→badges; parent
  Progress/Attendance render linked-child data; notification bell updates live.
- Migration replay integrity (`db:check-replay` + Supabase Preview) for the parent-RLS, grade-trigger,
  and challenge-RLS migrations.
- Regenerate types via `pwsh scripts/regen-types.ps1` after migrations; confirm `tsc --noEmit` clean.

## Sequencing (aligned to the audit's Sprint A/B/C)

- **Sprint A (blockers / highest leverage):** Class 1 role-gate (`_shared/auth.ts` + 2 PDF fns +
  shared callers), Class 2 schema drift, Class 3 N-1 planner status + N-3 XP allow-list. These unblock
  staff PDF generation and student XP immediately.
- **Sprint B (engagement + parent):** Class 4 engagement loop (login streak, perfect day, habit table,
  grade/journal XP), Class 5 parent RLS migration + dashboard/profile/i18n, T-2/R-12 grade trigger
  level recompute, T-3 graded status, T-1 `!inner`.
- **Sprint C (hygiene + infra + AI + report):** Class 6 shared infra, Class 7 remaining hygiene
  (A-2/A-3/A-5/C-2/casts/maybeSingle/challenge RLS/quiz label), Class 9 RAG config, Class 8 R-0
  verification, Class 10 final live-verified report.

Each migration follows migration-replay-integrity (function-before-reference ordering, harden at CREATE
site, `npm run db:check-replay` before push). Each sprint ends with lint + tsc + test green and a PR
to a feature branch (never to `main`).

## Don't-Break-These Notes (per Unchanged Behavior 3.1–3.11)

- Do not broaden any RLS policy beyond `parent_student_links.verified=true` linked children; re-run
  the 9 isolation probes after the parent migration.
- Do not change the XP ledger semantics: `xp_total = SUM(xp_transactions)`, multiplier engine, level
  math. The grade-trigger change adds `level` recompute only — no second `+15`.
- Do not regress the badge system: `scope='individual'`, idempotent.
- Do not alter `award-xp`/`check-badges` auth: keep `verify_jwt=false` + `x-internal-auth` service-role
  match + user-JWT ownership for self sources; keep cross-user `403`.
- Do not touch `ai-feedback-draft`/`ai-module-suggestion`/`generate-quiz-questions` behavior beyond
  what is already deployed.
- Keep the academic-integrity guard in the tutor; keep tutor graceful-degradation without RAG.
- Keep `calculate-attainment-rollup` disconnected; keep `trigger_attainment_rollup` as the cascade.
- Never hand-edit `src/types/database.ts` — regenerate via `pwsh scripts/regen-types.ps1` after each
  migration. Run lint + tsc + test before every push. Never push to `main`.

## Post-Deployment Live-Audit Fixes (Class 11)

> **Addendum status — already implemented, deployed, and live-verified.** This section is a
> post-deployment / "Class 11" addendum to the Fix Implementation and Sequencing sections above. The
> three findings below were discovered AFTER the Sprint A/B/C remediation migrations were deployed to
> production (Supabase project `cdlgtbvxlxjpcddjazzx`), during live-SQL verification that impersonates
> real JWTs (`set local role authenticated` + `set local request.jwt.claims`). They could not be
> caught by the source-structure property tests because they only manifest under a live RLS engine.
> All three are already fixed and re-verified live; this section documents the chosen approach for
> traceability and for the matching Class 11 tasks. It maps to bugfix clauses 1.33/2.33, 1.34/2.34,
> 1.35/2.35 and preservation clause 3.12, and is validated by Correctness Property 7.

### Finding 1.33 — Parent RLS recursion (CRITICAL; Requirements 2.33, 3.12)

**Symptom (live `42P17`):** ALL authenticated reads of `student_courses` and `profiles` aborted with
`ERROR: 42P17 infinite recursion detected in policy` — for parent AND admin callers. This is a
production-outage-class regression introduced by the naive inline parent policies added in
`20260821000000` / `20260821000003`.

**Root cause — the RLS evaluation cycle.** The parent SELECT policies on `student_courses`,
`course_sections`, `class_sessions`, and `assignments` used an INLINE
`EXISTS (… FROM parent_student_links …)` subquery. Because `parent_student_links` carries its own RLS
(`parent_links_admin_manage`, which subqueries `profiles`) and `profiles` carries
`profiles_teacher_read_students` (which subqueries `student_courses`), evaluating the RLS on
`student_courses` closes a cycle:

```
student_courses (parent policy)
  → parent_student_links (parent_links_admin_manage → subquery profiles)
    → profiles (profiles_teacher_read_students → subquery student_courses)
      → student_courses … ∞   ⇒  Postgres 42P17
```

Production was unaffected by the source-structure tests because the recursion only exists when the
live planner expands the nested policy predicates.

**Design decision — call the SECURITY DEFINER helper, not an inline subquery.** Rewrite all four
parent SELECT policies to resolve the verified link through the existing
`public.parent_has_verified_link(p_student_id uuid)` SECURITY DEFINER helper. `SECURITY DEFINER`
executes the link lookup with the definer's rights, **bypassing RLS on `parent_student_links`**, so
the chain terminates and the cycle is broken. This is the exact pattern the long-standing
`profiles_parent_read_linked` policy already uses, so it introduces no new mechanism. Semantics are
unchanged: a parent still sees only verified-linked children, with no broadening.
`parent_has_verified_link(p_student_id)` returns true iff the calling parent has a row in
`parent_student_links` for `p_student_id` with `verified = true`.

**Policy predicate shape per table** (implemented in
`20260821000004_fix_parent_rls_recursion_use_helper.sql`):

```sql
-- student_courses — keyed on student_id DIRECTLY (no join needed)
CREATE POLICY "parent_read_student_courses" ON public.student_courses
  FOR SELECT TO authenticated USING (
    (select auth_user_role()) = 'parent'
    AND student_id IS NOT NULL
    AND (select public.parent_has_verified_link(student_courses.student_id))
  );

-- course_sections — join through the linked child's enrollment
CREATE POLICY "parent_read_course_sections" ON public.course_sections
  FOR SELECT TO authenticated USING (
    (select auth_user_role()) = 'parent'
    AND EXISTS (
      SELECT 1 FROM student_courses sc
      WHERE (sc.section_id = course_sections.id OR sc.course_id = course_sections.course_id)
      AND (select public.parent_has_verified_link(sc.student_id))
    )
  );

-- class_sessions — section_id → course_sections → enrollment
CREATE POLICY "parent_read_class_sessions" ON public.class_sessions
  FOR SELECT TO authenticated USING (
    (select auth_user_role()) = 'parent'
    AND EXISTS (
      SELECT 1 FROM course_sections cs
      JOIN student_courses sc ON (sc.section_id = cs.id OR sc.course_id = cs.course_id)
      WHERE class_sessions.section_id = cs.id
      AND (select public.parent_has_verified_link(sc.student_id))
    )
  );

-- assignments — course-scoped via the linked child's enrollment
CREATE POLICY "parent_read_linked_assignments" ON public.assignments
  FOR SELECT TO authenticated USING (
    (select auth_user_role()) = 'parent'
    AND EXISTS (
      SELECT 1 FROM student_courses sc
      WHERE sc.course_id = assignments.course_id
      AND (select public.parent_has_verified_link(sc.student_id))
    )
  );
```

Note that `student_courses` is keyed on `student_id` directly, while `course_sections` /
`class_sessions` / `assignments` join through `student_courses` and apply
`parent_has_verified_link(sc.student_id)` (none of them re-references `parent_student_links` inline).

**Correctness property (see Property 7):** for all parent/admin (and any authenticated) callers,
reading `student_courses` / `profiles` returns rows with no `42P17`; for a verified parent the result
is scoped to their linked child only; for an unverified-link / non-parent caller the parent policies
return `[]`.

**Replay safety (migration-replay-integrity):** `20260821000004` references only long-existing
objects (`auth_user_role()`, `public.parent_has_verified_link()`, `student_courses`,
`course_sections`, `class_sessions`, `assignments`) and is idempotent via `DROP POLICY IF EXISTS`;
SELECT-only.

### Finding 1.34 — Parent assignments SELECT gap (Requirements 2.34)

**Symptom:** the parent planner view (`ParentPlannerView` → `useWeeklyPlannerData(studentId)`) builds
a per-week "deadlines" lane from `assignments`. Sessions / tasks / goals populated (those tables have
`parent_select_linked_*` policies from Class 5), but `assignments` had NO parent SELECT policy, so the
deadlines lane was silently empty for a verified parent's linked child.

**Design decision:** add one additive parent SELECT policy `parent_read_linked_assignments` on
`assignments`, course-scoped via the linked child's `student_courses` enrollment (assignments have no
`student_id` — they are course-scoped). It was first introduced in
`20260821000003_add_parent_assignments_read_rls.sql` and then **folded into the recursion-safe
rewrite in `20260821000004`** so it also uses `parent_has_verified_link` (the inline-subquery form in
`20260821000003` would otherwise participate in the same `42P17` cycle as 1.33). SELECT-only, no
broadening: unverified-link / non-parent / non-enrolled-course callers still get `[]`.

### Finding 1.35 — Migration history reconciliation (Requirements 2.35)

**Symptom:** the MCP `apply_migration` path executed the DDL directly against the hosted database but
did NOT record version rows in `supabase_migrations.schema_migrations` (latest recorded version stayed
`20260820100003`). A future `supabase db diff --linked` could therefore report drift even though the
schema is actually correct.

**Design decision:** because all five Class-5/Class-11 migrations are idempotent (every statement is
`DROP POLICY IF EXISTS` + `CREATE POLICY`, or `CREATE OR REPLACE`), reconciliation is safe by either
(a) backfilling the missing `schema_migrations` version rows, or (b) re-applying the chain via the
Supabase CLI (`supabase migration repair --status applied <version>` and/or `supabase db push`) so
that `supabase db diff --linked` reports no drift. Either path is non-destructive given idempotency.

**Migration filenames in replay (filename) order:**

1. `20260821000000_add_parent_course_access_rls.sql` — Class 5 parent SELECT policies
   (`student_courses` / `course_sections` / `class_sessions`).
2. `20260821000001_grade_trigger_level_recompute_and_graded_status.sql` — Class 7 T-2/R-12 grade
   trigger level recompute + T-3 `status='graded'`.
3. `20260821000002_challenge_participants_student_self_join.sql` — Class 7 challenge self-join INSERT
   policy (1.30/2.30).
4. `20260821000003_add_parent_assignments_read_rls.sql` — Finding 1.34 parent `assignments` SELECT.
5. `20260821000004_fix_parent_rls_recursion_use_helper.sql` — Finding 1.33 recursion-safe rewrite of
   all four parent policies (and the recursion-safe form of 1.34).

> Replay all five in the order above. The reconciliation must leave `supabase db diff --linked` clean
> and `npm run db:check-replay` CLEAN.

### Live verification (already performed)

These fixes were verified LIVE by impersonating real JWTs (`set local role authenticated` +
`set local request.jwt.claims`), not just by source-structure tests:

- Admin reads of `student_courses` / `profiles` no longer recurse (no `42P17`).
- A verified parent reads exactly the linked child's data — **3 of 250 `student_courses`** and
  **12 of 28 `assignments`** — confirming correct verified-link scoping (no broadening).
- The challenge self-join policy passes both a positive (student joins own institution challenge) and
  a negative (cross-student/cross-institution insert rejected) test.
- Zero `xp_total` drift and zero `level` mismatch across all **71 students** (preservation 3.2 holds).
- Append-only invariants (evidence / audit_logs / xp_transactions) and FK integrity confirmed intact.

### Class 11 fix map

| Finding                     | Files                                                                    | Change                                                                                   | Verify (live)                                                                        |
| --------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 1.33 parent RLS recursion   | `20260821000004_fix_parent_rls_recursion_use_helper.sql`                 | rewrite all 4 parent policies to call `parent_has_verified_link` SECURITY DEFINER helper | admin/parent read `student_courses`/`profiles` → no `42P17`; verified parent → 3/250 |
| 1.34 parent assignments gap | `20260821000003_add_parent_assignments_read_rls.sql` (folded into `…04`) | add `parent_read_linked_assignments`, course-scoped via `student_courses` + helper       | parent deadlines lane populates; verified parent → 12/28; non-parent → []            |
| 1.35 migration history      | `schema_migrations` backfill / `supabase migration repair` + `db push`   | record the 5 idempotent versions `20260821000000`–`20260821000004`                       | `supabase db diff --linked` clean; `db:check-replay` CLEAN                           |
