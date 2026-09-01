# Supabase Support Ticket (draft) — GitHub integration MIGRATIONS_FAILED

> Ready to submit at https://supabase.com/dashboard/support/new (project
> `cdlgtbvxlxjpcddjazzx`). All claims below verified live 2026-09-01 via MCP
> introspection + local replay.

**Subject:** GitHub integration shows MIGRATIONS_FAILED on main though the live database is healthy and fully migrated — replay-integrity drift root-caused

**Body:**

Our project's GitHub integration reports `MIGRATIONS_FAILED` for the `main` branch, while:

1. The live database is healthy: `supabase_migrations.schema_migrations` contains exactly **426 rows**, matching our 426 local migration files 1:1 (versions identical, verified 2026-09-01 via the Management API + local checkout diff).
2. All runtime workloads are healthy (edge functions, pg_cron schedules returning 200, RLS matrix passing).

**Root cause we identified locally:** replaying our 426-migration set into a fresh database (Supabase CLI `db reset`, Docker) produced a database where `anon`, `authenticated`, and `service_role` had **no DML privileges on ~168 public tables** (only `REFERENCES, TRIGGER, TRUNCATE`). A migration in our set revokes table DML schema-wide without re-granting it, while our live database carries the Supabase-default posture (full DML to the three roles; RLS policies perform the access control) plus a small set of intentional restrictions on sensitive tables.

We believe the dashboard/integration migration check fails for a related reason: the integration's migration pipeline either (a) chokes on our two non-standard ledger entries — one 8-digit version `20260314` (pre-dates our 14-digit convention) and five historical duplicate base-names under different versions — or (b) detects the replay state divergence described above.

**What we did:** we shipped `20260902000005_reconcile_table_grants.sql` (idempotent, forward-only): it restores the default DML posture for every public base table and re-asserts the intentional restrictions mirrored 1:1 from the live grant state. A fresh local replay including this migration now completes cleanly and passes our 91-case RLS isolation suite with real data.

**Ask:** please (1) clear or explain the `MIGRATIONS_FAILED` flag for `main` on project `cdlgtbvxlxjpcddjazzx`, and (2) confirm whether the GitHub integration's migration runner tolerates non-14-digit versions and duplicate base-names in the ledger, or whether we should normalize those two ledger entries (we can provide the exact list).
