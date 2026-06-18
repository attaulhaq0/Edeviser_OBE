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
  - [ ] 2.2 Regenerate types (`scripts/regen-types.ps1`).
        — BLOCKED until 2.1's migration is applied to the linked project. Verified the
        function does not yet exist in linked project `cdlgtbvxlxjpcddjazzx`, and the
        regen script reads `--project-id` (remote), so a regen now cannot add it and would
        risk unrelated schema drift. Interim: `useStudentDashboardAggregate.ts` (and the
        2.7 RLS test) cast ONLY the `rpc` surface (no `any`, Static_Cast_Guard-safe);
        remove the shim in a follow-up regen after merge.
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

- [ ] 4. **Skeleton-first sweep** (Req 4)

  - [ ] 4.1 Audit each dashboard/list route: shell + per-section `Shimmer` paint
        immediately; no query gates first paint.
  - [ ] 4.2 Reserve card heights to avoid layout shift; verify CLS in Lighthouse.

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

- [ ] 7. **Extend optimistic UI** (Req 7)
  - [ ] 7.1 Apply `useOptimisticToggle` / standard `onMutate` pattern to settings/
        privacy toggles, journal save, habit completion, planner-task done.
  - [ ] 7.2 Per covered mutation: test optimistic apply, `onError` rollback + Sonner,
        `onSettled` invalidate. Exclude non-deterministic/security-sensitive mutations.

## Phase 2 — Tier 1.5 (do soon)

- [ ] 8. **Auth round-trip trim** (Req 8) — security-sensitive

  - [ ] 8.1 Skip `fetchProfile` on `TOKEN_REFRESHED` when `session.user.id` is unchanged.
  - [ ] 8.2 Seed fetched profile into the query cache so consumers don't refetch.
  - [ ] 8.3 Allow the dashboard aggregate to start once `user.id` is known (parallel to
        profile hydration).
  - [ ] 8.4 Keep `AuthProvider` tests green + manual multi-role login pass (each role →
        correct dashboard, no stale profile). Document in PR.

- [ ] 9. **Prefetch on intent** (Req 9)

  - [ ] 9.1 On `NavLink` hover/focus (guarded by `matchMedia('(hover: hover)')`):
        `import()` the route chunk + `queryClient.prefetchQuery` the primary key.
  - [ ] 9.2 No prefetch on touch; prefetch failures are silent no-ops.

- [ ] 10. **Active-hours warm-ping** (Req 10)

  - [ ] 10.1 Vercel cron (reuse `api/cron/*` + `verifyCronSecret`) hitting `/health`
        every ~5 min during configured active hours only.
  - [ ] 10.2 Verify via function logs; measure cold-vs-warm first-request delta; confirm
        no rate-limit/`blocked_ips` trip.

- [ ] R. **Re-measure** after Tier 1 + 1.5; compare to Task 1 baseline. Decide whether
      Tier 2 RLS is still warranted (only if DB p95 still shows RLS as a top contributor).

## Phase 3 — Tier 2 (deliberate, gated)

- [ ] 11. **View Transitions** (Req 11)

  - [ ] 11.1 Wrap route/section state swaps in `document.startViewTransition` with
        feature-detection + reduced-motion gate.
  - [ ] 11.2 Measure INP before/after; confirm no regression.

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
