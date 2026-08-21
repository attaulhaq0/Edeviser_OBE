# Tasks — Duplication Audit Verification & Remediation

Every task below survived independent verification (see design.md). Tasks are
ordered by the corrected priority in design.md §9, not the original audit's
order. Each migration/RLS task follows this workspace's mandatory gates:
`npm run lint` → `npx tsc --noEmit` → `npm test` → `npm run db:check-replay`
(+ `db:check-dup-names` where relevant) → feature branch + PR → green
Supabase Preview → merge. Never edit an already-applied migration in place.

## Phase 0 — Record (this document)

- [x] 0. Verify every audit claim against live DB + actual source; write
      requirements.md + design.md with corrected findings, evidence, and a
      re-prioritized action list. (This task.)

## Phase 1 — Do now (confirmed, real, highest leverage)

- [ ] 1. AI-2 fix: correct `select-adaptive-question`'s attainment column read
  - In `supabase/functions/select-adaptive-question/index.ts`, both
    occurrences of `.select("outcome_id, attainment_percentage")` against
    `outcome_attainment` → change to `.select("outcome_id, attainment_percent")`,
    and update the `.reduce()` accessor (`a.attainment_percentage` →
    `a.attainment_percent`) in both the first-question and subsequent-question
    branches.
  - Add/extend a unit or property test asserting `classifyAbility` receives a
    real (non-NaN) average when attainment rows exist, so adaptive difficulty
    is no longer silently pinned to the lowest tier.
  - Gate: `npx tsc --noEmit`, `npm test`. No migration involved — this is an
    edge-function-only fix, redeploy per normal edge function process.
  - _Ref: design.md §3.2_

- [ ] 2. DB-4 corrected rollout: continue RLS policy consolidation on the
      remaining tables (largest-count first), using the already-proven
      pattern (one policy per command + `SECURITY DEFINER` helper(s) +
      deny-side test + green Preview) established on `habit_logs` and
      `team_members` in this session.
  - [ ] 2.1 `mastery_recovery_pathways` (3 SELECT policies: coordinator/student/teacher)
  - [ ] 2.2 `ai_feedback` (3 SELECT: admin/student/teacher)
  - [ ] 2.3 `attendance_records` (3 SELECT: admin/own/parent)
  - [ ] 2.4 `outcome_mappings` (3 ALL: admin/coordinator/teacher write)
  - [ ] 2.5 `baseline_attainment` (3 SELECT: admin/student/teacher)
  - [ ] 2.6 `blooms_progression` (3 SELECT: admin/student/teacher)
  - [ ] 2.7 `challenge_progress` (3 SELECT: parent/student/teacher)
  - [ ] 2.8 `course_material_embeddings` (3 SELECT + separate 2 ALL: admin/coordinator/student read, admin/teacher write)
  - [ ] 2.9 `deadline_extensions` (3 SELECT: admin/student/teacher)
  - [ ] 2.10 `evidence` (3 SELECT: parent/staff/student)
  - [ ] 2.11 `learning_outcomes` (3 ALL: admin/coordinator/teacher write)
  - [ ] 2.12 `social_challenges` (3 SELECT: admin/student ×2)
  - [ ] 2.13 `tutor_usage_limits` (3 SELECT: admin/student ×2)
  - [ ] 2.14 `xp_purchases` (3 SELECT: admin/parent/student)
  - [ ] 2.15 Re-run the live duplicate-policy SQL query from design.md §2.2
        after 2.1-2.14 land; sweep any remaining 2-policy tables
        (`announcements`, `assignments`, `badges`, `courses`,
        `course_sections`, `cqi_action_plans`, `competency_frameworks`,
        `graduate_attributes`, `graduate_attribute_mappings`, `invitations`,
        `marketplace_items`, `onboarding_questions`, `parent_student_links`,
        `peer_teaching_moments`, and any others found) in follow-up PRs.
  - Each sub-task ships as its own PR/migration (do not batch tables into one
    migration) so a Preview failure or a deny-side test regression on one
    table never blocks the others.
  - _Ref: design.md §2.2, Requirement 3.2_

- [x] 3. DB-1/2/3 cleanup: retire the dead-letter cron-scheduling code path — **verified implemented:** `cron.unschedule()` present in `20260520063903_fix_pgcron_connection_exhaustion.sql`, `20260602101312_task15_prune_duplicate_broken_pgcron_jobs.sql`, and `20260822000000_keepwarm_dashboards_cron.sql`.
  - New migration (do not edit `20260615000001` in place): `cron.unschedule()`
    the 7 job names it creates (`streak-risk-email`, `weekly-summary-email`,
    `compute-at-risk-signals`, `perfect-day-prompt`, `streak-midnight-reset`,
    `ai-at-risk-prediction`, `notification-digest`) — idempotent no-op if
    absent — and remove/neutralize the `leaderboard-refresh` MV-refresh
    scheduling (the object is a plain VIEW, not a materialized view; that
    `cron.schedule` call would error on any environment where
    `is_pgcron_available()` ever evaluates true).
  - Verify `npm run db:check-replay` stays CLEAN.
  - On the PR's Supabase Preview, confirm `select * from cron.job` returns
    only the 4 real jobs (`fee-overdue-check`, `badge-spotlight-rotate`,
    `badge-auto-archive`, `keepwarm-dashboards`) after a from-scratch replay —
    i.e., confirm the dead-letter jobs genuinely cannot be resurrected.
  - Leave `vercel.json`'s 10 cron routes and `api/cron/*.ts` untouched — they
    are already the sole live scheduler for those functions and are correct.
  - _Ref: design.md §2.1_

- [ ] 4. CFG-1: untrack committed diagnostic/capture files
  - `git rm --cached` the 3 tracked `.har.txt` files
    (`e-deviser.vercel.app.har.txt`, `e-deviser.vercel.appstudent.har.txt`,
    `e-deviser.vercel.appteacher.har.txt`), `lint-output.txt`, `sentinel.md`.
  - Update `.gitignore`: add a `*.har.txt` (or `*.har`) rule; fix the existing
    `lint_*.txt` pattern to also cover `lint-output.txt` (either broaden the
    glob or add an explicit `lint-output.txt` line) so regenerated diagnostic
    output never gets re-committed by accident.
  - Confirm the 5 other untracked `.har.txt` files on disk (not committed)
    remain untracked / are also covered by the new gitignore rule going
    forward.
  - Low risk: this removes generated artifacts, not source. Still goes
    through a normal PR (small, fast to review).
  - _Ref: design.md §8.1_

- [ ] 5. AI-1: shared, provider-agnostic query-embedding helper
  - Add `supabase/functions/_shared/embeddings.ts` exporting
    `generateQueryEmbedding(text: string): Promise<number[] | null>`, using
    the same `EMBEDDINGS_BASE_URL` / `EMBEDDINGS_MODEL` env-var pattern already
    proven in `embed-course-material/index.ts` (default to OpenAI, override to
    any OpenAI-compatible endpoint), returning `null` (never throwing) on
    missing config or a failed call.
  - Update `chat-with-tutor/index.ts` to call this helper in place of its
    inline OpenAI-only embedding block, **preserving** the existing
    graceful-skip-RAG-if-null behavior (do not make embeddings a hard
    requirement — that would be a regression, not a fix).
  - Update `generate-plan-update/index.ts` the same way.
  - Add a unit test asserting a non-null embedding is produced when
    `EMBEDDINGS_BASE_URL`/`EMBEDDINGS_MODEL` point at a non-OpenAI-named
    OpenAI-compatible config, proving this no longer silently degrades on an
    OpenRouter/Gemini-only deployment that still has *an* OpenAI-compatible
    embeddings key configured.
  - _Ref: design.md §3.1_

## Phase 2 — Do soon (confirmed, real, lower urgency)

- [ ] 6. FE-2: single `useStudentGamification` source hook
  - Add `useStudentGamification(studentId)` selecting all needed columns from
    `student_gamification` under one query key; refactor `useLevel`,
    `useStreak`, `useStudentXPMultiplier` (in `useAdaptiveXP.ts`),
    `useStreakFreezeInventory` (in `useStreakFreeze.ts`), and
    `useStudentLeagueTier` (in `useLeagueLeaderboard.ts`) to derive from it via
    TanStack `select`, instead of each issuing its own `.from("student_gamification")`
    query under a different key.
  - Parity test: assert each derived hook's output is unchanged from before
    the refactor for the same seeded row.
  - _Ref: design.md §5.2_

- [ ] 7. FE-5: pick one league-tier model
  - Keep `src/lib/leagueTier.ts` (absolute-XP, TitleCase) as canonical — it has
    real production importers.
  - Delete `src/lib/leagueTierCalculator.ts` and its sole consumer
    `src/__tests__/properties/leagueTiers.property.test.ts`, OR (if the
    percentile model is actually wanted for the leaderboard's "league" framing
    per FE-6) explicitly wire it into a real component first and then keep
    both with clearly different, non-conflicting names. Default recommendation:
    delete, since it has zero product usage today.
  - Re-confirm zero real importers immediately before deleting (Requirement 3.4).
  - _Ref: design.md §5.4_

- [ ] 8. FE-7: delete the dead `useBadgeSpotlight.ts` re-export shim
  - Confirm (immediately before deleting, per Requirement 3.4) that
    `useBadgeSpotlightQuery` and the file's other re-exports still have zero
    real importers.
  - Delete `src/hooks/useBadgeSpotlight.ts`. Real consumers already import
    directly from `useTieredBadges.ts` and are unaffected.
  - _Ref: design.md §5.5_

- [ ] 9. BE-1: migrate 2-3 more edge functions to `_shared/auth.ts`
  - Pick cron-triggered functions first (highest security-relevant blast
    radius from a subtly-wrong inline auth check): candidates confirmed to
    have inline auth in this pass — `ai-module-suggestion`,
    `calculate-attainment-rollup`, `send-email-notification`.
  - One function per PR. For each: replace the inline
    `req.headers.get("Authorization")` → `createClient(...).auth.getUser()` →
    manual role/institution lookup with `authenticateRequest()` (or
    `authenticateCronRequest()` for cron-only functions), verifying the
    caller contract is unchanged (same 200/401/403 behavior) with a
    per-function authorized/unauthorized test.
  - _Ref: design.md §4.1, Requirement 3.3_

- [~] 10. BE-5: export shared `corsHeaders` — **partial:** `corsHeaders` is exported from `_shared/auth.ts` (verified), but only ~1 function imports it from `_shared` so far; the "migrate a handful" demonstration is not complete.
  - Add `export const corsHeaders = {...}` to `_shared/auth.ts` (it currently
    defines but does not export one), or create `_shared/cors.ts`.
  - Migrate a handful of functions to import it instead of redefining it
    inline, as a demonstration/start of the pattern (full migration across
    all ~50 functions is a larger follow-up, not required to close this task).
  - No behavior change — purely maintainability. No live typo to fix (BE-5's
    `x-content-type` bug is already fixed per design.md §4.3).
  - _Ref: design.md §4.3_

- [ ] 11. RT-1: widen the realtime-filter scanner scope
  - In `scripts/audit/realtime-filter-scan.ts`, change the walk root from
    `resolve("src", "hooks")` to `resolve("src")` (excluding test
    directories), so any future direct `supabase.channel(...)` call in a page
    or component is caught, not just in hooks.
  - Add a regression test (a fixture file under a scanned-but-excluded test
    dir, plus a fixture that SHOULD be caught) proving the widened scan
    actually inspects `src/pages`.
  - _Ref: design.md §6.1_

- [x] 12. RT-1 follow-up: verify `useRealtime.ts`'s no-filter behavior — **verified closed with finding recorded:** `src/hooks/useRealtime.ts` documents that a tightly-scoped realtime filter is impossible for these call sites and cost is bounded/scales, per the task's own close-out criteria.
  - Read `src/hooks/useRealtime.ts` directly to determine what happens when a
    caller (like `ChallengeListPage.tsx` / `ChallengeListView.tsx`) omits
    `filter`. If it opens a table-wide Postgres-changes subscription, add an
    explicit filter (e.g. scoped by course/institution) to both call sites. If
    it already requires or defaults to polling without a filter, close this
    task with that finding recorded — no page change needed.
  - _Ref: design.md §6.1 (marked "needs one more verification step")_

- [ ] 13. Dead-code cleanup batch
  - Re-confirm (immediately before deleting, per Requirement 3.4) zero real
    importers for: `src/hooks/useXP.ts`, `src/components/shared/LanguageSelector.tsx`,
    `src/components/shared/ThemeToggle.tsx`, `src/providers/FocusModeProvider.tsx`,
    the impersonation trio (`ImpersonationProvider.tsx`, `useImpersonation.ts`,
    `ImpersonationBanner.tsx`).
  - Delete all in one PR (they are independent of each other and of tasks
    1-12). Do NOT include `src/stores/themeStore.ts` — it does not exist.
  - Gate: `npx tsc --noEmit` + full `npm test` green after removal.
  - _Ref: design.md §7_

## Phase 3 — Needs one more verification pass before acting (not confirmed this session)

- [ ] 14. Re-verify AI-3 (embedding idempotency), AI-4 (persona
      client/server divergence), AI-5 (test-only tutor mirrors), BE-3/BE-4
      (email dispatcher / XP-write bypass), DB-5 (redefinition churn
      framing), CFG-2/CFG-3, FE-4/FE-6 (dashboard tail fan-out / leaderboard
      split-brain) against actual source before creating remediation tasks
      for them. Do not act on the original audit's claims for these items
      without this pass — see design.md §3.3, §4.4, §2.3, §5.6, §8.2.

## Explicitly out of scope (refuted — no task)

- BE-2 (rate-limiter modules) — files do not exist, nothing to delete.
- FE-3 (`themeStore.ts`) — file does not exist, nothing to delete.
- DB-6 (duplicate migration names) — already solved and monitored by
  `npm run db:check-dup-names`; no new work.
- BE-5's `x-content-type` typo — already fixed in a prior pass.
- AI-2's `suggest-goals` half — `score` is a real, valid column.
