# RLS Consolidation & Infra Health — Design

## Overview

This spec is an **evidence ledger and triage record**, not a large implementation
effort. It formalizes the findings from a single investigation (triggered by "Pro
didn't fix the latency") into: two already-shipped reference artifacts (Req 1, 2), one
documentation correction (Req 3), one small-but-real security migration (Req 4), and
three recorded triage decisions (Req 5, 6, 7). Requirement 8 is a pointer table, not
code.

Everything here was verified against live project `cdlgtbvxlxjpcddjazzx` via read-only
`execute_sql`/`get_advisors` calls, never guessed from advisor category names alone —
that distinction is what surfaced the two real bugs in Requirement 4 that the generic
advisor WARN list did not distinguish from the dozen harmless entries next to them.

## Where this spec's work sits relative to the other three

```
                     ┌─────────────────────────────────────────┐
                     │  User question: "Pro didn't fix latency"  │
                     └───────────────────┬───────────────────────┘
                                         │ investigation (this spec)
        ┌────────────────┬───────────────┼───────────────┬────────────────┐
        │                │               │               │                │
        ▼                ▼               ▼               ▼                ▼
  compute-tiers    infra-health     docstring       2 new auth       advisor
  doc (Req 1)      report (Req 2)   correction      bugs (Req 4)     triage
  ─ DONE           ─ DONE           (Req 3)         ─ TODO           (Req 5-7)
                                    ─ TODO                            ─ TODO
        │                                │
        │        cross-references to work owned elsewhere:
        │
        ├──► dashboard-and-ux-performance   (query-shape / perceived-perf fixes)
        ├──► rls-policy-consolidation        (the actual 76-group OR-merge)
        └──► migration-history-reconciliation (ledger drift; already 21/21 done)
```

## Phased summary (Requirement 8's single table)

| Tier | Item | Owning spec | Status |
| --- | --- | --- | --- |
| 0 | Compute-tier plain-language doc | **this spec** (Req 1) | DONE |
| 0 | Reusable infra-health report + first snapshot | **this spec** (Req 2) | DONE |
| 0 | Fix `20260428000003` docstring vs. reality | **this spec** (Req 3) | DONE |
| 0 | Close 2 SECURITY DEFINER authorization gaps | **this spec** (Req 4) | DONE |
| 0 | Record SECURITY DEFINER exposure triage | **this spec** (Req 5) | DONE |
| 0 | Document least-privilege grant convention | **this spec** (Req 6) | DONE |
| 0 | Record defer/accept decisions on remaining advisors | **this spec** (Req 7) | DONE |
| 0 | Fix `AuthProvider` double profile-fetch on cold load | **this spec** (Appendix C) | DONE |
| 0 | Sequence 3 concurrent login-time writes (cascade trigger) | **this spec** (Appendix C) | DONE |
| 0 | Unsubscribed `grades`/`xp_transactions` realtime publication | **this spec** (Appendix C) | NOTED, not actioned |
| 1 | Dashboard aggregate RPCs (27→1 per role) | `dashboard-and-ux-performance` | DONE (all 5 roles) |
| 1 | `keepPreviousData`, lazy images, optimistic UI | `dashboard-and-ux-performance` | DONE |
| 1.5 | Auth round-trip trim, prefetch-on-intent, warm-ping | `dashboard-and-ux-performance` | DONE |
| 2 | **The actual 76-group RLS permissive-policy merge** | `rls-policy-consolidation` | STUB / not started |
| 2 | Per-user query-cache persistence | `dashboard-and-ux-performance` | not started (gated) |
| — | Migration ledger de-dup + drift reconciliation | `migration-history-reconciliation` | DONE (21/21) |
| — | Compute resize decision (Micro→Small/Large) | **billing decision**, no spec | awaiting human w/ billing access |

Reading this table top to bottom is the answer to "so what actually happens next."
Tier 0 is this spec, small and mostly evidence/triage. Tier 1 is done. Tier 2's biggest
item (RLS consolidation) is the one substantial piece of work still not started
anywhere, and it deliberately lives in its own spec because a careless RLS merge is a
data-leak risk, not a performance nice-to-have.

## Architecture

This spec has no new system architecture — it is a documentation/evidence-ledger
spec plus two small, targeted code fixes and one small migration. The "architecture"
is the investigation methodology: every finding is verified against the LIVE Supabase
project (`execute_sql`, `get_advisors`, `pg_get_functiondef`) or the LIVE production
HAR/`pg_stat_statements` evidence the user supplied — never inferred from an advisor
category name or a tool's summary output alone. Where a tool (search) was later found
to have given a false result, that is recorded rather than silently corrected (see
Appendix C.3).

## Components and Interfaces

- `docs/operations/supabase-compute-tiers.md` — the persistent explanation doc
  (Requirement 1), later extended with the Requirement 5/7 triage/defer tables as
  appendices.
- `scripts/infra-health-report.{sql,ps1,sh}` — the reusable report (Requirement 2).
- `supabase/migrations/20260428000003_optimize_rls_policies.sql` — comment-only
  correction (Requirement 3).
- `supabase/migrations/20260704200235_fix_authz_gaps_department_delete_and_earn_spend_ratio.sql`
  — the authorization-gap fix + `anon`-grant hygiene narrowing (Requirement 4, 6.3).
- `.kiro/steering/supabase-patterns.md` — the least-privilege grant convention
  (Requirement 6).
- `src/providers/AuthProvider.tsx` + its test file — the two Appendix C code fixes
  (double profile-fetch, sequenced login writes). No new component was created;
  both fixes are behavioral changes to an existing provider.

## Data Models

No new tables, columns, or types. The two `CREATE OR REPLACE FUNCTION` statements in
the Requirement 4 migration preserve their exact pre-existing signatures and return
shapes (`delete_department_if_no_programs(uuid) RETURNS boolean`;
`get_earn_spend_ratio(uuid) RETURNS TABLE(total_earned bigint, total_spent bigint,
ratio numeric, status text)`) — only their internal logic gained an authorization
guard.

## Requirement 3 — Docstring correction, mechanically

**What actually happened, with evidence:**

`20260428000003_optimize_rls_policies.sql`'s header comment says:

> Consolidates redundant permissive policies where possible

But reading the actual SQL body: every table section is `DROP POLICY` (old name) +
`CREATE POLICY` (same name, same predicate, wrapped in `(select ...)`). Not one section
merges two policies into one with `OR`. For example, PROFILES drops and recreates
`profiles_read_own`, `profiles_admin_read_institution`, `profiles_admin_write`,
`profiles_teacher_read_students`, `profiles_coordinator_read` — five separate
policies, going in as five and coming out as five. The live
`multiple_permissive_policies` advisor finding on `profiles` today lists exactly those
five (plus one more added later, `profiles_anon_public_portfolio`) as still-separate
policies.

**The fix is comment-only.** Per `migration-replay-integrity`, this migration is
already recorded in `Remote_History` — its `CREATE POLICY`/`DROP POLICY` statements
must not change (that would be altering executed history). Only the header comment
text changes, to something like:

```sql
-- ============================================================
-- Migration: RLS Policy InitPlan Optimization
-- Replaces bare auth.uid() with (select auth.uid())
-- Replaces bare auth_user_role() with (select auth_user_role())
-- Replaces bare auth_institution_id() with (select auth_institution_id())
-- Date: 2026-04-28
-- ============================================================
-- IMPORTANT: This migration preserves ALL existing policy logic and ALL
-- existing policy COUNTS per table. It only optimizes the evaluation
-- pattern (InitPlan) so auth.<fn>() is evaluated once per query instead of
-- once per row. It does NOT merge multiple permissive policies into one —
-- despite an earlier version of this comment claiming otherwise. The actual
-- multiple-permissive-policy consolidation (advisor: multiple_permissive_policies,
-- 76 groups as of 2026-07-04) is tracked separately in
-- .kiro/specs/rls-policy-consolidation/ and has NOT yet been done.
-- Security audit RLS fixes (Vulns 14-27) are preserved.
-- ============================================================
```

`supabase-audit-remediation/tasks.md` Task 3.4 gets an appended note (not a status
change — it correctly shipped the initplan-wrapping it actually did) pointing at this
finding and at `rls-policy-consolidation` as the real owner of the unfinished half.

## Requirement 4 — The two authorization gaps, with the exact fix

Both were found by reading `pg_get_functiondef` for every `SECURITY DEFINER` function
flagged by the security advisors, rather than trusting the advisor's flat WARN list —
the advisor cannot distinguish "has an internal guard" from "has no guard at all," so
this distinction required manually diffing each function body against the pattern
used by its correctly-guarded siblings (`get_wellness_aggregate_stats`,
`get_leaderboard_page`).

### Gap 1 — `delete_department_if_no_programs(dept_id uuid)`

Live body (verbatim, confirmed via `pg_get_functiondef`):

```sql
CREATE OR REPLACE FUNCTION public.delete_department_if_no_programs(dept_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  deleted_id uuid;
BEGIN
  DELETE FROM public.departments
  WHERE id = dept_id
    AND NOT EXISTS (
      SELECT 1 FROM public.programs WHERE department_id = dept_id
    )
  RETURNING id INTO deleted_id;

  RETURN deleted_id IS NOT NULL;
END;
$function$
```

No role check. No institution check. `EXECUTE` is granted to `authenticated`
(confirmed via the live snapshot's `securityDefinerRpcExposure`). Any signed-in user —
student, parent, whoever — can call
`POST /rest/v1/rpc/delete_department_if_no_programs {"dept_id": "<any-uuid>"}` and
delete that department, for any institution, as long as it happens to have zero
programs attached. This is a real authorization bug: `SECURITY DEFINER` means it runs
with the function owner's privileges, bypassing whatever RLS would otherwise have
blocked a non-admin from touching `departments`.

**Fix** (additive forward migration, `CREATE OR REPLACE FUNCTION` — same signature,
same return contract, so no call-site or type-regen impact):

```sql
CREATE OR REPLACE FUNCTION public.delete_department_if_no_programs(dept_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  deleted_id uuid;
BEGIN
  IF (select public.auth_user_role()) <> 'admin' THEN
    RAISE EXCEPTION 'unauthorized: admin role required' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.departments
  WHERE id = dept_id
    AND institution_id = (select public.auth_institution_id())
    AND NOT EXISTS (
      SELECT 1 FROM public.programs WHERE department_id = dept_id
    )
  RETURNING id INTO deleted_id;

  RETURN deleted_id IS NOT NULL;
END;
$function$;
```

Guard follows the exact convention already used by `get_wellness_aggregate_stats`
(role/institution check that raises before touching data) and the `supabase-patterns`
admin-scoping template. `boolean` return contract unchanged: `true` iff a row was
actually deleted, `false` for wrong-institution/has-programs/not-found/not-admin (the
generic `false` for a non-admin caller intentionally does not distinguish "wrong role"
from "not found" in the return value, matching how the original function already
folded "has programs" and "doesn't exist" into the same `false` — only the `RAISE
EXCEPTION` for wrong role is new signal, deliberately, since a 42501 error is the
correct signal for "you can't do that" rather than a silent `false`).

### Gap 2 — `get_earn_spend_ratio(p_institution_id uuid)`

Live body (verbatim):

```sql
CREATE OR REPLACE FUNCTION public.get_earn_spend_ratio(p_institution_id uuid)
 RETURNS TABLE(total_earned bigint, total_spent bigint, ratio numeric, status text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH earned AS (
    SELECT COALESCE(SUM(xt.xp_amount), 0) AS total
    FROM xp_transactions xt
    JOIN profiles p ON p.id = xt.student_id
    WHERE p.institution_id = p_institution_id
  ),
  spent AS ( ... same p_institution_id filter ... )
  SELECT earned.total, spent.total, ...
  FROM earned, spent;
$function$
```

This is the XP-Economist-Dashboard institution-wide rollup from the `xp-marketplace`
spec (Req: "THE XP_Economist_Dashboard SHALL display the current Earn_Spend_Ratio for
the institution"). It takes `p_institution_id` as a caller-supplied argument and
never checks it against the caller's own institution. Contrast directly with its
sibling `get_wellness_aggregate_stats`, which takes the same shape of argument and
opens with:

```sql
IF public.auth_institution_id() != p_institution_id THEN
  RAISE EXCEPTION 'unauthorized: institution mismatch';
END IF;
```

`get_earn_spend_ratio` has no equivalent line. Any authenticated user at Institution A
can pass Institution B's id and read B's total XP earned/spent and inflation status.
This is a real cross-tenant data exposure, even though the data is aggregate (not
row-level personal data) — institution-level financial-style metrics are still
something one institution should not be able to see for another, and the platform's
own multi-tenancy model (`institution_id` scoping everywhere else) treats this as a
boundary.

**Fix** (additive forward migration, same signature/return shape):

```sql
CREATE OR REPLACE FUNCTION public.get_earn_spend_ratio(p_institution_id uuid)
 RETURNS TABLE(total_earned bigint, total_spent bigint, ratio numeric, status text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH auth_check AS (
    SELECT CASE WHEN public.auth_institution_id() != p_institution_id
      THEN (SELECT 1/0) -- forces a division-by-zero error inline in `sql`-language fns
    END
  ),
  earned AS ( ... unchanged ... ),
  spent AS ( ... unchanged ... )
  SELECT earned.total, spent.total, ...
  FROM auth_check, earned, spent;
$function$;
```

Because this function is `LANGUAGE sql` (not `plpgsql`), it cannot use
`IF ... THEN RAISE EXCEPTION` directly — `plpgsql` is required for procedural
`RAISE`. The two lowest-risk equivalents are: (a) convert the function body to
`plpgsql` with a proper `IF ... RAISE EXCEPTION` guard (preferred — matches the
sibling functions' style exactly and gives a clean `42501`/custom error instead of a
confusing division-by-zero), or (b) keep `sql` and use the division-by-zero trick
shown above (works but produces an opaque error). **Decision: use (a)** — convert to
`plpgsql`, mirroring `get_wellness_aggregate_stats` exactly:

```sql
CREATE OR REPLACE FUNCTION public.get_earn_spend_ratio(p_institution_id uuid)
 RETURNS TABLE(total_earned bigint, total_spent bigint, ratio numeric, status text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF public.auth_institution_id() != p_institution_id THEN
    RAISE EXCEPTION 'unauthorized: institution mismatch';
  END IF;

  RETURN QUERY
  WITH earned AS (
    SELECT COALESCE(SUM(xt.xp_amount), 0) AS total
    FROM xp_transactions xt
    JOIN profiles p ON p.id = xt.student_id
    WHERE p.institution_id = p_institution_id
  ),
  spent AS (
    SELECT COALESCE(SUM(xp.xp_cost), 0) AS total
    FROM xp_purchases xp
    JOIN marketplace_items mi ON mi.id = xp.item_id
    WHERE mi.institution_id = p_institution_id AND xp.status != 'refunded'
  )
  SELECT
    earned.total AS total_earned,
    spent.total AS total_spent,
    CASE WHEN spent.total > 0 THEN ROUND(earned.total::NUMERIC / spent.total, 2) ELSE NULL END,
    CASE
      WHEN spent.total = 0 THEN 'no_spending'
      WHEN earned.total::NUMERIC / spent.total > 5 THEN 'inflationary'
      WHEN earned.total::NUMERIC / spent.total < 2 THEN 'deflationary'
      ELSE 'healthy'
    END
  FROM earned, spent;
END;
$function$;
```

### Verification plan for both fixes

Rolled-back `execute_sql` probes (no persisted side effects), for each function:

1. Impersonate a non-admin/wrong-institution caller via
   `set local role authenticated; select set_config('request.jwt.claims', ..., true);`
   → assert the call now raises (`42501` / `unauthorized`) instead of silently
   succeeding or leaking data.
2. Impersonate the legitimate caller (admin in the department's own institution;
   any user in their own institution) → assert the call still returns the same
   value it would have before the fix (regression-free for the legitimate path).
3. Confirm via `grep_search` across `src/` and `supabase/functions/` that neither RPC
   currently has a live caller — recorded so this reads as "closing a latent exposure,"
   not "fixing an observed incident," which affects how urgently it needs to ship.

Both changes are a single migration
(`supabase/migrations/<timestamp>_fix_authz_gaps_department_delete_and_earn_spend_ratio.sql`),
applied via `apply_migration`, `npm run db:check-replay` clean, Supabase Preview green
before merge — standard gate, no exception.

## Requirement 5 — Triage table (for the design doc / ops doc)

| Function | Grantee(s) | Category | Evidence |
| --- | --- | --- | --- |
| `auth_institution_id` | anon, authenticated | intentional-public | RLS helper fn itself |
| `auth_user_role` | anon, authenticated | intentional-public | RLS helper fn itself |
| `consume_invitation(text)` | anon, authenticated | intentional-public | token-gated by design |
| `get_invitation_by_token(text)` | anon, authenticated | intentional-public | token-gated by design |
| `is_portfolio_publicly_accessible(uuid)` | anon, authenticated | intentional-public | opt-in flag gated |
| `portfolio_public_access(uuid)` | anon, authenticated | intentional-public | opt-in flag gated |
| `get_student_dashboard(uuid)` | anon, authenticated | intentional-internal-guard (hygiene: narrow `anon`) | fail-closed `v_sid := null` on mismatch |
| `get_teacher_dashboard(uuid)` | anon, authenticated | intentional-internal-guard (hygiene: narrow `anon`) | fail-closed `v_tid := null` on mismatch |
| `fan_out_announcement_notifications(uuid)` | authenticated | intentional-internal-guard | `author_id = caller` check, raises 42501 |
| `send_teacher_nudge(uuid, text)` | authenticated | intentional-internal-guard | teaches-student check, raises 42501 |
| `get_leaderboard_page(uuid, int, int)` | authenticated | intentional-internal-guard | institution-mismatch raise |
| `get_wellness_aggregate_stats(uuid)` | authenticated | intentional-internal-guard | institution-mismatch raise |
| `get_badge_spotlight(uuid, int)` | authenticated | intentional-public (low sensitivity) | deterministic pick, no cross-tenant data |
| `course_material_institution(text)` | authenticated | intentional-internal-guard | storage-RLS helper, not a direct leak |
| `get_historical_evidence(text, text)` | authenticated | intentional-internal-guard | `auth_user_role() <> 'admin'` → zero rows |
| `delete_department_if_no_programs(uuid)` | authenticated | **fix-now** | Requirement 4 Gap 1 |
| `get_earn_spend_ratio(uuid)` | authenticated | **fix-now** | Requirement 4 Gap 2 |

This table is copied into `docs/operations/supabase-compute-tiers.md` as an appendix
(or a sibling `docs/operations/security-definer-exposure-triage.md` if the compute doc
is judged to be getting too long — decide at implementation time based on the doc's
resulting length) so it's discoverable without re-running `pg_get_functiondef` on
seventeen functions again.

## Requirement 6 — The convention, and why it matters here specifically

Both Requirement 4 gaps trace to the same root cause: Postgres's default
`GRANT EXECUTE ... TO PUBLIC` on function creation, never explicitly revoked. The
correctly-guarded functions in the same codebase (`get_wellness_aggregate_stats`,
`get_leaderboard_page`, `fan_out_announcement_notifications`) didn't fix this by
narrowing the grant — they fixed it by making the exposure safe-by-construction with
an internal guard. That's a valid pattern and the one this spec's Requirement 4 fixes
follow. But it depends on every author remembering to add the guard; nothing stops a
future function from being created without one, silently inheriting the same
`PUBLIC` grant.

The convention documented in `.kiro/steering/supabase-patterns.md` (or this design doc
if that file's maintainers prefer new patterns land here first) is simple: **treat the
default grant as a bug waiting to happen, not a convenience.** Either revoke-and-narrow
explicitly, or guard internally — never ship a third option ("assume nobody will call
it directly"), which is exactly how both Requirement 4 gaps happened.

## Correctness Properties

### Property 1: No legitimate caller is ever rejected

For both Requirement 4 fixes, a caller who was already entitled to the pre-fix
behavior (an admin deleting a department in their own institution; any user reading
their own institution's XP-economy ratio) continues to succeed identically —
verified by the Task 5.4 rolled-back probes.

**Validates: Requirements 4.2, 4.4**

### Property 2: Every illegitimate caller is now rejected

A non-admin cannot delete any department via the RPC; a caller cannot read another
institution's XP-economy data — verified by the same probes' negative cases.

**Validates: Requirements 4.1, 4.3**

### Property 3: The profile-fetch fix changes call count, not data

`AuthProvider` resolves to the exact same `user`/`profile`/`role`/`institutionId`
state as before, fetched once instead of twice — verified by the full
`AuthProvider.test.tsx` suite (23/23), including the new explicit "exactly once"
regression test.

**Validates: Appendix C.2 (no formal requirement number)**

### Property 4: The sequenced-writes fix changes timing, not outcome

The 3 login-time steps (habit upsert → perfect-day check, `process-streak`,
`award-xp`) still all run, in the same relative order, with the same idempotency
guarantees — only their concurrency changed from "all at once" to "one after
another."

**Validates: Appendix C.1 (no formal requirement number)**

## Error Handling

- Both Requirement 4 guards use `RAISE EXCEPTION` (mapped to Postgres error code
  `42501` for the role check, a generic raise for the institution-mismatch check),
  which PostgREST surfaces as an HTTP error to the caller — the correct signal for
  "you are not allowed to do this," distinct from a silent `false`/empty result.
- The Appendix C.2 fix has no new error paths — it removes a redundant call, so
  there is one fewer place a transient error could originate from, not more.
- The Appendix C.1 fix explicitly preserves independent `try/catch` around each of
  the 3 sequenced steps, so a failure in step 1 (habit upsert) cannot prevent step 2
  (`process-streak`) or step 3 (`award-xp`) from still being attempted — matching
  the pre-fix fire-and-forget failure isolation, just sequenced.

## Testing Strategy

- Requirement 4: rolled-back live SQL probes (`execute_sql` inside `BEGIN...ROLLBACK`)
  impersonating both a rejected and an accepted caller for each function — no
  persisted test data, no schema/test-fixture changes needed.
- Appendix C.2/C.1: existing Vitest unit tests in `AuthProvider.test.tsx`, extended
  with one new explicit regression test (`mockGetSession` not called, `mockFrom`
  called exactly once) and updated mocks for the other tests that depend on the
  auth-state-change flow. Full suite re-run (5907/5908 pass, 1 pre-existing unrelated
  failure) plus scoped and full-repo lint/typecheck, per this workspace's
  verification rules.
- No new automated test was added for the connection-cascade fix's actual effect
  (reduced 500/503 frequency under real concurrent load) — that requires live
  traffic and is explicitly noted as unmeasured in tasks.md's Notes section.

## Non-goals (explicit)

- This spec does NOT implement the `rls-policy-consolidation` 76-group merge. That
  spec's own gating (deny-side `test:rls` per table, one table per PR) stands
  unchanged.
- This spec does NOT resize compute. That's a billing decision for a human with
  billing access, informed by Requirement 1's recommendation matrix.
- This spec does NOT re-triage anything `migration-history-reconciliation` already
  closed (`security_definer_view` on `leaderboard_weekly`, `anonymize_user` grants,
  `pgcron`/`prevent_mutation` search_path) — cross-referenced as done, not redone.
- This spec does NOT retroactively add explicit revoke/grant lines to every
  intentional-public/intentional-internal-guard function in the Requirement 5 table.
  Those are already safe; touching them is optional cleanup with no urgency.


## Appendix C — Additional root causes from live evidence (2026-07-04)

The user supplied a `pg_stat_statements` export (`queryperformance.md`) and 6
production HAR captures (per-role + a detailed teacher-login trace) and asked for
root causes of "a lot of other errors and performance issues." This section records
what that evidence showed, a correction to a finding this investigation initially got
wrong, and the two fixes that shipped from it.

### C.1 — The connection-poisoning cascade, confirmed live

A prior investigation (outside this spec, referenced in the session's carried-over
context) theorized a "poisoned pooled connection" pattern from PG error codes alone,
but never confirmed it against real traffic or shipped a fix. The HAR evidence now
proves it directly. From `har-latest-analysis.txt` (a detailed request trace):

```
t+6344ms status=500 wait=21140ms POST /rest/v1/habit_logs
    BODY: {"code":"57014", message:"canceling statement due to statement timeout"}
t+6348ms status=500 wait=21544ms POST /functions/v1/award-xp
t+6461ms status=500 wait=7590ms  HEAD /rest/v1/notifications
t+6668ms status=500 wait=10036ms GET  /rest/v1/student_gamification
    BODY: {"code":"25P02", message:"current transaction is aborted, ..."}
t+6676ms .. t+6683ms: 8 more unrelated GETs, all 25P02, all in a ~340ms window
```

Twelve+ unrelated requests (`student_profiles`, `institution_settings`,
`micro_assessment_schedule`, `badge_spotlight_schedule`, `badges`, `student_courses`
×2, `student_gamification` ×2) fail with `25P02` in the ~340ms window immediately
following the `habit_logs` timeout — a burst pattern, not independent coincidences.

**Root cause:** `AuthProvider.signIn()`'s student engagement loop fired 3 writes for
the SAME student concurrently on every login: a `habit_logs` upsert (chained into
`awardPerfectDayIfComplete`, which itself does more reads/writes), a `process-streak`
edge-function invoke, and an `award-xp` edge-function invoke. None of the three
awaited any of the others — all three, plus the login's own already-fired dashboard
queries, land on the database in the same short window. This measurably increases the
odds that at least one write exceeds the `authenticated` role's 8s `statement_timeout`,
and the surrounding burst of unrelated requests in the same window then fails too.

`challenge_participants` (0 live rows), `student_wellness_preferences`, `semesters`,
and `wellness_habit_logs` are the tables that show up most often in the 500/503 lists
across the HAR captures — verified this is because they are among the most
frequently-polled tables on the student dashboard, not because of any defect in their
own query or RLS shape (`challenge_participants`' 3 RLS policies were read and are
correctly scoped; its row count is genuinely 0 in production).

**Fix shipped:** `AuthProvider.signIn()`'s 3-step engagement loop was changed from
"fire all 3 concurrently, `.catch()` each independently" to "run all 3 sequentially in
one `async` IIFE, each still independently `try/catch`-guarded." The whole chain
remains fire-and-forget relative to `signIn`'s return (the function has already
returned by the time this runs), so this costs nothing in perceived login speed while
cutting this flow's peak concurrent DB load from 3-at-once to 1-at-a-time for the
highest-frequency trigger of the cascade. This does not eliminate every possible
cause of the cascade (other concurrent-write call sites may exist elsewhere in the
app), but it removes the specific, HAR-confirmed trigger.

**What this fix does NOT do:** it does not raise the 8s `statement_timeout`, does not
add retry/circuit-breaker logic to the PostgREST client, and does not sanitize the
raw `57014`/`25P02` codes into a friendlier UI message (that sanitization was
identified as a separate, not-yet-implemented task in an earlier, unrelated
investigation — `src/lib/queryClient.ts`'s `getErrorMessage()` — and remains open).

### C.2 — `AuthProvider` double-fetches the profile on every cold load

`har-analysis.txt`'s chronological first-40-requests waterfall shows:

```
t+0ms   21787ms  GET /rest/v1/profiles
t+1ms   21693ms  GET /rest/v1/profiles
t+2ms   21780ms  GET /rest/v1/profiles
```

Three concurrent `profiles` SELECTs for what is a single user's single page load,
each blocking the dashboard (every dashboard hook is `enabled: !!studentId`, and
`studentId` only exists after the profile resolves).

Verified directly against the installed `@supabase/auth-js` source
(`node_modules/@supabase/auth-js/dist/main/GoTrueClient.js`): `onAuthStateChange()`
unconditionally schedules a call to `_emitInitialSession()` immediately upon
registration, which resolves the current session via the same internal `_useSession`
path that `getSession()` itself uses, then emits an `INITIAL_SESSION` event. This is
not conditional on whether the caller also called `getSession()` separately.

`AuthProvider`'s bootstrap effect called BOTH:
```ts
supabase.auth.getSession().then(({data:{session}}) => syncSession(session));
supabase.auth.onAuthStateChange((event, session) => {
  // case "INITIAL_SESSION": syncSession(session); ...
});
```
Both paths call `syncSession`, which unconditionally calls `fetchProfile` (a
`profiles` SELECT) — two independent network round-trips for the same user on every
single cold load, confirmed as a real, reproducible bug rather than a HAR artifact
(the HAR's `pageref` was verified to be a single page, ruling out a multi-tab
explanation).

**Fix shipped:** removed the explicit `getSession()` call entirely; the existing
`case "SIGNED_IN": case "INITIAL_SESSION":` branch (already present, already calling
`syncSession`) is now the sole path that restores a persisted session. Verified via
the auth-js source that this loses no functionality — `INITIAL_SESSION` always fires
on registration and always carries the current (possibly null) session.

Note: the HAR showed 3 concurrent calls, and this fix directly explains 2 of them.
An exhaustive `Select-String` sweep of `src/` for any other independent `profiles`
reader on mount found none (`ThemeProvider`/`LanguageProvider` both consume `profile`
from `useAuth()` rather than querying `profiles` themselves, and only write on
user-initiated preference changes). The exact source of the 3rd concurrent call was
not conclusively identified — it may be a React 18 double-invoke artifact specific to
how the captured build was served, a retry, or something not caught by static search.
This is recorded honestly rather than papered over: the 2-call duplication from
`AuthProvider` is a confirmed, fixed bug; the 3rd call's exact origin remains
unresolved.

### C.3 — Self-correction: `useRealtime` is NOT dead code

An earlier pass in this same session used the `grep_search` tool to check for any
consumer of the `useRealtime` hook and got zero matches, leading to an incorrect
conclusion that it was dead code and that the ~52% of captured `pg_stat_statements`
total time spent in `realtime.list_changes` was therefore pure waste with a
zero-risk fix (dropping the tables from the `supabase_realtime` publication).

Before acting on that conclusion, a sanity check was run: searching for a pattern
(`import.*useAuth`) known with certainty to exist in dozens of page files. That
search ALSO returned zero matches, revealing the tool was giving false negatives in
that session rather than reporting a real absence. Every subsequent verification in
this appendix was redone with `Select-String` (PowerShell) instead, which does not
exhibit the same failure.

Corrected finding: `useRealtime` is genuinely used. `useChallengeRealtime`,
`useTeamRealtime`, and `useNotificationRealtime` all call it internally, and it is
also called inline in `StudentDashboard.tsx`, `TeacherDashboard.tsx`,
`LeaderboardPage.tsx`, `ChallengeListView.tsx`/`ChallengeListPage.tsx`,
`CLOProgress.tsx`, and `useTeamBadges.ts`. Of the 10 tables in the
`supabase_realtime` publication, 8 have a confirmed real subscriber. Only `grades`
and `xp_transactions` do not (Task 12.4 — noted, not actioned this session; the cost
of an unsubscribed publication member is real but modest — WAL/replication overhead,
not a request-blocking one — and removing publication membership is a schema change
that deserves its own verification pass, not a same-session addendum to two
already-shipped code fixes).

This correction is recorded in detail specifically so a "useRealtime is dead code"
claim does not resurface as settled fact in a future session without this context.
