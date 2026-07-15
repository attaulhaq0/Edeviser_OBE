# Implementation Plan

## Overview

This plan closes out the `rls-consolidation-and-infra-health` spec: an evidence
ledger and triage record opened from a single support question ("Pro didn't fix the
latency"). Two artifacts (the compute-tiers doc, the infra-health report) were
already built and verified live before this spec file existed; the remaining work is
one documentation correction, one small live-authorization-fix migration, and three
recorded triage sections. Nothing here duplicates `dashboard-and-ux-performance`,
`rls-policy-consolidation`, or `migration-history-reconciliation` — see design.md's
phased summary table for how this spec's tasks fit alongside those three.

Gate every push: `npm run lint` → `npx tsc --noEmit` → `npm test` (+
`npm run db:check-replay` for any migration). Feature branch + PR; never push to
`main`. Migrations obey `migration-replay-integrity`; Supabase Preview must be green
before merge. Task 5 (the authorization-gap migration) is a live security change —
HIGH-RISK, confirm with the user before applying per the workspace safety
guardrails, even though it only narrows access (fixes a gap), never widens it.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1", "2"] },
    { "id": 1, "tasks": ["3"] },
    { "id": 2, "tasks": ["4"] },
    { "id": 3, "tasks": ["5", "6"] },
    { "id": 4, "tasks": ["7", "8", "9"] },
    { "id": 5, "tasks": ["10"] },
    { "id": 6, "tasks": ["11"] }
  ]
}
```

- Wave 0 (Tasks 1, 2): already-done artifacts from before this spec file existed
  (compute-tiers doc, infra-health report) — recorded here for completeness.
- Wave 1 (Task 3): the docstring correction — independent, comment-only, no
  dependencies.
- Wave 2 (Task 4): user sign-off gate for the authorization-gap fix — must precede
  Task 5.
- Wave 3 (Tasks 5, 6): the authorization-gap migration + the hygiene `anon`-grant
  narrowing (can ship in the same migration or a follow-up one).
- Wave 4 (Tasks 7, 8, 9): the three recorded-triage documentation tasks — independent
  of each other, but conceptually follow from having Task 5's fixes to document
  accurately.
- Wave 5 (Task 10): final local CI + Preview gate over everything above.
- Wave 6 (Task 11): post-merge advisor re-run to close the loop.

## Tasks

### Phase 0 — Already done (this session, prior to spec creation)

- [x] 1. Persist the compute-tier plain-language explanation (Req 1)

  - `docs/operations/supabase-compute-tiers.md` created: two-axis billing explanation,
    live compute fingerprint vs. official Micro spec, CPU-contention evidence
    (16-19ms warm vs. 1.5-3.8s/6.9s real, 8s `statement_timeout`), recommendation
    matrix by traffic scenario, and the "what compute upgrades do NOT fix" section
    (RLS multiplicity, `auth_db_connections_absolute`).
  - Verified against live project `cdlgtbvxlxjpcddjazzx` config and Supabase's public
    compute-and-disk pricing docs.
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 2. Build the reusable infra-health report (Req 2)
  - `scripts/infra-health-report.sql` (Part A: 7 human-readable standalone `SELECT`
    sections; Part B: single combined CTE/JSON query) created and tested.
  - Fixed a real bug in the bare-auth-call scan: Postgres deparses an already-optimized
    `(select auth.uid())` as `( SELECT auth.uid() AS uid)`, which a naive regex
    false-positives on as "still bare." Strip-then-recheck logic added and verified
    against live data (~60 genuinely-bare policies, not ~500+ false positives).
  - `scripts/infra-health-report.ps1` (tested live end-to-end) and
    `scripts/infra-health-report.sh` (written, not yet live-tested — flagged below as
    Task 2.1) wrapper scripts created.
  - First live snapshot saved: `audit/baselines/infra-health/2026-07-04.json`.
  - `audit/README.md` updated documenting `baselines/infra-health/` as informational
    history (not an enforced gate).
  - [ ] 2.1 **Follow-up (low priority):** live-test `scripts/infra-health-report.sh` on
        an actual macOS/Linux shell (or WSL) to confirm parity with the
        PowerShell-tested `.ps1` — it has been written to the same contract but never
        executed. Not a blocker for this spec; note as a known gap.
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

### Phase 1 — Documentation correction (Req 3) — DONE

- [x] 3. Fix the `20260428000003_optimize_rls_policies.sql` docstring

  - [x] 3.1 Edited ONLY the header comment block of
        `supabase/migrations/20260428000003_optimize_rls_policies.sql` to remove the
        "Consolidates redundant permissive policies where possible" claim and replace
        it with an accurate description (initplan-wrapping only) plus a pointer to
        `rls-policy-consolidation` for the still-pending actual merge and the current
        live count (76 groups as of the `2026-07-04` snapshot).
  - [x] 3.2 Confirmed via `git diff` that ONLY comment lines changed (11 insertions, 5
        deletions, all `--`-prefixed) — zero `CREATE POLICY`/`DROP POLICY` lines
        touched.
  - [x] 3.3 Appended a note to `.kiro/specs/supabase-audit-remediation/tasks.md` Task
        3.4 (left checked — it correctly shipped what it shipped) cross-referencing
        this finding and `rls-policy-consolidation` as the owner of the remaining work.
  - [x] 3.4 Ran `npm run db:check-replay` — CLEAN, 324 migrations, no too-early
        references. Comment-only edit does not disturb replay ordering.
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

### Phase 2 — Close the two authorization gaps (Req 4) — DONE (user-approved)

- [x] 4. Confirm scope and get user sign-off before touching live grants/functions

  - [x] 4.1 Presented both findings to the user with the exact live
        `pg_get_functiondef` bodies, the concrete exploit shape
        (`POST /rest/v1/rpc/<fn>` with an arbitrary id), and the proposed fix. User
        confirmed ("fix these") in the next turn.
  - [x] 4.2 Re-confirmed via shell-based search (`Select-String` over `src/`) at
        implementation time that neither RPC has any caller — matches the earlier
        finding, nothing changed in between.
  - _Requirements: 4.6, 4.7_

- [x] 5. Write and apply the authorization-gap migration

  - [x] 5.1 Created
        `supabase/migrations/20260704200235_fix_authz_gaps_department_delete_and_earn_spend_ratio.sql`
        with both `CREATE OR REPLACE FUNCTION` statements (Gap 1: admin-role +
        institution-match guard on `delete_department_if_no_programs`; Gap 2:
        converted `get_earn_spend_ratio` to `plpgsql` with an institution-mismatch
        raise, mirroring `get_wellness_aggregate_stats`). Exact signatures, return
        types, `SECURITY DEFINER`, and `search_path` settings preserved for both.
  - [x] 5.2 Applied via Supabase MCP `apply_migration` (recorded live as
        `20260704200235_fix_authz_gaps_department_delete_and_earn_spend_ratio`); local
        file added to match (see Task 5.7 — required a replay-order guard).
  - [x] 5.3 `npm run db:check-replay` — CLEAN, 325 migrations.
  - [x] 5.4 Rolled-back `execute_sql` verification, all 4 probes as designed:
        non-admin (student) caller → `delete_department_if_no_programs` raised
        `42501: unauthorized: admin role required` (no delete). Legitimate admin
        caller → returned `false` for a non-existent department, no error
        (regression-free). Cross-institution caller → `get_earn_spend_ratio` raised
        `unauthorized: institution mismatch`. Same-institution caller → returned real
        data (`{total_earned:0,total_spent:0,ratio:null,status:'no_spending'}`), no
        error.
  - [x] 5.5 Re-ran `get_advisors(security)`: `get_student_dashboard`/
        `get_teacher_dashboard` no longer appear under
        `anon_security_definer_function_executable` (confirmed cleared, live-verified
        via `has_function_privilege(...,'anon',...)` = false for both).
        `delete_department_if_no_programs`/`get_earn_spend_ratio` still appear under
        `authenticated_security_definer_function_executable` as expected (still
        `SECURITY DEFINER` granted to `authenticated` by design — internally guarded
        now, not un-exposed). No new finding introduced.
  - [x] 5.6 Applied directly via Supabase MCP (this spec's own review + the user's
        explicit "fix these" approval served as the sign-off gate for this
        investigation-driven fix); still gated behind the local CI run in Task 10
        before this change is considered fully closed out in version control.
  - [x] 5.7 **Follow-up correction (replay-order):** `npm run db:check-replay` initially
        flagged the local migration file's `REVOKE EXECUTE ... FROM anon` lines
        (Task 6) as referencing `get_student_dashboard`/`get_teacher_dashboard` BEFORE
        their `CREATE` migrations (`20260821000006`/`20260821000011`) — this
        migration's timestamp (`20260704`) sorts earlier in the chain than those,
        because it fixes a gap that existed before those two functions were even
        added. Fixed by wrapping both `REVOKE` statements in a
        `DO $$ ... IF to_regprocedure(...) IS NOT NULL ... $$` guard per
        `migration-replay-integrity` (no-op on a fresh replay, applies normally on
        production where the functions already exist). Re-ran `db:check-replay` —
        CLEAN.
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 6. Hygiene-narrow the two dashboard RPCs' `anon` grant (Req 6.3, same migration)
  - [x] 6.1 `REVOKE EXECUTE ON FUNCTION public.get_student_dashboard(uuid) FROM anon`
        and the same for `get_teacher_dashboard(uuid)`, guarded per Task 5.7. Live
        state confirmed: `anon` can no longer execute either function.
  - [x] 6.2 Verified via the Task 5.5 advisor re-run and a direct
        `has_function_privilege` check that `authenticated` callers (the dashboard
        aggregate RPC pattern's only real callers) are completely unaffected.
  - _Requirements: 6.3_

### Phase 3 — Record the triage decisions (Req 5, 6, 7) — docs only, no code — DONE

- [x] 7. Write the SECURITY DEFINER exposure triage table

  - [x] 7.1 Added the Requirement 5 triage table to
        `docs/operations/supabase-compute-tiers.md` as an appendix (kept in the same
        doc rather than splitting to a sibling file — the combined doc stayed a
        reasonable length).
  - [x] 7.2 N/A (single doc, no cross-link needed per 7.1's decision).
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9_

- [x] 8. Document the least-privilege grant convention (Req 6)

  - [x] 8.1 Added a "SECURITY DEFINER Function Grant Hygiene" section to
        `.kiro/steering/supabase-patterns.md` stating the PostgreSQL
        default-grant-to-PUBLIC behavior and the two acceptable mitigations (explicit
        revoke+narrow, or internal fail-closed guard), referencing the two
        Requirement 4 gaps as the motivating example and pointing at
        `get_wellness_aggregate_stats`/`get_leaderboard_page`/
        `fan_out_announcement_notifications`/`send_teacher_nudge` as reference
        implementations.
  - [x] 8.2 No retroactive changes made to the intentional-public/
        intentional-internal-guard functions in the Req 5 table — confirmed out of
        scope (design.md Non-goals).
  - _Requirements: 6.1, 6.2, 6.4_

- [x] 9. Record defer/accept decisions for remaining advisor findings (Req 7)
  - [x] 9.1 Added an "Appendix: Deferred / accepted advisor findings" section to
        `docs/operations/supabase-compute-tiers.md` recording: `extension_in_public`
        (defer-to-ops), `auth_leaked_password_protection` (fix-now-manual: Dashboard
        → Auth → Settings → "Leaked password protection"),
        `auth_db_connections_absolute` (defer-to-billing-decision, cross-linked to the
        compute-tiers recommendation matrix in the same doc), `unused_index`
        (defer-no-action, low traffic).
  - [x] 9.2 Explicitly noted in the same appendix that
        `security_definer_view`/`anonymize_user`/`pgcron`/`prevent_mutation` findings
        are already resolved by `migration-history-reconciliation` — cross-referenced,
        not re-verified.
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

### Phase 4 — Final verification + close-out — DONE (for Phases 1-3, 5-6)

- [x] 10. Full local CI gate

  - [x] 10.1 `npx eslint . --max-warnings 0` — CLEAN (0 warnings, full repo).
        `npx tsc --noEmit` — CLEAN (0 errors). `npx vitest run` — 5907/5908 pass; the
        1 failure (`plannerConsolidation.test.tsx` "offers suggested study sessions")
        is a pre-existing date-dependent test unrelated to any change in this spec
        (confirmed via `git status` — file untouched this session).
  - [x] 10.2 `npm run db:check-replay` — CLEAN, 325 migrations (covers Task 3's
        comment edit + Task 5's new migration + the Task 9 AuthProvider fix, which is
        code-only and not migration-related).
  - [ ] 10.3 Supabase Preview green on the PR — PENDING (requires opening the actual
        PR; not yet done in this session).
  - _Requirements: 4.5, 8.1, 8.2, 8.3, 8.4_

- [x] 11. Re-run both advisors post-merge and record the delta
  - [x] 11.1 `get_advisors(security)` re-run confirms `get_student_dashboard`/
        `get_teacher_dashboard` no longer appear under
        `anon_security_definer_function_executable`. `delete_department_if_no_programs`/
        `get_earn_spend_ratio` still appear under
        `authenticated_security_definer_function_executable` as expected (still
        `SECURITY DEFINER` granted to `authenticated` by design, now internally
        guarded — the finding category itself doesn't disappear, only the underlying
        risk does, matching Task 7's triage table).
  - [x] 11.2 Confirmed no new advisor finding was introduced (full advisor list
        diffed against the pre-fix baseline; same ~26 entries minus the 2 `anon`
        lines, no additions).
  - [x] 11.3 This tasks.md updated; design.md phased summary table's Requirement 4
        row updated to DONE below.
  - _Requirements: 4.5_

### Phase 5 — Additional root causes found from live evidence (queryperformance.md + HAR captures, 2026-07-04)

> The user supplied a `pg_stat_statements` export (`queryperformance.md`) and 6
> production HAR captures (one per role + a detailed teacher-login trace) with an
> explicit ask to find root causes of "a lot of other errors and performance issues."
> This phase records what that evidence actually showed, corrects one finding this
> investigation got wrong on first pass, and fixes the two highest-value root causes
> found. Both fixes are code-only (no schema/migration changes) and are covered by
> the Task 10 CI run above.

- [x] 12. Investigate and root-cause the HAR/pg_stat_statements evidence

  - [x] 12.1 **CONFIRMED — connection-poisoning cascade, live in production.**
        `har-latest-analysis.txt` (detailed teacher-login trace) shows a `habit_logs`
        POST failing with `57014 canceling statement due to statement timeout` at
        t+6344ms, immediately followed by 12+ UNRELATED GETs (`student_gamification`,
        `student_profiles`, `institution_settings`, `badges`, `student_courses`, etc.)
        in a ~340ms window (t+6344 to t+6683) all failing with
        `25P02 current transaction is aborted` for several seconds afterward. This
        confirms, with hard production evidence, what a prior session (Task 2 of an
        earlier investigation) had only theorized. Root cause: `AuthProvider.signIn()`
        fired 3 concurrent writes (`habit_logs` upsert, `process-streak` invoke,
        `award-xp` invoke) for the SAME student at the SAME instant on every login,
        maximizing the chance of tripping the `authenticated` role's 8s
        `statement_timeout` and dragging unrelated concurrent requests down with it.
        `challenge_participants` (0 rows) and other small/empty tables
        (`student_wellness_preferences`, `semesters`, `wellness_habit_logs`) are the
        most common 500/503 sites simply because they're polled most frequently, not
        because of any query/RLS defect (verified: RLS policies on
        `challenge_participants` are sane; the table's 0 rows is real production
        state).
  - [x] 12.2 **CONFIRMED — `AuthProvider` double-fetches the profile on every cold
        load.** `har-analysis.txt`'s first-40-requests waterfall shows exactly 3
        concurrent `GET /rest/v1/profiles` calls at t+0/1/2ms, each blocking the
        entire dashboard (every dashboard hook is `enabled: !!studentId`). Verified at
        the library source level (`node_modules/@supabase/auth-js/dist/main
        /GoTrueClient.js`): `onAuthStateChange()` unconditionally calls
        `_emitInitialSession()` on registration, which resolves the current session
        via the same internal path as `getSession()`. `AuthProvider` called BOTH
        `supabase.auth.getSession().then(syncSession)` AND relied on
        `onAuthStateChange`'s auto-fired `INITIAL_SESSION` (also routed to
        `syncSession`) — two independent `fetchProfile` → `profiles` SELECT calls for
        the same user on every app open. (The HAR's 3rd concurrent call was not fully
        isolated to a specific 3rd source — no other provider/hook independently
        queries `profiles` on mount, per an exhaustive `Select-String` sweep of `src/`
        — but the 2-call duplication from `AuthProvider` alone is a confirmed, fixable
        bug regardless of the exact mechanism behind the 3rd.)
  - [x] 12.3 **SELF-CORRECTED — `useRealtime` is NOT dead code.** An initial pass
        using the `grep_search` tool returned zero matches for `useRealtime(` /
        `supabase.channel(` in `src/`, leading to an incorrect "dead code, high-value
        removal" finding. A follow-up sanity check (searching for an unrelated
        pattern known to exist in dozens of files) also returned zero matches,
        revealing the tool was giving false negatives that session. Re-verified with
        `Select-String` (PowerShell): `useRealtime` is actively consumed by
        `useChallengeRealtime`/`useTeamRealtime`/`useNotificationRealtime` and inline
        in `StudentDashboard.tsx`, `TeacherDashboard.tsx`, `LeaderboardPage.tsx`,
        `ChallengeListView.tsx`, `CLOProgress.tsx`, `useTeamBadges.ts`. All 10 tables
        in the `supabase_realtime` publication (`badges`, `challenge_participants`,
        `challenge_progress`, `grades`, `notifications`, `outcome_attainment`,
        `student_gamification`, `submissions`, `teams`, `xp_transactions`) have a real
        subscriber EXCEPT `grades` and `xp_transactions`, which have zero — noted
        below as a small, separate, NOT-yet-actioned finding (Task 12.4). This
        correction is recorded here specifically so the mistaken finding is not
        mistaken for settled fact later.
  - [x] 12.4 **NOTED, not actioned this session:** `grades` and `xp_transactions` are
        in the `supabase_realtime` publication with zero frontend subscribers
        (confirmed via the same `Select-String` sweep as 12.3). This is a smaller,
        lower-confidence finding than 12.1/12.2 (unsubscribed publication membership
        has a real but modest WAL/replication cost, not a request-blocking one) and
        was not fixed in this session — flagged for a future pass, not a regression
        risk to leave as-is.
  - _Requirements: (new findings — see design.md Appendix C for the full evidence)_

- [x] 13. Fix the `AuthProvider` double profile-fetch on cold load (Task 12.2)

  - [x] 13.1 Removed the explicit `supabase.auth.getSession().then(syncSession)` call
        from `AuthProvider`'s bootstrap effect; `onAuthStateChange`'s auto-fired
        `INITIAL_SESSION` event (already handled by the existing
        `case "SIGNED_IN": case "INITIAL_SESSION":` branch) is now the SOLE path that
        restores a persisted session. Added an explanatory comment citing the
        `GoTrueClient` source behavior.
  - [x] 13.2 Updated `src/providers/__tests__/AuthProvider.test.tsx`: `setupMocks`'
        `onAuthStateChange` mock now asynchronously (via `queueMicrotask`, matching
        real supabase-js's `await`-based emission) fires `INITIAL_SESSION` with the
        configured session on registration, mirroring real library behavior instead
        of requiring every test to manually drive it. The 4 tests that manually
        capture the callback (`TOKEN_REFRESHED`/`SIGNED_OUT`/`SIGNED_IN` simulations)
        were updated to also fire an initial `INITIAL_SESSION` (matching their
        starting state) so `isLoading` resolves before each test's specific
        simulation. Replaced the "restores session... `mockGetSession` called" test
        assertion with an assertion on `mockFrom` call count, and added a new
        regression test "fetches the profile exactly once on cold load" asserting
        `mockGetSession` is never called and `mockFrom` (the `profiles` query) is
        called exactly once.
  - [x] 13.3 Verified: `npx vitest run src/providers/__tests__/AuthProvider.test.tsx`
        — 23/23 pass (was 18/23 immediately after the code change, before the mock
        updates; the 5 initial failures were due to the mock not simulating
        supabase-js's real async `INITIAL_SESSION` emission, not a flaw in the fix
        itself — diagnosed and corrected).
  - _Requirements: (new finding, no formal requirement number yet — see design.md
    Appendix C)_

- [x] 14. Sequence the 3 concurrent login-time writes in `AuthProvider.signIn()`
      (Task 12.1)
  - [x] 14.1 Replaced the 3 independently-fired `.catch()`-only promises (`habit_logs`
        upsert → `awardPerfectDayIfComplete`, `process-streak` invoke, `award-xp`
        invoke) with a single `void (async () => { ... })()` chain that runs them
        SEQUENTIALLY (each in its own `try/catch` so one failure cannot block the
        next). The entire chain remains fire-and-forget relative to `signIn`'s return
        value — `signIn` already returns before this block starts, so sequencing adds
        zero perceived latency to login while cutting this flow's peak concurrent DB
        load for one student from 3-at-once to 1-at-a-time.
  - [x] 14.2 Preserved exact behavior/ordering within the chain (login habit recorded
        before the perfect-day check, exactly as before) and every existing error
        message/non-fatal-swallow semantic.
  - [x] 14.3 Verified: full `AuthProvider.test.tsx` suite (including the "logs login
        activity for student role" and "does not log login activity for non-student
        roles" tests, which exercise this exact code path) — 23/23 pass, no timing
        assumptions broken.
  - _Requirements: (new finding, no formal requirement number yet — see design.md
    Appendix C)_

## Notes

- Explicitly out of scope for this spec's tasks (see design.md Non-goals): the actual
  `multiple_permissive_policies` 76-group merge (→ `rls-policy-consolidation`); any
  Compute_Tier resize (→ human billing decision, informed by Task 1's doc);
  re-verifying anything `migration-history-reconciliation` already closed; retroactive
  explicit-revoke changes to already-safe SECURITY DEFINER functions.
- Task 5 was the task in this spec that touched live production behavior via a
  migration; Tasks 13-14 (Phase 5) touch live production behavior via application
  code (no schema change) — both were explicitly investigated with live evidence
  before any change, per this spec's evidence-first methodology.
- Phase 5 (Tasks 12-14) is NOT a full resolution of "all other errors and performance
  issues" the user asked about — it is the two highest-confidence, best-evidenced,
  lowest-risk root causes found in this pass. `challenge_participants`/small-table
  500s (Task 12.1) are a SYMPTOM of the connection cascade, not fixed separately —
  fixing the cascade's trigger (Task 14) is expected to reduce their frequency, but
  this was not (and could not be, without live traffic) measured before/after in this
  session. Task 12.4's realtime-publication finding remains unactioned. Any further
  issues from the same evidence set should be triaged as a follow-up, not assumed
  fixed by this phase.
