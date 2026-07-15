-- =============================================================================
-- Edeviser Infra Health Report
-- =============================================================================
-- Reusable, read-only diagnostic query catalog for the Supabase project.
-- Answers, in one pass: "what compute tier are we actually running on, and
-- what is that costing us in query behavior right now?"
--
-- Origin: this file was assembled from the live investigation into why the
-- student dashboard (and every dashboard) still felt slow after upgrading the
-- Supabase ORG to the Pro plan. See:
--   - docs/operations/supabase-compute-tiers.md   (plain-language explainer)
--   - .kiro/specs/rls-consolidation-and-infra-health/  (consolidating spec)
--
-- USAGE — do not run this file by hand with psql/`>` redirection. Use the
-- wrapper, which runs it through the authenticated Supabase CLI and archives
-- a timestamped JSON snapshot under audit/baselines/infra-health/:
--
--   Windows (PowerShell):   pwsh scripts/infra-health-report.ps1
--   macOS / Linux:          bash scripts/infra-health-report.sh
--
-- This file is READ-ONLY (no DDL, no DML). It has TWO parts:
--   PART A (Sections 1-7)  — the same checks written as plain standalone
--                            SELECTs, one per section. Paste any one of them
--                            into the Supabase SQL Editor for a quick manual
--                            look; this is the "read it like a human" form.
--   PART B (bottom of file) — the SAME checks re-expressed as CTEs and
--                            folded into ONE final query returning a single
--                            JSON object. This is the form the wrapper
--                            script actually captures.
-- Why both exist: `supabase db query --file` (and most non-interactive
-- Postgres runners) only returns the result of the LAST statement in a
-- multi-statement file — every earlier SELECT's output is discarded. A
-- single combined JSON query is the only way to get one snapshot artifact
-- out of one CLI invocation, but a wall of nested CTEs is unpleasant to
-- read/copy-paste by hand. Keeping Part A gives you the readable version;
-- keeping Part B gives the automation a single atomic result to archive.
-- Re-run this after any compute resize, RLS consolidation, or index change to
-- get a fresh before/after comparison — that is the whole point of keeping it
-- as a script instead of a one-off query.
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────
-- SECTION 1 — Compute fingerprint
-- ─────────────────────────────────────────────────────────────────────────
-- Postgres config settings are a reliable proxy for compute size because
-- Supabase sizes them proportionally to instance RAM (shared_buffers ~= 25%,
-- effective_cache_size ~= 75%). Compare shared_buffers/8 to the table in
-- docs/operations/supabase-compute-tiers.md to identify the current tier
-- without needing dashboard access.
--   Nano/Micro  -> shared_buffers ~28,672 (8kB pages) = ~224 MB, max_connections=60
--   Small       -> shared_buffers ~65,536             = ~512 MB, max_connections=90
--   Medium      -> shared_buffers ~131,072             = ~1 GB,  max_connections=120
--   Large+      -> shared_buffers ~262,144+            = ~2 GB+, max_connections=160+
select
  'compute_fingerprint' as section,
  (select setting from pg_settings where name = 'shared_buffers') as shared_buffers_8kb_pages,
  (select setting from pg_settings where name = 'effective_cache_size') as effective_cache_size_8kb_pages,
  (select setting from pg_settings where name = 'max_connections') as max_connections,
  (select setting from pg_settings where name = 'work_mem') as work_mem_kb,
  (select setting from pg_settings where name = 'maintenance_work_mem') as maintenance_work_mem_kb,
  version() as postgres_version;

-- Per-role statement_timeout — the exact ceiling that turns "slow" into a
-- user-visible 57014 cancellation. authenticated=8s / anon=3s is the current
-- baseline; if real call latencies (Section 3) are approaching these values,
-- that is the leading indicator of cancellations under load.
select
  'role_statement_timeouts' as section,
  r.rolname,
  (
    select option_value
    from pg_db_role_setting drs, unnest(drs.setconfig) as option_value
    where drs.setrole = r.oid and option_value like 'statement_timeout%'
  ) as statement_timeout_setting,
  r.rolconnlimit
from pg_roles r
where r.rolname in ('authenticated', 'anon', 'service_role', 'authenticator')
order by r.rolname;


-- ─────────────────────────────────────────────────────────────────────────
-- SECTION 2 — Connection & realtime load
-- ─────────────────────────────────────────────────────────────────────────
-- Current connection count vs max_connections. Chronic values above ~70% of
-- the limit at rest (not just during a spike) is a sizing signal on its own.
select
  'connection_headroom' as section,
  count(*) as current_connections,
  (select setting::int from pg_settings where name = 'max_connections') as max_connections,
  round(100.0 * count(*) / (select setting::int from pg_settings where name = 'max_connections'), 1) as pct_used
from pg_stat_activity;

-- Connections grouped by application/state — surfaces whether idle Realtime
-- replication connections dominate the pool (a scoping/Section-15.4 signal),
-- separate from genuinely busy application queries.
select
  'connections_by_state' as section,
  coalesce(application_name, '(none)') as application_name,
  state,
  count(*) as connections
from pg_stat_activity
where pid <> pg_backend_pid()
group by application_name, state
order by connections desc;

-- Tables currently in the supabase_realtime publication. Every published
-- table adds background WAL-decode work on every write, competing for the
-- same shared CPU as user queries (Appendix A.2 in dashboard-and-ux-performance
-- design.md). A count that keeps climbing without a corresponding audit of
-- whether each subscription is filter-scoped is a latent cost.
select 'realtime_published_tables' as section, count(*) as published_table_count
from pg_publication_tables where pubname = 'supabase_realtime';


-- ─────────────────────────────────────────────────────────────────────────
-- SECTION 3 — Hot queries (pg_stat_statements)
-- ─────────────────────────────────────────────────────────────────────────
-- Top 20 by total time. This is the ground truth for "what is actually
-- consuming database time" — cross-reference mean/max against the role
-- statement_timeouts in Section 1. Anything with a max_exec_time approaching
-- 8000ms is one bad moment away from a 57014 cancellation.
select
  'top_queries_by_total_time' as section,
  left(query, 120) as query_excerpt,
  calls,
  round(total_exec_time::numeric, 1) as total_exec_time_ms,
  round(mean_exec_time::numeric, 1) as mean_exec_time_ms,
  round(max_exec_time::numeric, 1) as max_exec_time_ms
from pg_stat_statements
where query not ilike '%pg_stat_statements%'
order by total_exec_time desc
limit 20;

-- Same, ordered by call count — identifies "chatty" queries (Appendix B in
-- dashboard-and-ux-performance): a query that is individually fast but called
-- hundreds of times per session is still a scalability risk as user count
-- grows, and multiplies contention on shared compute.
select
  'top_queries_by_call_count' as section,
  left(query, 120) as query_excerpt,
  calls,
  round(mean_exec_time::numeric, 1) as mean_exec_time_ms,
  round(max_exec_time::numeric, 1) as max_exec_time_ms
from pg_stat_statements
where query not ilike '%pg_stat_statements%'
order by calls desc
limit 20;


-- ─────────────────────────────────────────────────────────────────────────
-- SECTION 4 — Read amplification (chattiness vs data volume)
-- ─────────────────────────────────────────────────────────────────────────
-- Live row count vs cumulative index+seq scans. A tiny table with a huge scan
-- count (e.g. profiles: 124 rows / 196k scans) means the CLIENT is re-fetching
-- far more than the data volume justifies — the "chatty client" root cause,
-- not a data-volume or missing-index problem. High scan/row ratios on small
-- tables are exactly the queries a dashboard aggregate RPC should collapse.
select
  'read_amplification' as section,
  relname as table_name,
  n_live_tup as live_rows,
  seq_scan + idx_scan as total_scans,
  case when n_live_tup > 0
    then round((seq_scan + idx_scan)::numeric / n_live_tup, 1)
    else null
  end as scans_per_row
from pg_stat_user_tables
where n_live_tup > 0
order by (seq_scan + idx_scan) desc
limit 25;


-- ─────────────────────────────────────────────────────────────────────────
-- SECTION 5 — RLS policy multiplicity (multiple_permissive_policies)
-- ─────────────────────────────────────────────────────────────────────────
-- Supabase advisor lint 0006: N separate PERMISSIVE policies for the same
-- (table, action) are OR-composed and, worst case, ALL N are evaluated per
-- row. This does NOT show up as a missing index — it shows up as a query
-- that "should" be fast but isn't. This surfaces every violation directly
-- from pg_policies so it can be tracked without depending on the advisor UI
-- (and so a "fixed" migration can be proven fixed by re-running this query).
select
  'multiple_permissive_policies' as section,
  tablename,
  cmd as action,
  count(*) as permissive_policy_count,
  array_agg(policyname order by policyname) as policy_names
from pg_policies
where schemaname = 'public' and permissive = 'PERMISSIVE'
group by tablename, cmd
having count(*) > 1
order by count(*) desc, tablename;

-- Bare (non-initplan-wrapped) auth function calls remaining in RLS policies.
-- `(select auth.uid())` is evaluated once per query (InitPlan); a bare
-- `auth.uid()` / `auth_user_role()` / `auth_institution_id()` is evaluated
-- once per ROW. This is the OTHER half of advisor lint 0003 alongside
-- Section 5's policy-count check.
--
-- IMPLEMENTATION NOTE: Postgres deparses `(select auth.uid())` back out of
-- pg_policies.qual as `( SELECT auth.uid() AS uid)` — uppercased, spaced, and
-- with an implicit column alias — NOT byte-identical to the migration's
-- source text. A naive `qual !~ '\(select auth\.uid\(\)\)'` check (matching
-- the source-code spelling) therefore false-positives on almost every
-- correctly-wrapped policy in the schema. The reliable check is: strip out
-- every occurrence of the properly-deparsed wrapped form, then see if a bare
-- call is still left over (this also correctly catches a policy that wraps
-- ONE call but leaves a SECOND bare call right next to it).
select
  'bare_auth_calls_in_rls' as section,
  tablename,
  policyname,
  cmd as action
from (
  select
    tablename, policyname, cmd,
    regexp_replace(
      regexp_replace(
        regexp_replace(qual, 'SELECT\s+auth\.uid\(\)\s+AS\s+uid', '', 'gi'),
      'SELECT\s+(public\.)?auth_user_role\(\)\s+AS\s+auth_user_role', '', 'gi'),
    'SELECT\s+(public\.)?auth_institution_id\(\)\s+AS\s+auth_institution_id', '', 'gi') as residual_qual
  from pg_policies
  where schemaname = 'public' and qual is not null
) s
where residual_qual ~* 'auth\.uid\(\)|auth_user_role\(\)|auth_institution_id\(\)'
order by tablename, policyname;


-- ─────────────────────────────────────────────────────────────────────────
-- SECTION 6 — Security-relevant exposure (informational, not perf)
-- ─────────────────────────────────────────────────────────────────────────
-- SECURITY DEFINER functions callable via the PostgREST RPC surface
-- (/rest/v1/rpc/<fn>) by anon/authenticated. Not inherently wrong (several
-- are intentional — invitation-by-token, public portfolio access) but every
-- entry here should have a documented reason. Cross-reference against the
-- consolidating spec's exposure review before assuming any one is a bug.
select
  'security_definer_rpc_exposure' as section,
  p.proname as function_name,
  r.rolname as grantee
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
join pg_roles r on has_function_privilege(r.oid, p.oid, 'EXECUTE')
where n.nspname = 'public'
  and p.prosecdef = true
  and r.rolname in ('anon', 'authenticated')
order by p.proname, r.rolname;

-- Extensions installed in the `public` schema. `public`-schema extensions are
-- exposed to PostgREST introspection; Supabase's own advisor flags this as a
-- WARN (extension_in_public). Fix is `ALTER EXTENSION ... SET SCHEMA extensions`,
-- tracked as a security cleanup, not a perf item.
select
  'extensions_in_public_schema' as section,
  extname,
  extversion
from pg_extension e
join pg_namespace n on n.oid = e.extnamespace
where n.nspname = 'public';


-- ─────────────────────────────────────────────────────────────────────────
-- SECTION 7 — Table & index volume (rules out "it's a data-size problem")
-- ─────────────────────────────────────────────────────────────────────────
-- Total on-disk size per table. Keep this in every snapshot: if this report
-- is re-run 6 months from now and every number above has gotten worse WHILE
-- these sizes are still tiny, that re-confirms it's compute/query-shape, not
-- data volume — and if these sizes have grown substantially, that changes
-- the diagnosis and this section is how you'd notice.
select
  'table_sizes' as section,
  relname as table_name,
  n_live_tup as live_rows,
  pg_size_pretty(pg_total_relation_size(relid)) as total_size
from pg_stat_user_tables
order by pg_total_relation_size(relid) desc
limit 15;


-- =============================================================================
-- PART B — single combined snapshot (what the wrapper script captures)
-- =============================================================================
-- Same 7 sections as above, re-expressed as CTEs and folded into one row of
-- JSON arrays so a single non-interactive CLI invocation can capture the
-- whole report atomically. Keep this in sync with Part A if you edit a
-- section — Part A is the readable reference, this is the machine copy.
with compute_fingerprint as (
  select jsonb_build_object(
    'shared_buffers_8kb_pages', (select setting from pg_settings where name = 'shared_buffers'),
    'effective_cache_size_8kb_pages', (select setting from pg_settings where name = 'effective_cache_size'),
    'max_connections', (select setting from pg_settings where name = 'max_connections'),
    'work_mem_kb', (select setting from pg_settings where name = 'work_mem'),
    'maintenance_work_mem_kb', (select setting from pg_settings where name = 'maintenance_work_mem'),
    'postgres_version', version()
  ) as data
),
role_timeouts as (
  select jsonb_agg(jsonb_build_object(
    'rolname', r.rolname,
    'statement_timeout_setting', (
      select option_value
      from pg_db_role_setting drs, unnest(drs.setconfig) as option_value
      where drs.setrole = r.oid and option_value like 'statement_timeout%'
    ),
    'rolconnlimit', r.rolconnlimit
  )) as data
  from pg_roles r
  where r.rolname in ('authenticated', 'anon', 'service_role', 'authenticator')
),
connection_headroom as (
  select jsonb_build_object(
    'current_connections', count(*),
    'max_connections', (select setting::int from pg_settings where name = 'max_connections'),
    'pct_used', round(100.0 * count(*) / (select setting::int from pg_settings where name = 'max_connections'), 1)
  ) as data
  from pg_stat_activity
),
connections_by_state as (
  select jsonb_agg(jsonb_build_object(
    'application_name', coalesce(application_name, '(none)'),
    'state', state,
    'connections', cnt
  ) order by cnt desc) as data
  from (
    select application_name, state, count(*) as cnt
    from pg_stat_activity
    where pid <> pg_backend_pid()
    group by application_name, state
  ) s
),
realtime_published as (
  select jsonb_build_object('published_table_count', count(*)) as data
  from pg_publication_tables where pubname = 'supabase_realtime'
),
top_by_total_time as (
  select jsonb_agg(jsonb_build_object(
    'query_excerpt', left(query, 120),
    'calls', calls,
    'total_exec_time_ms', round(total_exec_time::numeric, 1),
    'mean_exec_time_ms', round(mean_exec_time::numeric, 1),
    'max_exec_time_ms', round(max_exec_time::numeric, 1)
  )) as data
  from (
    select * from pg_stat_statements
    where query not ilike '%pg_stat_statements%'
    order by total_exec_time desc
    limit 20
  ) s
),
top_by_calls as (
  select jsonb_agg(jsonb_build_object(
    'query_excerpt', left(query, 120),
    'calls', calls,
    'mean_exec_time_ms', round(mean_exec_time::numeric, 1),
    'max_exec_time_ms', round(max_exec_time::numeric, 1)
  )) as data
  from (
    select * from pg_stat_statements
    where query not ilike '%pg_stat_statements%'
    order by calls desc
    limit 20
  ) s
),
read_amplification as (
  select jsonb_agg(jsonb_build_object(
    'table_name', relname,
    'live_rows', n_live_tup,
    'total_scans', seq_scan + idx_scan,
    'scans_per_row', case when n_live_tup > 0 then round((seq_scan + idx_scan)::numeric / n_live_tup, 1) else null end
  )) as data
  from (
    select * from pg_stat_user_tables
    where n_live_tup > 0
    order by (seq_scan + idx_scan) desc
    limit 25
  ) s
),
multiple_permissive as (
  select jsonb_agg(jsonb_build_object(
    'tablename', tablename,
    'action', cmd,
    'permissive_policy_count', policy_count,
    'policy_names', policy_names
  ) order by policy_count desc) as data
  from (
    select tablename, cmd, count(*) as policy_count, array_agg(policyname order by policyname) as policy_names
    from pg_policies
    where schemaname = 'public' and permissive = 'PERMISSIVE'
    group by tablename, cmd
    having count(*) > 1
  ) s
),
bare_auth_calls as (
  -- See Part A Section 5's implementation note: strip the deparsed wrapped
  -- form first, then check what's left, rather than pattern-matching the
  -- source-code spelling (which never matches pg_policies.qual's deparse).
  select jsonb_agg(jsonb_build_object(
    'tablename', tablename,
    'policyname', policyname,
    'action', cmd
  ) order by tablename, policyname) as data
  from (
    select
      tablename, policyname, cmd,
      regexp_replace(
        regexp_replace(
          regexp_replace(qual, 'SELECT\s+auth\.uid\(\)\s+AS\s+uid', '', 'gi'),
        'SELECT\s+(public\.)?auth_user_role\(\)\s+AS\s+auth_user_role', '', 'gi'),
      'SELECT\s+(public\.)?auth_institution_id\(\)\s+AS\s+auth_institution_id', '', 'gi') as residual_qual
    from pg_policies
    where schemaname = 'public' and qual is not null
  ) s
  where residual_qual ~* 'auth\.uid\(\)|auth_user_role\(\)|auth_institution_id\(\)'
),
security_definer_exposure as (
  select jsonb_agg(jsonb_build_object(
    'function_name', function_name,
    'grantee', grantee
  ) order by function_name, grantee) as data
  from (
    select distinct p.proname as function_name, r.rolname as grantee
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    join pg_roles r on has_function_privilege(r.oid, p.oid, 'EXECUTE')
    where n.nspname = 'public' and p.prosecdef = true and r.rolname in ('anon', 'authenticated')
  ) s
),
extensions_in_public as (
  select jsonb_agg(jsonb_build_object('extname', extname, 'extversion', extversion)) as data
  from pg_extension e
  join pg_namespace n on n.oid = e.extnamespace
  where n.nspname = 'public'
),
table_sizes as (
  select jsonb_agg(jsonb_build_object(
    'table_name', table_name,
    'live_rows', live_rows,
    'total_size', total_size
  )) as data
  from (
    select relname as table_name, n_live_tup as live_rows, pg_size_pretty(pg_total_relation_size(relid)) as total_size
    from pg_stat_user_tables
    order by pg_total_relation_size(relid) desc
    limit 15
  ) s
)
select jsonb_build_object(
  'generatedAt', now(),
  'computeFingerprint', (select data from compute_fingerprint),
  'roleStatementTimeouts', coalesce((select data from role_timeouts), '[]'::jsonb),
  'connectionHeadroom', (select data from connection_headroom),
  'connectionsByState', coalesce((select data from connections_by_state), '[]'::jsonb),
  'realtimePublishedTables', (select data from realtime_published),
  'topQueriesByTotalTime', coalesce((select data from top_by_total_time), '[]'::jsonb),
  'topQueriesByCallCount', coalesce((select data from top_by_calls), '[]'::jsonb),
  'readAmplification', coalesce((select data from read_amplification), '[]'::jsonb),
  'multiplePermissivePolicies', coalesce((select data from multiple_permissive), '[]'::jsonb),
  'bareAuthCallsInRls', coalesce((select data from bare_auth_calls), '[]'::jsonb),
  'securityDefinerRpcExposure', coalesce((select data from security_definer_exposure), '[]'::jsonb),
  'extensionsInPublicSchema', coalesce((select data from extensions_in_public), '[]'::jsonb),
  'tableSizes', coalesce((select data from table_sizes), '[]'::jsonb)
) as infra_health_snapshot;
