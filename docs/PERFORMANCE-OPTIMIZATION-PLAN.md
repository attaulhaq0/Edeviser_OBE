# Edeviser Performance Optimization Plan

**Author:** Senior Dev + QA review
**Date:** 2026-06-09
**Scope:** Full-stack performance on the Supabase **free tier** (no Pro upgrade assumed)
**Audience:** Engineering + product decision-makers
**Status:** Proposal for review — no risky changes applied without sign-off

---

## 0. TL;DR (read this first)

Your platform is **not slow because the code is bad** — the frontend is already
well-architected (lazy routes, manual vendor chunks, tuned TanStack Query cache,
console-drop in prod). The slowness you feel when "opening a section through a
different profile" is dominated by **three things, in this order**:

1. **Supabase free-tier compute cold-starts** (~1–3s first-hit penalty after idle). Biggest single factor. Can't be removed without paid compute, but can be _masked_ and _mitigated_ (§3).
2. **Auth/session round-trips on navigation** — `AuthProvider` re-fetches the profile on every `TOKEN_REFRESHED`/`INITIAL_SESSION`, and protected routes wait on auth before rendering (§4).
3. **Multiple permissive RLS policies** — every read evaluates 3–6 policies per row (§5). Real, measurable, but a medium-risk refactor.

Everything below is ordered by **impact ÷ risk**. The honest message: do the
**Tier 1** items now (cheap, safe, high perceived-speed gain), schedule **Tier 2**
deliberately (RLS consolidation — needs a spec + RLS regression tests), and treat
**Tier 3** as "only if metrics justify it."

---

## 1. Measured baseline (live data, not guesses)

| Signal                                     | Value                                                                                                               | Source                 |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| Compute tier                               | **Free (shared, auto-pauses on idle)**                                                                              | project plan           |
| Tables                                     | 124, **RLS on 100%**                                                                                                | `list_tables`          |
| Largest tables                             | attendance_records 7,500 · xp_transactions 4,121 · habit_tracking 3,010 · evidence 2,577 · outcome_attainment 1,743 | live counts            |
| Tables with 4–6 permissive SELECT policies | `profiles`(6), `habit_logs`(4), `student_gamification`(4), `outcome_attainment`(4), `team_members`(4), +10 with 3   | `pg_policies`          |
| Unindexed FKs                              | 2 (`announcement_attachments`, `announcement_reads`)                                                                | perf advisor           |
| Unused indexes                             | ~60 (write overhead, no read benefit)                                                                               | perf advisor           |
| Auth helper functions in RLS               | **Already optimized** — wrapped as `(SELECT auth_user_role())` initplan form                                        | `pg_policy` inspection |
| Frontend routes                            | **Already lazy-loaded** via `React.lazy`                                                                            | `AppRouter.tsx`        |
| Vendor chunking                            | **Already split** (react, query, charts, motion, per-role dashboards)                                               | `vite.config.ts`       |
| Query cache                                | `staleTime` 5min, `gcTime` 30min, `refetchOnWindowFocus` off — **already tuned**                                    | `App.tsx`              |
| Prod console/debugger                      | **Already dropped** via esbuild                                                                                     | `vite.config.ts`       |
| Heavy deps still in initial graph          | `recharts`, `framer-motion`, `radix-ui`, `react-joyride`, `canvas-confetti`                                         | `package.json`         |

**Senior-dev read:** the "easy wins" everyone lists online (lazy routes, code
splitting, cache config, drop console) are **already done here.** That's why the
remaining levers are more surgical. Don't let a generic blog post convince you to
"add code splitting" — you have it. The real work is cold-start masking, auth
round-trip reduction, and the RLS policy count.

---

## 2. How to MEASURE before you change anything (QA gate)

> Rule: no performance change ships without a before/after number. "Feels faster"
> is not a metric.

**Client-side (perceived speed):**

- Chrome DevTools → Performance panel → record a cold navigation to a slow section. Capture **LCP**, **INP**, and the network waterfall.
- DevTools → Network → throttle to "Fast 4G" → reload. Note the **first request** time (this exposes cold-start).
- Run `npm run analyze` (already wired — `rollup-plugin-visualizer`) → open `dist/bundle-report.html`. Record gzipped size of the initial chunks.
- `npm run lighthouse` (already wired — `lhci`) → record Performance score, FCP, LCP, TBT. Budget is already defined in `performance-budget.config.ts` (dashboard ≤1.5s on 4G) and `lighthouserc.cjs` (1.2MB gzipped total).

**Server-side (DB latency):**

- Supabase Dashboard → Reports → API → p50/p95 latency per endpoint.
- For a specific slow section, run its exact query through the SQL editor with `EXPLAIN (ANALYZE, BUFFERS)` and read the actual execution time + whether RLS adds a filter step per policy.
- Supabase Dashboard → Database → Query Performance (pg*stat_statements) → sort by total time. This tells you \_which* queries actually cost, not which you assume.

**Establish the baseline first.** Capture these numbers today, then re-measure
after each tier. This is the single most important QA discipline here.

---

## 3. TIER 1 — Free-tier cold-start mitigation (do now: cheap, safe, high perceived gain)

### The problem, precisely

The free instance pauses compute when idle. The first request after a pause pays
the wake-up cost before any SQL runs. Switching to a different profile = a fresh
session hitting a possibly-cold instance = the 1–3s stall you feel. You cannot
delete physics on the free tier, but you can change _how the app feels_ during
that window — which is exactly the guidance from latency-handling literature
(content rephrased for licensing compliance).

### 3.1 Keep the instance warm with a lightweight cron ping

- **What:** a scheduled hit (every ~5 min during active hours) to a trivial endpoint (`/health` edge function already exists, or a `select 1`) so the instance rarely sleeps.
- **Pros:** Removes most cold-starts during the school day for ~free. No code-path risk.
- **Cons:** On the free tier this consumes a slice of your compute-hours/egress budget; a 24/7 ping could bump you toward limits. Mitigate by pinging **only during expected active hours** (e.g. 6am–11pm local) and at a modest interval.
- **Existing vs new:** _New_ tiny addition. Lowest-risk item in this document.
- **QA:** verify the cron actually fires (check function logs); confirm it doesn't trip rate-limit/`blocked_ips`.

### 3.2 Optimistic / skeleton UI on every section entry

- **What:** ensure every route renders an instant skeleton (`Shimmer`) and never blocks the whole view on a query. You already have component-level `Shimmer` and a "defer non-critical hooks until after first paint" pattern in `StudentDashboard` — extend that pattern to the other dashboards and list pages.
- **Pros:** The cold-start still happens, but the user sees structure in <100ms instead of a blank stall. This is the highest _perceived_-speed win for the least risk.
- **Cons:** None functionally; purely additive UI work.
- **Existing vs new:** _Extend existing_ pattern. Strongly preferred over rewrites.

### 3.3 Route prefetch on intent (hover/focus of nav links)

- **What:** when a user hovers a sidebar link, prefetch (a) the route's lazy chunk and (b) its primary TanStack Query via `queryClient.prefetchQuery`. By the time they click, JS + data are warming in parallel.
- **Pros:** Hides both the chunk fetch and the cold-start behind the user's hover intent. Modern routers (TanStack Router) build this in; you can do it manually with React Router + your existing `queryKeys`.
- **Cons:** Slightly more prefetch traffic (minor on free tier); needs care not to prefetch on touch devices where hover ≠ intent.
- **Existing vs new:** _New_ enhancement layered on existing hooks. Medium effort, high payoff.

### 3.4 Persist the query cache across reloads (optional)

- **What:** `@tanstack/query-persist-client` to localStorage so a reload/profile-switch shows last-known data instantly, then revalidates.
- **Pros:** Instant paint on return visits; smooths the cold-start.
- **Cons:** Risk of showing **stale cross-profile data** if not keyed per-user — must scope the persisted cache by user id and clear on sign-out. For a multi-role product this is a real correctness footgun; gate it carefully.
- **Existing vs new:** _New_ dependency. Recommend **only after** 3.1–3.3, and with strict per-user cache keying + sign-out purge (QA must verify no leakage between profiles).

---

## 4. TIER 1.5 — Auth round-trip reduction (cheap, medium gain, low risk)

### The problem

`AuthProvider.syncSession` calls `fetchProfile` (a `profiles` SELECT) on **every**
`onAuthStateChange` event including `TOKEN_REFRESHED` and `INITIAL_SESSION`. On the
free tier each of those is a cold-able round-trip, and protected routes wait on
auth state before rendering. When you switch profiles you pay: sign-in →
getSession → fetchProfile → route guard → page's own queries. That's a serial
waterfall.

### Fixes (all low-risk, existing-code edits)

- **Don't re-fetch profile on `TOKEN_REFRESHED`** if the user id is unchanged — the profile rarely changes on a token refresh. Skip the redundant SELECT.
- **Seed the profile into the TanStack Query cache** so pages that need profile data don't issue a second fetch.
- **Parallelize, don't serialize:** the dashboard's primary data query can start as soon as the user id is known, in parallel with profile hydration, rather than after it.

**Pros:** Removes 1–2 serial round-trips from the exact "open a section" path you
described. **Cons:** Auth code is sensitive — every change needs the existing
`AuthProvider` tests green plus a manual multi-role login pass. **Existing vs new:**
_Refine existing_ — strongly preferred over any auth rewrite.

---

## 5. TIER 2 — RLS policy consolidation (real DB win, but a deliberate, tested refactor)

### The problem, quantified

Postgres evaluates **every permissive policy** for a role/action and ORs them
together — on **every row** scanned. Your hottest tables carry the most:
`profiles` (6 SELECT policies), `habit_logs`/`student_gamification`/
`outcome_attainment`/`team_members` (4 each), plus ~10 tables at 3. The Supabase
performance advisor flagged _hundreds_ of `multiple_permissive_policies` warnings.
On a 7,500-row table like `attendance_records`, multiplying policy predicates per
row adds up.

Two important nuances (so we stay honest):

- Your auth helpers are **already** wrapped in `(SELECT …)` initplan form, so they execute **once per query, not per row** — the worst Supabase RLS anti-pattern is already avoided here. Good.
- The remaining cost is the **number** of policies OR'd together, not the helper calls.

### The fix

Merge the per-role policies for the same action into **one** policy per
`(table, action)` using `OR`/`CASE` over `auth_user_role()`. Example pattern:

```sql
-- BEFORE: 4 separate permissive SELECT policies on student_gamification
-- AFTER: one consolidated policy
CREATE POLICY "student_gamification_select" ON student_gamification
  FOR SELECT TO authenticated
  USING (
    student_id = (SELECT auth.uid())                                  -- own
    OR (SELECT auth_user_role()) IN ('admin','coordinator','teacher') -- staff
    OR (SELECT parent_has_verified_link(student_id))                  -- parent
  );
```

### Pros

- Fewer policy evaluations per row → lower CPU per query → faster reads on the hot tables, and **less compute burned** (matters on the free tier's compute budget).
- Cleaner mental model: one policy = one place to reason about who can read a table.

### Cons / risks (the constructive-criticism part)

- **RLS is a security boundary.** A merge bug = either a lockout (annoying) or a data leak across institutions/roles (serious — this product is multi-tenant with parent/student/teacher separation). The recursion incident already in your history (`42P17` from inline `parent_student_links` subqueries) is proof this area bites.
- It touches **most tables** → large migration surface → must be replay-clean (your `db:check-replay` gate) and idempotent.
- The performance gain is **real but not dramatic** at your current row counts (hundreds–thousands of rows, not millions). The cold-start (§3) dwarfs it today.

### Recommendation

**Do it as its own bugfix spec, not inline.** Required guardrails:

1. Per-table before/after `EXPLAIN ANALYZE` to prove the win.
2. A full **RLS regression suite** (you already have `npm run test:rls` against a preview branch) covering every role × every table for both _allowed_ and _denied_ access — the deny tests are the ones that catch leaks.
3. Roll out table-by-table (start with the 4–6 policy tables: `profiles`, `habit_logs`, `student_gamification`, `outcome_attainment`, `team_members`), not big-bang.
4. Keep the `(SELECT …)` initplan wrapping and the `parent_has_verified_link` SECURITY DEFINER helper — do not regress those.

**Existing vs new:** this _replaces_ existing policies. Justified only with the
test scaffolding above. Without the deny-side RLS tests, **do not ship it.**

---

## 6. TIER 2.5 — Index hygiene (cheap, low risk)

- **Add covering indexes** for the 2 unindexed FKs (`announcement_attachments.announcement_id`, `announcement_reads.student_id`). Trivial, safe, removes seq-scan risk on join/delete.
- **Review the ~60 unused indexes.** Each one slows every INSERT/UPDATE and consumes storage. Many are on empty/near-empty feature tables (quests, donations, sale*events) — likely premature. **Caution:** "unused" reflects \_current* traffic; an index for a feature not yet live isn't truly dead. Drop only after confirming the feature is unused, and keep the migration reversible.
- **Pros:** Faster writes, less storage, cleaner advisor report. **Cons:** Dropping an index a future query needs causes a regression — verify against query patterns first. **Existing vs new:** _prune existing_.

---

## 7. TIER 3 — Frontend micro-optimizations (only if metrics justify)

You've done the big ones. Remaining marginal gains:

- **Charts:** `recharts` is heavy. It's a vendor chunk already, but ensure it's only imported on routes that render charts (lazy-import the chart component itself, not just the route).
- **Animation:** `framer-motion` is large; you already honor `prefers-reduced-motion`. Consider CSS keyframes (you have several) for simple transitions and reserve framer-motion for genuinely complex sequences.
- **`react-joyride` / `canvas-confetti`:** load on-demand (first tour / first celebration), never in the initial graph.
- **Realtime:** you use a shared `useRealtime` manager (good — avoids per-component channels). Verify subscriptions are scoped with filters and torn down on unmount; an over-broad subscription re-invalidates queries too often and causes refetch churn that _feels_ like slowness.
- **List virtualization:** for the big tables (attendance 7.5k, xp_transactions 4.1k), ensure any UI that lists them is paginated/virtualized (TanStack Table supports it) rather than rendering thousands of rows.

**Pros:** smaller initial JS, fewer re-renders. **Cons:** diminishing returns —
measure first with the bundle report; don't optimize a chunk that isn't on the
critical path.

---

## 8. Existing vs New — the decision framework

| Area               | Existing approach                               | "New" alternative                                            | Verdict                                                                                                       |
| ------------------ | ----------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| Routing/code-split | `React.lazy` per route + manualChunks           | Migrate to TanStack Router (built-in prefetch + loader data) | **Keep existing.** Add manual hover-prefetch (§3.3). A router migration is a large rewrite for marginal gain. |
| Data fetching      | TanStack Query, tuned cache                     | Server components / SSR (Next.js)                            | **Keep existing.** SSR would mean re-platforming off Vite SPA — massive cost, not justified.                  |
| Cold-start         | (none)                                          | Warm-ping cron + skeletons + prefetch                        | **Add new (§3)** — highest impact-to-risk.                                                                    |
| RLS                | Per-role permissive policies (initplan-wrapped) | Consolidated one-policy-per-action                           | **New, but gated** behind RLS regression tests (§5).                                                          |
| Auth               | Re-fetch profile on every auth event            | Skip redundant fetches + cache seed                          | **Refine existing (§4).**                                                                                     |
| Compute            | Free tier                                       | Pro dedicated compute                                        | **Deferred by your constraint.** It remains the single biggest lever; revisit when budget allows.             |

**Guiding principle (SOLID / clean-architecture aligned):** prefer _refining
existing_ patterns over introducing new frameworks. Every "new" item here is
additive and reversible; the one _replacement_ (RLS) is explicitly gated behind
tests. This respects your engineering guardrails (no big-bang rewrites, backward
compatibility, test-first).

---

## 9. Recommended sequence (impact ÷ risk)

1. **Measure baseline** (§2) — capture numbers today.
2. **Tier 1 cold-start mitigation** (§3.1 warm-ping, §3.2 skeletons, §3.3 hover-prefetch) — biggest perceived-speed win, lowest risk.
3. **Tier 1.5 auth round-trip trim** (§4) — removes serial hops from the exact slow path.
4. **Tier 2.5 index hygiene** (§6 — add the 2 FK indexes; audit unused later).
5. **Re-measure.** If DB latency is still a top contributor → **Tier 2 RLS consolidation** (§5) as its own spec with deny-side RLS tests.
6. **Tier 3** only where the bundle report / Lighthouse shows a real regression.

---

## 10. What I did NOT change (and why)

- **No RLS edits** — security boundary; needs a dedicated tested spec.
- **No index drops** — "unused" is traffic-dependent; reversible spec required.
- **No new dependencies** — query-persist (§3.4) carries a cross-profile staleness footgun; gated.
- **No auth rewrite** — refine, don't replace.

This is deliberate. The fastest way to _create_ a P0 (data leak, lockout, stale
cross-profile data) is to "optimize" a security or auth path without the test
scaffolding. The plan front-loads the safe, high-perceived-gain work and quarantines
the risky-but-real DB work behind proper QA gates.

---

## 11. Honest bottom line (constructive criticism)

- Your instinct that "it might be the free tier" is **correct** — that's the dominant factor, and no amount of frontend tuning fully erases a compute cold-start. Budget for Pro compute when you can; it's the highest-leverage single change.
- Until then, **the cold-start is maskable, not removable.** Tiers 1 and 1.5 will make the app _feel_ substantially faster for near-zero risk.
- The RLS policy sprawl is a **legitimate** finding and worth fixing — but it's a medium win at your data volumes and a high-blast-radius change. Don't let a perf advisor warning count stampede you into a risky mass-migration without the deny-side RLS tests. That discipline is what separates a senior fix from a self-inflicted outage.
- You've already done the frontend fundamentals well. Resist the urge to "add code splitting / cache config" advice from generic articles — you have it. Spend effort where the data points: cold-start, auth hops, then RLS.

---

### Appendix A — Sources consulted (paraphrased for licensing compliance)

- Code splitting / lazy loading is table-stakes in 2026; un-split apps ship 3–5× more initial JS and fail interaction-latency budgets. _(pagespeedmatters.com — content rephrased)_
- Real UI slowness is usually architecture, unnecessary renders, oversized bundles, and work at the wrong time — not "React being slow." _(React Systems Newsletter — content rephrased)_
- You can't beat network physics; you change how the app _feels_ under latency (skeletons, optimistic UI, prefetch). _(Next.js latency guide — content rephrased)_
- Supabase RLS optimization: wrap `auth.*()` in `(SELECT …)`, index policy-referenced columns, encapsulate deep joins in SECURITY DEFINER helpers, and avoid multiple permissive policies per action. _(Supabase RLS best-practice skills/docs — content rephrased)_

### Appendix B — Concrete next-action checklist

- [ ] Capture baseline: Lighthouse, bundle report, DevTools cold-nav trace, Supabase API p95.
- [ ] Add active-hours warm-ping to `/health`.
- [ ] Audit each dashboard/list route for instant skeleton + deferred non-critical hooks.
- [ ] Add hover/focus route+query prefetch to sidebar nav.
- [ ] Trim `AuthProvider` redundant profile fetch on `TOKEN_REFRESHED`; seed profile into cache.
- [ ] Add covering indexes for the 2 unindexed FKs.
- [ ] Re-measure; decide on RLS consolidation spec based on post-change DB p95.
