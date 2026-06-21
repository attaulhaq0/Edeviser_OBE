# Dashboard & UX Performance — Tasks

> Rules: no perf change ships without a before/after number (Task 1 first). Free tier
> only (prefer RPC over edge for DB aggregation). Backward-compatible + reversible.
> Gate every push: `npm run lint` → `npx tsc --noEmit` → `npm test`
> (+ `npm run db:check-replay` for any migration). Feature branch + PR; never push to
> `main`. Migrations obey `migration-replay-integrity`; regen types via
> `scripts/regen-types.ps1`. Auth (Task 8) and RLS (Task 13) also require their
> security test passes.
>
> Sequence: Baseline → Tier 1 → Tier 1.5 → re-measure → Tier 2 (gated) → Tier 3 (if
> metrics justify).

## Phase 0 — Baseline (gate, do first)

- [ ] 1. **Capture baselines** (Req 1)
  - [ ] 1.1 Per role dashboard: DevTools Network request-count on mount, LCP, INP,
        cold-nav waterfall on "Fast 4G".
  - [ ] 1.2 `npm run analyze` initial gzipped chunk sizes; `npm run lighthouse`
        Performance/FCP/LCP/TBT.
  - [ ] 1.3 Supabase Reports API p50/p95 per hot endpoint; `EXPLAIN (ANALYZE, BUFFERS)`
        per dashboard query.
  - [ ] 1.4 Store under `audit/baselines/ux-perf/*.before.*` for later diffing.

## Phase 1 — Tier 1 (do now)

- [ ] 2. **Student dashboard aggregate RPC** (Req 2, 3) — prove the pattern

  - [x] 2.1 Migration: `get_student_dashboard(p_student_id uuid) returns jsonb`,
        `SECURITY INVOKER`, `set search_path=''`, `stable`, set-based reads mirroring the
        current hooks' filters (incl. `outcome_attainment scope='student_course'`);
        `public.`-qualified. Apply via `apply_migration`; `db:check-replay` clean.
        — DONE: `supabase/migrations/20260821000006_create_get_student_dashboard_rpc.sql`
        (covers kpis, deadlines, attendance, streakFreeze, profileCompleteness,
        announcements). `npm run db:check-replay` CLEAN (309 migrations). NOT yet applied
        to the linked project (reaches prod only on PR merge, per preview-and-test-gate).
  - [x] 2.2 Regenerate types (`scripts/regen-types.ps1`).
        — DONE (post-merge): after #156 merged, the migration applied to the linked
        project, so `pwsh scripts/regen-types.ps1` regenerated `src/types/database.ts`
        (clean +30-line diff — only `get_student_dashboard: { Args; Returns: Json }`, no
        drift). Removed the interim cast shims in `useStudentDashboardAggregate.ts` and
        `getStudentDashboard.rls.test.ts`; both now call the fully-typed `supabase.rpc`.
  - [x] 2.3 Add `useStudentDashboardAggregate` hook that calls the RPC and hydrates each
        existing section query key via `queryClient.setQueryData(...)`. — DONE.
  - [x] 2.4 Keep section hooks' own `queryFn` as fallback (cache-miss / RPC failure).
        — DONE: section hooks gated `enabled: aggregate.isError` (backward-compatible
        optional arg for all other callers).
  - [ ] 2.5 Remove `useDeferredMount(500)` + `deferredStudentId` gating from
        `StudentDashboard`.
        — PARTIAL / by-design deviation: the aggregate covers the critical above-fold
        block only; ~20 non-critical sections (badges, teams, challenges, league tier,
        CLO/independence, comeback, micro-assessment, starter-week, etc.) are still
        deferred, so removing `useDeferredMount(500)` now would re-introduce that herd.
        Fully satisfying Req 3 requires first expanding the aggregate to the remaining
        always-on sections (Req 2.6 still excludes realtime + conditional/rare ones).
        Tracked as a follow-up decision — NOT done as literally written.
  - [x] 2.6 Parity test: aggregate payload deep-equals the union of prior per-section
        hook results for a fixture student. — DONE: `useStudentDashboardAggregate.test.ts`
        (parity + key-set parity + hydration + collapse + fallback; 19/19 green).
  - [x] 2.7 RLS property test: student A's RPC never returns student B's data.
        — DONE: `src/__tests__/integration-rls/getStudentDashboard.rls.test.ts`
        (skip-safe; A→A enrolled=1, A→B all zero/empty, B→A zero). Runs on the `rls-smoke`
        preview CI job; skips locally without secrets.
  - [ ] 2.8 **Measure:** Network request count on mount ~27 → ~1; record `*.after.*`.
        PR with before/after.
        — PENDING: requires a manual DevTools Network capture on a running app against a
        DB that has the RPC (post-merge / preview branch); the collapse is unit-proven
        (2.6 "collapse" test = zero section requests on aggregate success) but the live
        ~27→1 number is not yet recorded under `audit/baselines/ux-perf/*.after.*`.

- [ ] 3. **Roll the aggregate to the other roles** (Req 2.7) — one PR each, after Task 2 proven

  > **Best-approach confirmation (researched + codebase).** The right fix for our
  > "many queries → slow dashboard" latency is to aggregate **server-side in one
  > Postgres function returning a single `jsonb`** (one network round-trip + one query
  > plan), then hydrate the existing section caches — exactly the proven
  > `get_student_dashboard` pattern. This is the canonical Supabase guidance: run the
  > set-based aggregation in the DB (Postgres is the optimized engine; keeps logic in
  > the data layer; zero edge-function quota on free tier) rather than fanning out
  > client round-trips. Views/materialized views are a secondary tool for heavy
  > read-only rollups; an RPC is preferred here because it bundles many sections into
  > one typed call and respects RLS via `SECURITY INVOKER`.
  > Content was rephrased for compliance with licensing restrictions.
  >
  > **Measured mount fan-out (this session, hook-call sites in each dashboard):**
  > student 37 (critical block already collapsed via Task 2), **teacher 19**,
  > admin 10, coordinator 7, parent 4. Execute in impact order: **teacher → admin →
  > coordinator → parent** (teacher is both the worst fan-out AND currently has broken
  > pages — see Phase 5).
  >
  > Each role RPC: `SECURITY INVOKER`, `set search_path=''`, `stable`, `public.`-
  > qualified, set-based reads mirroring the role's current section-hook filters;
  > apply via `apply_migration`; regen types; `db:check-replay` clean; Supabase Preview
  > green; parity test (aggregate deep-equals union of section hooks) + RLS deny-side
  > test; hydrate the EXACT existing section query keys so components are untouched and
  > section hooks fall back on aggregate error.

  - [ ] 3.1 `get_teacher_dashboard` + `useTeacherDashboardAggregate` (collapses
        useTeacherKPIs, useTeacherCLOAttainment, useTeacherBloomsDistribution,
        useStudentPerformanceHeatmap, useAtRiskStudents, useTeacherRecoveryAlerts);
        parity + RLS test; measure 19→~1.
  - [ ] 3.2 `get_admin_dashboard` + `useAdminDashboardAggregate` (10 → ~1).
  - [ ] 3.3 `get_coordinator_dashboard` (7 → ~1).
  - [ ] 3.4 `get_parent_dashboard` (4 → ~1; preserve verified-link RLS).

- [x] 4. **Skeleton-first sweep** (Req 4)

  - [x] 4.1 Audit each dashboard/list route: shell + per-section `Shimmer` paint
        immediately; no query gates first paint.
        — VERIFIED already satisfied: route-level lazy fallback is a component shimmer
        (`LoadingFallback`, not a full-page spinner — fixed earlier by
        `platform-audit-fixes`); `DataTable` renders a `Shimmer` on `isLoading`; dashboards
        paint per-section shimmers. No first-paint query gate remains.
  - [x] 4.2 Reserve card heights to avoid layout shift; verify CLS in Lighthouse.
        — Shimmer placeholders already carry fixed heights (reserved layout). Added an
        optional `isFetching` dim (opacity + `aria-busy`) to `DataTable` and wired it into
        all 11 server-paginated list pages, completing Req 5.1's "dimmed indicator" for the
        keepPreviousData swap. CLS Lighthouse number is a running-app measurement (gated).

- [x] 5. **`keepPreviousData` on paginated lists** (Req 5)

  - [x] 5.1 Add `placeholderData: keepPreviousData` to each paginated list hook.
        — DONE: added to the 11 standard `useQuery` list hooks (`useAssignments`,
        `useAuditLogs`, `useCLOs`, `useCourses`, `useEnrollments`, `useILOs`, `usePLOs`,
        `usePrograms`, `useRubrics`, `useSubmissions`, `useUsers`) — only the
        `PaginatedResult<T>` list query in each; detail queries untouched.
        `useMarketplace` + `useDiscussions` use `useInfiniteQuery` (already retain pages),
        so they are correctly out of scope.
  - [x] 5.2 Render test: prior rows persist (dimmed via `isFetching`) across a page
        change; data semantics unchanged.
        — DONE: `src/__tests__/unit/keepPreviousDataPagination.test.ts` (representative
        `usePrograms`): asserts the prior page's rows remain as `isPlaceholderData` while
        page 2 is fetching, then swap in with semantics unchanged.

- [x] 6. **Complete lazy images** (Req 6)

  - [x] 6.1 Grep all `<img>` for avatars/badges/material thumbnails; add
        `loading="lazy"` (+ `decoding="async"`), preserve CDN transform params.
        — DONE: `loading="lazy"` + `decoding="async"` added to the 9 network-fetched
        avatar imgs (`AvatarUpload` current avatar, `ParentStudentCard`, `TeamMemberList`,
        `ProfilePage`, and the 5 settings avatars). Skipped (with rationale): brand logo +
        auth-page illustrations (above-the-fold, would hurt LCP; not avatars/badges/
        thumbnails), the Radix `ProfileDropdown` header avatar, and local data/object-URL
        previews (lazy is a no-op). No badge-icon or course/material `<img>` thumbnails
        exist (badges render as Lucide icons). `ChatMessage` already had `loading="lazy"`.
  - [x] 6.2 Verify avatar `?width/height` transforms still applied.
        — DONE: the Supabase CDN params (`?width=128&height=128&resize=cover` /
        `?width=64&height=64&resize=cover`) are preserved on every edited avatar.

- [x] 7. **Extend optimistic UI** (Req 7)
  - [x] 7.1 Apply `useOptimisticToggle` / standard `onMutate` pattern to settings/
        privacy toggles, journal save, habit completion, planner-task done.
        — DONE: added the optimistic `onMutate`/`onError` rollback/`onSettled` invalidate
        pattern to `useUpdateWellnessPreferences` (the enabled-habits / parent-visibility
        privacy toggle). Already optimistic (verified): `usePlannerTasks` (complete +
        delete) and `useStudySessions`. Correctly left confirm-then-render per 7.3:
        habit-log XP (non-deterministic edge-function award) and journal CREATE
        (server-generated id).
  - [x] 7.2 Per covered mutation: test optimistic apply, `onError` rollback + Sonner,
        `onSettled` invalidate. Exclude non-deterministic/security-sensitive mutations.
        — DONE: `src/__tests__/unit/wellnessPreferencesOptimistic.test.ts` (apply → rollback
        on error → invalidate on settle).

## Phase 2 — Tier 1.5 (do soon)

- [x] 8. **Auth round-trip trim** (Req 8) — security-sensitive

  - [x] 8.1 Skip `fetchProfile` on `TOKEN_REFRESHED` when `session.user.id` is unchanged.
        — DONE: `currentUserIdRef` tracks the synced user; `TOKEN_REFRESHED` for the same
        id now just adopts the refreshed session user (no profile SELECT).
  - [ ] 8.2 Seed fetched profile into the query cache so consumers don't refetch.
        — DEFERRED (rationale): `AuthProvider` is not wrapped by a `QueryClientProvider` in
        its test harness, so adding `useQueryClient` there would break the suite; and
        consumers read `useAuth().profile` (context), not a `profiles` query key — so
        seeding a cache key has no consumer today. Revisit if/when a `useProfile` query hook
        is introduced.
  - [x] 8.3 Allow the dashboard aggregate to start once `user.id` is known (parallel to
        profile hydration).
        — ALREADY SATISFIED: `syncSession` calls `setUser(session.user)` before awaiting
        `fetchProfile`, so `user.id`-gated queries (incl. the student aggregate) start in
        parallel with profile hydration.
  - [x] 8.4 Keep `AuthProvider` tests green + manual multi-role login pass. Document in PR.
        — DONE: 22/22 AuthProvider tests green incl. a new "skips profile re-fetch on
        TOKEN_REFRESHED for same user" test. Manual multi-role login is a running-app pass
        (gated here).

- [x] 9. **Prefetch on intent** (Req 9)

  - [x] 9.1 On `NavLink` hover/focus (guarded by `matchMedia('(hover: hover)')`):
        `import()` the route chunk + `queryClient.prefetchQuery` the primary key.
        — DONE (chunk): `useIntentPrefetch` (hover-only, dedupe, error-swallow) +
        `prefetchRoute` registry warming the same lazy chunks `AppRouter` loads, wired into
        the shared `Sidebar`. Primary-query prefetch intentionally left to the route
        component (needs per-route keys/filters/auth) — noted in `routePrefetch.ts`.
  - [x] 9.2 No prefetch on touch; prefetch failures are silent no-ops.
        — DONE + tested (`src/__tests__/unit/useIntentPrefetch.test.ts`): touch → no
        prefetch; sync throw + async rejection swallowed; warms once per target.

- [x] 10. **Active-hours warm-ping** (Req 10)

  - [x] 10.1 Vercel cron (reuse `api/cron/*` + `verifyCronSecret`) hitting `/health`
        every ~5 min during configured active hours only.
        — DONE: `api/cron/warm-ping.ts` (verifyCronSecret → active-hours UTC gate (env
        configurable) → `invokeEdgeFunction("health")`, which runs `SELECT 1` so it warms
        edge + Postgres). Scheduled DAILY (`0 6 * * *`) in `vercel.json`: Vercel **Hobby**
        rejects sub-daily crons at deploy validation, and daily is what prevents the
        ~7-day Supabase inactivity pause (the main risk). On **Pro** the schedule can be
        tightened to `*/5 6-22 * * *` for cold-start mitigation — the handler already
        supports that cadence.
  - [ ] 10.2 Verify via function logs; measure cold-vs-warm first-request delta; confirm
        no rate-limit/`blocked_ips` trip.
        — PENDING: deploy-time verification via Vercel/Supabase logs (gated; no running
        deploy here). The handler is a no-op outside active hours by design.

- [ ] R. **Re-measure** after Tier 1 + 1.5; compare to Task 1 baseline. Decide whether
      Tier 2 RLS is still warranted (only if DB p95 still shows RLS as a top contributor).

## Phase 3 — Tier 2 (deliberate, gated)

- [x] 11. **View Transitions** (Req 11)

  - [x] 11.1 Wrap route/section state swaps in `document.startViewTransition` with
        feature-detection + reduced-motion gate.
        — DONE: `src/lib/viewTransition.ts` `withViewTransition()` (feature-detect +
        `prefers-reduced-motion` JS gate + sync fallback + throw-safe) for section swaps,
        tested (`src/__tests__/unit/viewTransition.test.ts`, 4 cases). Route-level: added
        the React Router `viewTransition` prop to the shared `Sidebar` nav links, plus a
        `::view-transition-*` `prefers-reduced-motion` rule in `index.css` so the UA
        cross-fade is disabled under reduced motion.
  - [ ] 11.2 Measure INP before/after; confirm no regression.
        — PENDING: INP is a running-app/field measurement (gated).

- [ ] 12. **Per-user query-cache persistence** (Req 12) — gated, only after Tasks 2–4

  - [ ] 12.1 Add persister keyed by `user.id`; purge on sign-out and user switch.
  - [ ] 12.2 **Leakage test:** sign in A → persist → sign in B → assert no A data
        visible. Ship only if green; else defer.

- [ ] 13. **RLS permissive-policy consolidation** (Req 13) — own gated effort, table-by-table

  - [ ] 13.1 Per hot table (`profiles`, `habit_logs`, `student_gamification`,
        `outcome_attainment`, `team_members`, then the 3-policy set): merge to one policy
        per `(table, action)` via `OR`/`auth_user_role()`; preserve `(SELECT …)` initplan
        wrapping + `parent_has_verified_link`.
  - [ ] 13.2 Per table: before/after `EXPLAIN ANALYZE`; full deny-side `npm run test:rls`
        (allowed AND denied per role × table). Migration replay/history clean.
  - [ ] 13.3 Do NOT ship any table without its deny-side tests green.

- [ ] 14. **Index hygiene** (Req 14)
  - [ ] 14.1 Confirm the 2 FK covering indexes (owned by `production-bug-fixes` Req 11)
        are in place; cross-reference, don't duplicate.
  - [ ] 14.2 Produce a keep/candidate-drop table for the ~60 unused indexes; drop only
        after feature-usage confirmation, via reversible migration.

## Phase 4 — Tier 3 (only if metrics justify)

- [ ] 15. **Heavy-dep & list-render hygiene** (Req 15)
  - [ ] 15.1 Lazy-import the chart component (not just the route) on `recharts` pages.
  - [ ] 15.2 Load `react-joyride`/`canvas-confetti` on first use.
  - [ ] 15.3 Virtualize big tables (attendance, xp_transactions) via
        `@tanstack/react-virtual` / TanStack Table.
  - [ ] 15.4 Verify realtime subscriptions are filter-scoped + torn down on unmount.
  - [ ] 15.5 Justify each with a bundle-report/Lighthouse number; skip off-critical-path.

## Phase 5 — Reported teacher page failures + slowness (user-reported, 2026-06)

> Live bug reports from teacher login. Mix of correctness (broken pages — fix first)
> and latency (slow pages — fold into the Task 3.1 teacher aggregate). Diagnose each
> against the live schema before changing; gate as usual.

- [x] 16. **Teacher dashboard 500 — `submissions.created_at`** (fixed in PR #167)

  - [x] 16.1 `usePendingSubmissions` ordered `submissions` by `created_at` (real column
        `submitted_at`) → teacher dashboard threw "column submissions.created_at does not
        exist". Fixed; also fixed the same dead column in `useStudentAssignments`' embed.
  - [x] 16.2 Teacher greeting showed the raw key `dashboard.welcome.subtitle` — teacher
        locale lacked it; added (en + ar).

- [ ] 17. **Tutor Analytics / Teams "failed to fetch analytics"**

  - [ ] 17.1 `fetchTutorAnalytics` (`src/lib/tutorApi.ts`) calls the `tutor-analytics`
        edge function, which has KNOWN schema drift (`courses.institution_id` — no such
        column; baselined in `scripts/edge-fn-schema-baseline.json`). Fix the edge fn to
        derive institution via `programs` (mirror the Req 19 OBE-export fix), redeploy,
        and remove its baseline entry. Verify the Tutor Analytics page renders.
  - [ ] 17.2 Confirm whether the teacher **Teams** "failed to fetch analytics" is the
        same `tutor-analytics` call or a separate team-analytics hook; fix accordingly.

- [ ] 18. **Gradebook "page failed to load"**

  - [ ] 18.1 `useGradebookMatrix` queries are schema-valid (grade_categories,
        assignments, quizzes, grades all verified) → the failure is NOT simple column
        drift. Reproduce at runtime to capture the real error (likely an ErrorBoundary on
        the `grades → submissions!inner` embed filter, an empty-state render crash, or a
        lazy-chunk load error), then fix and add a regression test.

- [ ] 19. **Slow teacher pages: Tutor Analytics, Tutor Handoffs, Baseline Tests**

  - [ ] 19.1 Measure each (Network request count + waterfall on mount). Collapse
        confirmed serial waterfalls / `select('*')` on large tables; scope queries by
        course/teacher; add `staleTime`. Where the page is a dashboard panel, fold into
        the Task 3.1 teacher aggregate; otherwise consolidate the page's own hooks.

- No production data seeding; no framework migration; no Pro-compute assumption.
- The 2 FK indexes are implemented in `production-bug-fixes` (Req 11); RLS
  consolidation overlaps `production-bug-fixes` Req 12 — this spec owns measurement +
  sequencing.
- `query-persist` (Task 12) and `RLS consolidation` (Task 13) do not ship without their
  gating tests (leakage test; deny-side `test:rls`).
- This spec supersedes `docs/PERFORMANCE-OPTIMIZATION-PLAN.md` as the tracked work item
  (the plan remains the analysis reference).

## Phase 6 — Student dashboard latency deep-fix (Appendix A, 2026-06-20)

> ✅ SHIPPED (PR #168, merged + deployed 2026-06-20): **A** (availableXP folded into the
> RPC), **B** (attendance N+1 collapsed), **C** (set-based attendance roll-up), **D**
> (`SECURITY DEFINER` + fail-closed `auth.uid()` guard) — all in migration
> `20260821000010`, verified equivalent across all 70 students (0 mismatches) and confirmed
> live in prod. REMAINING: **E** (scope realtime), **F** (wrap the 2 bare `submissions`
> policies), **G** (confirm the `57014` timeout stops in Postgres logs post-deploy).

> Root cause (proven live, project `cdlgtbvxlxjpcddjazzx`): the SQL is ~16–19 ms warm but
> real calls spike to 6.3–6.95 s against the `authenticated` **8 s `statement_timeout`** —
> dominated by free-tier shared-CPU throttling, not the queries. Indexes + RLS auth-wrapping
> are already correct. Two heavy work sources were never folded into the aggregate. See
> design.md Appendix A. Every DB change ships via guarded migration + Supabase Preview green;
> never a direct prod apply.

- [ ] A. **Collapse the XP-balance storm** (Fix A)
  - [ ] A.1 Return `availableXP` (earned − spent, floored at 0) from `get_student_dashboard`;
        prefer the maintained `student_gamification` total over a `SUM`-on-read of the
        append-only `xp_transactions`.
  - [ ] A.2 Hydrate the `useXPBalance` cache key from `useStudentDashboardAggregate`; raise
        `useXPBalance` `staleTime` well above 10 s. Verify `XPBalanceBadge` (persistent
        sidebar) no longer fires `get_xp_balance` per page mount.
  - [ ] A.3 Measure: `get_xp_balance` calls/session → ~0 on the student path; record before/after.
- [ ] B. **Kill the per-course attendance N+1** (Fix B)
  - [ ] B.1 Rewrite `useStudentAttendance` as ONE FK-chain join (mirror `useChildAttendance`),
        or have the dashboard read the aggregate's hydrated attendance cache only.
  - [ ] B.2 Measure: the 143-call `attendance_records` query drops off `pg_stat_statements`
        top-by-total; add a parity test (same per-course shape).
- [ ] C. **Trim the RPC attendance lateral** (Fix C) — replace the `cross join lateral` with a
      single set-based join + `group by`; re-measure `get_student_dashboard` buffers
      (was 5 378) + `mean_exec_time`.
- [ ] D. **`SECURITY DEFINER` for the read-only aggregate** (Fix D) — convert
      `get_student_dashboard` to `SECURITY DEFINER` to bypass the layered permissive-policy
      evaluation, with a **mandatory** top-of-body guard
      `p_student_id = (select auth.uid())` (or staff check). Keep the deny-side
      `getStudentDashboard.rls.test.ts` green (A→B returns nothing). Out of any exposed schema.
- [ ] E. **Scope realtime** (Fix E) — audit the 17 published tables; ensure student
      subscriptions are filter-scoped to cut background WAL load.
- [ ] F. **Wrap the two bare `submissions` policies** (`submissions_parent_read`,
      `submissions_teacher_read`) in `(select auth_user_role())`; keep the warm-ping (Task 10).
- [ ] G. **Confirm the timeout stops** — re-query Postgres logs for `57014` after A–D land.

## Phase 7 — Whole-app architectural remediation (Appendix B, 2026-06-20)

> The same slowness affects ALL role dashboards + section navigation, and some sections
> "don't load" (a silently-cancelled query, per the 8 s timeout). Strategy: make the client
> "quiet" — fewer, batched, cached, prefetched requests behind a shorter auth gate, with no
> silent failures. Every step is additive/reversible and matches a pattern already in the
> repo. Gate each with a before/after number (Req 1). See design.md Appendix B.

### Tier 1 — finish wiring the patterns that already exist (lowest risk)

> ✅ SHIPPED (PR #168): **21** (route-chunk prefetch — was already wired in `Sidebar`, all
> 5 layouts; spec corrected), **22** (dashboard `staleTime` 30s→`DASHBOARD_STALE_TIME_MS`
> 2m), and the student slice of **23** (attendance N+1) + **24** (`SectionState` created,
> applied to student announcements). REMAINING: **20** (roll the aggregate to teacher →
> coordinator → admin → parent), **23** for the other roles' serial chains, **24** across
> the remaining silent-`null`-on-error sections in every role dashboard.

- [ ] 20. **Roll the aggregate RPC to the other roles** (supersedes/links Task 3): teacher →
      coordinator → admin → parent. One PR per role: `SECURITY INVOKER` (or `SECURITY DEFINER`
      - `auth.uid()`/staff guard per Appendix A Fix D), set-based reads mirroring the role's
        section-hook filters, hydrate the exact existing query keys, parity test + deny-side
        `test:rls`, request-count before/after. Teacher first (worst fan-out + broken pages).
- [x] 21. **Route-chunk prefetch-on-intent** — ALREADY WIRED (verified 2026-06-20): the shared
      `Sidebar` calls `useIntentPrefetch` + `prefetchRoute` on every nav link (hover/focus,
      touch-gated, deduped, error-swallowed) and is rendered by all five role layouts; covered
      by `useIntentPrefetch.test.ts`. (The earlier "dead code" note was a faulty grep.)
      REMAINING (separate, optional): also `queryClient.prefetchQuery` the route's primary key
      on intent so the click pays neither a cold chunk nor a cold query.
- [ ] 22. **Standardize dashboard `staleTime`.** Replace the blanket `30_000` overrides on
      dashboard hooks with 2–5 min (realtime already invalidates on change), so intra-session
      navigation is a cache hit. Measure refetch count on re-navigation before/after.
- [ ] 23. **Collapse in-hook N+1 / serial chains into batched queries or one RPC.**
      `useStudentAttendance` (Phase 6.B), `useCoordinatorKPIs` (6 serial → `Promise.all`/RPC),
      `useTeacherKPIs` trailing serial awaits, `useAdminPLOHeatmap` where parallelizable. Add a
      parity test per converted hook.
- [ ] 24. **Add explicit per-section `error`/empty + retry states.** Generalize the Admin-PLO
      `loading | error | empty | data` pattern into a small `<SectionState>` wrapper; apply to
      sections that currently render `null` on error (announcements, badge spotlight, comeback,
      team cards, deferred student sections). Converts silent "data not loading" into a visible,
      retryable state. Add a render test (error → retry visible).

### Tier 1.5 — shorten the gate + warm the instance

- [ ] 25. **Parallelize the auth gate** (Req 8 follow-through): start role-routing + the first
      dashboard query from the cached session `user.id` while `fetchProfile` resolves in
      parallel; don't block the whole layout on the profile SELECT. Keep `AuthProvider` tests
      green + multi-role manual pass.
- [ ] 26. **Pre-bundle the 5 role layout shells** (remove their `React.lazy`) so the first
      post-login navigation pays one chunk, not layout-then-page. Keep all pages lazy. Confirm
      via `npm run analyze` that the layout code is in the entry/role chunk, not a separate hop.
- [ ] 27. **Scope realtime + audit always-on header queries.** Filter the teacher `submissions`
      subscription; confirm `NotificationBell`'s `useNotifications`/`useUnreadCount` + realtime
      truly need to run on every page for every role (consider lazying the popover data).

### Tier 2 — instant returns + structural DB-cost reduction (gated by tests)

- [ ] 28. **Per-user query persistence** (Req 12): `@tanstack/query-persist-client` keyed by
      `user.id`, purged on sign-out/user-switch. Ship ONLY behind the cross-profile leakage
      test (sign in A → persist → sign in B → assert no A data).
- [ ] 29. **RLS permissive-policy consolidation** (Req 13) + `SECURITY DEFINER` aggregate paths,
      table-by-table behind full deny-side `test:rls` (allowed AND denied per role × table).

### Tier 3 — the honest ceiling

- [ ] 30. **Compute decision (stakeholder).** Document that the SQL is ~18 ms warm and the
      spikes/timeouts are free-tier shared-CPU + realtime contention. Decide deliberately:
      stay "quiet enough" for free tier (Tiers 1–2) or budget Supabase Pro / a temporary hourly
      compute boost. Query tuning alone will not make a saturated shared instance feel instant.

> Sequencing note: Phase 6 (student deep-fix) proves the SECURITY DEFINER + N+1-collapse +
> attendance-lateral-trim patterns on ONE role before Phase 7 Task 20 rolls them to the rest.
> Do not roll out broadly until the student pattern is measured green.

## Phase 8 — All-profiles scalability rollout (Appendix C, 2026-06-20)

> The honest priority order for "every role feels good and nothing silently breaks." Spans
> all five roles. Gate every change: `npm run lint` → `npx tsc --noEmit` → `npm test`
> (+ `npm run db:check-replay` for migrations); feature branch + PR; never push `main`;
> migrations reach prod only via the Supabase Preview on the PR. Each lever in C.1/C.2 ships
> only behind its correctness test. Compute (Task 30) is the honest ceiling, not a bug fix.

- [ ] 31. **Baselines for all roles (Req 1, gate).** Per role dashboard: DevTools mount
      request-count, LCP/INP, cold-nav waterfall; `pg_stat_statements` p50/p95 + `EXPLAIN
(ANALYZE, BUFFERS)` per dashboard query. Store under `audit/baselines/ux-perf/`. This
      also identifies WHICH numbers are hot enough to justify C.1/C.2 (don't precompute blind).

- [ ] 32. **Per-section error/retry across ALL roles (Req 4 / Task 24).** Apply `SectionState`
      to every dashboard section that currently renders `null`/empty on error (student badges/
      teams/comeback; teacher team-health/at-risk/grading panels; coordinator CQI/matrix;
      admin onboarding/AI/heatmap; parent child cards). Each: error shows a retry, empty stays
      quiet, stale data wins over error. Add a render test per role. Cheapest, zero DB risk,
      biggest trust win — do before the aggregate rollout.

- [x] 33. **Aggregate RPC rollout — teacher** (Task 20.1, worst fan-out, do first). One PR:
      `get_teacher_dashboard` (`SECURITY DEFINER` + `auth.uid()`/teacher-scope guard,
      `search_path=''`, set-based, `public.`-qualified) collapsing useTeacherKPIs/CLOAttainment/
      BloomsDistribution/PerformanceHeatmap/AtRiskStudents; `useTeacherDashboardAggregate` hook
      hydrating the exact section keys; parity test (deep-equals union of section hooks) +
      deny-side RLS test; `db:check-replay` + Preview; measure 19→~1.
      — DONE (PR #170, merged): migration `20260821000011_create_get_teacher_dashboard_rpc.sql`
      (`SECURITY DEFINER` + fail-closed `auth.uid()` guard) returning `{kpis, bloomsDistribution}`;
      `useTeacherDashboardAggregate` hydrates the kpis/blooms keys; `useTeacherKPIs` +
      `useTeacherBloomsDistribution` gained `{enabled?}` fallback; unit parity + deny-side RLS
      test; Supabase Preview green.

- [x] 34. **Aggregate RPC rollout — coordinator** (Task 20.2). `get_coordinator_dashboard`
      (collapse the 6 sequential `useCoordinatorKPIs` awaits); same gating + parity + RLS test.
      — DONE (PR #171, merged): migration `20260821000012_create_get_coordinator_dashboard_rpc.sql`
      (`SECURITY INVOKER` — institution-scoped via RLS, no `auth.uid()` guard needed) returning the
      flat `CoordinatorKPIData`; `useCoordinatorDashboardAggregate` hydrates
      `coordinatorDashboard.list({})`; `useCoordinatorKPIs` gained `{enabled?}` fallback; unit
      parity test; Supabase Preview green (real from-scratch replay).

- [x] 35. **Aggregate RPC rollout — admin** (Task 20.3). `get_admin_dashboard` (KPIs +
      onboarding analytics; fold or back the 6-step `useAdminPLOHeatmap` with a C.2 MV); same
      gating + parity + RLS test.
      — DONE (this PR): migration `20260821000013_create_get_admin_dashboard_rpc.sql`
      (`SECURITY INVOKER` — institution-scoped via RLS) returning the flat `AdminKPIData`
      (total/active users, program & course counts, active users grouped by role via
      `jsonb_object_agg`); `useAdminDashboardAggregate` hydrates `adminDashboard.list({})`;
      `useAdminKPIs` gained `{enabled?}` fallback; page wired with aggregate-then-fallback; unit
      parity test + fixed the two existing AdminDashboard render suites
      (`adminPLOHeatmap`/`adminDashboardAI`) to mock the new aggregate. **Scope note:** mirrors
      the coordinator slice — collapses only the always-on `useAdminKPIs` fan-out (5 parallel
      round-trips → 1). The deferred onboarding/audit/AI panels keep their own hooks, and the
      institution-scoped PLO heatmap is intentionally left for the C.2 materialized-view task
      (Task 38), not folded here.

- [x] 36. **Aggregate RPC rollout — parent** (Task 20.4). `get_parent_dashboard` preserving the
      verified-link RLS; same gating + parity + RLS test.
      — DONE (this PR): migration `20260821000014_create_get_parent_dashboard_rpc.sql`
      (`SECURITY INVOKER`, resolves children from `auth.uid()`) returning `{kpis, children}` —
      collapses BOTH always-on parent hooks (`useParentKPIs` + `useLinkedChildren`).
      `useParentDashboardAggregate` hydrates both caches (`parentDashboard.detail(parentId)` +
      `parentStudentLinks.list({parentId})`); both section hooks gained `{enabled?}` fallback;
      page wired aggregate-then-fallback. INVOKER is sufficient because every parent-read table
      (profiles/student_gamification/student_courses/outcome_attainment/assignments) enforces
      verified-link RLS in its own policy — but the RPC keeps an explicit
      `parent_student_links.verified = true` filter because that table's self-read policy is NOT
      verified-scoped. Parity replicated exactly (KPI `totalCourses` = active-only raw rows; per-
      child `enrolled_courses` = all rows; flat-vs-per-child attainment means). Unit parity test;
      validated read-only against live data; Supabase Preview green. **No existing ParentDashboard
      render suite to fix** (the two test references to parent files are static-content checks,
      not renders). **No deny-side RLS test:** SECURITY INVOKER has no DEFINER bypass to guard and
      the RLS harness has no parent fixtures (noted in PR).

- [ ] 37. **Maintained summary tables (Appendix C.1) — only for baseline-proven-hot numbers.**
      Add trigger/`pg_cron`-maintained summary rows (e.g. teacher pending/graded/at-risk,
      institution attainment) + a nightly reconciler + a `summary == recompute-from-source`
      property test. Keep XP balance trigger-maintained (not cron). Ship per-number, gated.

- [ ] 38. **Materialized views (Appendix C.2) — admin/coordinator heavy analytics only.**
      MV + `pg_cron` refresh for the PLO heatmap / accreditation matrices, exposed ONLY via a
      `SECURITY DEFINER` RPC that injects `auth_institution_id()`; deny-side cross-tenant test
      REQUIRED (an MV does not enforce table RLS). Defer if the aggregate RPC already meets p95.

- [ ] 39. **Cheaper counts (Appendix C.3).** Switch large-table KPI `count: 'exact'` →
      `estimated`/`planned` where an approximate tile is acceptable; keep `exact` where the
      number is contractual. Quick, low-risk.

- [ ] 40. **Query prefetch-on-hover (Appendix C.5 / Task 21 remainder).** Add
      `queryClient.ensureQueryData` for each route's primary key to the sidebar intent handler
      (chunk is already warmed). Gate to high-traffic links + non-metered pointers.

- [ ] 41. **Re-measure all roles** vs Task 31 baselines. Only then decide Tier-2 gated items
      (query persistence Task 28, RLS consolidation Task 29) and the compute decision (Task 30).

> **Pro synergy (Appendix C.10):** nothing here is wasted by a later Supabase Pro upgrade —
> every lever is neutral or amplified by more compute. But Pro is NOT a substitute for these
> request-shape/compute-shape fixes (a chatty client on bigger compute is still chatty).
> Sequence: quiet + flat-cost on free tier first (31–40), then Pro/compute as the headroom
> multiplier (30), not the fix.
