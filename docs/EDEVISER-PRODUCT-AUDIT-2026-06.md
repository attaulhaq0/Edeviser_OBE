# Edeviser — Full-Product Audit (Backend → Live UI)

**Date:** 2026-06-04 · **Revised:** 2026-06-05 (added §11 — systemic `verify_jwt` gateway-401 finding from live end-to-end testing)
**Scope:** Every section, every edge function, every cron, all hooks, all 6 user roles, the live Supabase database, the live Vercel deployment, OBE + Gamification flows, connectivity, and data flow.
**Method:** Static codebase trace (54 edge functions, ~216 hooks, ~140 pages, 131 tables) **cross-checked against the live database** (`cdlgtbvxlxjpcddjazzx`) via read-only SQL, plus a live production probe (`https://e-deviser.vercel.app`) and a real-auth backend smoke (13/13). Every claim is file:line- or query-evidenced.
**Detailed evidence:** `docs/audit-findings/01..05-*.md` (cron/edge, OBE, gamification, roles/nav, auth/RLS/connectivity).

> **Severity legend:** 🔴 Blocker (feature dead / data-integrity / security) · 🟠 High (significant gap, visible to users) · 🟡 Medium (works-but-flawed) · 🟢 Low (polish / tech-debt). · **Status:** ✅ WORKING · ◑ PARTIAL · ⛔ BROKEN · ◯ NO-DATA (wired but unseeded).

> **⚠️ 2026-06-05 REVISION:** Live end-to-end testing (real auth, real edge-function invocation, real DB writes) uncovered a **systemic production bug** — see **§11**: this project's keys are the modern non-JWT `sb_…` format, so every Edge Function deployed with `verify_jwt=true` that is called server-to-server (edge→edge, cron→edge) **401s at the gateway before its handler runs**. This silently breaks emails, streak reset, at-risk/AI crons, perfect-day nudges, and badge/XP fan-out. `award-xp` + `check-badges` are now FIXED (`--no-verify-jwt` + `x-internal-auth`). **NOTE:** the OBE grade→attainment cascade is **NOT** affected — its trigger is pure in-database SQL (verified live, §11.6.1); the original §10 claim there stands. The §10 "cron auth pattern is solid" claim is retracted.

---

## 0. Executive Summary

Edeviser is a large, mature, **richly-seeded** platform: 131 tables (100% RLS-enabled, every table policy-backed), 220 DB functions, 54 edge functions, 9 Vercel + 3 pg_cron jobs, ~140 pages across 6 roles. The live DB holds real flowing data — 124 profiles, 859 grades→859 submissions, 2,577 evidence records, 1,743 attainment rollups, 4,117 XP transactions, 7,500 attendance records, 3,010 habit-tracking rows.

**The core academic + XP loops work end-to-end on live data.** Grade → evidence → attainment rollup fires (via a DB trigger), XP accrues and `xp_total = SUM(xp_transactions)` holds with **zero drift** live, the leaderboard + marketplace + challenges + tutor are functional, RLS isolation is sound, and auth never trusts a client-supplied role.

**The headline problems are three "feature exists but produces nothing" classes:**

1. **Badges are dead end-to-end** (🔴) — three disconnected tables, no definitions seeded, and the XP path never triggers badge checks. 0 badges awarded across 71 gamified students.
2. **Several admin/coordinator analytics read the wrong data shape** (🟠) — the PLO heatmap, CLO-detail headline, and the accreditation/course-file PDF exports query scopes/columns that don't match what the rollup actually writes, so they show grey/zero despite 1,743 attainment rows.
3. **Whole feature areas are unseeded** (◯) — graduate-attribute mappings (0), quizzes (0), teams (0), badge definitions (0), and the `habit_logs` table the "Today" view reads (0, while live data lives in `habit_tracking`).

None of these block the primary teaching flow, but they directly undercut the OBE accreditation value proposition and the gamification reward loop. This document enumerates every finding; the companion seeding + bug-fix work addresses the top items.

### Top issues at a glance

| #   | Finding                                                                                                 | Sev | Status | Evidence                                                                               |
| --- | ------------------------------------------------------------------------------------------------------- | --- | ------ | -------------------------------------------------------------------------------------- |
| 1   | Badge subsystem dead (3 disconnected tables, no defs, XP never triggers check-badges)                   | 🔴  | ⛔     | live: badges=0, student_badges=0, badge_definitions=0, badge-source XP=0               |
| 2   | Admin PLO heatmap + CLO-detail read wrong attainment scope → all-grey                                   | 🟠  | ⛔     | live: PLO@`course`/CLO@`student_course` written, hooks read PLO@`program`/CLO@`course` |
| 3   | Accreditation report + Course file PDFs query non-existent columns/scopes → zeros / 500                 | 🟠  | ⛔     | `generate-accreditation-report`, `generate-course-file`                                |
| 4   | `outcome_mappings` weight sum-to-100 invariant not enforced; 0–1 vs 0–100 scale clash                   | 🟠  | ◑      | schemas use 0–1, cascade/tests use 0–100, no DB/zod check                              |
| 5   | Graduate-attribute attainment always empty (mappings unseeded)                                          | 🟡  | ◯      | live: graduate_attribute_mappings=0                                                    |
| 6   | `habit_logs` empty; Today view + perfect-day cron read it; live data in `habit_tracking`                | 🟠  | ◑      | live: habit_logs=0, habit_tracking=3010                                                |
| 7   | Sentry initialises before cookie-consent gate (privacy/compliance)                                      | 🟠  | ◑      | App.tsx:26 vs main.tsx:28                                                              |
| 8   | `fee-overdue-check` duplicated (pg_cron + unscheduled Vercel handler) + cron replay-resurrection hazard | 🟠  | ◑      | vercel.json vs migration 20260615000001                                                |
| 9   | 10 orphaned edge functions + 9 orphan page files (dead code)                                            | 🟢  | —      | see §3, §5                                                                             |
| 10  | Duplicate/dead student challenge-list route; placeholder coordinator analytics pages                    | 🟡  | ◑      | `/student/challenges/list`, `/coordinator/trends`, `/cohort-comparison`                |

---

## 1. Live Environment & Connectivity — ✅

| Check                                         | Result                                                                                              |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Production URL `https://e-deviser.vercel.app` | HTTP 200, SPA shell + hashed assets served (fresh build from PR #149 merge `3cd7206`)               |
| Supabase project `cdlgtbvxlxjpcddjazzx`       | reachable; 131 tables, 220 functions, 1 matview                                                     |
| RLS coverage                                  | 131/131 tables RLS-enabled; **0** tables enabled-without-policy                                     |
| Real-auth backend smoke                       | 13/13 passed (nudge RPC authz + 42501, announcement fan-out, read-receipt RLS, MV-refresh lockdown) |
| `xp_total = SUM(xp_transactions)` invariant   | **0 students drifting** (verified live)                                                             |
| Migration replay                              | clean (Supabase Preview green on PR; 294 migrations)                                                |
| Build / lint / typecheck / tests              | green (568 files / 5,678 tests)                                                                     |

**Verdict:** infrastructure, deployment, auth, RLS, secrets, and storage are sound. Details in `05-auth-rls-connectivity.md`.

---

## 2. Cron Jobs (9 Vercel + 3 pg_cron) — ◑

The two cron systems are **separate and non-overlapping by design**: Vercel crons authenticate with `CRON_SECRET` and invoke a Supabase Edge Function (service-role); pg_cron jobs run pure SQL in-database.

### 2.1 Vercel crons (all 9 resolve to an existing edge function ✅)

| Vercel path           | Schedule     | Edge fn                           | Exists? | Note                                                                |
| --------------------- | ------------ | --------------------------------- | ------- | ------------------------------------------------------------------- |
| streak-risk           | `0 20 * * *` | streak-risk-cron                  | ✅      | schedule matches fn header                                          |
| weekly-summary        | `0 8 * * 1`  | weekly-summary-cron               | ✅      | matches                                                             |
| compute-at-risk       | `0 2 * * *`  | compute-at-risk-signals           | ✅      | matches                                                             |
| perfect-day-prompt    | `0 18 * * *` | perfect-day-prompt                | ✅      | matches                                                             |
| streak-reset          | `0 0 * * *`  | process-streak `{midnight_reset}` | ✅      | **invoked with no `student_id`** → fails validation (🟠 see §6 H-2) |
| leaderboard-refresh   | `0 12 * * *` | leaderboard-refresh               | ✅      | no-op verify (view is plain VIEW)                                   |
| ai-at-risk-prediction | `0 3 * * *`  | ai-at-risk-prediction             | ✅      | matches                                                             |
| notification-digest   | `0 20 * * *` | notification-digest               | ✅      | matches                                                             |
| exam-period-notify    | `0 8 * * *`  | exam-period-notify                | ✅      | 🟡 fn header says 09:00, Vercel fires 08:00 (mismatch)              |

### 2.2 pg_cron (3 live)

| Job                    | Schedule    | Action                                 | Verdict                                                       |
| ---------------------- | ----------- | -------------------------------------- | ------------------------------------------------------------- |
| badge-auto-archive     | `0 0 * * *` | `SELECT badge_auto_archive()`          | ✅ runs (inert — nothing to archive)                          |
| badge-spotlight-rotate | `0 0 * * 1` | `SELECT badge_spotlight_auto_rotate()` | ◯ reads `badge_definitions` (0 rows) → spotlight always empty |
| fee-overdue-check      | `0 6 * * *` | `UPDATE fee_payments … overdue`        | ✅ runs                                                       |

### 2.3 Cron findings

- 🟠 **`fee-overdue-check` is duplicated** — identical logic exists as both the pg_cron SQL job (running) **and** a Vercel handler + edge function (`api/cron/fee-overdue-check.ts` → `fee-overdue-check`), but the Vercel one is **not in `vercel.json` crons**, so it never fires. Latent double-write if enabled. Pick one (the repo's own prune migration declares Vercel canonical).
- 🟠 **Replay-resurrection hazard** — `20260602101312_task15_prune_duplicate_broken_pgcron_jobs.sql` unschedules 8 jobs, but the later-sorting `20260615000001_conditional_pgcron_guard.sql` **re-creates all 8** (including a broken `REFRESH MATERIALIZED VIEW leaderboard_weekly` against an object that's now a plain VIEW, and HTTP jobs built from an unset GUC). A from-scratch replay (DR / preview) diverges from the live "3 jobs" state.
- 🟡 `exam-period-notify` schedule mismatch (08:00 wired vs 09:00 documented).

Full detail: `01-cron-and-edge-functions.md`.

---

## 3. Edge Functions (54) — ◑

**Wired & reachable (33):** all the AI/PDF/import/grading/XP/tutor functions have a clear frontend hook, DB trigger, edge-to-edge, or cron caller, and handle CORS + auth. Highlights: `award-xp`, `calculate-attainment-rollup` (note: superseded by a DB trigger — see §4), `chat-with-tutor`, `bulk-import-users` (JWT + admin check), `generate-accreditation-report`/`generate-course-file` (wired but broken — §4), `process-purchase`, `process-onboarding`, `check-login-rate`, `health`, `audit-fixtures` (test-only, prod-blocked).

**Cron-driven (9 + 1 unscheduled):** §2.1, plus the unscheduled `fee-overdue-check` handler.

**🟢 Orphaned — no caller anywhere (10):** `ai-module-suggestion`, `auto-grade-quiz`, `challenge-completion`, `challenge-progress-update`, `update-challenge-progress` (two confusingly-transposed names, both dead), `cqi-review-reminder`, `generate-reflection-digest`, `improvement-bonus-check`, `embed-course-material`, `team-streak-risk-cron`. These deploy but are unreachable — dead surface to prune or wire.

**🟡 Authorization gaps (M-3):** several service-role functions accept a caller-supplied `student_id`/id with RLS bypassed and **no in-handler ownership/role check**, relying solely on the gateway `verify_jwt` default: `generate-fee-receipt`, `import-competency-csv`, `resolve-mystery-reward`, `check-bonus-question`, `improvement-bonus-check`, the challenge fns. IDOR-pattern — add explicit ownership checks (mirror `check-badges`'s self-or-service pattern).

**🟠 CORS typo:** `score-reflection-quality` (browser-invoked) and `generate-reflection-digest` declare `Access-Control-Allow-Headers: …x-content-type…` instead of `x-client-info` — the supabase-js client always sends `x-client-info`, so the preflight can reject the request in-browser.

Full inventory (grouped A–D, per-function evidence): `01-cron-and-edge-functions.md`.

---

## 4. OBE Domain — ◑ (core loop works; analytics/exports broken)

| Feature                                                 | Status | Notes                                                                                                                                   |
| ------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| ILO/PLO/CLO CRUD + 3-level `outcome_mappings` hierarchy | ✅     | audit-logged, delete dependency guards                                                                                                  |
| Attainment rollup grade→evidence→CLO→PLO→ILO            | ✅     | **DB trigger** `trigger_attainment_rollup()` (pure SQL) is the live mechanism — not the edge fn                                         |
| Attainment thresholds (85/70/50)                        | ✅     | `attainmentClassifier.ts` matches domain spec exactly                                                                                   |
| Student-facing attainment (progress, dashboard)         | ✅     | reads `student_course` scope — consistent with the writer                                                                               |
| Section comparison (coordinator)                        | ✅     | reads `student_course` — matches writer                                                                                                 |
| Rubrics (21 rubrics / 63 criteria)                      | ✅     | CLO-title join, paginated, read-only preview dialog                                                                                     |
| CQI (3 plans)                                           | ✅     | new root_cause/due_date/evidence_of_improvement fields wired                                                                            |
| Outcome chain view                                      | ✅     | cleanest implementation in the domain                                                                                                   |
| **Admin PLO heatmap + CLO-detail headline**             | ⛔ 🟠  | **scope mismatch** — see below                                                                                                          |
| **Accreditation report PDF**                            | ⛔ 🟠  | filters `scope='PLO'/'ILO'` (never matches) + `score_percent` (wrong column) → every row 0%                                             |
| **Course file PDF**                                     | ⛔ 🟠  | queries `child/parent_outcome_id`, `clo_ids`, CQI `title/gap_description/corrective_actions` — none exist → empty sections / likely 500 |
| weights sum-to-100 invariant                            | ◑ 🟠   | not enforced anywhere; 0–1 (schemas/UI) vs 0–100 (cascade/tests) scale clash                                                            |
| Graduate Attributes                                     | ◯ 🟡   | wired correctly (`outcome_id`), but mappings=0 live → always empty; edge/report code uses drifted `ilo_id`                              |
| Curriculum matrix coverage                              | ◑ 🟡   | cell status = CLO-count placeholder, not attainment-driven                                                                              |
| Quiz attainment path                                    | ◯      | quizzes=0 live; writes CLO-scope only                                                                                                   |

### 🟠 Confirmed live: attainment scope mismatch (the heatmap I shipped in Req 7 is affected)

Live `outcome_attainment` rows by type×scope:

| outcome_type | scope            | rows |
| ------------ | ---------------- | ---- |
| ILO          | `program`        | 747  |
| PLO          | `course`         | 249  |
| CLO          | `student_course` | 747  |

But `useAdminPLOHeatmap` reads PLO at `scope='program'` (0 rows) then falls back to CLO at `scope='course'` (0 rows) → **every PLO renders as unmeasured grey** despite 249 PLO rows existing at `course` scope. `useCLOAttainment` reads CLO at `scope='course'` (CLOs are at `student_course`) → CLO-detail headline shows "no data". This is a confirmed High-severity bug, fixable by aligning the reader scopes to the writer.

Full detail: `02-obe-flows.md`.

---

## 5. Gamification Domain — ◑ (XP works; badges dead; teams/habits gaps)

| Feature                                  | Status | Notes                                                                                                                     |
| ---------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------- |
| XP award (`award-xp`) + `xp_total = SUM` | ✅     | 4,117 txns; **0 drift live**; sources used: grade, login, perfect_day, streak, submission                                 |
| Levels (threshold formula)               | ✅     | matches domain doc; duplicated client+edge (drift risk)                                                                   |
| Perfect Day 50 XP                        | ✅     | **565 `perfect_day` txns live** (static scan missed the writer — corrected by live check)                                 |
| Leaderboard + anonymous opt-out          | ✅     | set-based exclusion in `get_leaderboard_page` RPC                                                                         |
| Challenges (21 live)                     | ✅     | CRUD + reward via challenge-completion→award-xp                                                                           |
| Marketplace / XP economy                 | ✅     | atomic RPC; balance = SUM(xp_transactions) − SUM(xp_purchases)                                                            |
| Mystery box / bonus question             | ✅     | probability-weighted; bonus XP bypasses multipliers by design                                                             |
| **Badges (earn + display + spotlight)**  | ⛔ 🔴  | **dead end-to-end** — see below                                                                                           |
| Streak daily increment/reset             | ◑ 🟠   | `process-streak` has no per-student login caller; the midnight cron calls it without `student_id` (fails validation)      |
| Streak freeze cap                        | 🟡     | DB/RPC cap = 3, domain says max 2; cost not hard-pinned to 200                                                            |
| Teams                                    | ◯ 🟠   | teams=0; split-table landmine — edge fns write `team_gamification` (exists live), app reads `teams.xp_total/streak_count` |
| Daily habits / Today view                | ◑ 🟠   | **`habit_logs`=0** (read by Today view + perfect-day cron) while live data is in **`habit_tracking`=3010**                |

### 🔴 Confirmed live: the badge subsystem produces nothing

Three disconnected tables (schema confirmed live):

- `check-badges` writes individual badges to **`student_badges`** (`badge_id text`).
- The student UI (`useBadges.ts`) reads a **different** table, **`badges`** (`badge_key`, `badge_name`, `emoji`, `tier`, `scope`).
- The weekly Badge Spotlight reads **`badge_definitions`** — which has **0 rows** (35 definitions exist in `src/lib/badgeDefinitions.ts` but were never seeded to the DB).
- `award-xp` **never invokes `check-badges`** — the core academic loop (login/submission/grade/streak-milestone) never triggers a badge check.

Live confirms: `badges=0`, `student_badges=0`, `badge_definitions=0`, badge-source XP=0 — across 71 gamified students with 4,117 XP transactions. The feature is advertised in the UI but awards nothing.

Full detail: `03-gamification-flows.md`.

---

## 6. Roles & Navigation (6 roles, ~140 pages) — ✅ (with dead-code & placeholders)

- ✅ **Guards sound:** every role subtree (`/admin`, `/coordinator`, `/teacher`, `/student`, `/parent`) is wrapped exactly once by `RouteGuard` with the correct single role; public/auth routes open by design; catch-all → `/login`. No misrouted/wrong-role routes; **no dead nav links**. Login redirects every role to its dashboard.
- 🟡 **H1 — duplicate student challenge list:** `/student/challenges` (in nav) vs `/student/challenges/list` (dead route, not navigable). Two divergent UIs for the same data.
- 🟢 **H2 — 9 orphan page files** never routed/imported: `QuizBuilder`, `QuizAttemptPage`, `JournalEditor`, `JournalListPage`, `WellnessXpSettingsPage`, and 4 role-specific `*ProfilePage` (superseded by shared `ProfilePage`). Maintainer-confusion risk.
- 🟡 **M1 — placeholder coordinator pages in nav:** `/coordinator/trends` (SemesterTrendView) and `/coordinator/cohort-comparison` (CohortComparisonView) are navigable but render only static "Requires …" empty states (no data hook).
- 🟡 **M2 — league leaderboard not institution-scoped client-side** (`useLeagueLeaderboard` selects all `student_gamification` rows); isolation depends entirely on RLS. Parent hooks ARE correctly scoped.
- 🟢 `ROLE_DASHBOARD_MAP` duplicated in 3 files; `ReportGeneratorPage` semester selector is a documented stub; several admin routes have no sidebar entry (deep-link only).

Full detail: `04-roles-and-navigation.md`.

---

## 7. Auth / RLS / Realtime / Storage / Query / Secrets — ✅ / ◑

- ✅ **Auth:** role/institution derived only from `profiles`; client never trusts a sent role; `handle_new_user` forces `student` for self-signup. Token refresh re-fetches profile.
- ✅ **RLS defense-in-depth:** guards are cosmetic; real boundary is RLS via SECURITY DEFINER `auth_user_role()` / `auth_institution_id()`. 131/131 policy-backed.
- ✅ **Storage:** only `avatars` is public; all student work/evidence/reports/tutor/announcement files are private (signed URLs); every upload has type+size + path-traversal validation.
- ✅ **Secrets:** only `VITE_`-prefixed vars reach the client; no service-role key in `src/`.
- ◑ **Realtime:** shared manager is correct (dedup, backoff, polling fallback, unmount cleanup); two scoping gaps — `TeacherDashboard` subscribes to `submissions` unfiltered (M1); `useTeamBadges` opens an unfiltered `badges` subscription when `teamId` is undefined (M2).
- 🟠 **Sentry consent bypass (H1):** `initSentry()` runs unconditionally at `App.tsx` import time, before the consent-gated `initAnalyticsIfConsented()` in `main.tsx` — so Sentry initialises regardless of cookie consent (the stricter PII-scrubbing config does win, so data minimisation is intact, but the consent gate is defeated).
- 🟡 a few `.single()` on zero-row-capable reads should be `.maybeSingle()` (AcceptInvitePage, useSessionCompletion, useReflectionDigest, useTeamProfile).

Full detail: `05-auth-rls-connectivity.md`.

---

## 8. Data-population gaps (the "works but no data" set)

These features are correctly wired but have **no live data**, so they always render empty. Addressed by the companion seeding work.

| Table                         | Live rows | Feature blocked                                                        |
| ----------------------------- | --------- | ---------------------------------------------------------------------- |
| `badge_definitions`           | 0         | Badge Spotlight, admin badge mgmt (35 defs exist in code)              |
| `graduate_attribute_mappings` | 0         | GA attainment display (GAs exist=2, just unmapped)                     |
| `teams`                       | 0         | All team features (challenges exist=21)                                |
| `quizzes`                     | 0         | Quiz / adaptive assessment                                             |
| `habit_logs`                  | 0         | Today view + perfect-day nudge (live data is in `habit_tracking`=3010) |

---

## 9. Consolidated remediation backlog (ranked)

### 🔴 Blocker

- **B1 — Resurrect the badge subsystem.** Standardize on one badges table (UI reads `badges`); make `check-badges` write `badges`; have `award-xp` fan out to `check-badges`; seed `badge_definitions` from `src/lib/badgeDefinitions.ts`.

### 🟠 High

- **H1 — Fix attainment scope mismatch** (PLO heatmap / CLO-detail read the wrong scope). _Fixable in the hooks I shipped._
- **H2 — Fix accreditation report + course-file column/scope drift** (PDFs currently emit zeros / risk 500).
- **H3 — Enforce `outcome_mappings` weight sum + unify the 0–1 vs 0–100 scale.**
- **H4 — Fix the streak daily driver** (per-student `process-streak` invocation or batch mode).
- **H5 — `habit_logs` vs `habit_tracking` split** — point Today view + perfect-day cron at the live table, or backfill.
- **H6 — Sentry consent gating** (init only after consent).
- **H7 — Resolve `fee-overdue-check` duplication + the cron replay-resurrection hazard.**

### 🟡 Medium

- Edge-function CORS typo (`x-content-type` → `x-client-info`); service-role IDOR ownership checks; realtime subscription scoping (submissions, team badges); `.single()`→`.maybeSingle()`; coordinator placeholder pages (hide nav until implemented); league leaderboard institution scoping; streak-freeze cap (2 vs 3); `exam-period-notify` schedule.

### 🟢 Low

- Prune 10 orphan edge functions + 9 orphan page files; dedupe `ROLE_DASHBOARD_MAP`; resolve duplicate challenge-list route; centralize level-threshold formula; add a CI schema-contract/smoke test for edge functions (would have caught H2 and the GA `ilo_id` drift).

---

## 10. What's genuinely solid (don't touch)

Core grade→evidence→attainment rollup (DB trigger); XP ledger + level derivation (0 drift live); RLS posture (100% policy-backed, defense-in-depth); auth role-trust model; storage privacy + upload validation; the outcome-chain view; rubrics; CQI; marketplace economy; leaderboard anonymity; the cron auth pattern; env/secret hygiene. These are reference-quality and should be the patterns the fixes build on.

---

_Companion evidence files:_ `docs/audit-findings/01-cron-and-edge-functions.md`, `02-obe-flows.md`, `03-gamification-flows.md`, `04-roles-and-navigation.md`, `05-auth-rls-connectivity.md`.

---

## 11. 🔴 SYSTEMIC: `verify_jwt` gateway-401 breaks ALL server-to-server edge calls (found via live E2E testing, 2026-06-05)

**This is the single highest-impact finding in the audit.** It was invisible to static analysis and only surfaced when the badge fix was tested end-to-end against the live platform.

### 11.1 Root cause

This project's injected `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are the **modern non-JWT `sb_…` key format** (confirmed: `get_publishable_keys` returns `sb_publishable_…`; the service-role secret is `sb_secret_…`). A Supabase Edge Function deployed with the default `verify_jwt=true` has the **platform gateway** validate the `Authorization: Bearer <token>` as a JWT **before the handler runs**. A non-JWT `sb_…` key fails that gate → the gateway returns **HTTP 401** and the function body never executes.

Therefore **every server-to-server invocation that sends the service-role key as a Bearer token silently 401s**:

- edge-function → edge-function via `supabase.functions.invoke(...)`
- Vercel cron → edge-function via `fetch(... Bearer SERVICE_ROLE_KEY)` (`api/_utils/auth.ts:48-50`)
- pg_cron / pg_net DB trigger → edge-function with a service-role bearer header

The function's own **in-handler** auth (`isServiceRole = authHeader.replace("Bearer ","") === serviceRoleKey`) is actually correct — but it never gets to run because the gateway rejects first.

### 11.2 Proof (live, reproducible)

- **XP-source ledger:** of **41** `VALID_SOURCES` in `award-xp`, only **6** have ever produced an `xp_transactions` row, and 5 of those are the May seed (`login`, `submission`, `grade`, `perfect_day`, `streak`). Every source that depends on a server-to-server `award-xp` call — `challenge_reward`, `tutor_engagement`, `improvement_bonus`, `league_promotion`, `quiz_completion`, `study_session`, `peer_teaching`, … — has **0 rows ever**.
- **Edge logs:** `award-xp` and `check-badges` sub-invokes logged **401** (gateway) for versions 4–6; after deploying both with `--no-verify-jwt` + `x-internal-auth`, the same calls logged **200** and the first-ever live `badge` XP transactions (2 rows) were recorded. No infinite loop (Step 13 excludes `source='badge'`).
- **Attainment cascade:** `outcome_attainment.last_calculated_at` max = **2026-05-26**, `grades.graded_at` max = **2026-05-20**. **Initially this looked like the rollup was dead** (and the pg_net response log shows the OLD edge-function trigger 401'ing on 2026-05-20). **CORRECTION (verified live):** the grade trigger was **rewritten to pure in-database SQL** at migration `20260520070203_rewrite_attainment_trigger_pure_sql` (+ 3 follow-ups), so it no longer calls the edge function at all. A controlled live re-fire (no-op `UPDATE grades SET score_percent = <same value>`) advanced `last_calculated_at` from `2026-05-26T10:36:58` → `2026-06-05T01:40:41` and recomputed the CLO/PLO/ILO rows correctly. **The OBE cascade WORKS in production via the SQL trigger.** The `calculate-attainment-rollup` edge function is now orphaned dead code (still `verify_jwt=true`, but nothing invokes it).

### 11.3 Affected functions (deployed `verify_jwt=true`, called server-to-server)

| Function                      | Invoked by                                   | In-handler auth present?                | Impact if unfixed                                                                        |
| ----------------------------- | -------------------------------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------- |
| `award-xp`                    | 5+ edge fns, hooks                           | ✅ service-role + self                  | **FIXED** (`--no-verify-jwt` + `x-internal-auth`)                                        |
| `check-badges`                | award-xp, process-streak, process-onboarding | ✅ service-role + ownership             | **FIXED** (`--no-verify-jwt` + `x-internal-auth`)                                        |
| `calculate-attainment-rollup` | ~~grade DB trigger~~ **NOTHING (orphaned)**  | ✅ service-role + teacher/admin         | ✅ **NOT broken** — superseded by a pure-SQL trigger (see §11.6.1); edge fn is dead code |
| `process-streak`              | Vercel cron `streak-reset` + pg_cron         | ✅                                      | 🔴 daily streak reset/increment dead                                                     |
| `send-email-notification`     | weekly-summary-cron, streak-risk-cron        | ✅ service-role + admin                 | 🟠 all transactional/digest emails fail                                                  |
| `generate-starter-week`       | process-onboarding                           | ⚠️ JWT-only + ownership (double-broken) | 🟠 onboarding starter week never generated                                               |
| `generate-plan-update`        | chat-with-tutor (fetch)                      | ⛔ NONE (creates service client)        | 🟠 tutor plan-update never fires; **add caller auth before flipping**                    |
| `leaderboard-refresh`         | Vercel cron                                  | ✅                                      | 🟡 non-fatal (view self-computes)                                                        |
| `compute-at-risk-signals`     | Vercel cron                                  | ✅                                      | 🟠 at-risk signals stale                                                                 |
| `ai-at-risk-prediction`       | Vercel cron                                  | ✅                                      | 🟠 AI predictions never run                                                              |
| `perfect-day-prompt`          | Vercel cron                                  | ✅                                      | 🟠 perfect-day nudges never sent                                                         |
| `notification-digest`         | Vercel cron                                  | ✅                                      | 🟠 digest never sent                                                                     |
| `exam-period-notify`          | Vercel cron                                  | ✅                                      | 🟠 exam notices never sent                                                               |

### 11.4 The fix pattern (applied to award-xp + check-badges)

1. Deploy the function with **`--no-verify-jwt`** (removes the redundant gateway JWT gate — authorization is preserved in-handler).
2. Internal callers send the **anon key** as `Authorization: Bearer` + `apikey`, and the **service-role secret** in a custom **`x-internal-auth`** header.
3. The handler treats the caller as service-role when `x-internal-auth === SERVICE_ROLE_KEY` (or the legacy `Authorization`-equals-key path), and still runs user-ownership checks for student JWT callers.
4. **`generate-plan-update` must get an in-handler caller check added** before it is flipped to `--no-verify-jwt`, otherwise it becomes fully unauthenticated.

### 11.5 Deploy-script bug (latent re-break)

`scripts/deploy-edge-functions.sh` declared `NO_VERIFY_JWT_FUNCTIONS=(award-xp check-badges)` but the deploy loop **never applied the flag** — a batch redeploy would silently flip the fixed functions back to `verify_jwt=true` and re-break them. **Fixed:** the loop now appends `--no-verify-jwt` for any function in that set. As more functions are fixed, add them to the set.

### 11.6 Why static audit missed it (and the §10 correction)

The original audit traced the _code paths_ (caller → callee, in-handler auth present) and concluded the rollup trigger + cron auth were "reference-quality." The **cron auth** conclusion is wrong (the gateway rejects the non-JWT bearer — observable only by invoking the live functions). The **rollup trigger** conclusion is actually CORRECT but for the wrong reason — see §11.6.1. **§10's "cron auth pattern" entry is retracted** pending the §11.4 fix + a CI smoke test that actually invokes each service function and asserts a non-401 response.

#### 11.6.1 The rollup trigger is pure SQL (not an edge call) — verified live

The grade trigger `trigger_attainment_rollup` was migrated to **pure in-database plpgsql** (`20260520070203_rewrite_attainment_trigger_pure_sql`, hardened by `…upsert_v3` and `…include_plo_ilo`). It does evidence insert + CLO→PLO→ILO cascade + grade XP + notification entirely in SQL with no pg_net/edge call. A controlled live re-fire confirmed it runs (see §11.2). So the OBE cascade is NOT affected by the verify_jwt bug. The `calculate-attainment-rollup` edge function and the three historical pg_net trigger migrations are superseded dead code (candidate for §9 prune list).

### 11.7 Secondary confirmed bugs (independent of verify_jwt)

- 🟠 **Habit table split:** `habit_tracking` = 3,010 rows (populated) but `habit_logs` = 0, `journal_entries` = 0, `wellness_habit_logs` = 0. `process-streak`, `perfect-day-prompt`, `update-challenge-progress` read `habit_logs`; `check-badges` `journal_10`/`perfect_week` read `journal_entries`/`habit_logs`. So 58 students who qualify for `journal_10` and 29 for `perfect_week` get **0** badges. Readers must point at `habit_tracking` (or the data must be written to both).
- 🔴 **Accreditation exports query non-existent columns** (confirmed via live `ERROR 42703`):
  - `generate-accreditation-report/index.ts`: `score_percent` (real col is `attainment_percent`); filters `scope==='PLO'/'ILO'` (real scope values are `student_course|course|program|institution`).
  - `generate-course-file/index.ts`: `child_outcome_id`/`parent_outcome_id` (real: `source_outcome_id`/`target_outcome_id`); `score_percent`; `scope='CLO'`; and `cqi_action_plans.{title,gap_description,corrective_actions,course_id}` — **all four columns absent** from the live table.
- 🟠 **Department analytics PLO scope mismatch:** `useAdminDashboard.useDepartmentAnalytics` reads PLO at `scope in ('program','institution')` but PLO attainment is written at `scope='course'` → `avg_plo_attainment` always 0 (same class as the already-fixed heatmap bug).
- 🟠 **`outcome_mappings` weight invariant unenforced + scale drift:** weights are stored 0–1 (CHECK 0.0–1.0), not 0–100 as the domain doc says; **no trigger/constraint** enforces per-child sum; live data: all 28 children violate "sum to 1.0."
- 🟢 **GA/`institution` cascade produces 0 rows** despite 2 graduate attributes + 4 GA→ILO mappings (seeded post-audit). Step-6 GA rollup never runs (also gated behind the dead rollup).
