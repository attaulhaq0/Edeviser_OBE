# Dashboard & UX Performance — Requirements

## Introduction

The app _feels_ sluggish: when a user opens a dashboard, sections fill in one-by-one
over ~1–1.5s, and navigation/data loads feel "outdated" rather than instant. A
senior-dev/QA investigation (this spec) plus the existing
`docs/PERFORMANCE-OPTIMIZATION-PLAN.md` established that the codebase is **not poorly
architected** (lazy routes, vendor chunks, tuned TanStack Query cache, prod
console-drop are already done). The slowness comes from a small set of measurable
causes, in order:

1. **Dashboard query fan-out** — each role dashboard fires ~27 independent PostgREST
   queries on mount; the `StudentDashboard` even adds a deliberate 500ms
   `useDeferredMount` to stagger them, which is what produces the visible "drip."
   Confirmed: a representative dashboard query runs in **~4ms** (`EXPLAIN ANALYZE`),
   so the cost is the **number of round-trips + ordering**, not slow SQL.
2. **Supabase free-tier cold-starts** — the shared instance pauses on idle; the first
   hit after a pause pays a ~1–3s wake penalty (per the existing plan). Maskable, not
   removable, on the free tier.
3. **Auth round-trip waterfall** — every dashboard hook is `enabled: !!studentId`, and
   `studentId` only exists after `getSession()` → `fetchProfile()`. So 2 serial hops
   precede any dashboard query, and `AuthProvider` re-fetches the profile on every
   `TOKEN_REFRESHED`/`INITIAL_SESSION`.
4. **RLS policy sprawl** — hot tables carry 4–6 permissive policies per action
   (advisor `multiple_permissive_policies`), evaluated per row.

This spec consolidates: the existing `PERFORMANCE-OPTIMIZATION-PLAN.md`, the new
dashboard-aggregate-RPC finding, and a codebase scan of UX-smoothness gaps. It is the
single tracked home for perceived-performance work.

### Scope rules (non-negotiable)

- **Stay on the Supabase free tier.** No change may assume Pro compute. Prefer
  Postgres RPCs (one pooled connection, zero edge-function quota) over edge-function
  aggregators for DB-bound work.
- **Backward-compatible, reversible, no big-bang rewrites.** Every item is additive or
  a refinement of an existing pattern. No framework migration (no Next.js/SSR, no
  router swap). RLS changes are gated behind a deny-side regression suite and shipped
  table-by-table (deferred tier).
- **No production data seeding.** This spec changes data-access and UI behaviour only.
- **Measurement gate (QA rule).** No performance change ships without a **before/after
  number**. "Feels faster" is not a metric. Baselines are captured first (Req 1).
- **Respect spec boundaries.** RLS multiple-permissive-policy consolidation overlaps
  `production-bug-fixes` Req 12 (which carved it into its own track) and the existing
  plan §5 — this spec owns the _measurement + sequencing_, the consolidation itself
  remains its own gated migration effort. The 2 unindexed-FK indexes are owned by
  `production-bug-fixes` Req 11; referenced here, not duplicated.
- **Local CI gate before every push:** `npm run lint` → `npx tsc --noEmit` →
  `npm test` (+ `npm run db:check-replay` for any migration). Feature branch + PR;
  never push to `main`. Migrations obey `migration-replay-integrity`; types via
  `scripts/regen-types.ps1`.

### Severity / sequencing legend (impact ÷ risk)

- **T1 — do now:** cheap, safe, high perceived-speed gain.
- **T1.5 — do soon:** low risk, removes serial hops.
- **T2 — deliberate:** real DB win, medium risk, gated behind tests.
- **T3 — only if metrics justify:** marginal frontend micro-opts.

---

## Requirement 1 — Establish a measured baseline before any change (gate)

**WHY:** Every later requirement asserts an improvement against a number; without a
baseline we cannot prove a win or catch a regression.

#### Acceptance Criteria

1. WHEN baselining THEN the team SHALL capture, per role dashboard: DevTools Network
   **request count on mount**, **LCP** and **INP**, the cold-navigation waterfall
   (throttled "Fast 4G"), the `npm run analyze` initial gzipped chunk sizes, and
   `npm run lighthouse` Performance/FCP/LCP/TBT.
2. WHEN baselining the DB THEN the team SHALL capture Supabase API p50/p95 per hot
   endpoint and `EXPLAIN (ANALYZE, BUFFERS)` for each dashboard's queries.
3. WHEN baselines are captured THEN they SHALL be stored (e.g. under
   `audit/baselines/`) so each subsequent requirement can show before/after.

---

## Tier 1 — Dashboard fan-out + perceived speed (do now)

### Requirement 2 — Per-role dashboard aggregate RPC (27 → 1) (T1, highest impact)

**WHAT:** Each role dashboard fans out ~27 PostgREST queries on mount. Replace the
always-on section fetches with **one `SECURITY INVOKER` Postgres RPC per role**
(`get_student_dashboard`, `get_admin_dashboard`, `get_coordinator_dashboard`,
`get_teacher_dashboard`, `get_parent_dashboard`) returning one `jsonb` payload, and
hydrate the existing per-section query caches from it.

**WHY:** Collapses ~27 round-trips → 1; removes the visible pop-in; eases free-tier
connection pressure; matches the RPC pattern the codebase already uses
(`get_leaderboard_page`, `process_marketplace_purchase`, etc.).

#### Acceptance Criteria

1. WHEN a role dashboard mounts THEN it SHALL issue **one** aggregate request for its
   always-on sections instead of ~N per-section requests (verify in DevTools Network).
2. WHEN the aggregate RPC runs THEN it SHALL be `SECURITY INVOKER` so RLS applies
   exactly as today; a user SHALL never receive another user's/institution's rows
   (property-tested).
3. WHEN the aggregate resolves THEN it SHALL hydrate the existing section query keys
   via `queryClient.setQueryData(...)` so **section components are unchanged** and
   resolve as cache hits.
4. IF the aggregate fails THEN each section hook SHALL fall back to its own fetch (no
   regression; fully reversible).
5. WHEN compared THEN the aggregate payload SHALL be **value-equivalent** to the union
   of the previous per-section hook results (parity test) — no data changes.
6. **Excluded from the aggregate:** realtime-driven sections (e.g. the live
   `student_gamification` subscription) and conditional/rare sections (comeback
   challenge, starter-week) — these stay as-is. The aggregate covers only always-on,
   first-paint sections.
7. WHEN rolled out THEN it SHALL be done **one role at a time** (student first, prove
   ~27→1, then admin → coordinator → teacher → parent), each its own PR.

---

### Requirement 3 — Remove the artificial 500ms defer once aggregated (T1)

**WHAT:** `useDeferredMount(500)` in `StudentDashboard` was added to throttle the
thundering herd. With one aggregate request it is pure added latency.

#### Acceptance Criteria

1. WHEN a dashboard uses the aggregate (Req 2) THEN its `useDeferredMount(500)` defer
   SHALL be removed.
2. WHEN removed THEN there SHALL be no return of the original thundering-herd (verified
   by the single-request assertion in Req 2.1).

---

### Requirement 4 — Skeleton-first on every section and route (T1)

**WHAT:** Ensure every dashboard section and list route renders an instant skeleton
(`Shimmer`) and never blocks the whole view on a query; extend the existing
component-level shimmer pattern uniformly.

**WHY:** Cold-start/data latency can't be erased on free tier, but a skeleton in
<100ms makes the wait feel far shorter (best-practice: skeletons cut _perceived_ load
substantially vs spinners/blank screens).

#### Acceptance Criteria

1. WHEN any dashboard/list route is entered THEN the page structure SHALL paint
   immediately with per-section skeletons; no full-page blank/spinner gate.
2. WHEN a section resolves THEN it SHALL replace its own skeleton without shifting
   sibling layout (reserve heights to avoid layout shift / CLS).

---

### Requirement 5 — Smooth pagination with `keepPreviousData` (T1, easy win)

**WHAT:** No `placeholderData`/`keepPreviousData` exists anywhere in the codebase, so
paginated tables (DataTable list pages) flash empty/skeleton on every page change.

#### Acceptance Criteria

1. WHEN a user changes page/filter on a paginated list THEN the previous page's rows
   SHALL remain visible (dimmed/`isFetching` indicator) until the next page resolves,
   via TanStack Query `placeholderData: keepPreviousData`.
2. WHEN applied THEN no list's data semantics SHALL change (same rows, same order).

---

### Requirement 6 — Complete native image lazy-loading (T1, easy win)

**WHAT:** A platform requirement mandates `loading="lazy"` on avatars, badge icons,
and material thumbnails, but it is currently applied only to chat-message images.

#### Acceptance Criteria

1. WHEN any avatar, badge icon, or material/course thumbnail renders THEN it SHALL set
   `loading="lazy"` (and `decoding="async"` where appropriate).
2. WHEN applied THEN existing Supabase image CDN transformations (e.g. avatar
   `?width=64&height=64`) SHALL be preserved.

---

### Requirement 7 — Extend optimistic UI to high-frequency mutations (T1)

**WHAT:** `useOptimisticToggle` and optimistic `onMutate` exist in only ~4 hooks.
Extend the standard optimistic pattern to other frequent, low-risk mutations (settings
toggles, journal save, habit completion, planner task done) so they feel instant.

#### Acceptance Criteria

1. WHEN a user performs a covered mutation THEN the UI SHALL update optimistically via
   `onMutate` (snapshot + `setQueryData`), with `onError` rollback and `onSettled`
   invalidation — reusing `useOptimisticToggle` where it fits.
2. WHEN the mutation fails THEN the UI SHALL roll back to the prior state and surface a
   Sonner error (never a silent wrong state).
3. Optimistic UI SHALL NOT be applied to mutations whose server result is
   non-deterministic or security-sensitive (those keep confirm-then-render).

---

## Tier 1.5 — Reduce the pre-data hops (do soon)

### Requirement 8 — Trim the auth round-trip waterfall (T1.5)

**WHAT:** `AuthProvider.syncSession` re-fetches the profile on every
`onAuthStateChange` (including `TOKEN_REFRESHED`/`INITIAL_SESSION`), and dashboards
wait on profile before any query starts.

#### Acceptance Criteria

1. WHEN a `TOKEN_REFRESHED` event fires with an unchanged user id THEN the profile
   SELECT SHALL be skipped (no redundant round-trip).
2. WHEN the profile is fetched THEN it SHALL be seeded into the TanStack Query cache so
   profile-consuming components do not issue a second fetch.
3. WHEN the user id is known THEN the dashboard's primary query (the Req 2 aggregate)
   MAY start in parallel with profile hydration rather than strictly after it.
4. WHEN changed THEN existing `AuthProvider` tests SHALL stay green and a manual
   multi-role login pass SHALL confirm no auth/role regression (auth is security-
   sensitive).

---

### Requirement 9 — Prefetch on intent (hover/focus) (T1.5)

**WHAT:** On hover/focus of a sidebar nav link (and optionally a table row), prefetch
the route's lazy chunk and its primary query (the Req 2 aggregate) so JS + data warm
before the click.

#### Acceptance Criteria

1. WHEN a user hovers/focuses a nav link on a non-touch device THEN the route chunk
   and its primary `queryClient.prefetchQuery` SHALL warm in the background.
2. WHEN on a touch device THEN hover-prefetch SHALL NOT fire (hover ≠ intent); focus/
   tap-intent handling SHALL be used instead.
3. WHEN prefetch fails THEN it SHALL be a silent no-op (the click still works).

---

### Requirement 10 — Active-hours warm-ping to mask cold-starts (T1.5)

**WHAT:** Add a scheduled lightweight ping (to the existing `/health` edge function or
`select 1`) during active hours so the free-tier instance rarely sleeps.

#### Acceptance Criteria

1. WHEN active hours are configured THEN a cron SHALL ping a trivial endpoint at a
   modest interval (e.g. ~5 min) to keep the instance warm.
2. WHEN outside active hours THEN the ping SHALL NOT run (to respect free-tier
   compute/egress budget).
3. WHEN running THEN it SHALL NOT trip rate-limit/`blocked_ips`, and its effect SHALL
   be verified via function logs and a cold-vs-warm first-request measurement.

---

## Tier 2 — Deliberate, gated wins

### Requirement 11 — Smooth section/route transitions (View Transitions API) (T2, low risk)

**WHAT:** Use the View Transitions API for section/route swaps to replace hard
pop-in with a smooth cross-fade, improving INP and the "futuristic" feel.

#### Acceptance Criteria

1. WHEN navigating between routes/sections in a supporting browser THEN the swap SHALL
   use a View Transition (graceful no-op fallback where unsupported).
2. WHEN a user requests reduced motion THEN transitions SHALL be disabled/instant
   (honor `prefers-reduced-motion`).
3. WHEN applied THEN it SHALL not block interaction or regress INP (measured).

---

### Requirement 12 — Per-user query-cache persistence (T2, gated)

**WHAT:** Optionally add `@tanstack/query-persist-client` so a reload/profile-switch
shows last-known data instantly, then revalidates.

#### Acceptance Criteria

1. WHEN a user returns/reloads THEN the dashboard MAY paint from a persisted cache
   instantly, then revalidate in the background.
2. WHEN persistence is enabled THEN the cache SHALL be **keyed per user id** and
   **purged on sign-out**, with a QA test proving **no cross-profile data leakage**
   (this is a multi-role product — leakage is a P0).
3. This requirement SHALL ship **only after** Reqs 2–4 and with the leakage test
   green; otherwise it is deferred.

---

### Requirement 13 — RLS permissive-policy consolidation (T2, gated, cross-spec)

**WHAT:** Hot tables (`profiles` 6, `habit_logs`/`student_gamification`/
`outcome_attainment`/`team_members` 4 each, ~10 more at 3) carry multiple permissive
policies per action, each OR-evaluated per row. Consolidate to one policy per
`(table, action)`. (Overlaps `production-bug-fixes` Req 12 and the existing plan §5.)

#### Acceptance Criteria

1. WHEN consolidation is undertaken THEN it SHALL be its own gated migration effort,
   table-by-table, starting with the 4–6 policy tables, with per-table before/after
   `EXPLAIN ANALYZE`.
2. WHEN consolidating THEN a full **deny-side RLS regression suite** (`npm run
test:rls`) SHALL prove every role × table for both allowed and **denied** access;
   the `(SELECT …)` initplan wrapping and `parent_has_verified_link` SECURITY DEFINER
   helper SHALL be preserved.
3. WHEN measured THEN the win SHALL be confirmed real at current data volumes before
   broad rollout; absent the deny-side tests, it SHALL NOT ship.

---

### Requirement 14 — Index hygiene (T2.5)

**WHAT:** Add covering indexes for the 2 unindexed FKs (owned by
`production-bug-fixes` Req 11; referenced here for sequencing) and review the ~60
unused indexes (write overhead) — drop only after confirming the owning feature is
unused, reversibly.

#### Acceptance Criteria

1. WHEN the 2 FK indexes are added THEN join/delete plans SHALL use them (cross-ref
   `production-bug-fixes` Req 11).
2. WHEN unused indexes are reviewed THEN each SHALL get a keep/candidate-drop note; no
   drop ships without query-pattern confirmation and a reversible migration.

---

## Tier 3 — Frontend micro-optimizations (only if metrics justify)

### Requirement 15 — Heavy-dependency & list-render hygiene (T3)

**WHAT:** Marginal gains: lazy-import the chart component itself (not just the route)
for `recharts`; load `react-joyride`/`canvas-confetti` on first use; virtualize the
big tables (attendance 7.5k, xp_transactions 4.1k) which currently have no
virtualization in `src`; verify realtime subscriptions are filtered and torn down.

#### Acceptance Criteria

1. WHEN the bundle report shows a heavy chunk on the critical path THEN that dependency
   SHALL be lazy-loaded at the component level.
2. WHEN a list can render thousands of rows THEN it SHALL paginate or virtualize
   (`@tanstack/react-virtual` / TanStack Table) rather than render all rows.
3. WHEN realtime is reviewed THEN every subscription SHALL be filter-scoped and torn
   down on unmount (avoid refetch churn that feels like slowness).
4. Each T3 item SHALL be justified by a measured number; no chunk is optimized that the
   bundle report shows is off the critical path.

---

## Out of Scope

- Pro-compute upgrade (remains the single biggest lever; revisit when budget allows).
- Framework migration (Next.js/SSR, TanStack Router) — large rewrite, not justified.
- The 2 FK indexes' implementation (owned by `production-bug-fixes` Req 11).
- Any production data seeding.
- Shipping RLS consolidation or query-persistence without their respective gating tests.
