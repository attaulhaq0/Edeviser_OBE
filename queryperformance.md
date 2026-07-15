# Edeviser — Performance Audit & Optimization Program

> Principal-engineer audit of the Supabase + Postgres + RLS + Realtime + React/TanStack
> stack. **Correctness and security first; eliminate software bottlenecks before buying
> compute.** Every finding here is grounded in **live production data** pulled from project
> `cdlgtbvxlxjpcddjazzx` on 2026-07-04 (`pg_stat_statements` since its 2026-05-10 reset,
> `pg_policies`, `pg_settings`, realtime publication, advisors) — not from documentation or
> assumptions.

---

## 0. Executive summary

The application is **already ~80% aligned with industry best practice** (aggregate RPCs,
initplan-wrapped RLS, lazy routes, skeletons, `keepPreviousData`, optimistic UI). The
remaining latency has **one dominant hardware cause and a short list of software causes**,
and the software causes are worth fixing first because they reduce load at *every* compute
tier.

**The single biggest lever is hardware and it is free:** the project is on **Nano** compute
(0.5 GB RAM, shared burstable CPU *and* burstable disk IO). On the Pro plan, Nano is billed
at the *same price as Micro*, so resizing Nano → Micro is **$0 extra, doubles RAM, and
doubles baseline disk IO**, ~2 min downtime. Per your instruction we treat this as deferred,
but it is recorded as P0 because no amount of software work makes shared-burst CPU behave
like dedicated CPU.

**The dominant software symptom is concurrency, not slow SQL.** Warm queries run in ~16–19 ms;
the *same* queries spike to multiple seconds under real traffic because ~20+ concurrent
requests fight over 2 shared burstable cores. So the highest-ROI software work is **reducing
the number and CPU-cost of concurrent queries**, not rewriting individual fast queries.

### The "263 slow queries", reframed with live data

`pg_stat_statements` currently tracks **3,476 distinct normalized statements**. Of those:

| Bucket | Count |
| --- | --- |
| mean_exec_time > 100 ms | **323** |
| mean_exec_time > 500 ms | 66 |
| mean_exec_time > 1 s | **30** |
| max_exec_time > 1 s | 146 |
| Cumulative DB time tracked | 5,896,348 ms (~98 min) |

The Supabase dashboard's "263 slow queries" is a threshold slice of these. **They are not 263
independent problems.** They collapse to a handful of root causes (below). Fix ~8 root causes
and the large majority of the 263 disappear — the correct engineering response is *root-cause
elimination*, not hand-editing 263 rows (many of which are the same normalized statement, or
one-off admin/cron statements).

---

## 1. Live baseline (evidence, dated 2026-07-04)

**Compute (inferred; dashboard is source of truth):** Nano. `effective_cache_size` = 384 MB
= exactly 75% of 512 MB (Nano's 0.5 GB); `shared_buffers` = 224 MB; `max_connections` = 60;
`work_mem` ≈ 2.1 MB. Supabase does not auto-upgrade Nano→Micro on plan change, so a
Free→Pro upgrade leaves Nano hardware in place ([Supabase compute docs](https://supabase.com/docs/guides/platform/compute-and-disk)).
**Action: confirm in Dashboard → Settings → Compute and Disk.**

**Cache:** 100% cache hit ratio → this is **not** a disk-I/O problem. Cost is query
shape / RLS / repeated execution / CPU contention.

**Top statements by total DB time (live):**

| # | Statement (normalized) | Calls | Mean | Max | Total ms | Class |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `rpc get_student_dashboard` | 21 | **3,831 ms** | 6,516 ms | 80,469 | Contention (already SECURITY DEFINER) |
| 2 | `profiles` full row by id | 1,425 | 20 ms | 1,860 ms | 28,582 | Chattiness (1,425 calls) |
| 3 | `courses` list + 2 lateral joins | 56 | 154 ms | 2,879 ms | 8,622 | Query shape / contention |
| 4 | `profiles` UPDATE onboarding_completed | 15 | 572 ms | 5,656 ms | 8,587 | Contention |
| 5 | `student_gamification.xp_total` by id | 159 | 53 ms | 2,382 ms | 8,490 | Chattiness (XP badge) |
| 6 | `course_sections` + lateral | 32 | 229 ms | 1,630 ms | 7,319 | Query shape |
| 7 | `profiles.institution_id` by id | 77 | 86 ms | 1,478 ms | 6,586 | Chattiness (repeat auth-context lookup) |
| 8 | `student_gamification.level` by id | 102 | 62 ms | 968 ms | 6,355 | Chattiness |
| 9 | `student_courses` + nested lateral | 46 | 128 ms | 1,142 ms | 5,903 | Query shape |
| 10 | `submissions` + 3 lateral joins | 3 | 1,802 ms | 3,551 ms | 5,407 | Query shape (grading queue) |

**Root-cause classes (this is what actually matters):**

- **A. Concurrency/fan-out contention** — #1, #4, plus the ~20 deferred student-dashboard
  section hooks. The student dashboard fires ~1 aggregate **+ ~20** section queries within
  500 ms of mount; on 2 shared cores they self-contend.
- **B. Chattiness (same tiny row re-fetched hundreds of times)** — #2 (`profiles` 1,425×),
  #5/#8 (`student_gamification` fields fetched as separate queries), #7 (`institution_id`
  77×). These are cheap individually but multiply contention.
- **C. Query shape (lateral/embedded joins, `select *`)** — #3, #6, #9, #10.
- **D. Multiple permissive RLS policies** — OR-evaluated per row on `profiles` (5 for
  `authenticated`), `outcome_attainment` (3), `student_gamification` (3), `submissions` (4),
  `grades` (4), `xp_transactions` (2).

**RLS census (6 named tables) — good news:** every policy already uses initplan-wrapped
`(select auth.uid())` / `(select auth_user_role())` per [Supabase Splinter 0003](https://supabase.github.io/splinter/0003_auth_rls_initplan/)
**except one**: `submissions_parent_read` still calls bare `auth_user_role()`. The remaining
RLS cost is purely the *multiple permissive policies* count ([Splinter 0006](https://supabase.github.io/splinter/0006_multiple_permissive_policies/)).

**Realtime publication (10 tables):** `badges, challenge_participants, challenge_progress,
grades, notifications, outcome_attainment, student_gamification, submissions, teams,
xp_transactions`. Frontend-subscriber audit (grepped every `useRealtime` call):

| Table | Subscriber found | Verdict |
| --- | --- | --- |
| student_gamification | StudentDashboard, LeaderboardPage | keep |
| outcome_attainment | CLOProgress | keep |
| submissions | TeacherDashboard | keep |
| challenge_progress | ChallengeListPage | keep |
| challenge_participants | ChallengeListView | keep |
| **grades** | **none** | **remove (P1)** |
| **xp_transactions** | **none** | **remove (P1)** |
| badges, notifications, teams | not found in component scan | verify before removing |

---

## 1a. Fresh re-grounding (2026-07-05) — after user reset pg_stat_statements

The user reset `pg_stat_statements` (2026-07-05 13:51 UTC) and asked to "fire all queries"
+ double-check because the HAR captures are older than recent code. I repopulated stats via
an **authenticated, read-only cross-profile replay** (8 students in concurrent waves, 3
teachers, 2 coordinators, admin, 2 parents — signing in live and firing each profile's real
first-load surface) plus **controlled single-call `EXPLAIN ANALYZE`** on the aggregates.
This produced a cleaner, and in one place *corrected*, picture.

**CONTROLLED (uncontended, warm, 100% cache hit — the true intrinsic cost):**

| Call | Execution | Buffers |
| --- | --- | --- |
| `get_student_dashboard(uuid)` | **254 ms** | shared hit=3051, read=0 |
| `get_teacher_dashboard(uuid)` | **101 ms** | shared hit=2258 |
| attendance roll-up subquery (the suspected hot section) | **100 ms** | hit=1661 |

**CORRECTION to §1:** the pre-reset "`get_student_dashboard` mean 3,831 ms / top offender"
was **contention-inflated, not intrinsic**. Proof: the *same* call measured **4,979 ms while
my replay was hammering the box**, then **254 ms once the replay finished** — identical
buffers, 20× wall-clock difference. The aggregates are already fast; they only balloon under
concurrency. This is the strongest evidence yet that the bottleneck is **CPU/connection
contention on shared Nano cores, not slow SQL**.

**The per-request tax that makes fan-out expensive (live, fresh):**

| Statement | Calls | Mean | Max | Total |
| --- | --- | --- | --- | --- |
| PostgREST `set_config(role, request.jwt.claims, …)` per request | **1,007** | 28.9 ms | 1,078 ms | **29,100 ms** |
| GoTrue `INSERT INTO sessions` (sign-in) | 55 | 180 ms | 2,009 ms | 9,902 ms |
| GoTrue user lookup on auth | 77 | 49.5 ms | 806 ms | 3,812 ms |

Every PostgREST request — all ~90 in a student cold load — pays the `set_config` role/JWT
tax. At 1,007 calls it totalled 29 s and spiked to ~1 s each under load. **This cost scales
with request COUNT**, so cutting the fan-out cuts it directly. Under the concurrent burst,
even **sign-ins returned HTTP 504 (upstream timeout)** — GoTrue's small auth pool saturates
too.

**Headroom check (replay deliberately over-driven):** my replay fires each user's whole
surface at once (no ~6-conn/host cap a real browser has) and several users in parallel, so it
is heavier than one real first-load. Result: 1,253 requests, **1,224 ≥ 15 s, ~96 % aborted at
45 s**, plus auth 504s. That does *not* mean one lone user sees 96 % failures — it means the
instance has **almost no headroom**: a handful of concurrent first-loads drives Nano to
collapse (timeouts surface to the browser as 500/503/504).

**Latest-capture confirmation (`…parentstudentlatest.har.txt`, current build):** the student
first-load is still a ~90-request fan-out; `student_gamification` is still fetched as **~8
separate column-slice queries** (`xp_total`; `xp_total,level`; `level`; `streak_current`;
`leaderboard_anonymous`; `comeback_challenge_*`; `habit_difficulty_level,habit_level_streak`;
HEAD) per load; `student_wellness_preferences` / `semesters` / `wellness_habit_logs` /
`student_active_boosts` / `tutor_conversations` are the long-poles (15–37 s under load, with
503s). The only genuinely new shapes vs the older captures are `tutor_conversations`,
`tutor_usage_limits`, and the `student_activity_log` write — so the **core fan-out +
gamification chattiness diagnosis is current, not stale**.

**Net:** priorities are unchanged but sharpened. The #1 software lever remains **cut the
student cold-load request count** (fold the ~89 deferred section reads + the ~8
`student_gamification` slices into 1–3 aggregate RPCs / hydrate from the existing aggregate),
because that is what drives both the `set_config` tax and the connection-queue contention.
Nano→Micro ($0 on Pro) is the multiplier once the fan-out is lean.

## 1b. Root cause of the 40–60 s "stuck after login" (latest2 HAR, 2026-07-05)

Reconstructed the login→dashboard **waterfall** from `…parentstudentlatest2.har.txt` +
traced the render-gating code. There are **two stacked causes**:

**Cause A — the whole app blocks first paint on a network profile fetch.**
`RouteGuard` (src/router/RouteGuard.tsx L22-28) renders a **bare full-screen `<Loader2>`
spinner** whenever `useAuth().isLoading` is true, withholding the entire layout+dashboard.
`AuthProvider` (src/providers/AuthProvider.tsx) keeps `isLoading=true` (L82) until
`syncSession` **awaits a `profiles` SELECT** (L130) and only then `setIsLoading(false)`
(L143), driven by `onAuthStateChange` INITIAL_SESSION/SIGNED_IN. So nothing paints until a
DB round-trip finishes. HAR: login token `0..1092ms`, then `profiles` `1096..3576ms`
(fired **twice** — INITIAL_SESSION *and* SIGNED_IN both call syncSession). Under contention
that same SELECT was seen at 15–21 s in other captures → the bare spinner can sit for many
seconds. **Blocking the router on an async profile read is the anti-pattern.**

**Cause B — once the shell paints, a ~24-request fan-out storm makes data take 40–60 s.**
At dashboard mount the page fires the aggregate RPC + ~20 deferred section hooks + the login
write burst all at once. HAR in-flight profile: **24–25 concurrent requests at 4–7 s,
15+ concurrent until ~21 s**. On Nano's 2 shared cores they self-contend, so:
`get_student_dashboard` = **27,597 ms then HTTP 500** at t=4.5 s (the same RPC is 254 ms
uncontended), retried and finally 200 at **t=58 s**; `challenge_participants` 500 @18 s;
`habit_logs` write 500 @13.6 s (the login-burst statement_timeout cascade). KPIs/sections
therefore sit in skeleton state ~40–58 s. The dashboard is NOT a single full-page gate — it
already uses per-section skeletons + `useDeferredMount(500)` — but the deferred wave all
releases at 500 ms and storms the box.

**Fixes (map directly to the user's ask "shell shows, data fills in background"):**
- **A-fix (headline):** decouple first paint from the profile read. Gate `RouteGuard` on
  *session presence* (instant from the persisted JWT), not on `isLoading` of the profile.
  Options: (1) **role as a custom JWT claim** (auth hook) → role known at boot, zero DB read
  on the critical path — the scalable end-state; (2) **hydrate last-known role/profile from
  localStorage synchronously** and verify in background — no backend change, immediate win.
  Keep RLS as the true security boundary; the guard is UX-only.
- **B-fix:** stop the mount storm — **viewport-gate** the deferred section wave (load on
  scroll via `useInView`) so the aggregate runs mostly alone (~254 ms), consolidate the ~8
  `student_gamification` slices, and defer the login write burst until after first data.
- **C:** Nano→Micro ($0 on Pro) for headroom once A+B land.

Best-practice references: App Shell model (render shell instantly, stream content);
never block routing on async data; stale-while-revalidate + `persistQueryClient` (show
last-known data instantly, refresh in background); per-section skeletons over a global
spinner; kill request waterfalls / fan-out in favour of one aggregate + on-viewport lazy loads.

## 2. Full performance audit — by severity

Each item: **why it matters · expected impact · risk · rollout · rollback · tests · security
· scalability**.

### CRITICAL

**C1 — Nano shared-burst compute (hardware).** *Why:* shared CPU + burst disk IO is the
direct cause of the 16 ms→3.8 s gap. *Impact:* eliminates the largest single latency source.
*Risk:* ~2 min downtime. *Rollout:* dashboard resize Nano→Micro (free on Pro), then re-measure.
*Rollback:* resize down (hourly billing). *Tests:* re-run `pg_stat_statements` deltas.
*Security:* none. *Scalability:* required beyond ~1k concurrent; plan Micro→Small→Large.

**C2 — Student/Admin dashboard deferred fan-out (~20 queries).** *Why:* root cause A, the
top contention source. *Impact:* removes ~20 concurrent round-trips per cold load → less
self-contention → fewer `57014` timeouts. *Risk:* medium (touches the busiest page). *Rollout:*
expand the existing SECURITY DEFINER aggregate to cover always-on sections; delete
`useDeferredMount(500)`. *Rollback:* section hooks already fall back on aggregate error.
*Tests:* parity test (aggregate == union of section hooks) + RLS deny test. *Security:* RPC
keeps `p_student_id = (select auth.uid())` guard. *Scalability:* 1 query/dashboard scales
linearly instead of 21×.

### HIGH

**H1 — RLS multiple-permissive-policy consolidation** (profiles 5→1, outcome_attainment 3→1,
student_gamification 3→1, submissions 4→1, grades 4→2, xp_transactions 2→1). *Why:* root
cause D; the one thing more compute can't fully fix. *Impact:* fewer policy evaluations per
row on the hottest tables. *Risk:* **high — this is tenant/role isolation.** *Rollout:*
**table-by-table, gated behind full deny-side `test:rls`, one PR each.** *Rollback:* per-table
revert migration. *Security:* identical allow/deny matrix must be proven. *Scalability:*
compounds at every tier.

**H2 — No query-cache persistence.** *Why:* every reload re-runs the full cold fan-out.
*Impact:* instant paint on return visits / reloads. *Risk:* medium — **cross-profile leakage
is P0** in a multi-role app. *Rollout:* `@tanstack/query-persist-client` keyed by `user.id`,
purge on sign-out/switch. *Rollback:* feature-flag off. *Tests:* sign-in-A→persist→sign-in-B
→ assert zero A data. *Security:* cache isolation test gates the ship. *Scalability:* offloads
reads at all tiers.

**H3 — `submissions_parent_read` bare `auth_user_role()`.** *Why:* the one un-wrapped policy;
per-row function call. *Impact:* small but free. *Risk:* low. *Rollout:* wrap in
`(select …)`. *Rollback:* revert. *Tests:* deny-side parent test + before/after `EXPLAIN`.
*Security:* boolean-identical. *Scalability:* helps parent reads.

**H4 — Auth-gate serialization.** *Why:* dashboard queries wait on the profile fetch.
*Impact:* removes 1 serial hop before first data. *Risk:* medium (auth). *Rollout:* start
`user.id`-gated queries from the cached session while profile hydrates in parallel.
*Rollback:* revert. *Tests:* AuthProvider suite green + multi-role manual pass. *Security:*
no authz decision may move client-side.

### MEDIUM

**M1 — Realtime scope** (remove `grades`, `xp_transactions`; verify `badges`/`teams`/
`notifications`). *Impact:* less WAL/CPU. *Risk:* low, reversible. *Tests:* confirm no
subscriber regressions.
**M2 — Chattiness** (`profiles` 1,425×, `student_gamification` fields as separate queries).
*Impact:* fewer round-trips. *Rollout:* fold `institution_id`/role into the auth context
cache; hydrate `student_gamification` fields from the aggregate; raise `staleTime`.
**M3 — CDN/edge caching** for non-personalized reads (leaderboard shell, marketplace catalog,
public config) via `Cache-Control` + revalidation. *Security:* never cache personalized rows.
**M4 — Lazy layout waterfall** — role layout shells are themselves `lazy()`; first nav loads
layout-then-page. *Rollout:* pre-bundle the 5 shells.
**M5 — Prefetch-on-intent is chunk-only** — add `queryClient.prefetchQuery` of the route's
primary key on hover/focus.

### LOW

**L1 — Unused indexes (~70).** Defer; near-zero traffic means "unused" is unreliable. Review,
don't drop, without query-pattern confirmation.
**L2 — `extension_in_public` (vector, citext).** Cosmetic security-advisor item; defer.
**L3 — Leaked-password protection disabled.** One dashboard toggle (Auth settings).
**L4 — Heavy-dep code-split** (recharts at component level; virtualize 4k+ row tables).

---

## 3. Prioritized roadmap

| ID | Item | Effort | Expected gain | Risk | Depends on | Gate |
| --- | --- | --- | --- | --- | --- | --- |
| H3 | Wrap `submissions_parent_read` | 1 h | Small, free | Low | — | deny-side test |
| M1 | Realtime scope (grades, xp_tx) | 1 h | Less bg CPU | Low | subscriber audit ✓ | reversible |
| C2 | Student+Admin aggregate expansion | 2–3 d | **Largest software win** | Med | — | parity + RLS test |
| H4 | Parallelize auth gate | 1 d | 1 hop | Med | — | AuthProvider tests |
| H2 | Query-cache persistence | 2–3 d | Instant returns | Med | C2 | **leakage test** |
| H1 | RLS consolidation (per table) | 1 d/table | Per-row RLS cost | **High** | deny-side suite | **user confirm + test:rls** |
| M3 | CDN/edge caching | 2 d | Offload hot reads | Low | — | no personalized data |
| C1 | Nano→Micro resize | 5 min | **Largest overall** | Low | billing decision | re-measure |

**Rollout order:** H3 → M1 (safe quick wins, today) → C2 (biggest software win) → H4 → H2 →
H1 (gated, table-by-table) → M3 → then re-measure and decide C1.

---

## 4. Security review

No item here weakens security **if the gates hold**:

- **RLS consolidation (H1)** must prove an **identical allow/deny matrix** per role × table
  via deny-side `test:rls` before each table ships. Consolidation is OR-of-the-same-predicates;
  it must not broaden any row's visibility. This is the highest-risk change and is gated on
  explicit confirmation.
- **Cache persistence (H2)** must pass a **cross-profile leakage test** (A→persist→B→assert
  none-of-A). Keyed by `user.id`, purged on sign-out and role switch.
- **Aggregate expansion (C2)** keeps the RPC `SECURITY DEFINER` with the mandatory
  `p_student_id = (select auth.uid())` (or staff) guard; deny test A→B stays green.
- **Auth-gate parallelization (H4)** may start *data* queries early but **no authorization
  decision** moves to the client; RLS remains the enforcement boundary.
- **Edge/CDN (M3)** caches only non-personalized, RLS-irrelevant data.

Tenant isolation, role isolation, authentication, and data integrity are preserved by
construction + tests. Append-only invariants (evidence, audit_logs, xp_transactions) untouched.

---

## 5. Scalability review (100 → 1,000,000 users)

- **100:** Current Nano is adequate *if* C2 lands (fewer concurrent queries). Today it's
  borderline because the fan-out saturates 2 cores.
- **1,000:** Needs C2 + H1 + Micro/Small. Connection count (60 direct / 200 pooler) fine via
  Supavisor. Realtime scope (M1) matters.
- **10,000:** Needs H2 (cache persistence) + M3 (CDN offload) + Small/Medium compute +
  Supavisor **transaction** pooler for any server-side/edge Postgres access. GoTrue's fixed
  10-connection Auth cap becomes a factor — request percentage-based allocation.
- **100,000:** Read replicas for heavy read paths (leaderboard, analytics); materialized
  rollups for attainment; Large (dedicated CPU). Aggregate RPCs become essential, not optional.
- **1,000,000:** Multi-region read replicas, partitioning of append-only tables
  (`xp_transactions`, `attendance`, `audit_logs`) by time/tenant, edge-cached read APIs, and
  dedicated compute (XL+). The aggregate-RPC + per-user-cache + CDN architecture built now is
  what makes this reachable without a rewrite.

**Future bottlenecks to pre-empt:** (a) append-only tables growing unbounded → partition +
archival; (b) leaderboard/analytics fan-out → materialized views + edge cache; (c) Auth
connection cap → percentage-based; (d) realtime WAL volume → strict per-subscription filters.

---

## 6. Phase status map (1–10 from the brief)

| Phase | Status | Notes |
| --- | --- | --- |
| 1 Correctness/Security | ✅ preserved | RLS enabled all tables; gates defined above |
| 2 DB shape (RLS) | ◐ | initplan done; multi-permissive consolidation = H1 (gated) |
| 2 DB shape (indexes) | ✅/L1 | FK covering indexes done; ~70 unused deferred |
| 2 DB functions | ◐ | dashboard RPCs SECURITY DEFINER + guard; 2 authz gaps fixed earlier |
| 3 Realtime | ◐ → M1 | remove grades/xp_transactions |
| 4 API layer | ◐ → C2 | aggregate RPCs exist; student/admin still fan out |
| 5 Client data layer | ◐ | staleTime/keepPreviousData/optimistic done; **persistence missing (H2)** |
| 6 Auth flow | ◐ → H4 | double-fetch removed; still serial before dashboard |
| 7 React rendering | ✅/L4 | lazy routes/skeletons done; layout-shell waterfall (M4) |
| 8 Network/CDN | ✗ → M3 | no CDN caching of hot reads yet |
| 9 Connections | ◐ | PostgREST pooled; adopt Supavisor tx pooler for server-side |
| 10 Observability | ✗ | recommend Supabase reports + slow-query alerts + cache-hit dashboards |

---

## 7. Sources (best-practice references)

- Supabase RLS performance & initplan: [Splinter 0003](https://supabase.github.io/splinter/0003_auth_rls_initplan/),
  [0006 multiple permissive policies](https://supabase.github.io/splinter/0006_multiple_permissive_policies/),
  [RLS performance guide](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv)
- Supabase compute/scaling: [Compute and Disk](https://supabase.com/docs/guides/platform/compute-and-disk)
- TanStack Query: [request waterfalls](https://tanstack.com/query/latest/docs/react/guides/request-waterfalls),
  [prefetching](https://tanstack.com/query/latest/docs/react/guides/prefetching), persistence (`@tanstack/query-persist-client`)

_Content from external sources was rephrased for compliance with licensing restrictions._

---

_Last grounded against live project `cdlgtbvxlxjpcddjazzx` on 2026-07-04. Re-pull
`pg_stat_statements` after each change for before/after deltas._
