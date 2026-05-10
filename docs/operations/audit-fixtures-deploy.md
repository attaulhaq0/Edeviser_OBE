# Deploying `audit-fixtures` Edge Function

The `audit-fixtures` Edge Function at `supabase/functions/audit-fixtures/`
is the seed and teardown surface used by the Pre-Deployment E2E Audit. It is
safety-gated to `ENV_ID=audit-staging` and refuses to serve traffic in any
other environment.

**Task 2.4 is intentionally a manual deploy.** The function touches seed
users, linked parent relationships, and the bonus XP event table — deploying
it automatically on every CI run is unnecessary and amplifies blast radius if
a mistake ships. Deploy it once per staging environment and version-tag.

## Prerequisites

- Supabase CLI authenticated: `npx supabase login` or `SUPABASE_ACCESS_TOKEN`
  set to a personal access token
- A Supabase project dedicated to audit staging, distinct from production
- Secrets configured on that project:
  - `ENV_ID` must be `audit-staging`
  - `SUPABASE_SERVICE_ROLE_KEY` is set automatically by Supabase — do not
    override
  - Standard `SUPABASE_URL` set by Supabase — do not override

## One-time deploy (staging only)

```bash
# Link to the staging project first
npx supabase link --project-ref <staging-project-ref>

# Verify ENV_ID secret before deploying
npx supabase secrets list | grep ENV_ID
# expected: ENV_ID=audit-staging
#
# If missing, set it:
#   npx supabase secrets set ENV_ID=audit-staging

# Deploy
npx supabase functions deploy audit-fixtures --project-ref <staging-project-ref>
```

Record the deployed slug in `audit/baselines/deployed-fixtures.json`:

```json
{
  "createdAt": "2026-05-08T00:00:00.000Z",
  "lockedByCommit": "<sha>",
  "fixtures": {
    "audit-fixtures": {
      "deployedAt": "2026-05-08T00:00:00.000Z",
      "slug": "audit-fixtures-v1",
      "env": "audit-staging"
    }
  }
}
```

The connectivity matrix (Task 8.3) reads that file to confirm the function
is deployed when validating hook targets.

## Re-deploying

Only needed when the function source changes. Safe to re-run the
`supabase functions deploy` command; it overwrites the deployed artifact.
Record the new `deployedAt` and `slug` in the baseline file.

## What NOT to do

- **Do not deploy to production.** If you run `supabase link --project-ref
<production-ref>` and then `functions deploy audit-fixtures`, the function
  still rejects every request because `ENV_ID != 'audit-staging'`. The
  safety gate is defensive but the first defense is: don't point the CLI at
  production.
- **Do not set `ENV_ID=audit-staging` on the production project.** That
  would enable the fixture endpoint to provision seed users against real
  data. Check `npx supabase secrets list` on production periodically.
- **Do not commit `supabase/.env.audit-staging`.** The `.example` file is
  committed; the real env file is gitignored via `supabase/.gitignore`.

## Smoke test

After deploy, a single curl confirms the gating works:

```bash
curl -X POST \
  "https://<staging-project-ref>.supabase.co/functions/v1/audit-fixtures/seed" \
  -H "Authorization: Bearer $(npx supabase auth get-anon-key)" \
  -H "Content-Type: application/json" \
  -d '{"runId":"00000000-0000-0000-0000-000000000001"}'
```

Expected shape (Phase 1 stub):

```json
{
  "ok": true,
  "runId": "00000000-0000-0000-0000-000000000001",
  "note": "seed stub — per-role inserts land in tasks 3.1–3.8",
  "identifiers": { "...": "..." }
}
```

If you receive `403 { "error": "fixture endpoint disabled" }`, verify
`ENV_ID` is set correctly on the staging project:

```bash
npx supabase secrets list | grep ENV_ID
```
