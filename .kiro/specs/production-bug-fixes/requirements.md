# Production Bug Fixes — Requirements

## Introduction

During a pre-investor demo walkthrough on the local dev server (pointing at the
production Supabase project `cdlgtbvxlxjpcddjazzx`, "Edeviser-Kiro"), several **real
code defects** were found that also affect the deployed application. This spec then
expanded into a full senior-dev / QA sweep of the codebase audit findings
(`docs/audit-findings/01-05`) and the live Supabase security/performance advisors to
capture every genuine production gap in one place so they can be fixed, reviewed, and
shipped through the normal pipeline (feature branch → CI → Supabase Preview → PR →
Vercel) without hand-editing production.

Each item is framed the way a senior engineer would triage it: **WHAT** (root cause,
with `file:line` evidence where known), **WHY** (user/business impact + severity), and
**HOW** (fix approach), with a **verification/test strategy** captured in `design.md`
and `tasks.md`.

### Scope rules (non-negotiable)

- **No fake/seed/demo data in production.** Any data gaps observed during the demo
  (empty outcome mappings, sparse onboarding responses, `badges=0`, `teams=0`, etc.)
  are resolved by real institutions configuring their own data — **not** by seeding.
  This spec changes **code/behaviour and platform configuration only**. The one
  exception explicitly allowed is _catalog/reference_ seeding that is part of a
  feature's definition (e.g. `badge_definitions`), and even that is treated as a
  per-institution configuration step, gated behind its own track and flagged, never
  silent fixture data.
- **Preserve existing functionality.** Every change must be backward-compatible and
  must not alter working flows. Improve only where a defect or measurable
  performance problem exists. Public component props, hook return shapes, RPC
  signatures, and Edge Function request/response contracts are preserved unless a
  requirement explicitly calls out a contract change.
- **Dev-only affordances stay dev-only.** The local quick-login panel
  (`src/pages/LoginPage.tsx`) is gated behind `import.meta.env.DEV` and must remain
  excluded from production builds. The generic `@demo.com` Quick Demo Access panel is
  env-gated (`VITE_DEMO_PASSWORD`) and is out of scope.
- **Respect spec boundaries (no duplication).** Several findings overlap with
  in-flight specs and are **deferred** to them, not re-solved here:
  - All Postgres function `search_path` hardening / `function_search_path_mutable`
    (the 10 functions + 2 badge functions) → owned by
    **`db-function-search-path-qualification`**.
  - Migration replay-order aborts, historical drift, phantom-table deployment gaps →
    owned by **`migration-history-reconciliation`** and **`migration-replay-order-fix`**.
    This spec references those but does not re-specify their work.
- **DB-change discipline.** Any migration obeys `migration-replay-integrity`
  (no forward function references; harden at CREATE site), `migration-history-reconciliation`,
  passes `npm run db:check-replay` + Supabase Preview, and `src/types/database.ts` is
  regenerated via `scripts/regen-types.ps1` (never hand-edited).
- **Local CI gate before every push:** `npm run lint` → `npx tsc --noEmit` →
  `npm test` (per `pre-push-checks`). Never push to `main`; feature branch + PR.

### Severity legend

- **P0 / BLOCKER** — a core feature is non-functional end-to-end (silent data loss,
  always-zero output on a headline deliverable, or a hard 500).
- **P1** — visible to every user / blocks a core flow.
- **P2** — visible in a specific role/flow, has a workaround.
- **P3** — performance / robustness / hygiene improvement, no hard block.

### Track structure (by risk, so low-risk wins ship first)

- **Track A — Confirmed surgical code defects (low risk).** Tightly scoped client/UX
  fixes with a regression test each. Ship first; near-zero blast radius.
- **Track B — Supabase platform hardening (advisors).** Live security/performance
  advisor findings; mostly configuration + small guarded migrations.
- **Track C — Higher-risk correctness defects (verify-then-fix).** Real but larger
  bugs (OBE export schema drift, badge/XP/streak engines). Each requires its own
  reproduce → preserve-baseline → fix → parity loop and may be spun into a dedicated
  spec; nothing here ships without explicit verification on production data shapes.

---

## Track A — Confirmed surgical code defects (low risk)

### Requirement 1 — ILO status badge always shows "Inactive" (P1)

**WHAT (root cause):** `src/pages/admin/outcomes/columns.tsx` (the Status cell at the
`is_active` accessor, ~line 81) defines a `Status` column with
`accessorKey: "is_active"`, but the `learning_outcomes` table has no `is_active`
column. `row.getValue("is_active")` is therefore always `undefined` (falsy), so every
ILO renders the red "Inactive" badge. The sortable/reorder view hard-codes "Active",
confirming the intended state is Active.

**WHY (impact):** P1 — every admin sees every ILO mislabelled "Inactive"; misleading
on the core outcomes screen and in front of investors.

**User story:** As an admin, I want my Institution Learning Outcomes to show their
true status, so the outcomes list is not misleading.

#### Acceptance Criteria

1. WHEN an admin views the ILO list THEN the system SHALL render each ILO as
   "Active" unless an explicit `is_active === false` value is present.
2. WHEN the underlying row has no `is_active` field THEN the system SHALL treat the
   ILO as Active (default), matching the reorder view's existing behaviour.
3. WHEN this change is applied THEN no other column, sort, or filter behaviour on the
   ILO list SHALL change.

---

### Requirement 2 — Student trapped by onboarding "Complete & Go to Dashboard" (P1)

**WHAT (root cause):** In `src/pages/student/onboarding/OnboardingWizard.tsx`,
`handleConfirmProfile` calls `navigate('/student')` only **after**
`processOnboarding.mutateAsync(...)` resolves. If the `process-onboarding` Edge
Function is slow, errors, or is unavailable, the `await` rejects into an empty
`catch` and navigation never runs. Because the wizard is a full-screen
`fixed inset-0 z-50` overlay, the student is left stuck on "Processing…" with no way
to reach the dashboard.

**WHY (impact):** P1 — a brand-new student's very first action can dead-end on a
blank processing screen, the worst possible first impression and unrecoverable
without a manual reload.

**User story:** As a student finishing onboarding, I want to always reach my
dashboard when I click Complete, even if backend post-processing is slow or fails.

#### Acceptance Criteria

1. WHEN a student clicks "Complete & Go to Dashboard" THEN the system SHALL navigate
   to the student dashboard regardless of whether the `process-onboarding` Edge
   Function call succeeds or fails.
2. WHEN the Edge Function call is in flight THEN the button SHALL show a spinner and
   be disabled, and navigation SHALL occur optimistically.
3. IF the Edge Function call fails THEN the failure SHALL be logged (Sentry via the
   existing mutation error handling, not silently swallowed) and the student SHALL
   still land on the dashboard.
4. WHEN profile post-processing eventually completes THEN the student's profile data
   SHALL still be written (the function call is not removed, only de-coupled from
   navigation).

---

### Requirement 3 — Greeting/label shows honorific instead of first name (P2)

**WHAT (root cause):** Two surfaces derive a display name by naive token split:

- `src/components/shared/WelcomeHero.tsx` uses `name.split(" ")[0]`.
- `src/components/shared/ProfileDropdown.tsx:90` uses
  `profile.full_name?.split(" ")[0] ?? "User"` in the header.
  Real staff names carry honorific titles ("Mr. David Okonkwo", "Dr. Aisha
  Al-Mansoori"), so both render "Mr." / "Dr." instead of the first name.

**WHY (impact):** P2 — visible on every role dashboard hero **and** the global header
dropdown; cosmetic but pervasive and unprofessional.

**User story:** As any user, I want the dashboard and header to greet me by my actual
first name, not by my title.

#### Acceptance Criteria

1. WHEN a user's `full_name` begins with a recognised honorific (Mr, Mrs, Ms, Miss,
   Dr, Prof, Mx, Sir, with or without a trailing period) AND has at least one more
   token THEN the displayed first name SHALL be the following token (the real first
   name).
2. WHEN a user's `full_name` has no honorific THEN the first token SHALL be used,
   preserving current behaviour.
3. WHEN `full_name` is empty or missing THEN the existing fallback SHALL be used
   (translated "there" in `WelcomeHero`; "User" in `ProfileDropdown`).
4. WHEN this change is applied THEN a single shared pure helper (e.g.
   `getDisplayFirstName(name)`) SHALL back **both** `WelcomeHero` and `ProfileDropdown`
   (no duplicated logic, per engineering-guardrails "no duplication"), and it SHALL
   apply uniformly to every role dashboard.

---

### Requirement 4 — `.single()` on zero-row reads throws instead of empty state (P2)

**WHAT (root cause):** Per audit 05 Flag 5a/M3, four read paths use `.single()`, which
throws `PGRST116` when no row matches, instead of `.maybeSingle()`:

- `src/pages/auth/AcceptInvitePage.tsx:128-132` — institution name lookup (a
  missing/renamed institution turns a cosmetic label fetch into a thrown error inside
  the invite flow).
- `src/hooks/useSessionCompletion.ts:289-293` — session lookup by id + student.
- `src/hooks/useReflectionDigest.ts:75-78` and `:131-134` — digest fetch by id+student.
- `src/hooks/useTeamProfile.ts:63-65` — team lookup by id.
  (`insert/update … .select().single()` paths are correct and are **not** in scope.)

**WHY (impact):** P2 — these are the inconsistent reads in a codebase that otherwise
prefers `.maybeSingle()` (60+ sites). On a missing row they surface as a thrown query
error rather than a clean "not found"/empty state, contradicting the
`supabase-patterns` pitfall rule.

**User story:** As a user hitting a page whose target row may not exist, I want a
clean empty state, not a crashed query.

#### Acceptance Criteria

1. WHEN any of the four flagged reads returns zero rows THEN the hook/page SHALL
   resolve to `null`/empty and render the appropriate empty or fallback state, not a
   thrown error.
2. WHEN exactly one row exists THEN behaviour SHALL be byte-for-byte identical to
   today.
3. WHEN converted THEN no caller relying on the previous throw-on-missing behaviour
   SHALL break (verify each call site handles `null`).

---

### Requirement 5 — Misleading signup role dropdown (P3, UX/trust)

**WHAT (root cause):** `src/pages/LoginPage.tsx:597-611` (register tab) exposes a role
`<select>` offering teacher/coordinator/admin/parent, and `AuthProvider` forwards it as
`raw_user_meta_data.role`. The `handle_new_user` trigger **ignores** the requested role
for self-signup and always assigns `student` (audit 05 §1). The dedicated
`SignUpPage.tsx` correctly hard-codes `student`.

**WHY (impact):** P3 — **not** a privilege-escalation hole (server is authoritative),
but a user can pick "Admin" and silently get a student account; confusing and
inconsistent across the two signup surfaces.

#### Acceptance Criteria

1. WHEN a user opens the `LoginPage` register tab THEN the role selector SHALL either
   be limited to `student` only, OR be relabelled to make clear the role is
   "requested, subject to approval/invitation" so the UI matches server behaviour.
2. WHEN this change is applied THEN no actual role assignment behaviour on the server
   SHALL change (purely a client UX correction).
3. WHEN compared THEN the two signup surfaces (`LoginPage`, `SignUpPage`) SHALL be
   consistent.

---

### Requirement 6 — Global query/mutation error safety net (P3, robustness)

**WHAT (root cause):** Audit 05 L3 — the TanStack Query client (`src/App.tsx:36-69`)
has no `queryCache.onError` / `mutationCache.onError`; per-query error surfacing relies
on every consumer reading `isError`/`error`. Most hooks do, but the long tail can fail
silently.

**WHY (impact):** P3 — defence-in-depth; a forgotten error branch becomes a silent
no-op rather than a logged, user-visible failure (violates engineering-guardrails
"never swallow errors silently").

#### Acceptance Criteria

1. WHEN any query or mutation errors AND the consumer does not surface it THEN a
   global handler SHALL at minimum log it (and optionally show a Sonner toast),
   without double-toasting hooks that already handle their own errors.
2. WHEN this is added THEN existing per-hook error handling SHALL remain the primary
   path (the global handler is a fallback, not a replacement).

---

## Track B — Supabase platform hardening (live advisors)

> Source: live `get_advisors` (security + performance) on `cdlgtbvxlxjpcddjazzx`.
> All security findings are WARN-level (no ERRORs). Items already owned by
> `db-function-search-path-qualification` (function `search_path`) are **excluded**.

### Requirement 7 — Restrict EXECUTE on internal SECURITY DEFINER functions (P2, security)

**WHAT (root cause):** The advisor flags `anon_security_definer_function_executable`
and `authenticated_security_definer_function_executable`: a set of `SECURITY DEFINER`
functions is EXECUTE-able by `anon` and/or `authenticated`. Some are **intentional**
(`auth_user_role()`, `auth_institution_id()` are used inside RLS and must stay callable
by `authenticated`; `consume_invitation`, `get_invitation_by_token`,
`is_portfolio_publicly_accessible`, `portfolio_public_access` back public invite/
portfolio flows). Others appear **internal** and need not be reachable from the public
API surface (e.g. `delete_department_if_no_programs`, `fan_out_announcement_notifications`,
`send_teacher_nudge`, `check_rate_limit_approaching`, `course_material_institution`).

**WHY (impact):** P2 — least-privilege. An internal helper reachable by any
authenticated (or anon) caller widens the attack/abuse surface even when RLS limits
data. This is hygiene, not a confirmed exploit.

#### Acceptance Criteria

1. WHEN the SECURITY DEFINER function inventory is reviewed THEN each function SHALL
   be classified as **public-by-design** (keep grant) or **internal** (revoke the
   unnecessary `anon`/`authenticated` EXECUTE).
2. WHEN a grant is revoked THEN it SHALL be done via a migration that obeys
   `migration-replay-integrity` (guard with `to_regprocedure(...) IS NOT NULL` if the
   REVOKE could precede the function's CREATE on a fresh replay) and SHALL NOT revoke
   EXECUTE from `authenticated` on `auth_user_role()` / `auth_institution_id()` (would
   break RLS).
3. WHEN applied THEN every existing client/RPC/Edge call path SHALL still function
   (verify each candidate has no legitimate client caller before revoking).

---

### Requirement 8 — Enable leaked-password protection (P2, security, config-only)

**WHAT (root cause):** Advisor `auth_leaked_password_protection` — the HaveIBeenPwned
compromised-password check is **DISABLED** in Auth settings.

**WHY (impact):** P2 — users can set known-breached passwords; trivial to enable, high
security value, zero code change.

#### Acceptance Criteria

1. WHEN Supabase Auth settings are updated THEN leaked-password protection SHALL be
   enabled for the production project.
2. WHEN enabled THEN existing sign-in SHALL be unaffected (only new/changed passwords
   are checked).

---

### Requirement 9 — Move `vector`/`citext` extensions out of `public` (P3, security)

**WHAT (root cause):** Advisor `extension_in_public` — `vector` and `citext` are
installed in the `public` schema.

**WHY (impact):** P3 — recommended practice is a dedicated `extensions` schema; reduces
name-collision/search-path surface. **Higher-risk to relocate** because objects/columns
(e.g. embedding `vector` columns, `citext` columns) and functions depend on them.

#### Acceptance Criteria

1. WHEN this is evaluated THEN the system SHALL determine whether relocating each
   extension is safe given existing dependent columns/indexes/functions.
2. IF relocation is safe THEN it SHALL be done via a migration obeying replay/history
   rules with no change to dependent object behaviour.
3. IF relocation risks breaking dependents THEN the finding SHALL be documented and
   formally accepted as-is (extensions remain in `public`), with the rationale recorded.

---

### Requirement 10 — Restrict `mv_historical_evidence` from the API (P2, security)

**WHAT (root cause):** Advisor `materialized_view_in_api` —
`public.mv_historical_evidence` is selectable by `anon`/`authenticated` through the
auto-exposed API.

**WHY (impact):** P2 — a materialized view in the API can leak aggregated/historical
data not gated by RLS the way base tables are.

#### Acceptance Criteria

1. WHEN reviewed THEN access to `mv_historical_evidence` SHALL be restricted so it is
   not directly selectable by `anon`/`authenticated` (e.g. revoke API access / move
   out of the exposed schema / serve via a SECURITY DEFINER RPC that enforces scope).
2. WHEN restricted THEN any legitimate consumer (e.g. the Historical Evidence
   dashboard) SHALL continue to function through an authorised path.

---

### Requirement 11 — Index the two unindexed foreign keys (P3, performance)

**WHAT (root cause):** Advisor `unindexed_foreign_keys` —
`announcement_attachments.announcement_id_fkey` and
`announcement_reads.student_id_fkey` lack covering indexes.

**WHY (impact):** P3 — FK lookups/joins and cascade deletes do sequential scans; cheap
to fix, scales with announcement volume.

#### Acceptance Criteria

1. WHEN a migration adds a btree index on each flagged FK column THEN query plans for
   the related joins/deletes SHALL use the index.
2. WHEN added THEN the indexes SHALL follow project naming and obey replay/history
   rules.

---

### Requirement 12 — Triage unused indexes & multiple permissive policies (P3, document/scoped)

**WHAT (root cause):**

- Advisor `unused_index` — ~50 indexes report zero scans. On a low-data demo DB this is
  largely an **artifact of little traffic**, not proof an index is useless.
- Advisor `multiple_permissive_policies` — almost every table has multiple permissive
  policies for the same role/action. Each is evaluated per query (a real perf smell),
  but consolidating is **high-risk for RLS correctness**.

**WHY (impact):** P3 — both are real signals but acting blindly is dangerous (dropping
a "unused" index that backs a rare admin query; merging policies that subtly change
access). Senior-dev call: **document, do not auto-remediate** in this spec.

#### Acceptance Criteria

1. WHEN the unused-index list is reviewed THEN each index SHALL be recorded with a
   recommendation (keep / candidate-to-drop-after-load-test); **no index is dropped**
   under this spec without query-pattern analysis on real data.
2. WHEN the multiple-permissive-policies finding is reviewed THEN it SHALL be carved
   out as a **separate, dedicated RLS-consolidation track** (own spec) with per-table
   correctness proof; this spec only documents the finding and its risk.

---

## Track C — Higher-risk correctness defects (verify-then-fix)

> These are real defects (several BROKEN/BLOCKER) but each is larger, touches data
> shapes or core engines, and several are **NO-DATA/latent** on the demo DB. Every
> Track C item follows reproduce → capture preservation baseline → fix → parity, and
> any that turns out to need substantial schema/engine work SHALL be promoted to its
> own spec rather than rushed here. None ships without live verification of the data
> shapes its fix assumes.

### Requirement 13 — `process-onboarding` Edge Function health (P2, investigation)

**WHAT:** Requirement 2 is the resilient client fix; the root cause (function slow/
unavailable) must also be verified in production so profiles are actually computed.

#### Acceptance Criteria

1. WHEN production is checked THEN `process-onboarding` SHALL be confirmed deployed and
   responding successfully for a representative real payload (preview/staging student,
   not production seeding).
2. IF failing/undeployed THEN it SHALL be redeployed per
   `docs/Edge-Function-Deployment-Guide.md` with no contract change.
3. WHEN it errors THEN the client SHALL surface a logged, non-blocking error (Sentry)
   and the student SHALL remain unblocked (ties to Req 2).

---

### Requirement 14 — `student_profiles` duplicate-row risk (P3, investigation)

**WHAT:** `student_profiles` has **no unique constraint on `student_id`** (an
`ON CONFLICT (student_id)` upsert failed). If the writer ever inserts rather than
upserts, a student could accumulate multiple profile rows and reads could pick an
arbitrary one.

#### Acceptance Criteria

1. WHEN audited THEN the system SHALL determine whether duplicate `student_profiles`
   rows per `student_id` exist in production (read-only query).
2. IF one-row-per-student is intended THEN a `UNIQUE (student_id)` constraint SHALL be
   added via a migration obeying replay-order/history rules, after de-duplicating any
   existing rows (keep most recent).
3. IF a constraint is added THEN the write path SHALL use a proper upsert keyed on
   `student_id`, and existing reads SHALL be unaffected.
4. WHEN no duplicates/risk are confirmed THEN this MAY be closed as "no change needed"
   with the finding documented.

---

### Requirement 15 — Coordinator analytics: empty-state clarity + load performance (P3)

**WHAT:** Curriculum Matrix, Sankey, Coverage Heatmap, Gap Analysis, Cohort Comparison,
Semester Trends, and Section Comparison appeared to "load too long" or show "no data".
The _no-data_ case is a real config gap (no mappings yet) resolved by coordinators in
production — **not** by seeding. Audit 04 §4 additionally flags **Semester Trends** and
**Cohort Comparison** as **placeholder** pages. The _slowness_ is a genuine front-end
concern.

#### Acceptance Criteria

1. WHEN a coordinator opens an analytics view with no underlying data THEN the shared
   `EmptyState` (icon, title, guidance) SHALL render rather than an indefinite spinner.
2. WHEN a view is loading THEN per-section skeletons SHALL render and SHALL NOT block
   first paint; no query may hang on a never-resolving dependency.
3. WHEN an analytics query is profiled THEN any confirmed N+1/waterfall SHALL be reduced
   (batched fetch / single query / RPC) with identical rendered output for non-empty data.
4. WHEN Semester Trends / Cohort Comparison are confirmed placeholders THEN they SHALL
   either be implemented against real data OR clearly labelled "coming soon"/hidden from
   nav so they don't read as broken in a demo (no fabricated data).

---

### Requirement 16 — Parent attendance load reliability & performance (P3)

**WHAT (root cause):** `ParentAttendancePage` (`useChildAttendance`) runs a 4-step
client waterfall (enrollments → `course_sections` → `class_sessions` →
`attendance_records`) and passes potentially hundreds of session ids into one `.in()`
filter — slow and at risk of exceeding URL/`in`-list limits, surfacing as a stuck
"loading" or empty result even when RLS and data are correct.

#### Acceptance Criteria

1. WHEN a parent opens the attendance page for a verified-linked child THEN the summary
   SHALL render promptly and SHALL NOT spin indefinitely.
2. WHEN the query chain is reviewed THEN it SHALL be consolidated (single joined query
   or `SECURITY INVOKER` RPC scoped by `student_id`) while preserving the per-course
   present/late/absent/rate output shape.
3. WHEN a child has no attendance records THEN the existing "No attendance data
   available yet" empty state SHALL show.
4. WHEN applied THEN parent RLS boundaries SHALL remain intact (verified-linked
   children only).

---

### Requirement 17 — Cron schedule mismatch & `fee-overdue-check` duplication (P2/P3)

**WHAT (root cause):** Audit 01 —

- `exam-period-notify`: Vercel fires `0 8 * * *` but the function header documents
  `0 9 * * *` (M-1). One of them is wrong.
- `fee-overdue-check` exists **twice**: a live pg_cron SQL job (`0 6 * * *`) **and** a
  Vercel→edge handler that is **absent from the `vercel.json` crons array** (so it never
  fires). Latent double-sweep trap if someone adds the missing entry without removing
  the pg_cron job (M-2/H-2).

**WHY (impact):** P2/P3 — schedule drift undermines trust in time-based notifications;
the duplication is a maintenance landmine (idempotent today, double-write tomorrow).

#### Acceptance Criteria

1. WHEN `exam-period-notify` is reviewed THEN the Vercel schedule and the function
   header SHALL be reconciled to a single intended time, documented in both places.
2. WHEN `fee-overdue-check` is reviewed THEN exactly **one** scheduler SHALL own it
   (per the repo's own note "Vercel Cron is the canonical scheduler", keep Vercel and
   retire the pg_cron SQL job, or vice-versa) — never both live simultaneously.
3. WHEN changed THEN no other cron's schedule or target SHALL be affected.

---

### Requirement 18 — Service-role Edge Functions lacking in-handler caller checks (P2, security)

**WHAT (root cause):** Audit 01 M-3/H-3 — several functions use the service-role client
(bypassing RLS) with **no in-handler caller/role check**:
`check-bonus-question`, `generate-fee-receipt`, `import-competency-csv`,
`resolve-mystery-reward`; and `score-reflection-quality` has a **CORS header typo**.

**WHY (impact):** P2 — a service-role function with no caller authorization can be
invoked by any authenticated user to perform privileged actions or read/write data
outside their scope (RLS is bypassed inside the function).

#### Acceptance Criteria

1. WHEN each flagged function is reviewed THEN it SHALL enforce an explicit caller
   check (valid JWT + role/ownership appropriate to the action) before performing any
   service-role operation, matching the pattern used by compliant functions (e.g.
   `bulk-import-users` admin check).
2. WHEN `score-reflection-quality` is reviewed THEN the CORS header typo SHALL be
   corrected.
3. WHEN changed THEN each function's public request/response contract SHALL be
   preserved; only authorization is added/corrected.

---

### Requirement 19 — OBE accreditation report & course file are broken by schema drift (P0/BLOCKER)

**WHAT (root cause):** Audit 02 H-3/H-4 — two headline OBE deliverables reference
columns/enum values that don't exist:

- `generate-accreditation-report`: filters `scope === 'PLO'`/`'ILO'` (real enum is
  `student_course|course|program|institution`) and selects `score_percent` (real col
  `attainment_percent`) → every PLO/ILO row renders **0%**.
- `generate-course-file`: selects `outcome_mappings.child_outcome_id/parent_outcome_id`
  (real: `source_outcome_id`/`target_outcome_id`), `scope='CLO'`, `assignments.clo_ids`
  (real: `clo_weights`), and non-existent CQI columns
  (`title/gap_description/corrective_actions`) → empty sections and a likely **500** on
  the CQI select.

**WHY (impact):** P0 — for an OBE platform, accreditation/course-file exports are core
value. They currently emit zeros/empties or error out. **This is the highest-value
Track C fix.**

#### Acceptance Criteria

1. WHEN the accreditation report is fixed THEN it SHALL read `outcome_attainment` using
   the real scope enum and `attainment_percent`, producing correct non-zero PLO/ILO
   attainment for institutions that have data.
2. WHEN the course-file generator is fixed THEN it SHALL use real column names
   (`source_outcome_id`/`target_outcome_id`, `clo_weights`, real CQI columns) and a
   valid scope, producing populated sections without a 500.
3. WHEN fixed THEN each generator's output contract (PDF structure, storage path) SHALL
   be preserved; only the data-access layer changes.
4. WHEN verified THEN a generated report/file for a real course with data SHALL be
   inspected to confirm non-zero, correct values; a course with no data SHALL produce a
   clean empty/"no data" section, not an error.
5. The fix SHALL be guarded by a CI schema-contract check (see Req 22) so this
   "compiles in Deno, wrong column at runtime" class cannot silently return.

---

### Requirement 20 — Attainment scope mismatch & outcome-weight invariant (P1, verify-then-fix)

**WHAT (root cause):** Audit 02 H-1/H-2 —

- **Scope mismatch:** the trigger writes CLO@`student_course`, PLO@`course`,
  ILO@`program`, but `useAdminPLOHeatmap` reads PLO@`program` then CLO@`course`, and
  `useCLOAttainment` reads CLO@`course` → admin PLO heatmap and CLO-detail headlines
  likely show grey "no data" despite 1,743 live attainment rows. (Student dashboards
  read `student_course` and work.)
- **Weight invariant:** `outcome_mappings` weight "sum-to-100" is not enforced anywhere,
  and the scale is inconsistent (zod/UI use 0–1; cascade/tests assume 0–100).

**WHY (impact):** P1 — admin/coordinator aggregate analytics are misleading, and
weighted rollups are mathematically arbitrary. **Needs live verification** of the actual
scope distribution in `outcome_attainment` before changing readers or the trigger.

#### Acceptance Criteria

1. WHEN the live `outcome_attainment` scope distribution is queried THEN the actual
   per-scope row counts SHALL be recorded before any change.
2. WHEN the mismatch is confirmed THEN readers and writer SHALL be aligned to one scope
   taxonomy (align readers to the writer's scopes, or have the trigger also write the
   aggregate scopes), with identical output for already-correct student-facing reads.
3. WHEN the weight invariant is addressed THEN a single scale SHALL be chosen (recommend
   0–100 to match docs), enforced by a shared zod `superRefine` sum check AND a DB
   CHECK/trigger per child→parent group, **without** breaking existing saved mappings
   (provide a migration/normalisation path for existing 0–1 data).
4. Because this changes a core data contract, IF the change is non-trivial THEN it SHALL
   be promoted to its own spec with full reproduce/baseline/parity coverage.

---

### Requirement 21 — Gamification engine defects (badges / XP / streak / perfect-day) (mixed, mostly own-spec)

**WHAT (root cause):** Audit 03 — several are NO-DATA/latent on the demo DB
(`badges=0`, `teams=0`) but are genuine engine defects:

- **B-1 (BLOCKER):** `check-badges` writes individual badges to `student_badges`
  (text key) while the UI reads `badges`; and `award-xp` never fans out to
  `check-badges` for login/submission/grade/streak-milestone. Earned badges never
  display; most badge checks never fire.
- **H-1:** `xp_total` is maintained by two mechanisms (edge recompute vs DB grade
  trigger flat `+15`) and the trigger path skips level recompute → drift.
- **H-2:** the daily streak driver is broken — the midnight Vercel cron calls
  `process-streak` with **no `student_id`**, which the function rejects (400); no
  per-student/login driver exists → streaks never advance/reset automatically.
- **H-3:** `badge_definitions` is never seeded → Badge Spotlight always empty.
- **H-4:** team gamification split across `teams` columns vs `team_gamification` table
  (app distrusts the latter).
- **H-5:** Perfect Day 50 XP is never awarded (only the 6 PM nudge exists).
- **M-1:** streak-freeze inventory cap is 3 in DB/RPC but domain says max 2.

**WHY (impact):** These range BLOCKER→Medium but most are **latent** (no badges/teams
in production yet). They are too large and interdependent for the surgical track.

#### Acceptance Criteria

1. WHEN this requirement is triaged THEN each sub-item (B-1, H-1, H-2, H-3, H-4, H-5,
   M-1) SHALL be recorded with severity and a fix direction, and the **badge subsystem
   (B-1), XP-total source-of-truth (H-1), and streak driver (H-2)** SHALL be promoted
   to a dedicated **`gamification-engine-remediation`** spec (they are interdependent
   and high-risk).
2. WHEN any quick, low-risk, backward-compatible sub-fix is identified that does not
   depend on the larger redesign (e.g. M-1 cap alignment to 2, or correcting the
   midnight cron to a batch mode) THEN it MAY be included here with its own regression
   test, only if it ships safely in isolation.
3. NO sub-item SHALL introduce seeded gameplay data into production; catalog seeding of
   `badge_definitions` (H-3) is treated as a per-institution configuration step in the
   promoted spec, not a fixture.

---

### Requirement 22 — CI schema-contract check for Edge Functions (P2, prevention)

**WHAT (root cause):** Audit 02 explicitly recommends this: H-3/H-4/M-2 are all
"compiles in Deno, wrong column at runtime" defects that a build-time check would have
caught. Edge Functions are not type-checked against the generated DB types.

**WHY (impact):** P2 — without this guard, the OBE export fixes (Req 19) and any future
edge query can silently drift again.

#### Acceptance Criteria

1. WHEN a contract check is added THEN it SHALL validate that table/column/enum
   references in `supabase/functions/**` exist in the current schema
   (`src/types/database.ts` or a live introspection), failing CI on drift.
2. WHEN added THEN it SHALL run in the existing CI pipeline alongside lint/types/tests
   and SHALL flag the Req 19 columns before they regress.
3. The check SHALL be pragmatic (catch the high-value drift class) and SHALL NOT block
   on false positives for dynamic/RPC calls it cannot statically resolve.

---

## Out of Scope

- Seeding or back-filling any demo/sample **gameplay or institutional** data into
  production (badges earned, teams, enrollments, mappings, attendance, etc.).
- The local-only quick-login panel (dev-gated) and the env-gated `@demo.com` panel.
- Postgres function `search_path` hardening / `function_search_path_mutable` (owned by
  `db-function-search-path-qualification`).
- Migration replay-order aborts, historical drift, phantom-table deployment (owned by
  `migration-history-reconciliation` / `migration-replay-order-fix`).
- Full RLS multiple-permissive-policy consolidation (own dedicated track; Req 12 only
  documents it).
- New features or redesigns; only defect fixes and scoped performance/security
  improvements. Track C items that prove to need redesign are promoted to their own
  specs rather than expanded here.
