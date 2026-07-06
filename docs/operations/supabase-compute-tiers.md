# Supabase Compute Tiers — Plain-Language Reference

> **Why this doc exists:** we upgraded the Supabase organization to the **Pro plan**
> expecting the student dashboard (and every other dashboard) to get faster. It didn't.
> This doc explains exactly why, in plain language, and gives a recommendation matrix
> for what to do next. It is the persistent reference for that explanation — don't
> re-derive it from scratch next time someone asks "didn't we already pay to fix this?"

## The one-sentence answer

**"Pro plan" and "compute size" are two different bills.** Upgrading the org to Pro
did not resize the database — it just made the small database size we were already on
free instead of billed. The database itself never got bigger or faster.

## Two separate things Supabase charges for

Supabase billing has two independent axes that are easy to conflate:

1. **Organization plan** (Free / Pro / Team / Enterprise) — this controls _limits and
   features_: how many MAUs, how much egress, log retention, SSO, support SLAs, daily
   backups, etc. This is the thing the pricing page markets. **It does not by itself
   determine how fast your database is.**
2. **Per-project Compute size** (Nano / Micro / Small / Medium / Large / XL / …) — this
   is a literal dedicated Postgres server size (CPU + RAM), billed **per project, per
   hour**, completely independent of the org plan. This is the thing that actually
   determines query latency under load.

Every Supabase project — on any plan — runs on one of these compute sizes. The org plan
just changes how that compute is billed and what else you get.

## The mechanic that caused the confusion: the $10/month compute credit

The Pro (and Team) plan includes a **$10/month compute credit**, and a Micro instance
costs almost exactly $10/month (`$0.01344/hour × ~730h ≈ $10`). So on Pro, **one
project's Micro compute is effectively free** — the credit cancels the bill.

This is exactly what our own Supabase billing dashboard showed after the upgrade: a
message saying we were "already paying for Micro Compute" with $0 additional charge.
That line is not a bug or a discount — it is the credit doing exactly what it's designed
to do. It also means the upgrade to Pro, by itself, changed **$0 → $0** on the compute
line. Nothing was resized.

Source: [Manage Compute usage](https://supabase.com/docs/guides/platform/manage-your-usage/compute),
[Your monthly invoice](https://supabase.com/docs/guides/platform/your-monthly-invoice) —
paraphrased for compliance with licensing restrictions.

## What Pro _did_ actually change for us

Real, non-placebo benefits from the Pro upgrade:

- Daily backups (Free plan has none)
- 7-day log retention instead of 1 day (this is how we can even pull `pg_stat_statements`/advisor history for this investigation)
- No more 7-day inactivity auto-pause
- Higher MAU / egress / edge-function-invocation limits
- Access to the compute add-on menu at all (Free plan is locked to Nano)

None of these move query latency. They're org-level, not per-project-hardware-level.

## Confirmed live: we are still on Micro compute

Live config pulled directly from project `cdlgtbvxlxjpcddjazzx` (`Edeviser-Kiro`,
`ap-northeast-1`, Postgres 17.6, org plan = **Pro**):

| Setting                | Live value                         | Matches                                                                            |
| ---------------------- | ---------------------------------- | ---------------------------------------------------------------------------------- |
| `max_connections`      | 60                                 | Nano **or** Micro only (Small=90, Medium=120)                                      |
| `shared_buffers`       | 28,672 × 8kB ≈ 224 MB              | ~1/4 of Micro's 1 GB RAM (Postgres default `shared_buffers = 25%` of instance RAM) |
| `effective_cache_size` | 49,152 × 8kB ≈ 384 MB              | consistent with a 1 GB instance                                                    |
| CPU                    | 2-core ARM, **shared** (burstable) | Micro/Small/Medium share this; only Large+ get dedicated cores                     |

This is the official Micro spec, for reference (source:
[Compute and Disk](https://supabase.com/docs/guides/platform/compute-and-disk.md),
paraphrased):

| Compute Size         | ~Monthly | CPU                       | Memory   | Max DB connections | Pooler max clients |
| -------------------- | -------- | ------------------------- | -------- | ------------------ | ------------------ |
| Nano (free only)     | $0       | shared                    | 0.5 GB   | 60                 | 200                |
| **Micro (us today)** | **~$10** | **2-core ARM, shared**    | **1 GB** | **60**             | **200**            |
| Small                | ~$15     | 2-core ARM, shared        | 2 GB     | 90                 | 400                |
| Medium               | ~$60     | 2-core ARM, shared        | 4 GB     | 120                | 600                |
| Large                | ~$110    | 2-core ARM, **dedicated** | 8 GB     | 160                | 800                |
| XL                   | ~$210    | 4-core ARM, dedicated     | 16 GB    | 240                | 1,000              |

The jump from Medium → Large is the important one: it's the first tier where the CPU
stops being shared with other tenants' bursts and becomes dedicated. Given our
measured symptom (SQL is ~18ms warm, but the _same_ query spikes to 6-7 seconds under
real traffic), we are CPU-contention-bound, not query-plan-bound — so Large is the tier
that actually targets our specific bottleneck, not just "bigger."

## Why the app still feels slow on Micro (evidence, this project)

- A representative dashboard RPC runs in **~16-19ms** warm (`EXPLAIN ANALYZE`, service
  role, no contention) — the SQL and indexes are fine.
- The _same_ RPC measured via real client calls (`pg_stat_statements`) shows **mean
  1.5-3.8s, max 6.9s**, over dozens of calls. That's a ~100-400x gap between "the query"
  and "what the user feels."
- The `authenticated` Postgres role has an **8-second `statement_timeout`** (`anon` =
  3s). Real calls already spike to 6.9s — comfortably close enough to 8s that any extra
  load (another user, a cron tick, realtime WAL replay) pushes some fraction of calls
  over the line and Postgres cancels them (`57014 canceling statement due to statement
timeout`), which is the "sometimes it just doesn't load" symptom.
- `profiles` has 124 rows but 196,034 index scans — the client re-fetches far more than
  the data volume justifies (chattiness), which multiplies how often concurrent
  short-lived queries collide on the same shared 2 vCPUs.
- None of this is a data-volume problem. Every table in the project is small
  (`profiles`=124 rows, largest table `job_run_details`=5MB). A fully-indexed read of a
  few dozen rows should never take seconds — and on a quiet instance, it doesn't. The
  slowdown shows up specifically when the shared CPU is busy with someone/something
  else at the same moment.

**In short: this is shared-CPU burst throttling, not a missing index and not "Pro not
applying."** Pro applied correctly; it just doesn't touch this axis.

## Recommendation matrix

| Situation                                                                      | Recommendation                                                                                                                                                                                                                                                                                                                         |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pilot/demo traffic, tolerant of occasional slow loads, cost-sensitive          | Stay on Micro, ship the query-shape fixes already in `dashboard-and-ux-performance` (aggregate RPCs, fewer round-trips, standardized `staleTime`) — these reduce _how often_ you cross the 8s timeout even on shared CPU. This is "quiet enough for free tier," not "fast."                                                            |
| Demoing to investors/pilot institutions, needs to _feel_ instant               | Upgrade to **Small** (~$15/mo, still shared CPU but 2x the RAM/connections) as a cheap first step; re-measure. If still spiky under a live-audience demo, go to **Large** (~$110/mo) — this is the first tier with **dedicated** (non-bursty) CPU, which directly targets the measured contention pattern above.                       |
| Real multi-institution production traffic                                      | Budget **Large** or above from the start. Query-shape fixes still matter (they reduce total load and therefore cost at every tier), but they cannot fully substitute for dedicated CPU once concurrent real users are involved — this is the "honest ceiling" the `dashboard-and-ux-performance` spec's Appendix A/B already call out. |
| Considering a temporary boost for a single big event (demo day, investor call) | Compute changes apply with **under ~2 minutes of downtime** and bill **hourly** — you can size up for the event and back down after. Don't leave it sized up by accident; it's a recurring hourly charge, not a one-time fee.                                                                                                          |

Compute size changes are made from **Project Settings → Compute and Disk** in the
Supabase dashboard, or `mcp_power_supabase_hosted_supabase_*` doesn't currently expose a
resize call — it's a dashboard-only action today. This is a **billing decision**, not an
engineering one — flagging it here rather than making the change; someone with
billing access should choose the tier from the matrix above.

## The one thing compute upgrades do NOT fix

Two issues found in this same investigation are **not** solved by more compute at all:

1. **`multiple_permissive_policies` (RLS)** — several tables evaluate 2-4 separate
   permissive RLS policies per row per query (see
   `.kiro/specs/rls-consolidation-and-infra-health/`). More CPU makes this cheaper per
   query, but the query is still doing redundant work. This is a query-shape fix, gated
   and tracked separately (`rls-policy-consolidation` spec).
2. **`auth_db_connections_absolute`** — the Auth server (GoTrue) is hardcoded to a
   fixed max of 10 database connections **regardless of compute size**. Upsizing compute
   alone does not increase Auth throughput; that requires switching Auth's connection
   allocation to percentage-based (a support-ticket / config change, not a compute
   resize).

Both are documented with live evidence in the consolidating spec so they aren't
mistaken for "just buy more compute" problems.

---

_Last verified against live project `cdlgtbvxlxjpcddjazzx` and Supabase's official
compute-and-disk docs on 2026-07-04. Compute pricing changes periodically — re-check
[the source table](https://supabase.com/docs/guides/platform/compute-and-disk.md) before
relying on exact dollar figures more than a few months old._

---

## Appendix: SECURITY DEFINER function exposure triage

_Added by `.kiro/specs/rls-consolidation-and-infra-health/` — every `SECURITY DEFINER`
function the security advisor flags as executable by `anon`/`authenticated`, triaged
individually by reading its live `pg_get_functiondef` body (not just its advisor
category). This replaces "here's a pile of WARNs" with a recorded decision per
function._

| Function                                   | Grantee(s)          | Category                                                | Evidence                                                                                      |
| ------------------------------------------ | ------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `auth_institution_id`                      | anon, authenticated | intentional-public                                      | RLS helper fn itself, used inside every policy                                                |
| `auth_user_role`                           | anon, authenticated | intentional-public                                      | RLS helper fn itself, used inside every policy                                                |
| `consume_invitation(text)`                 | anon, authenticated | intentional-public                                      | token-gated by design (needs a valid unexpired unused token)                                  |
| `get_invitation_by_token(text)`            | anon, authenticated | intentional-public                                      | token-gated by design                                                                         |
| `is_portfolio_publicly_accessible(uuid)`   | anon, authenticated | intentional-public                                      | gated on the student's own opt-in flags                                                       |
| `portfolio_public_access(uuid)`            | anon, authenticated | intentional-public                                      | gated on the student's own opt-in flags                                                       |
| `get_student_dashboard(uuid)`              | anon, authenticated | intentional-internal-guard (narrowed `anon` as hygiene) | fail-closed: mismatched/anon caller gets an all-empty payload                                 |
| `get_teacher_dashboard(uuid)`              | anon, authenticated | intentional-internal-guard (narrowed `anon` as hygiene) | fail-closed: mismatched/anon caller gets an all-empty payload                                 |
| `fan_out_announcement_notifications(uuid)` | authenticated       | intentional-internal-guard                              | requires `author_id = caller`, raises 42501 otherwise                                         |
| `send_teacher_nudge(uuid, text)`           | authenticated       | intentional-internal-guard                              | requires caller teaches the target student, raises 42501 otherwise                            |
| `get_leaderboard_page(uuid, int, int)`     | authenticated       | intentional-internal-guard                              | raises on institution mismatch                                                                |
| `get_wellness_aggregate_stats(uuid)`       | authenticated       | intentional-internal-guard                              | raises on institution mismatch                                                                |
| `get_badge_spotlight(uuid, int)`           | authenticated       | intentional-public (low sensitivity)                    | deterministic pick, no cross-tenant data exposed                                              |
| `course_material_institution(text)`        | authenticated       | intentional-internal-guard                              | storage-RLS helper, used inside a policy predicate                                            |
| `get_historical_evidence(text, text)`      | authenticated       | intentional-internal-guard                              | `auth_user_role() <> 'admin'` returns zero rows                                               |
| `delete_department_if_no_programs(uuid)`   | authenticated       | **fix-now (real gap)**                                  | no role check, no institution check at all — see below                                        |
| `get_earn_spend_ratio(uuid)`               | authenticated       | **fix-now (real gap)**                                  | no institution-mismatch check (unlike its sibling `get_wellness_aggregate_stats`) — see below |

### The two real gaps

**`delete_department_if_no_programs(dept_id uuid)`** is `SECURITY DEFINER`, granted to
`authenticated`, and its live body has **zero authorization check** — no role check,
no institution check. Any signed-in user (including a student account) can call
`POST /rest/v1/rpc/delete_department_if_no_programs {"dept_id": "<any-uuid>"}` and
delete that department, for any institution, provided it has no programs attached
yet. `SECURITY DEFINER` means this runs with the function owner's privileges,
bypassing the RLS that would otherwise block a non-admin from touching `departments`
directly.

**`get_earn_spend_ratio(p_institution_id uuid)`** is `SECURITY DEFINER`, granted to
`authenticated`, and returns institution-wide XP-economy totals for **whatever
institution id the caller passes in** — there's no check that it's the caller's own
institution. Its sibling function `get_wellness_aggregate_stats` takes the exact same
shape of argument and correctly guards with
`IF auth_institution_id() != p_institution_id THEN RAISE EXCEPTION ...`;
`get_earn_spend_ratio` is missing that line. Any authenticated user at Institution A
can currently read Institution B's XP-economy rollup.

Neither function currently has a caller anywhere in `src/` or
`supabase/functions/` (confirmed by repo search) — so this is a latent exposure in the
API surface, not something that has caused an observed incident. Both are being
fixed via an additive migration (mirroring the internal-guard pattern already used
correctly by `get_wellness_aggregate_stats`/`get_leaderboard_page`) — see
`.kiro/specs/rls-consolidation-and-infra-health/tasks.md` Phase 2. This is a live
authorization change and is gated on explicit user confirmation before it ships,
per the workspace's safety guardrails, even though the change only narrows access.

### The convention that would have prevented this

Postgres grants `EXECUTE` on a newly created function to `PUBLIC` by default (which
reaches both `anon` and `authenticated`) unless a migration explicitly revokes it.
Every function in the "intentional" rows above stayed safe not because the grant was
narrowed, but because someone remembered to add an internal guard. Going forward,
every new `SECURITY DEFINER` function should either explicitly
`REVOKE EXECUTE ... FROM PUBLIC` + `GRANT` to the intended role, or include the
`auth.uid()`/`auth_institution_id()` fail-closed guard pattern already used
correctly elsewhere in this codebase — never ship a function that relies on nobody
calling it directly.

## Appendix: Deferred / accepted advisor findings

Recorded so each reads as a decision, not an oversight:

| Finding                                                                                                                             | Decision                  | Why                                                                                                                                                                                                                                                                                |
| ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `extension_in_public` (`vector`, `citext`)                                                                                          | defer-to-ops              | Moving an in-use extension to a dedicated schema is a coordinated, low-value change at this project's size; revisit only if a future security review specifically requires it.                                                                                                     |
| `auth_leaked_password_protection` disabled                                                                                          | **fix-now-manual**        | Single Dashboard toggle (Auth → Settings → Enable "Leaked password protection"), not a migration. Someone with Dashboard access should flip it — same category of manual step as `supabase-audit-remediation` Task 3.7.                                                            |
| `auth_db_connections_absolute` (GoTrue fixed at 10 connections)                                                                     | defer-to-billing-decision | Only actionable together with a Compute_Tier resize (see the recommendation matrix above) — request percentage-based Auth connection allocation at the same time as any resize.                                                                                                    |
| `unused_index` (~70-110 INFO entries)                                                                                               | defer-no-action           | Near-zero production traffic means many legitimately-needed indexes (FK joins, filters) haven't been exercised yet. Dropping any now risks removing a soon-to-be-hot index for no measurable benefit — same conclusion `migration-history-reconciliation` Task 12 already reached. |
| `security_definer_view` (`leaderboard_weekly`), `anonymize_user` anon/authenticated grants, `pgcron`/`prevent_mutation` search_path | **already resolved**      | Closed by `migration-history-reconciliation` (Tasks 11-12, complete). Not re-verified here — cross-referenced only.                                                                                                                                                                |
| `multiple_permissive_policies` (76 groups)                                                                                          | tracked, not fixed here   | Owned exclusively by `.kiro/specs/rls-policy-consolidation/` (stub, gated, table-by-table with deny-side tests). See the docstring-correction note above for how this was discovered.                                                                                              |

## Appendix: Connection pooling and the 60-connection cap (Supavisor)

> **Why this appendix exists:** a natural follow-up idea was "put the serverless `api/`
> functions behind Supavisor transaction-mode pooling (port 6543) so they don't churn
> the 60-connection cap." We investigated the actual connection topology of this codebase
> before acting. The short version: **that specific change does not apply here, because
> nothing in the runtime opens a direct Postgres connection.** This records the evidence
> so the idea isn't re-proposed from scratch later.

### What actually connects to Postgres (verified 2026-07)

| Caller                               | How it reaches Postgres                     | Direct PG connection?  |
| ------------------------------------ | ------------------------------------------- | ---------------------- |
| React app (`src/`)                   | `@supabase/supabase-js` → PostgREST (HTTPS) | No                     |
| `api/cron/*.ts` (Vercel)             | `fetch()` → Supabase Edge Functions (HTTPS) | No — thin HTTP proxies |
| `supabase/functions/**` (Deno Edge)  | `createClient(...)` → PostgREST (HTTPS)     | No                     |
| `scripts/gen-required-columns.mjs`   | `pg` driver, connection string from env     | **Yes** (CI/dev only)  |
| `scripts/check-declared-objects.mjs` | `pg` driver, connection string from env     | **Yes** (CI/dev only)  |

The runtime request path is **entirely HTTP/PostgREST**. PostgREST maintains its own
server-side connection pool to Postgres _inside_ the 60-connection cap — that pool is
managed by Supabase, not by our code, so there is no client-side pool in the `api/`
functions to "switch to Supavisor." Transaction-mode pooling (port 6543) exists to tame
_many short-lived direct connections_ — e.g. a serverless function that opens a raw
Postgres socket per invocation with a `pg`/`postgres.js` driver. We don't have that
pattern in the runtime, so there is nothing there to repoint.

### The only direct connections are two CI/dev scripts

`gen-required-columns.mjs` and `check-declared-objects.mjs` each read a connection string
from `SUPABASE_DB_URL` (or `DATABASE_URL`), open **one** connection, run **one** query,
and close it. They run in CI (and occasionally locally) after migrations. They do not
"churn" connections — a single sequential connection is not a pool-exhaustion source.

The one legitimate (if marginal) hygiene improvement: point their **CI env**
`SUPABASE_DB_URL` at the **transaction-mode pooler** endpoint rather than a direct
connection or the session pooler —

```
# transaction mode (recommended for short-lived CI scripts): host = pooler, port = 6543
postgresql://postgres.cdlgtbvxlxjpcddjazzx:<pw>@aws-0-<region>.pooler.supabase.com:6543/postgres
# (the in-code example currently shows :5432 = session mode on the same pooler host)
```

This is an **environment/secret change, not a code change** — the scripts are already
fully env-driven. It is safe for these two scripts specifically because they issue plain,
one-shot queries (the only parameterized one uses an unnamed prepared statement via
`$1`), with no cross-statement session state, no named prepared statements, and no
`LISTEN`/`NOTIFY` — all of which are the things transaction-mode pooling does not carry
across statements. No code edit was made for this; forcing it in code would be
speculative since the endpoint is supplied by the CI secret.

### What actually relieves the 60-connection cap on this architecture

1. **PostgREST pool sizing** — Supabase-managed; scales with compute tier. This is the
   real lever, and it moves when compute moves (see the recommendation matrix above),
   not via anything in this repo.
2. **Fewer round-trips per page** — already addressed by the per-role dashboard aggregate
   RPCs and the client-side critical-first sequencing (owned by
   `.kiro/specs/dashboard-and-ux-performance/`), which cut the mount-time query fan-out
   that was the actual connection-pressure source.
3. **No heavy/long `pg_cron` jobs** — see `20260520063903_fix_pgcron_connection_exhaustion`
   for the time a `*/5` `REFRESH MATERIALIZED VIEW CONCURRENTLY` job exhausted the pool.
   The keep-warm job (`20260822000000_keepwarm_dashboards_cron`) is deliberately
   read-only, lock-free, and sub-second with a pinned `statement_timeout` for this reason.

Cross-reference: `auth_db_connections_absolute` (GoTrue's fixed 10-connection allocation)
in the "Deferred / accepted advisor findings" appendix is a related, separate cap that
also only moves as part of a compute-resize decision.
