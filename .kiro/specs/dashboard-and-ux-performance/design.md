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
