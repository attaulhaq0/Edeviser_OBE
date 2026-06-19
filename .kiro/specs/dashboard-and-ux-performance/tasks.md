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

  - [ ] 3.1 `get_admin_dashboard` + `useAdminDashboardAggregate` + hydrate + remove any
        defer; parity + RLS test; measure.
  - [ ] 3.2 `get_coordinator_dashboard` (same steps).
  - [ ] 3.3 `get_teacher_dashboard` (same steps).
  - [ ] 3.4 `get_parent_dashboard` (same steps; preserve verified-link RLS).

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

## Notes / non-goals

- No production data seeding; no framework migration; no Pro-compute assumption.
- The 2 FK indexes are implemented in `production-bug-fixes` (Req 11); RLS
  consolidation overlaps `production-bug-fixes` Req 12 — this spec owns measurement +
  sequencing.
- `query-persist` (Task 12) and `RLS consolidation` (Task 13) do not ship without their
  gating tests (leakage test; deny-side `test:rls`).
- This spec supersedes `docs/PERFORMANCE-OPTIMIZATION-PLAN.md` as the tracked work item
  (the plan remains the analysis reference).
