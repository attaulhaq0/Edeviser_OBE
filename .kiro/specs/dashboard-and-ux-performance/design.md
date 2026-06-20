# Dashboard & UX Performance — Design

## Overview

This design turns the requirements into concrete, low-risk, free-tier-friendly
mechanisms, ordered by impact ÷ risk. It builds on (does not replace) the existing
`docs/PERFORMANCE-OPTIMIZATION-PLAN.md`; the one net-new mechanism that plan lacks is
the **per-role dashboard aggregate RPC** (Req 2), which is the biggest perceived-speed
lever.

Guiding principles (from the workspace guardrails):

- Refine existing patterns over introducing frameworks; everything additive/reversible.
- Free tier only: prefer Postgres RPC (one pooled connection, zero edge quota) for
  DB-bound aggregation; edge functions are for TS logic / external IO, not joins.
- No change ships without a before/after number (Req 1 baseline first).
- RLS and auth are security boundaries — gated behind their test suites.

Evidence anchors (this session, live project `cdlgtbvxlxjpcddjazzx`):

- A representative dashboard query (`student_gamification` by `student_id`) =
  **~4ms** index scan → SQL is fast; round-trip count is the cost.
- `StudentDashboard` mounts ~25 hooks; code comment cites **27 parallel queries** and
  a `useDeferredMount(500)` throttle.
- Existing RPC pattern in use: `get_leaderboard_page`, `process_marketplace_purchase`,
  `get_badge_spotlight`, `get_wellness_aggregate_stats`, `send_teacher_nudge`,
  `consume_invitation`, `get_invitation_by_token`.

---

## Req 1 — Baseline harness

**Mechanism:** A short, repeatable measurement script + checklist stored under
`audit/baselines/ux-perf/`:

- Client: Lighthouse (`npm run lighthouse`, budgets already in
  `performance-budget.config.ts` / `lighthouserc.cjs`), `npm run analyze`
  (`rollup-plugin-visualizer`) for chunk sizes, and a manual DevTools cold-nav trace
  (LCP/INP + Network request count) per role dashboard on "Fast 4G".
- Server: Supabase Reports API p50/p95 + `EXPLAIN (ANALYZE, BUFFERS)` per dashboard
  query, captured as `*.before.json`/notes.

**Why:** Each later task records the matching `*.after.*` and the diff. This is the QA
gate, not a deliverable feature.

---

## Tier 1

### Req 2 — Per-role dashboard aggregate RPC (the big lever)

**DB layer.** One `SECURITY INVOKER` PL/pgSQL function per role returning a single
`jsonb`:

```sql
create or replace function public.get_student_dashboard(p_student_id uuid)
returns jsonb
language plpgsql
security invoker          -- RLS applies as the caller; no privilege change
set search_path = ''      -- per migration-replay-integrity / search_path rules
stable
as $$
  -- One function body that runs the same set-based reads the per-section
  -- hooks do today, assembled into a single jsonb object:
  -- { kpis: {...}, deadlines: [...], gamification: {...}, badges: [...],
  --   attendanceSummary: [...], announcements: [...], team: {...} | null }
  -- Guard: p_student_id must equal auth.uid() OR caller is staff (mirror existing
  -- per-table RLS predicates so the function adds NO new visibility).
$$;
```

Design rules for the function:

- **`SECURITY INVOKER`** so each underlying table read is RLS-checked as the caller —
  it can return nothing the user couldn't already select. No new data exposure.
- **Set-based, indexed** reads only; no per-row subqueries. Mirror the exact filters
  the current hooks use (e.g. `outcome_attainment` at `scope='student_course'`).
- Return **only always-on sections** (Req 2.6 excludes realtime + conditional ones).
- `public.`-qualify everything; ship via `apply_migration`; regenerate types via
  `scripts/regen-types.ps1`; `db:check-replay` clean; Supabase Preview green.

**Client layer (non-breaking via cache hydration).** Add one hook:

```ts
// useStudentDashboardAggregate.ts
const useStudentDashboardAggregate = (studentId?: string) => {
  const qc = useQueryClient();
  return useQuery({
    queryKey: queryKeys.studentDashboard.aggregate(studentId ?? ""),
    enabled: !!studentId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_student_dashboard", {
        p_student_id: studentId,
      });
      if (error) throw error;
      // Hydrate each existing section's cache so current hooks become cache hits:
      qc.setQueryData(
        queryKeys.studentGamification.detail(studentId),
        data.kpis
      );
      qc.setQueryData(
        queryKeys.assignments.list({ studentId, upcoming: true, limit: 5 }),
        data.deadlines
      );
      // ...one setQueryData per section key, matching today's keys exactly...
      return data;
    },
  });
};
```

- **Components are untouched** — `useStudentKPIs`, `useUpcomingDeadlines`, etc. keep
  their existing `queryKey`; they now resolve from the hydrated cache instead of
  firing their own request.
- **Fallback (Req 2.4):** the section hooks keep their own `queryFn`, so on a cache
  miss / aggregate failure they fetch as before — fully reversible.
- **Parity (Req 2.5):** a test asserts `aggregate.kpis` deep-equals the old
  `useStudentKPIs` result for a fixture student, etc.

**Rollout (Req 2.7):** student → admin → coordinator → teacher → parent, one PR each,
each with its own ~N→1 request-count proof.

**Why safe:** RLS unchanged (INVOKER), component code unchanged (hydration), reversible
(fallback), free-tier-optimal (one pooled connection, no edge quota).

### Req 3 — Remove `useDeferredMount(500)`

Once a dashboard reads the aggregate, delete its `useDeferredMount(500)` and the
`deferredStudentId` gating; all sections hydrate from the single result. Verified by
the Req 2.1 single-request assertion (no herd returns).

### Req 4 — Skeleton-first

Audit each dashboard/list route: ensure the shell + per-section `Shimmer` paint
immediately and no query gates first paint. Reserve each card's height (fixed
min-height / aspect) to avoid CLS when content swaps in. Extend the existing `Shimmer`
component; no new dependency.

### Req 5 — `keepPreviousData`

In each paginated list hook, add `placeholderData: keepPreviousData` (TanStack Query
v5). The DataTable shows the prior page (dimmed via `isFetching`) until the next
resolves. Pure UX; no data-shape change. Add a small render test asserting rows persist
across a page change while `isFetching`.

### Req 6 — Lazy images

Add `loading="lazy"` (+ `decoding="async"`) to avatar, badge-icon, and
material/course-thumbnail `<img>`s (e.g. `ProfileDropdown` avatar, badge components,
course/material cards). Preserve existing CDN transform query params. Grep-driven sweep
so none are missed.

### Req 7 — Extend optimistic UI

Reuse `useOptimisticToggle` for settings/privacy toggles; apply the standard
`onMutate`→`onError` rollback→`onSettled` invalidate to journal save, habit completion,
planner-task done. Exclude non-deterministic/security-sensitive mutations (keep
confirm-then-render). Each gets a test: optimistic apply, error rollback, settle.

---

## Tier 1.5

### Req 8 — Auth round-trip trim

In `AuthProvider`:

- In `onAuthStateChange`, on `TOKEN_REFRESHED` with the **same** `session.user.id` as
  current, skip `fetchProfile` (the profile rarely changes on a token refresh).
- After `fetchProfile`, seed the profile into the query cache (e.g.
  `queryKeys.profile.detail(userId)`) so consumers don't refetch.
- Let the dashboard aggregate (Req 2) start as soon as `user.id` is known, parallel to
  profile hydration.

**Guardrail:** auth is sensitive — keep `AuthProvider` tests green + a manual
multi-role login pass (sign in as each role, confirm correct dashboard + no stale
profile). Document in the PR.

### Req 9 — Prefetch on intent

A small helper on sidebar `NavLink`s: `onMouseEnter`/`onFocus` →
`import(routeChunk)` + `queryClient.prefetchQuery(primaryKey)`. Guard with a
pointer/`matchMedia('(hover: hover)')` check so touch devices don't prefetch on scroll.
Prefetch failures are swallowed (no-op). Reuses existing `queryKeys`; no router change.

### Req 10 — Active-hours warm-ping

A cron (Vercel cron, consistent with the existing `api/cron/*` + `verifyCronSecret`
pattern) that hits the existing `/health` edge function every ~5 min **only during
configured active hours** (e.g. 06:00–23:00 local). Verify via function logs and a
cold-vs-warm first-request delta. Keep interval modest to respect free-tier compute/
egress; ensure it doesn't trip `blocked_ips`/rate-limit.

---

## Tier 2

### Req 11 — View Transitions

Wrap route/section swaps with `document.startViewTransition(() => { /* state update */ })`
where supported (feature-detect; graceful no-op otherwise). Gate behind
`prefers-reduced-motion` (and your existing `MotionConfig reducedMotion="user"`).
Measure INP before/after to confirm no regression. No dependency required.

### Req 12 — Per-user query-cache persistence (gated)

If adopted: `@tanstack/query-persist-client-core` + a localStorage persister keyed by
`user.id`; **purge on sign-out** and on user switch. A QA test signs in as user A,
persists, signs in as user B, and asserts **no A data** is visible. Ships only after
Reqs 2–4 and with the leakage test green; otherwise deferred. This is the one item
with a real cross-profile-staleness footgun, hence the hard gate.

### Req 13 — RLS consolidation (gated, cross-spec)

Per the existing plan §5: merge per-role permissive policies into one policy per
`(table, action)` using `OR`/`auth_user_role()`, preserving the `(SELECT …)` initplan
wrapping and `parent_has_verified_link`. Table-by-table starting with `profiles`(6),
`habit_logs`/`student_gamification`/`outcome_attainment`/`team_members`(4). Each table:
before/after `EXPLAIN ANALYZE` + full deny-side `npm run test:rls`. Migration obeys
replay/history rules. This is high blast-radius; it remains its own gated effort
(overlaps `production-bug-fixes` Req 12) — this spec owns only its measurement +
sequencing.

### Req 14 — Index hygiene

The 2 FK covering indexes are implemented under `production-bug-fixes` Req 11 (referenced
for sequencing). Unused-index review: produce a keep/candidate-drop table; drop only
after confirming the owning feature is unused, via reversible migration.

---

## Tier 3 — Req 15

- Lazy-import the chart component (not just the route) for `recharts`-using pages.
- Load `react-joyride`/`canvas-confetti` on first use (tour start / celebration).
- Virtualize the big tables (attendance 7.5k, xp 4.1k) with `@tanstack/react-virtual`
  or TanStack Table virtualization (none exists in `src` today).
- Verify realtime subscriptions are filter-scoped and torn down on unmount (the shared
  `useRealtime` manager already does dedup/backoff; confirm callers pass filters and
  `enabled`).
- Each item justified by a bundle-report/Lighthouse number; skip anything off the
  critical path.

---

## Testing & rollout

- **Baseline first (Req 1).** Capture per-role numbers before touching code.
- **Tier 1 PRs** (one per concern; aggregate RPC one role per PR): each PR carries the
  ~N→1 request-count proof and the parity test.
- **Local gate every push:** `npm run lint` → `npx tsc --noEmit` → `npm test`
  (+ `npm run db:check-replay` for the RPC/RLS/index migrations). Supabase Preview green.
- **Auth (Req 8) and RLS (Req 13)** additionally require their security test passes
  (AuthProvider tests + multi-role manual pass; full deny-side `test:rls`).
- **Re-measure after each tier**; only proceed to Tier 2 RLS if post-Tier-1 DB p95
  still shows RLS as a top contributor.
- No direct pushes to `main`; never merge with a required check red.

## Risk register (summary)

| Req                  | Tier | Blast radius        | Risk       | Disposition                |
| -------------------- | ---- | ------------------- | ---------- | -------------------------- |
| 1 baseline           | gate | none                | none       | Do first                   |
| 2 aggregate RPC      | T1   | 1 RPC + 1 hook/role | low        | Ship, role-by-role         |
| 3 remove defer       | T1   | 1 line/dashboard    | low        | Ship with Req 2            |
| 4 skeleton-first     | T1   | UI additive         | low        | Ship                       |
| 5 keepPreviousData   | T1   | list hooks          | very low   | Ship                       |
| 6 lazy images        | T1   | img tags            | very low   | Ship                       |
| 7 optimistic UI      | T1   | few mutations       | low        | Ship                       |
| 8 auth trim          | T1.5 | AuthProvider        | low–med    | Ship w/ auth tests         |
| 9 prefetch-on-intent | T1.5 | nav                 | low        | Ship                       |
| 10 warm-ping         | T1.5 | 1 cron              | low        | Ship                       |
| 11 View Transitions  | T2   | nav/sections        | low        | Ship, reduced-motion gated |
| 12 query-persist     | T2   | cache               | med (leak) | Gated, after T1            |
| 13 RLS consolidation | T2   | most tables         | high       | Own gated effort           |
| 14 index hygiene     | T2.5 | indexes             | low        | FK idx via prod-bug-fixes  |
| 15 micro-opts        | T3   | bundles/lists       | low        | Only if measured           |

---

# Appendix A — Deep root-cause investigation of the student dashboard "statement timeout" + persistent slowness (live DB, 2026-06-20)

> This appendix is the honest, evidence-backed answer to the recurring user report:
> _"canceling statement due to statement timeout … after the 27→1 change it still feels
> slow … why is your solution not working?"_ It supersedes the earlier assumption (in
> Requirement 1 / the original analysis) that **round-trip count** was the dominant cost.
> All numbers below were captured live against project `cdlgtbvxlxjpcddjazzx`
> (ACTIVE_HEALTHY) using `pg_stat_statements`, `EXPLAIN (ANALYZE, BUFFERS)`,
> `pg_policies`, `pg_indexes`, and `pg_roles`.

## A.1 Headline finding — the SQL is NOT slow; the environment is

The same SQL that the app reports as multi-second runs in **~16–19 ms** when measured
warm. There is a ~**100×** gap between the warm execution time and what real users
experience. That gap is **not** the query — it is the free-tier instance.

| Function / query                              | Warm exec (EXPLAIN ANALYZE, service role) | Real client calls (`pg_stat_statements`)             |
| --------------------------------------------- | ----------------------------------------- | ---------------------------------------------------- |
| `get_xp_balance(p_student_id)`                | **16.2 ms** (759 shared buffers, all hit) | **mean 1626 ms · max 6950 ms · 51 calls · Σ 82.9 s** |
| `get_student_dashboard(p_student_id)`         | **18.7 ms** (5 378 shared buffers, hit)   | **6323 ms** (1 call)                                 |
| client per-course `attendance_records` SELECT | n/a (raw PostgREST query)                 | **mean 335 ms · max 4775 ms · 143 calls · Σ 47.9 s** |

**Correction to the prior session's note:** the "mean 1626 ms / Σ 82.9 s / 51 calls"
figure belongs to **`get_xp_balance`**, not `get_student_dashboard`. `get_xp_balance`
is the single largest application-query consumer of DB time on the instance.

## A.2 The mechanism of the timeout (exact, not hand-wavy)

- The **`authenticated` Postgres role has `statement_timeout = 8s`** (verified in
  `pg_roles`; `anon` = 3s, `service_role` = none). This is the precise threshold behind
  the user-visible `57014 canceling statement due to statement timeout`.
- Real calls already spike to **6.3 s / 6.95 s** (just under 8 s). When the shared
  instance is additionally loaded, the same ~18 ms of work crosses 8 s and is **cancelled**.
- Independent corroboration that the instance — not our SQL — is the variable: Supabase's
  **own internal background statements** spike on the same instance — realtime WAL polling
  (`SELECT wal->>…`, 53 k + 62 k calls) hits **max ~13 s**, an extension-version check hits
  **max ~32.8 s**, and realtime partition DDL hits **~12.5 s**. Trivial internal queries
  reaching 12–32 s is only possible on a CPU/IO-starved shared host.

**Conclusion:** the dominant cause is **Supabase free-tier resource starvation** (shared
burst-CPU throttling + cold buffer cache + connection-pooler latency) against a hard **8 s**
`authenticated` timeout — amplified by background **realtime** load (2 publications, **17
published tables**, `max_connections = 60`). The 27→1 consolidation reduced round-trips but
did nothing for per-call contention sensitivity, and — critically — **two heavy work
sources were never folded into the aggregate** (A.4).

## A.3 It is NOT missing indexes, and NOT (mostly) unwrapped RLS

Both are already correct, so neither explains the slowness:

- **Indexes — all present and ideal.** `idx_xp_transactions_student (student_id, created_at)`,
  `idx_attendance_student (student_id, session_id)`, `idx_class_sessions_section_id`,
  `idx_course_sections_course_id`, `student_courses (student_id, course_id)`. Data volumes
  are tiny: `attendance_records` 7 500, `class_sessions` 750, `course_sections` 25,
  `student_courses` 250, `xp_transactions` 4 127, `xp_purchases` 6. A fully-indexed read of
  a few dozen rows cannot legitimately cost seconds — confirmed by the 16–19 ms warm floor.
- **RLS auth-function wrapping — already done.** The hot-table policies already wrap
  `(select auth.uid())` / `(select auth_user_role())`, so `auth_rls_initplan`
  (per-row re-evaluation) is largely handled. **Two exceptions** still use a bare
  `auth_user_role()`: `submissions_parent_read` and `submissions_teacher_read` — worth
  wrapping, but not the dashboard's bottleneck.
- **What remains is `multiple_permissive_policies`.** Under the RPC's `SECURITY INVOKER`,
  every table it touches evaluates all its permissive SELECT policies per row:
  `student_gamification` **4**, `outcome_attainment` **4**, `attendance_records` **3**,
  `submissions` **3**, `assignments` **3**, `student_courses` **3**. Per Supabase's
  advisor lint 0006, in the worst case all N are tested per row and the query can "fall
  off" its index. This is a real multiplier, but secondary to A.2 / A.4.

## A.4 The two work sources the 27→1 aggregate never collapsed

This is why "the fix didn't work": the aggregate covers the above-fold KPI block, but the
two most expensive student-path queries still fire on their own.

1. **`get_xp_balance` — fired from the persistent sidebar, not the dashboard body.**
   `useXPBalance` (`staleTime: 10_000`) powers `XPBalanceBadge`, which lives in the
   **always-mounted student sidebar**. So it runs on _every_ student page and refetches
   every 10 s. The function is `SECURITY INVOKER` and `SUM`s the student's entire
   `xp_transactions` (append-only, 4 127 rows and growing) + `xp_purchases` on every call.
   It is the #1 DB-time consumer and is completely outside the aggregate.
2. **`useStudentAttendance` per-course fan-out.** For each active enrolled course it runs,
   inside `Promise.all`, `course_sections → class_sessions → attendance_records
(SELECT status WHERE student_id = … AND session_id IN (…))`. That last query is the
   143-call / max-4.77 s line in A.1. The hook now accepts an `enabled` gate, but it is
   still firing — some page (attendance / habit-tracker / profile) calls it directly rather
   than reading the aggregate's hydrated cache. The parent equivalent, `useChildAttendance`,
   already demonstrates the fix: **one** FK-chain join query
   (`attendance_records → class_sessions!inner → course_sections!inner(course_id)`)
   instead of a per-course fan-out.

`get_student_dashboard` itself touches **5 378 shared buffers** in one call; the bulk is
its attendance `cross join lateral` aggregating `class_sessions` + `attendance_records`
per active course — the heaviest part of the RPC and the part most exposed to cold-cache
disk reads.

## A.5 Researched best practices (Supabase official docs) and how they map here

Each item below is paraphrased from Supabase's own guidance; inline links are the source.
Content was rephrased for compliance with licensing restrictions.

- **Use `SECURITY DEFINER` to bypass join-table RLS.** The RLS performance guide states
  that join tables in an RLS expression also run _their_ RLS unless a security-definer
  function bypasses them; their benchmarks show order-of-magnitude wins (e.g. ~11,000 ms →
  single-digit ms).
  [RLS Performance & Best Practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv).
  → Maps to **Fix D**: make the dashboard aggregate `SECURITY DEFINER` so its internal
  reads skip the layered permissive policies, with a mandatory `auth.uid()` guard (A.6).
- **Consolidate multiple permissive policies.** Advisor lint 0006 explains N permissive
  policies are OR-composed and, worst case, all N are evaluated per row, increasing cost
  and index fall-off.
  [Lint 0006](https://supabase.com/docs/guides/database/database-advisors?lint=0006_multiple_permissive_policies).
  → Confirms Requirement 13 (Tier 2 RLS consolidation) is real, but it is high-blast-radius;
  Fix D gets most of the dashboard win without touching table policies.
- **Wrap auth calls in `(select …)`** for initPlan caching — already done in our policies;
  the two bare `submissions` policies are the only stragglers.
- **Add explicit client-side filters even under RLS**, and **minimize joins** by selecting
  the filter set and using `IN`/`ANY` rather than a correlated join. → Supports the
  single-query attendance rewrite (Fix B) and trimming the RPC lateral (Fix C).
- **For genuinely heavy work, temporarily raise compute** (billed hourly); client/dashboard
  timeouts are configurable up to 60 s.
  [Timeouts](https://supabase.com/docs/guides/database/postgres/timeouts).
  → The honest ceiling: software trims exposure, but the only true fix for the multi-second
  contention spikes is **more compute**.

## A.6 The fix plan (priority order) — software mitigations + the honest ceiling

The goal of every software fix is to keep each student-path query **comfortably under the
8 s `authenticated` timeout even while the shared instance is throttled**, and to reduce
total work per page so contention is hit less often. None of these eliminate the spikes;
they shrink the surface that crosses the timeout.

- **Fix A — collapse the XP-balance storm (highest impact, lowest risk).**
  Return `availableXP` (and the existing `totalXP`) from `get_student_dashboard`; hydrate
  the `useXPBalance` cache key from the aggregate; raise `useXPBalance` `staleTime` well
  above 10 s. Prefer serving the balance from the maintained `student_gamification` total
  rather than a `SUM`-on-read of an unbounded append-only table. Removes ~51 cold
  `get_xp_balance` calls / session from the sidebar.
- **Fix B — kill the 143-call attendance fan-out.** Replace `useStudentAttendance`'s
  per-course `Promise.all` with **one** FK-chain join query (mirror `useChildAttendance`),
  and ensure the dashboard reads the aggregate's hydrated attendance cache instead of
  re-fetching.
- **Fix C — trim the RPC's attendance lateral.** Rewrite the `cross join lateral` as a
  single set-based join + `group by` to cut the 5 378-buffer footprint (less cold-cache
  disk exposure).
- **Fix D — `SECURITY DEFINER` for the read-only dashboard aggregate.** Convert
  `get_student_dashboard` to `SECURITY DEFINER` so its internal reads bypass the
  multiple-permissive-policy evaluation. **Security is preserved by a mandatory top-of-body
  guard:** the function must enforce `p_student_id = (select auth.uid())` (or an explicit
  staff-authorization check) before returning anything — without it, `SECURITY DEFINER`
  becomes a cross-student data-leak vector. Because the function takes a fixed
  `p_student_id` parameter (not per-row data), the Supabase caveat about un-wrappable
  row-parameter functions does not apply. Keep it out of any exposed schema.
- **Fix E — narrow realtime.** 17 published tables is heavy for a free-tier instance;
  audit student subscriptions so each is filter-scoped (Req 15.4) to reduce the background
  WAL load that competes for the shared CPU.
- **Fix F — keep the warm-ping (Req 10)** to avoid the 7-day pause + the cold-start tax,
  and **wrap the two bare `submissions` policies** in `(select …)`.
- **The honest ceiling (must be stated to stakeholders):** at current data volumes the SQL
  is already ~18 ms warm. The multi-second spikes and 8 s cancellations are dominated by
  free-tier shared-CPU throttling and realtime background load. Software fixes A–F reduce
  how often we cross the timeout, but the **only durable fix for the spikes themselves is a
  compute upgrade** (or a temporary hourly compute boost for heavy windows). "Feels slow"
  will not fully disappear on free-tier compute regardless of query tuning.

## A.7 How each fix is proven (measurement gate)

Per the spec's QA rule, each fix ships with a before/after number:

- Fix A/B: DevTools Network — `get_xp_balance` and per-course `attendance_records` calls on
  a student session go from N (51 / 143 cumulative) to **0** on the dashboard path; the
  dashboard issues one aggregate request.
- Fix C/D: `pg_stat_statements` `mean_exec_time` + `EXPLAIN (ANALYZE, BUFFERS)` for
  `get_student_dashboard` before/after (buffer count + mean), and a re-query confirming the
  `57014` cancellations stop in the Postgres logs.
- Fix D additionally: the existing `getStudentDashboard.rls.test.ts` deny-side test must
  stay green (A→B returns nothing) — the `auth.uid()` guard is the security proof.
- All DB changes go via a guarded migration (`to_regprocedure`/`to_regclass`), `db:check-replay`
  clean, Supabase Preview green; never a direct prod apply.

---

# Appendix B — Whole-app architectural assessment: why every dashboard/section feels slow (2026-06-20)

> Scope: the user reports the slowness is **not student-only** — every role dashboard,
> and navigating into any section, is slow to paint, and **sometimes data does not load
> at all**. This appendix is the honest, codebase-grounded architectural answer, the
> constructive criticism that was asked for, and a scalable, non-breaking remediation
> roadmap. It builds on Appendix A (the DB-side root cause) and was produced by reading
> the 5 role dashboards, their hooks, `AuthProvider`, `RouteGuard`, `AppRouter`,
> `useRealtime`, and `src/lib/queryClient.ts`, cross-referenced with current best-practice
> docs. Where exact bundle sizes or runtime traces are cited as "to measure", they are not
> yet captured (the measurement gate, Req 1, still applies).

## B.1 The one-sentence diagnosis

**The data layer is "chatty," and a chatty client is exactly what a resource-constrained
shared Postgres instance handles worst** — so the front-end architecture and the free-tier
DB starvation (Appendix A) amplify each other. Every screen fires many small queries,
most go stale in 30 s and refetch on every navigation, nothing is persisted across
reloads, nothing is prefetched on intent, and all of it is gated behind a serial auth
hop. Under the 8 s `authenticated` `statement_timeout`, the surplus concurrent queries
contend, some are cancelled, and the section that depended on them **silently disappears**
— which is the "data not loading" the user sees.

## B.2 What is actually well-built (so the criticism is calibrated)

This is not a poorly-architected codebase, and the fix is not a rewrite. Genuinely good:

- **Route-level code splitting** (~120 `React.lazy` chunks) + **vendor `manualChunks`**
  (`vendor-react`, `vendor-query`, `vendor-charts`, `vendor-motion`) in `vite.config.ts`.
- A **shared realtime manager** (`useRealtime`) with channel dedup, exponential backoff,
  a 30 s polling fallback, and unmount cleanup — better than most apps have.
- **Component-level `Shimmer`** skeletons (no full-page spinner gate), an app `ErrorBoundary`
  - `PageErrorFallback`, and a global `QueryCache.onError` → Sentry + toast safety net.
- `retry` that **skips HTTP 429**, `refetchOnWindowFocus: false`, sane `gcTime`.
- The **student aggregate-RPC + cache-hydration pattern** (`get_student_dashboard` →
  `useStudentDashboardAggregate`) is a genuinely good design.

**The core criticism is not "bad code" — it is "good patterns applied inconsistently."**
The aggregate exists for one role of five; `keepPreviousData` was added to list pages but
not dashboards; `useDeferredMount` is on student/admin but not teacher/coordinator. Several
designed wins are not yet switched on for every surface.

> **Correction (2026-06-20, verified by file read + `findstr`):** an earlier draft of this
> appendix stated `useIntentPrefetch` / `prefetchRoute` were "dead code / zero call-sites."
> That was a faulty search result. In fact `src/components/shared/Sidebar.tsx` already wires
> `getIntentHandlers(item.to, () => prefetchRoute(item.to))` on every nav link (plus
> `viewTransition`), and that Sidebar is rendered by all five role layouts. Prefetch-on-intent
> for route **chunks** is therefore already live across all roles; what remains is the
> per-route **primary-query** prefetch (intentionally deferred — it needs per-route keys).

## B.3 The five architectural anti-patterns (with file evidence)

### B.3.1 A serial auth gate sits in front of _every_ dashboard query (all roles)

`AuthProvider` boots `getSession()` → `syncSession()` → **`fetchProfile()`** (a network
`SELECT` of 14 columns on `profiles`). `isLoading` stays true until that returns, and
`RouteGuard` renders a **full-screen spinner and nothing else** until `role` resolves.
Every dashboard hook is gated `enabled: !!user?.id` / `!!institutionId`, so none can start
until the profile round-trip finishes. The cold-start sequence is fully serial:

`getSession (local)` → `fetchProfile (network)` → `RouteGuard` pass → **lazy layout chunk**
→ **lazy page chunk** → hooks fire → (their own internal waterfalls). Per the TanStack
Query guide, in-component fetching that chains like this is the classic
[request waterfall](https://tanstack.com/query/v5/docs/framework/react/guides/request-waterfalls)
— the library's named "biggest performance footgun." `INITIAL_SESSION` can also trigger a
second `fetchProfile` on first load.

### B.3.2 Per-dashboard query fan-out + serial N+1 _inside_ hooks (worst on teacher/coordinator)

Mount-time hook counts and in-hook shapes (verified):

| Role        | Aggregate?                 | Defer?                     | Heaviest in-hook shape                                                                                                                                                 |
| ----------- | -------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Student     | ✅ `get_student_dashboard` | ✅ `useDeferredMount(500)` | `useStudentAttendance` = **true N+1**: per active course → `course_sections` → `class_sessions` → `attendance_records` (3 queries × N)                                 |
| Teacher     | ❌ none                    | ❌ none                    | `useTeacherKPIs` = `Promise.all(5)` **then 2 more serial**; `useAtRiskStudents` = 4 serial; heatmap = 3 serial; charts gated on `useCourses` → **course-id waterfall** |
| Coordinator | ❌ none                    | ❌ none                    | `useCoordinatorKPIs` = **~6 fully sequential** awaits                                                                                                                  |
| Admin       | ❌ none                    | ✅ `useDeferredMount(500)` | `useAdminPLOHeatmap` = **6 sequential** batched queries                                                                                                                |
| Parent      | ❌ none                    | ❌ none                    | lightest — 2 hooks, correctly batched with `.in()`                                                                                                                     |

Teacher and coordinator are the worst because they have **neither** mitigation and their
KPI hooks are serial chains. The student `useStudentAttendance` N+1 is the same query that
Appendix A measured as **143 calls / max 4.77 s** in the DB.

### B.3.3 Route chunks are prefetched on intent; the page-load chain is still cold

All ~120 routes **and the role layouts** are `React.lazy`. `src/components/shared/Sidebar.tsx`
**already** warms a route's JS chunk on hover/focus via `useIntentPrefetch` +
`prefetchRoute` (`matchMedia('(hover:hover)')`-gated, dedup, error-swallowing), and the
Sidebar is rendered by all five role layouts — so a hovered nav link's chunk is usually
warm before the click. Two gaps remain: (1) the route's **primary query** is not yet
prefetched on intent (only the chunk is — query prefetch needs per-route keys, so it is
deferred to each route), so the click still pays a cold query; and (2) the **role layout
shells themselves are lazy**, so the very first post-login navigation still pays a
layout-chunk then page-chunk staircase. Best practice is to also warm the primary query on
hover and to keep the small layout shells in the entry bundle
([lazy-loading best practices](https://moldstud.com/articles/p-top-10-questions-every-react-developer-has-about-lazy-loading-answers-best-practices)).
Content was rephrased for compliance with licensing restrictions.

### B.3.4 Cache policy defeats itself; no persistence → every reload/return is cold

`src/lib/queryClient.ts` sets a sensible 5 min default `staleTime`, **but nearly every
dashboard hook overrides it to `30_000` (30 s)**. So data goes stale in 30 s and refetches
on the next remount/navigation — the cache rarely serves a navigation hit. There is **no
`placeholderData`/`keepPreviousData` default** and **no `persistQueryClient`**, so a full
reload re-runs the entire cold fan-out from scratch. TanStack's
[prefetching guide](https://tanstack.com/query/v5/docs/framework/react/guides/prefetching)
notes `ensureQueryData` can serve cached data while ignoring `staleTime` — the opposite of
what the 30 s overrides do here.

### B.3.5 Errors/empties render as silent disappearance → "data not loading"

Several sections (e.g. announcements, badge spotlight, comeback, team cards, and the
deferred student sections) render `null` or an empty card when their query errors or
returns empty. When the Appendix-A `57014 statement timeout` cancellation fires, the
section's query rejects and the section **just vanishes** — the global toast fires once,
but there is no per-section error/retry state. The Admin PLO heatmap is the **correct
counter-pattern**: explicit `loading | error | empty | data` branches. This is exactly the
"sometimes data doesn't load" symptom, and it is a UX/architecture gap, not (only) a DB bug.

### B.3.6 Always-on header cost on every navigation

`NotificationBell` lives in `GlobalHeader` on **every page for every role**, firing
`useNotifications` + `useUnreadCount` + a realtime subscription on every load — added on
top of each page's own fan-out. `TeacherDashboard` subscribes to `submissions` INSERT with
**no filter** (institution-wide), broader than the design's own realtime rule.

## B.4 The scalable remediation roadmap (non-breaking, ordered by impact ÷ risk)

The strategy is to make the client **quiet**: fewer requests, served from cache, prefetched
before the click, behind a shorter auth gate, and never failing silently. Each step is
additive/reversible and matches a pattern already in the repo.

**Tier 1 — finish wiring the patterns that already exist (days, not weeks; lowest risk).**

1. **Roll the aggregate-RPC pattern to teacher → coordinator → admin → parent.** This is
   Task 3 already in this spec; Appendix A's caveats apply (return `availableXP`; consider
   `SECURITY DEFINER` + `auth.uid()` guard to skip layered permissive RLS; trim lateral
   joins). One PR per role, each with a parity test + deny-side RLS test + a request-count
   before/after.
2. **Route-chunk prefetch-on-intent is already wired** in the shared sidebar
   (`useIntentPrefetch` + `prefetchRoute` on every nav link, touch-gated, tested). The
   remaining win is to also **prefetch the route's primary query** on hover where the key is
   known (`queryClient.prefetchQuery`), so the click pays neither a cold chunk nor a cold
   query. (Status 2026-06-20: chunk prefetch DONE; query prefetch outstanding.)
3. **Standardize `staleTime` and stop the 30 s thrash.** Dashboards are not real-time
   (realtime invalidates them on change anyway). Raise dashboard `staleTime` to 2–5 min so
   intra-session navigation is a cache hit, not a refetch storm. One-line change per hook.
4. **Collapse the in-hook N+1s into one query.** `useStudentAttendance` → one FK-chain join
   (the parent `useChildAttendance` already shows the exact pattern). Convert
   `useCoordinatorKPIs`' 6 sequential awaits and `useTeacherKPIs`' trailing serial awaits
   to `Promise.all` / a single RPC. Mirrors Supabase's "minimize joins / batch" guidance.
5. **Give every data section explicit `error`/empty states with a retry** (generalize the
   Admin-PLO-heatmap pattern; a small `<SectionState>` wrapper). This converts silent
   "data not loading" into a visible, retryable state and is the single highest-trust UX fix.

**Tier 1.5 — shorten the gate + warm the instance.**

6. **Parallelize the auth gate.** Seed `user.id` from the cached session synchronously and
   let the role-routing + first dashboard query start while `fetchProfile` resolves in
   parallel (Req 8). Don't block the whole layout on the profile SELECT.
7. **Pre-bundle the role layouts** (don't lazy-split the 5 layout shells) so the first
   post-login navigation pays one chunk, not two. Keep pages lazy.
8. **Keep the active-hours warm-ping** (Req 10) and **scope realtime** (filter the teacher
   `submissions` subscription; confirm the notification subscription is necessary on every
   page) to cut background WAL load.

**Tier 2 — make returns instant + reduce DB work structurally (gated by tests).**

9. **Per-user query persistence** (`@tanstack/query-persist-client`, keyed by `user.id`,
   purged on sign-out) so a reload/return paints last-known data instantly then revalidates
   (Req 12) — ship only behind the cross-profile leakage test.
10. **RLS permissive-policy consolidation** (Req 13) + the `SECURITY DEFINER` aggregate
    path — the structural DB-cost reduction, table-by-table behind deny-side `test:rls`.

**Tier 3 — the honest ceiling.**

11. **Compute.** Appendices A+B show the SQL is ~18 ms warm; the multi-second spikes and
    timeouts are dominated by free-tier shared-CPU throttling + realtime load. Tiers 1–2
    shrink how often we cross the 8 s timeout, but the **only durable fix for the spikes
    themselves is more compute** (Supabase Pro / a temporary hourly compute boost, which is
    [billed by the hour](https://supabase.com/docs/guides/troubleshooting/avoiding-timeouts-in-long-running-queries-6nmbdN)).
    This must be said plainly to stakeholders: query tuning cannot fully fix a saturated
    shared instance.

## B.5 Constructive criticism (the part that was explicitly asked for)

- **You built the right tools; some are plugged in, some only partially.** The aggregate RPC,
  `keepPreviousData`, and `useDeferredMount` exist but reach only some surfaces (one role, list
  pages, student/admin respectively), while route-chunk prefetch (`useIntentPrefetch` +
  `prefetchRoute`) is correctly wired across all roles. The highest-leverage remaining work is
  _finishing the integration_ (roll the aggregate to every role; prefetch the primary query,
  not just the chunk), not new invention.
- **`staleTime: 30_000` copy-pasted everywhere is an anti-pattern for this app.** It was
  likely added to "keep data fresh," but combined with realtime invalidation it just
  guarantees a refetch on every navigation. Pick freshness per data class, not per hook by
  habit.
- **Per-hook client-side joins don't scale.** Hooks like `useTeacherKPIs`,
  `useAtRiskStudents`, `useAdminPLOHeatmap`, and `useStudentAttendance` re-implement joins
  and roll-ups in TypeScript across many round-trips. That is N round-trips of latency +
  N× the RLS evaluation. The database is the join engine; push these into set-based RPCs.
- **Silent failure is the most damaging pattern for trust.** A section that vanishes on
  error reads to a user (and an investor) as "the product is broken," even when the data
  exists. Explicit, retryable section states would change the _perceived_ reliability more
  than any single query optimization.
- **The free tier is a product decision, not just an infra detail.** At current volumes the
  schema and indexes are fine; the experience is gated by shared compute. Decide
  deliberately: either keep the app "quiet enough" to live within free-tier compute (Tiers
  1–2), or budget for compute. Pretending tuning alone will make it feel instant on free
  tier is the trap to avoid.

## B.6 How this is proven (measurement gate, per Req 1)

For each step: DevTools Network **request count on mount** and **on section navigation**
before/after; `pg_stat_statements` `mean/max_exec_time` for the touched queries; a re-query
of Postgres logs confirming `57014` cancellations drop; `npm run analyze` chunk sizes for
the layout-prebundle change; and the existing parity + deny-side RLS tests staying green for
every aggregate/RLS change. No step ships without its number. No direct prod DDL — guarded
migration + Supabase Preview green only.

---

# Appendix C — Scalability levers beyond request-shape, + Supabase Pro synergy (2026-06-20)

> Appendices A/B fixed the **request shape** (how many round-trips, how heavy each, how
> they fail). This appendix records the **compute-shape** levers — precompute/cache instead
> of compute-on-read — that keep read cost flat as data grows. All are free-tier-friendly;
> each notes its **con/tradeoff** and how a later **Supabase Pro** upgrade amplifies it. This
> is an audit of suggested levers against this product; items already covered by an existing
> requirement are cross-referenced, not duplicated. Verdict per lever: **ADOPT** (add to
> plan), **REINFORCE** (already in plan; strengthen), or **DEFER** (right idea, wrong time).

## C.1 Maintained summary tables (denormalization) — ADOPT (highest structural win)

Store running aggregates in a row that a trigger / `pg_cron` job updates on change, so the
dashboard reads **one row** instead of scanning thousands. We already do this for XP
(`student_gamification.xp_total` is a stored total, not a `SUM(xp_transactions)` on read).
Extend the pattern to the numbers that currently scan rows on every dashboard load:

- **Student**: `avgAttainment` (currently `avg()` over `outcome_attainment`).
- **Teacher**: `pendingSubmissions`, `gradedThisWeek`, `atRiskCount`, per-CLO attainment.
- **Coordinator/Admin**: PLO/CLO coverage %, institution attainment, at-risk counts.

**Why it's the biggest scalability win:** read cost stops growing with data volume — a
500-student institution reads the same one row a 50-student one does. (Aligns with Supabase's
"do the work in Postgres / read pre-aggregated data" guidance; content rephrased for
licensing compliance.)

**Cons / tradeoffs:**

- **Write-time cost + a correctness burden**: every source mutation must update the summary
  (trigger or cron). A missed path = silent drift. Mitigate with: triggers on the canonical
  write path only, a nightly `pg_cron` reconciler that recomputes from source, and a
  property test asserting `summary == recompute-from-source`.
- **Staleness window** if refreshed by cron rather than trigger (acceptable for KPI tiles;
  not for XP balance, which stays trigger-maintained).
- More moving parts than an on-read RPC — so adopt it **only for the numbers proven hot**
  (by the Req 1 baseline / `pg_stat_statements`), not everywhere.

**Pro synergy:** neutral-to-positive — on Pro's larger compute the on-read aggregates may
already be fast enough that some summary tables become optional; the ones you keep get
cheaper to refresh. Nothing here is wasted if you upgrade.

## C.2 Materialized views for heavy analytics — ADOPT (admin/coordinator only)

For expensive, read-mostly rollups that don't need second-freshness — the **admin/coordinator
heatmaps** (`useAdminPLOHeatmap`'s 6 sequential queries) and **accreditation matrices** —
compute once via a materialized view refreshed on a `pg_cron` schedule; the dashboard reads
it instantly.

**Cons / tradeoffs:**

- **Stale until refreshed** (a scheduled-refresh MV is not live) — fine for accreditation/
  curriculum analytics, wrong for anything interactive.
- `REFRESH MATERIALIZED VIEW` locks the MV unless `CONCURRENTLY` (which needs a unique index
  and more work) — schedule refreshes off-peak.
- **RLS caveat (important):** a materialized view does **not** enforce the underlying tables'
  RLS, and Postgres MVs can't be queried with `security_invoker`. So an MV of multi-tenant
  data must be (a) institution-scoped in the view definition AND (b) exposed only through a
  `SECURITY DEFINER` RPC that injects `auth_institution_id()` / `auth.uid()` — never granted
  directly to `authenticated`. Treat any MV as a potential cross-tenant leak until that
  wrapper + a deny-side test exist.

**Pro synergy:** strong — Pro/compute add-ons make `CONCURRENTLY` refreshes and larger MVs
cheaper; the MV definitions carry over unchanged.

## C.3 Cheaper counts (`estimated`/`planned`) — ADOPT (easy, low risk)

KPI hooks use `count: 'exact'`, which forces Postgres to count every matching row. For large
tables use PostgREST's `estimated`/`planned` count — "≈12,400 users" reads fine on a KPI
tile. **Con:** approximate (and `planned` relies on planner stats, so it can be off right
after big inserts until `ANALYZE`); keep `exact` where a precise number is contractual (e.g.
billing, "you have 3 pending"). Low risk, immediate buffer/CPU saving on the count queries.
**Pro synergy:** neutral (helps regardless).

## C.4 Select only needed columns — REINFORCE (make it a lint-able convention)

`select('*')` on wide/large tables wastes buffers + network. `AuthProvider.fetchProfile`
already lists explicit columns; the convention should be enforced everywhere a query hits a
big table. **Con:** more verbose; adding a column later means editing the select list (a
worthwhile tradeoff). Not separately ticketed beyond folding into the per-hook reviews in the
aggregate rollout and a code-review checklist item. **Pro synergy:** neutral.

## C.5 Prefetch the query, not just the chunk, on hover — REINFORCE (Phase 7 Task 21 remainder)

The sidebar already warms the route **chunk** on hover (see §B.3.3 correction). The remaining
win is to also `queryClient.ensureQueryData` the route's **primary query** on hover so the
click is instant (`ensureQueryData` returns cached data and skips the fetch when fresh).
**Con:** prefetching data the user may not click wastes a little quota — so gate it to the
nav links most likely to be used and to non-metered pointers (already done for chunks).
**Pro synergy:** neutral.

## C.6 Cut the realtime surface — REINFORCE (Phase 7 Task 27)

17 published tables is heavy background WAL work that steals CPU from queries (Appendix A).
Subscribe only to what a role needs, always filtered (`student_id=eq.X`), torn down on
unmount. **Con:** fewer live-updating surfaces means more reliance on invalidate-on-mutation;
acceptable. **Pro synergy:** strong — Pro's larger compute tolerates more realtime, so this
is "do it now for free tier; relax later if needed."

## C.7 Avoid the waterfall structurally — REINFORCE (Appendix B §B.3.1, Phase 7 Task 25)

TanStack names in-component request waterfalls the "biggest performance footgun" — exactly
the serial `auth → profile → page → query` chain and `useCoordinatorKPIs`' 6 sequential
awaits. Fix by parallelizing (one aggregate RPC; `Promise.all`). Already core to the aggregate
rollout (Task 20) and the auth-gate trim (Task 25). **Pro synergy:** neutral (architecture,
not compute).

## C.8 Index every filtered/joined column; drop unused — REINFORCE (Req 14 / Task 14)

Confirm via `EXPLAIN (ANALYZE, BUFFERS)` that each dashboard query is an **index scan, not a
seq scan**; drop genuinely unused indexes (they tax writes). **Con:** index review must be
data-pattern-driven and reversible (drop only after confirming non-use). Note from Appendix A:
the student-path indexes are already correct — so this is a per-table confirmation as each
role's aggregate lands, not a blanket sweep. **Pro synergy:** neutral.

## C.9 The honest priority order for "all profiles, no surprises"

Do these in order. The first is non-optional (the spec's own measurement gate); the others are
ranked by trust/impact ÷ risk, and explicitly span **all five roles**, not just student.

1. **Capture baselines (Req 1 / Task 1)** — per role: mount request count, LCP/INP, cold
   waterfall, `pg_stat_statements` p95. No fix is provable without a before-number; it also
   tells us _which_ numbers in C.1 are actually hot.
2. **Per-section error/retry states across all roles (Req 4 / Task 24)** — generalize the new
   `SectionState` to every dashboard's silent-`null`-on-error sections. Cheapest, zero DB
   risk, biggest _trust_ win; stops "data didn't load / it vanished" everywhere.
3. **Roll the aggregate RPC to teacher → coordinator → admin → parent (Task 20)** — the lever
   that actually makes the _other four_ dashboards fast. Teacher first (worst fan-out + had
   broken pages). One PR per role, each parity- + deny-side-RLS-tested, Preview-gated.
4. **Collapse remaining N+1 / serial chains (Task 23)** alongside each role's aggregate
   (student done).
5. **Maintained summary tables / materialized views (C.1/C.2)** — only for the numbers the
   baseline proves hot; each behind a `summary == recompute` property test (and, for MVs, a
   `SECURITY DEFINER` wrapper + deny-side test).
6. **Gated structural: query persistence (Req 12 / Task 28)** behind the cross-profile leakage
   test; **RLS consolidation (Req 13 / Task 29)** behind deny-side `test:rls`.
7. **Decide on compute (Task 30)** — the honest ceiling: the above buy _headroom_, not an
   absolute guarantee on free-tier shared CPU.

## C.10 Bottom line on Pro

Nothing in this plan is wasted by a later Pro upgrade — every lever is either neutral or
**amplified** by more compute (summary tables refresh cheaper, MVs can refresh
`CONCURRENTLY`, realtime budget relaxes, on-read aggregates get faster). Equally, **Pro is not
a substitute** for the request-shape fixes: a chatty client on bigger compute is still chatty.
Sequence is: make it _quiet and flat-cost_ on free tier first (1–6), then treat Pro/compute
(7) as the headroom multiplier — not the bug fix.
