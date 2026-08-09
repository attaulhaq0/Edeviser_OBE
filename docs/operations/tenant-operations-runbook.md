# Tenant readiness runbook

This runbook is local-first. Production Supabase is read-only until a separately approved execution window. Never load `.env` or `.env.local` for tenant operations; pass explicit local variables instead.

## Local Docker and migration replay

```powershell
npx supabase@latest start
npx supabase@latest db reset --local --yes
docker exec supabase_db_Edeviser-Kiro psql -U postgres -d postgres -Atc "select count(*) from supabase_migrations.schema_migrations;"
npm run db:check-dup-names
npm run db:check-replay
```

The authoritative replay baseline on 2026-08-09 is 380 migrations, versions `20260222065213` through `20260823000022`.

## Seed idempotency

The repository seed is disabled during ordinary resets because it provisions Auth-linked fixtures. Run it explicitly against local Postgres only:

```powershell
$seedSql = "SET client_min_messages = error;`n" + (Get-Content supabase\seed.sql -Raw)
$seedSql | docker exec -i supabase_db_Edeviser-Kiro psql -v ON_ERROR_STOP=1 -U postgres -d postgres
```

Run that command twice and compare counts for Auth users, profiles, enrollments, assignments, activity, evidence, Parent links and reminders. The expected clean baseline is 53 Auth users/profiles, 142 enrollments, 20 assignments, 6,074 activity rows and 703 trigger-owned evidence rows; duplicate groups must remain zero. The sentinel is `Seed Demo University`; the fixture returns to `invite_only` after Auth provisioning.

## Noor local five-role fixture

The SQL fixture is explicit and never included in `db reset`:

```powershell
$fixtureSql = Get-Content supabase\noor-local-fixture.sql -Raw
$fixtureSql | docker exec -i supabase_db_Edeviser-Kiro psql -v fixture_password='RUNTIME_ONLY' -U postgres -d postgres
```

Use a runtime-only password and discard it after testing. The fixture creates one local Admin, Coordinator, Teacher, Student and Parent, plus a connected course, enrollment, assignment, journal, calendar event, verified Parent link and reminder. It is idempotent and returns the local tenant to `invite_only`.

The five login attempts currently succeed. Profile/data reads are blocked by the migration baseline: `authenticated` has no table-level `SELECT` grant on `profiles` (and the other core tables), producing `permission denied for table profiles`. Do not paper over this with a broad fixture grant. The production fix requires a separately reviewed Supabase migration that preserves the existing RLS policies.

## Audits and dry-runs

Use the guarded tenant tool; it defaults to dry-run and refuses production execute mode:

```powershell
$env:TENANT_OPERATIONS_SUPABASE_URL='http://127.0.0.1:54321'
$env:TENANT_OPERATIONS_SERVICE_ROLE_KEY='RUNTIME_LOCAL_SERVICE_ROLE_KEY'
npm run tenant:operations -- --project-ref cdlgtbvxlxjpcddjazzx --institution-id 9fb38246-8bad-4372-acf7-e2d17558f2d0 --expected-name "Gulf Academy of Excellence" --expected-slug gulf-academy --operation audit --run-id gulf-audit --output-path output/tenant-operations/gulf.json
```

Gulf remains BLOCKED for reset because operational ownership is incomplete, recent activity exists, and Storage/cross-tenant scans are not fully proven. Noor’s production seed plan is pure and dry-run-only in `src/lib/noorSeedPlan.ts`; it preserves meaningful rows, creates only missing date-sensitive coverage, and blocks invitation/token writes.

## Email, invitations and Parent links

Use local Auth and Inbucket only. Do not set Resend credentials, send real invitations, or create production Auth users. Before any production invitation work, verify server-side inviter role/institution, single-use/expiry/revocation behavior, raw-token non-persistence, Parent-link revocation, and cross-tenant denial with a separately approved migration/deployment state.

## Production gate

Before any Gulf reset, Noor seed, migration deployment, Edge Function deployment, email enablement or merge, obtain separate written authorization, review the dry-run/backup report, run the full required checks, and keep PR #238 draft until all gates are independently green.
