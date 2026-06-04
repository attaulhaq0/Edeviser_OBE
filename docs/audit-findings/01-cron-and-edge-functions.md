# Audit Findings 01 — Cron Jobs & Edge Functions Synchronization

**Scope:** Cron jobs (Vercel + pg_cron) and Supabase Edge Function wiring.
**Method:** Static evidence only — every claim cites `file:line`. No files were modified.
**Date generated:** from the current state of the repository at `f:\Edeviser-Kiro`.

> Verification caveat: this audit reads source, migrations, and config. It does **not** query the live
> Supabase project, so any statement about what is _actually scheduled/deployed in production_ is
> explicitly marked as unverifiable from the codebase. The three "verified live" pg_cron jobs were
> supplied by the requester and are treated as given.

---

## 1. Cron Cross-Check

### 1.1 Source inventory

- Vercel crons array: `vercel.json:62-72` — **9 entries**, all hitting `/api/cron/*`.
- Vercel cron handlers on disk: **10 files** in `api/cron/` (`fee-overdue-check.ts` exists but has **no** matching `crons` entry — see Finding H-2).
- Shared invoker: `api/_utils/auth.ts` — `verifyCronSecret()` (lines 11-27) checks `Authorization: Bearer <CRON_SECRET>`; `invokeEdgeFunction()` (lines 33-60) POSTs to `${SUPABASE_URL}/functions/v1/<name>` with the **service-role** bearer.
- pg_cron jobs are declared across several migrations; the most recent guard that re-creates them is
  `supabase/migrations/20260615000001_conditional_pgcron_guard.sql`. A prune migration
  `supabase/migrations/20260602101312_task15_prune_duplicate_broken_pgcron_jobs.sql` removes 8 of them.

### 1.2 Cron Sync table

| Cron name              | Type                             | Schedule               | Target (edge fn / SQL)                           | Target exists?                            | Notes / Evidence                                                                                                                                                                       |
| ---------------------- | -------------------------------- | ---------------------- | ------------------------------------------------ | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| streak-risk            | Vercel                           | `0 20 * * *`           | edge `streak-risk-cron`                          | ✅ `supabase/functions/streak-risk-cron/` | `api/cron/streak-risk.ts:9`. Fn header schedule `0 20 * * *` matches (`streak-risk-cron/index.ts:10`).                                                                                 |
| weekly-summary         | Vercel                           | `0 8 * * 1`            | edge `weekly-summary-cron`                       | ✅                                        | `api/cron/weekly-summary.ts:9`. Fn header `0 8 * * 1` matches (`weekly-summary-cron/index.ts:11`).                                                                                     |
| compute-at-risk        | Vercel                           | `0 2 * * *`            | edge `compute-at-risk-signals`                   | ✅                                        | `api/cron/compute-at-risk.ts:9`. Fn header `0 2 * * *` matches (`compute-at-risk-signals/index.ts:11`).                                                                                |
| perfect-day-prompt     | Vercel                           | `0 18 * * *`           | edge `perfect-day-prompt`                        | ✅                                        | `api/cron/perfect-day-prompt.ts:9`. Fn header `0 18 * * *` matches (`perfect-day-prompt/index.ts:11`).                                                                                 |
| streak-reset           | Vercel                           | `0 0 * * *`            | edge `process-streak` `{type:'midnight_reset'}`  | ✅                                        | `api/cron/streak-reset.ts:9`. Only caller of `process-streak` found (see §2).                                                                                                          |
| leaderboard-refresh    | Vercel                           | `0 12 * * *`           | edge `leaderboard-refresh`                       | ✅                                        | `api/cron/leaderboard-refresh.ts:11`. Now a no-op verify (view is a plain VIEW), `leaderboard-refresh/index.ts:16-17`. Schedule diverges from old pg_cron `*/5 * * * *` — intentional. |
| ai-at-risk-prediction  | Vercel                           | `0 3 * * *`            | edge `ai-at-risk-prediction`                     | ✅                                        | `api/cron/ai-at-risk-prediction.ts:8`. Fn header `0 3 * * *` matches (`ai-at-risk-prediction/index.ts:11`).                                                                            |
| notification-digest    | Vercel                           | `0 20 * * *`           | edge `notification-digest`                       | ✅                                        | `api/cron/notification-digest.ts:9`. Fn header "8 PM daily" matches (`notification-digest/index.ts:11-12`).                                                                            |
| exam-period-notify     | Vercel                           | `0 8 * * *`            | edge `exam-period-notify`                        | ✅                                        | `api/cron/exam-period-notify.ts:9`. **Schedule mismatch:** fn header says `0 9 * * * (daily 9 AM)` (`exam-period-notify/index.ts:11`) but Vercel fires 08:00. See Finding M-1.         |
| **fee-overdue-check**  | **Vercel handler (UNSCHEDULED)** | — (no `crons` entry)   | edge `fee-overdue-check`                         | ✅                                        | Handler `api/cron/fee-overdue-check.ts:9` exists but **absent from `vercel.json` crons** (`vercel.json:62-72`). See Finding H-2.                                                       |
| badge-auto-archive     | pg_cron (live)                   | `0 0 * * *` daily      | SQL `SELECT badge_auto_archive()`                | ✅ fn exists                              | Pure-SQL DB-local job; kept by prune (`20260602101312...sql:7-8`). Schedule per `20260720000008_badge_archive_cron.sql:34-35`.                                                         |
| badge-spotlight-rotate | pg_cron (live)                   | `0 0 * * 1` weekly     | SQL `SELECT badge_spotlight_auto_rotate()`       | ✅ fn exists                              | Pure-SQL DB-local job; kept by prune. Schedule per `20260720000007_badge_spotlight_rotate_cron.sql:80-81`.                                                                             |
| fee-overdue-check      | pg_cron (live)                   | `0 6 * * *` daily 6 AM | SQL `UPDATE fee_payments SET status='overdue' …` | n/a (inline SQL)                          | Pure-SQL job, `20260615000001_conditional_pgcron_guard.sql:106-110`. **Overlaps the edge function of the same name** — see Finding M-2.                                                |

### 1.3 The `fee-overdue-check` duplication — verdict

There are **two** implementations of the same business rule:

1. **pg_cron, pure SQL** (`20260615000001_conditional_pgcron_guard.sql:106-110`):
   `UPDATE fee_payments SET status='overdue' WHERE status='pending' AND EXISTS (SELECT 1 FROM fee_structures fs WHERE fs.id = fee_payments.fee_structure_id AND fs.due_date < CURRENT_DATE)` — daily 06:00. This is one of the 3 jobs confirmed live.
2. **Vercel→edge function** (`api/cron/fee-overdue-check.ts` → `supabase/functions/fee-overdue-check/index.ts`): the edge function performs the identical logic (fetch pending payments, join `fee_structures`, mark overdue) — `fee-overdue-check/index.ts:48-99`. Its own header also claims `0 6 * * *` (`index.ts:13`).

**Verdict: this is genuine functional duplication, but currently only the pg_cron copy runs.** The Vercel handler exists yet is **not in the `crons` array**, so it never fires on schedule. The two are therefore not double-firing today, but the duplication is latent: if someone adds the missing `crons` entry without removing the pg_cron job, `fee_payments` would be swept twice at 06:00 (harmless idempotent re-write today, but a maintenance trap). Recommend picking one scheduler and deleting the other (the repo's own prune migration declares "Vercel Cron is the canonical scheduler" — `20260602101312...sql:2-3` — which argues for keeping the Vercel path and dropping the pg_cron SQL job, **or** vice-versa, but not both).

### 1.4 Cron flags

- **No Vercel cron points at a missing edge function** — all 9 scheduled targets resolve to a directory under `supabase/functions/` (verified §1.2).
- **One unscheduled handler:** `api/cron/fee-overdue-check.ts` (Finding H-2).
- **One schedule mismatch vs. code intent:** `exam-period-notify` (8 AM Vercel vs 9 AM in the function header) (Finding M-1).
- **Migration replay hazard:** the prune migration (`20260602101312`) is followed in filename order by `20260615000001_conditional_pgcron_guard.sql`, which **re-creates all 8 pruned jobs** including the broken `REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_weekly` (`20260615000001...sql:29-34`). A from-scratch replay (DR / preview branch) therefore does **not** reproduce the "3 live jobs" state. See Finding H-1.

---

## 2. Edge Function Inventory (54 functions, `_shared` excluded)

Reference search basis: `supabase.functions.invoke("<name>"…)` across `src/`, `fetch(getEdgeFunctionUrl("<name>"))` in `src/lib/tutorApi.ts`, edge-to-edge `functions.invoke` inside `supabase/functions/`, `api/cron/*` invokers, `net.http_post('/functions/v1/<name>')` in migrations, and E2E fixtures.

### Group A — WIRED (clear runtime caller: frontend hook, DB trigger, edge-to-edge, or ops)

| #   | Function                      | One-phrase purpose                                       | Caller (evidence)                                                                                                                                                                                                                                                                                                              |
| --- | ----------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | ai-feedback-draft             | Per-criterion draft rubric feedback for teachers         | `src/hooks/useAIFeedbackDraft.ts:47-49`. In-handler JWT (`ai-feedback-draft/index.ts:286-295`).                                                                                                                                                                                                                                |
| 2   | award-xp                      | Insert XP transaction (all XP awards)                    | `src/lib/xpClient.ts:32`, `src/lib/quizXpAward.ts:32`, many hooks; edge-to-edge from `check-badges`, `process-streak`, `process-onboarding`, `update-challenge-progress`, `challenge-completion`, `improvement-bonus-check`, `chat-with-tutor`. Auth: service-role or JWT w/ source restriction (`award-xp/index.ts:544-569`). |
| 3   | bulk-data-import              | Generic CSV import (enrollments/courses/outcomes/grades) | `src/hooks/useDataImport.ts:24-26`, `src/hooks/useBulkOperations.ts:33-35`. JWT (`bulk-data-import/index.ts:66-72`).                                                                                                                                                                                                           |
| 4   | bulk-grade-export             | Export course grades                                     | `src/hooks/useBulkOperations.ts:17-19`. JWT (`bulk-grade-export/index.ts:22`).                                                                                                                                                                                                                                                 |
| 5   | bulk-import-users             | CSV bulk user creation + invites                         | `src/hooks/useBulkImport.ts:25-27`. JWT **+ admin role check** (`bulk-import-users/index.ts:64-69`).                                                                                                                                                                                                                           |
| 6   | calculate-attainment-rollup   | Evidence→CLO→PLO→ILO weighted rollup                     | DB trigger via pg_net, `20260520065433_fix_trigger_add_apikey_header.sql:24`. Auth: service-role or teacher/admin (`calculate-attainment-rollup/index.ts:66-91`).                                                                                                                                                              |
| 7   | chat-with-tutor               | Streaming AI tutor (SSE)                                 | `src/lib/tutorApi.ts:87,218`. JWT via `getAuthHeaders` (anon key + session).                                                                                                                                                                                                                                                   |
| 8   | check-badges                  | Idempotent badge evaluation                              | `src/hooks/usePlannerTasks.ts:227`, `useWellnessHabits.ts:83`, `useSessionCompletion.ts:160`, `useWeeklyGoalXP.ts:144`; edge-to-edge from `process-streak`, `process-onboarding`. Auth: service-role or self+ownership (`check-badges/index.ts:1645-1700`).                                                                    |
| 9   | check-bonus-question          | Bonus-question trigger + validation                      | `src/hooks/useBonusQuestion.ts:37,67`. Service-role client, **no in-handler caller check** (`check-bonus-question/index.ts:26-29`). See Finding M-3.                                                                                                                                                                           |
| 10  | check-login-rate              | Login rate limiter (5/15min)                             | `src/lib/loginAttemptTracker.ts:126`. Service-role; `clear` action requires admin JWT (`check-login-rate/index.ts:237-262`).                                                                                                                                                                                                   |
| 11  | compute-habit-correlations    | Habit↔academic correlation insights                      | `src/hooks/useHabitCorrelations.ts:26-28`. Service-role or authenticated user (`compute-habit-correlations/index.ts:226-251`).                                                                                                                                                                                                 |
| 12  | export-student-data           | GDPR student data export (CSV)                           | `src/components/shared/ExportDataButton.tsx:33-35`. (Locked-down CORS origin, `export-student-data/index.ts:5-11`.)                                                                                                                                                                                                            |
| 13  | generate-accreditation-report | PDF accreditation report (ABET/HEC/…)                    | `src/hooks/useAccreditationReport.ts:34-36`. JWT (`generate-accreditation-report/index.ts:452-470`).                                                                                                                                                                                                                           |
| 14  | generate-course-file          | PDF course file per course/semester                      | `src/hooks/useCourseFile.ts:28-30`. JWT (`generate-course-file/index.ts:417-435`).                                                                                                                                                                                                                                             |
| 15  | generate-fee-receipt          | PDF fee receipt                                          | `src/hooks/useFees.ts:143-145`. Service-role client, **no in-handler caller/role check** (`generate-fee-receipt/index.ts:22-25`). See Finding M-3.                                                                                                                                                                             |
| 16  | generate-quiz-questions       | Generate quiz questions for CLOs                         | `src/hooks/useGenerateQuestions.ts:35-37`. JWT (`generate-quiz-questions/index.ts:521-542`).                                                                                                                                                                                                                                   |
| 17  | generate-starter-week         | First-week study plan                                    | `src/hooks/useStarterWeekPlan.ts:115-117`; edge-to-edge from `process-onboarding` (`process-onboarding/index.ts:988`). JWT (`generate-starter-week/index.ts:199-219`).                                                                                                                                                         |
| 18  | generate-transcript           | PDF transcript                                           | `src/hooks/useTranscript.ts:17-19`. JWT (`generate-transcript/index.ts:31-46`).                                                                                                                                                                                                                                                |
| 19  | generate-plan-update          | AI learning-plan update (tutor)                          | edge-to-edge from `chat-with-tutor/index.ts:1761-1765`. Service-role client (`generate-plan-update/index.ts:63-66`).                                                                                                                                                                                                           |
| 20  | import-competency-csv         | Competency framework CSV → 3-level hierarchy             | `src/hooks/useCompetencyFrameworks.ts:98-100`. Service-role client, **no in-handler caller/role check** (`import-competency-csv/index.ts:74-77`). See Finding M-3.                                                                                                                                                             |
| 21  | process-onboarding            | Onboarding completion + XP/badges                        | `src/hooks/useStudentProfile.ts:75-77`. JWT (`process-onboarding/index.ts:406-426`).                                                                                                                                                                                                                                           |
| 22  | process-purchase              | Marketplace purchase processor                           | `src/hooks/useStreakFreeze.ts:52-54`, `src/hooks/usePurchase.ts:45`. JWT (`process-purchase/index.ts:96-112`).                                                                                                                                                                                                                 |
| 23  | resolve-mystery-reward        | Probability-weighted mystery reward                      | `src/hooks/useMysteryRewardBox.ts:26-28`. Service-role client, **no in-handler caller check** (`resolve-mystery-reward/index.ts:63-66`). See Finding M-3.                                                                                                                                                                      |
| 24  | score-reflection-quality      | Score reflection (originality/relevance/depth)           | `src/hooks/useReflectionQuality.ts:75-77`, `src/hooks/useSessionReflections.ts:113`. Service-role client. **CORS header typo** — see Finding H-3.                                                                                                                                                                              |
| 25  | select-adaptive-question      | Pick next adaptive quiz question                         | `src/hooks/useAdaptiveQuiz.ts:92-94`. JWT (`select-adaptive-question/index.ts:221-242`).                                                                                                                                                                                                                                       |
| 26  | semester-transition           | Copy courses/CLOs into new semester                      | `src/hooks/useBulkOperations.ts:52-54`. JWT (`semester-transition/index.ts:16-41`).                                                                                                                                                                                                                                            |
| 27  | send-invitation-email         | Send role invitation emails (Resend)                     | `src/hooks/useInviteUsers.ts:86-88`. Service-role client (`send-invitation-email/index.ts:31-35`).                                                                                                                                                                                                                             |
| 28  | send-onboarding-reminder      | Email onboarding reminder                                | `src/pages/admin/onboarding/PendingOnboardingPage.tsx:57-60`. JWT (`send-onboarding-reminder/index.ts:25-46`).                                                                                                                                                                                                                 |
| 29  | suggest-goals                 | Suggest weekly SMART goals                               | `src/hooks/useGoalSuggestions.ts:128`. JWT (`suggest-goals/index.ts:149-169`).                                                                                                                                                                                                                                                 |
| 30  | tutor-analytics               | Tutor usage analytics (teacher)                          | `src/lib/tutorApi.ts:240`. JWT (`tutor-analytics/index.ts:288-309`).                                                                                                                                                                                                                                                           |
| 31  | update-question-analytics     | Post-quiz analytics + mastery/Bloom update               | `src/hooks/useAdaptiveQuiz.ts:125-127` (fire-and-forget). JWT (`update-question-analytics/index.ts:264-283`).                                                                                                                                                                                                                  |
| 32  | send-email-notification       | Transactional email dispatcher (Resend)                  | edge-to-edge from `weekly-summary-cron/index.ts:127`, `streak-risk-cron/index.ts:123`. Has a JWT branch (`send-email-notification/index.ts:382-392`).                                                                                                                                                                          |
| 33  | health                        | DB connectivity health check                             | External uptime monitor; documented `README.md:87,101`. Service-role client (`health/index.ts:25-28`). No in-repo caller (ops endpoint).                                                                                                                                                                                       |
| 34  | audit-fixtures                | E2E audit seed/teardown/impersonate/bonus-xp             | `tests/e2e/_fixtures/seed.ts:23`, `teardown.ts:14` (`/functions/v1/audit-fixtures`). Hard-gated to `ENV_ID == "audit-staging"`, production-blocked (`audit-fixtures/index.ts:11-17`).                                                                                                                                          |

### Group B — CRON-DRIVEN (invoked by a Vercel cron)

| #   | Function                | One-phrase purpose                        | Cron caller (evidence)                                                                               | Auth                                                                                                                                                                                                    |
| --- | ----------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 35  | ai-at-risk-prediction   | Nightly at-risk probability prediction    | `api/cron/ai-at-risk-prediction.ts:8`                                                                | cron-secret or service-role (`index.ts:182-195`)                                                                                                                                                        |
| 36  | compute-at-risk-signals | Nightly at-risk signal computation        | `api/cron/compute-at-risk.ts:9`                                                                      | cron-secret or service-role (`index.ts:116-130`)                                                                                                                                                        |
| 37  | exam-period-notify      | Notify students 5 days before exams       | `api/cron/exam-period-notify.ts:9`                                                                   | cron-secret or service-role (`index.ts:20-34`)                                                                                                                                                          |
| 38  | leaderboard-refresh     | Verify weekly leaderboard view accessible | `api/cron/leaderboard-refresh.ts:11`                                                                 | **service-role bearer exact match** (`index.ts:20-26`)                                                                                                                                                  |
| 39  | notification-digest     | Daily digest of undelivered notifications | `api/cron/notification-digest.ts:9`                                                                  | cron-secret or service-role (`index.ts:24-…`)                                                                                                                                                           |
| 40  | perfect-day-prompt      | Nudge students with 3/4 habits done       | `api/cron/perfect-day-prompt.ts:9`                                                                   | cron-secret or service-role (`index.ts:68-…`)                                                                                                                                                           |
| 41  | process-streak          | Streak processing (midnight reset)        | `api/cron/streak-reset.ts:9`                                                                         | cron-secret/service-role branch + per-student JWT branch (`index.ts:437-456`). **Only caller found is the midnight-reset cron** — no per-student login-path invoker exists in `src/` (see Finding M-4). |
| 42  | streak-risk-cron        | Email students whose streak is at risk    | `api/cron/streak-risk.ts:9`                                                                          | cron-secret or service-role (`index.ts:20-…`)                                                                                                                                                           |
| 43  | weekly-summary-cron     | Weekly summary email per student          | `api/cron/weekly-summary.ts:9`                                                                       | cron-secret or service-role (`index.ts:20-…`)                                                                                                                                                           |
| 44  | fee-overdue-check       | Mark overdue fee payments                 | `api/cron/fee-overdue-check.ts:9` — **handler exists but UNSCHEDULED** (not in `vercel.json` crons). | cron-secret or service-role (`index.ts:20-38`). See Finding H-2.                                                                                                                                        |

### Group C — ORPHANED (no caller found anywhere in repo — potential dead code)

| #   | Function                   | One-phrase purpose                             | Evidence of no caller                                                                                                                                                                                                                                      | Auth posture                                                 |
| --- | -------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| 45  | ai-module-suggestion       | Personalized CLO-gap module suggestions        | No `invoke`/`fetch`/cron/trigger caller. `useAISuggestions.ts` only **reads** `ai_feedback` (`useAISuggestions.ts:43-52`), it does **not** invoke this fn. The `SUPABASE-HEALTH-REPORT.md:37` claim that `useAISuggestions.ts` calls it is **inaccurate**. | JWT-or-service (`index.ts:227-252`)                          |
| 46  | auto-grade-quiz            | Auto-grade MCQ/T-F quizzes                     | Only doc/deploy-script mentions; no runtime caller in `src`/`api`/migrations.                                                                                                                                                                              | Service-role client, no in-handler auth (`index.ts:107-110`) |
| 47  | challenge-completion       | Process challenge completion, award team XP    | "Task 134.5 cron" (`index.ts:3`) but **no pg_cron entry and not in `vercel.json`**; no frontend caller.                                                                                                                                                    | Service-role client, no in-handler auth (`index.ts:18-21`)   |
| 48  | challenge-progress-update  | Update challenge progress + 90% notify         | "Task 134.4" (`index.ts:1-2`); no runtime caller found.                                                                                                                                                                                                    | Service-role client, no in-handler auth (`index.ts:27-30`)   |
| 49  | update-challenge-progress  | Team-challenge progress recompute (idempotent) | team-challenges spec says "invoked after grade/habit/xp events" (`design.md`), but **no caller exists in `src`/`api`/migrations**. Distinct from #48 despite near-identical name (Finding M-5).                                                            | Service-role client, no in-handler auth (`index.ts:491-494`) |
| 50  | cqi-review-reminder        | Notify coordinators of CQI reviews due         | Header says "pg_cron Edge Function (Mon 09:00)" (`index.ts:1`) but **no pg_cron `net.http_post` references it** and it is not in `vercel.json`.                                                                                                            | Service-role client, no in-handler auth (`index.ts:20-23`)   |
| 51  | generate-reflection-digest | Monthly reflection digest                      | No caller; no cron schedules it.                                                                                                                                                                                                                           | Service-role client; **CORS header typo** (Finding H-3)      |
| 52  | improvement-bonus-check    | Award XP for CLO score improvement             | Calls `award-xp` but **nothing calls it** — no frontend/cron/trigger caller.                                                                                                                                                                               | Service-role client, no in-handler auth (`index.ts:26-29`)   |
| 53  | embed-course-material      | Chunk + embed course material (RAG)            | No runtime caller in `src`/`api`/migrations (only unit tests reference its pure helpers).                                                                                                                                                                  | Service-role client, no in-handler auth (`index.ts:545-549`) |
| 54  | team-streak-risk-cron      | Notify team members of streak risk             | "Task 132.5 cron" (`index.ts:1`) but the live team-streak pg_cron job (`update-team-streaks`, `20260415071802...sql`) is **pure SQL** and does not call this fn; not in `vercel.json`; no frontend caller.                                                 | Service-role client, no in-handler auth (`index.ts:18-21`)   |

### Group D — UNCERTAIN

None remaining — every function resolved to A, B, or C with cited evidence. The closest to "uncertain" are
`health` (no in-repo caller but a documented external uptime endpoint — classified WIRED/ops) and
`audit-fixtures` (test-harness-only — classified WIRED/test). Both are intentional, not dead code.

### 2.1 Auth-pattern summary

- **Every** function handles the CORS `OPTIONS` preflight and returns the standard `corsHeaders`
  (pattern from `.kiro/steering/supabase-patterns.md`). None is fully unauthenticated at the network layer
  _if_ the platform gateway `verify_jwt` default is in force.
- `supabase/config.toml` contains **no `[functions.*] verify_jwt` overrides**, so the Supabase default
  (`verify_jwt = true`) applies at the gateway to all functions. This cannot be confirmed against the live
  project from the codebase.
- **In-handler verification varies sharply:**
  - **JWT (`auth.getUser` via anon key):** #1,3,4,5,7,13,14,16,17,18,21,22,25,26,28,29,30,31 (+ role/ownership in #5 admin, #8 self, #6 teacher/admin, #10 admin-on-clear).
  - **Cron-secret OR service-role:** #35,36,37,39,40,42,43,44 and the midnight branch of #41 (`_shared/auth.ts:authenticateCronRequest` pattern, re-implemented inline).
  - **Service-role exact-bearer only:** #38 leaderboard-refresh.
  - **Service-role client with NO in-handler caller check (relies solely on gateway `verify_jwt`):**
    #9,15,19,20,23,24,45,46,47,48,49,50,51,52,53,54,32(partial),27. Several of these take a `student_id`
    from the request body and operate with RLS-bypassing service role without verifying
    `caller == student_id` or caller role — see Finding M-3.

---

## 3. Findings (ranked by severity)

### Blocker

None identified within this scope from static evidence. (Deployment/live-state blockers are out of scope —
this audit cannot confirm which functions are deployed.)

### High

**H-1 — Migration replay re-creates the 8 pruned/broken pg_cron jobs (DR / preview-branch hazard).**
`20260602101312_task15_prune_duplicate_broken_pgcron_jobs.sql` unschedules 8 jobs (lines 12-21), but the
later-sorting `20260615000001_conditional_pgcron_guard.sql` **re-creates all of them** when `pg_cron` is
available, including the broken `REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_weekly`
(`20260615000001...sql:29-34`) against an object that is now a plain VIEW, and the 7 HTTP jobs whose URL is
built from the unset `app.settings.supabase_url` GUC (`…:40-103`). A from-scratch replay (disaster recovery,
Supabase preview branch) therefore yields a **different** cron set than the "3 live jobs" state, and resurrects
the known-broken jobs. _Evidence:_ filename order `20260602…` < `20260615…`; prune body vs. re-create body.
_Cannot verify_ the live job list from the codebase.
_Recommendation:_ make the prune the last word (move/duplicate the unschedule after `20260615000001`, or
remove the HTTP/MV jobs from the guard migration so replay converges on the intended 3 SQL-only jobs).

**H-2 — `fee-overdue-check` Vercel handler is orphaned (exists but never scheduled).**
`api/cron/fee-overdue-check.ts` is a complete cron handler (`:9` invokes the edge fn) but there is **no**
corresponding entry in `vercel.json` crons (`vercel.json:62-72` lists only 9 paths, fee-overdue absent).
Result: the Vercel→edge path for overdue fees never fires; only the pg_cron SQL job does the work.
_Recommendation:_ either add the `crons` entry (and then remove the pg_cron SQL job to avoid the H/M
duplication) or delete the dead handler + edge function if pg_cron is canonical.

**H-3 — CORS allow-headers typo blocks browser preflight for two functions.**
`score-reflection-quality/index.ts:12` and `generate-reflection-digest/index.ts:12` declare
`"Access-Control-Allow-Headers": "authorization, x-content-type, apikey, content-type"` — note
**`x-content-type`** instead of the standard **`x-client-info`** that the supabase-js client always sends.
`score-reflection-quality` **is called from the browser** (`useReflectionQuality.ts:75`,
`useSessionReflections.ts:113`); its custom `x-client-info` header would not be in the allow-list, so the
CORS preflight can reject the request in-browser. _Cannot verify_ runtime behavior without execution, but the
header set is objectively wrong vs. every other function in the repo.
_Recommendation:_ fix both to `x-client-info`.

### Medium

**M-1 — `exam-period-notify` schedule mismatch (intent vs. wiring).**
Vercel fires `/api/cron/exam-period-notify` at `0 8 * * *` (`vercel.json:71`), but the function's own header
documents `0 9 * * * (daily 9 AM)` (`exam-period-notify/index.ts:11`). One of the two is wrong; reconcile so
the documented intent and the actual trigger agree.

**M-2 — `fee-overdue-check` logic is duplicated across pg_cron and an edge function.**
Pure-SQL pg_cron job (`20260615000001...sql:106-110`) and the edge function
(`fee-overdue-check/index.ts:48-99`) implement the same overdue sweep. Only the pg_cron copy currently runs
(see H-2), so no double-fire today, but the duplication is a latent double-write if the Vercel cron is ever
enabled. Consolidate to one scheduler. (The repo's own prune migration declares Vercel the canonical
scheduler — `20260602101312...sql:2-3`.)

**M-3 — Privileged service-role functions accept `student_id`/IDs from the body with no in-handler
authorization check.** `generate-fee-receipt` (`index.ts:22-25`), `import-competency-csv` (`:74-77`),
`resolve-mystery-reward` (`:63-66`), `check-bonus-question` (`:26-29`), `improvement-bonus-check` (`:26-29`),
and the challenge functions (#47-49) build a **service-role** client (RLS bypassed) and act on caller-supplied
IDs without verifying `caller == subject` or caller role. They rely entirely on the gateway `verify_jwt`
default, which only proves _some_ user is authenticated — not that they own the target row. This is an IDOR /
missing-authorization pattern. (Overlaps prior `docs/security/SECURITY-AUDIT-REPORT.md` findings for
`ai-module-suggestion`.) _Cannot verify_ the live `verify_jwt` setting.
_Recommendation:_ add explicit ownership/role checks (mirror the `check-badges` self-or-service pattern,
`check-badges/index.ts:1645-1700`).

**M-4 — `process-streak` has no per-student (login-path) caller.** The only invoker found is the midnight
`streak-reset` cron (`api/cron/streak-reset.ts:9`, payload `{type:'midnight_reset'}`). No code in `src/`
invokes `process-streak` on daily login, so per-student streak _increment_ (as opposed to reset) appears to
have no trigger in the audited code. _Cannot verify_ whether streak increments are instead handled inside
another path (e.g., `award-xp`/login flow) — flagging the gap, not asserting breakage.

**M-5 — Two near-identically named challenge functions, both orphaned.**
`challenge-progress-update` (#48, Task 134.4) and `update-challenge-progress` (#49, team-challenges Task 2.3)
coexist with confusingly transposed names and neither has a runtime caller. High risk of a future developer
wiring the wrong one. Consolidate or clearly deprecate one.

### Low

**L-1 — Dead/duplicate cron-style edge functions inflate the deploy surface.**
`cqi-review-reminder`, `team-streak-risk-cron`, `generate-reflection-digest`, `challenge-completion`,
`auto-grade-quiz`, `embed-course-material`, `improvement-bonus-check`, `ai-module-suggestion`,
`update-challenge-progress`, `challenge-progress-update` (Group C) have no caller. Several advertise
themselves as "cron" functions in their headers yet no scheduler references them. They are listed in
`scripts/deploy-edge-functions.sh`, so they get deployed despite being unreachable. Recommend removing or
explicitly documenting them as intentionally-dormant.

**L-2 — Cron auth is implemented two ways.** `api/_utils/auth.ts:verifyCronSecret` checks
`Authorization: Bearer <CRON_SECRET>`, while the edge functions check an `x-cron-secret` header
(`_shared/auth.ts:authenticateCronRequest`, e.g. `compute-at-risk-signals/index.ts:116-123`). The actual
Vercel→edge call sends the **service-role** bearer (`api/_utils/auth.ts:51-55`), which the edge functions
accept via their service-role branch — so it works, but the `x-cron-secret` path is never exercised by the
Vercel crons. Minor inconsistency worth noting for maintainers.

---

## 4. Cross-checks against existing repo docs (for the product-wide audit)

- `docs/architecture/SUPABASE-HEALTH-REPORT.md` lists `ai-module-suggestion` caller as `useAISuggestions.ts`
  — **inaccurate**; that hook only reads the `ai_feedback` table (`useAISuggestions.ts:43-52`).
- `.kiro/specs/migration-history-reconciliation/tasks.md:178-182` already documents the broken-NULL-URL
  pg_cron jobs and the leaderboard MV-vs-VIEW error; this report independently confirms the same via the
  guard migration and adds the **replay-resurrection** angle (H-1) and the **unscheduled fee handler** (H-2).
