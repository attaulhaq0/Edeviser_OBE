# audit-fixtures Edge Function

Fixture endpoint powering the Pre-Deployment E2E Audit's test-data lifecycle.

## Routes

All routes are `POST` and require `ENV_ID=audit-staging`. Any other environment
returns `403`.

| Route             | Purpose                                                   | Task                   |
| ----------------- | --------------------------------------------------------- | ---------------------- |
| `/seed`           | Provision seed users and the ILO→PLO→CLO→assignment chain | 2.1 (routing), 3.1–3.8 |
| `/teardown`       | Truncate rows inside the per-run audit namespace          | 2.1 (routing), 3.9     |
| `/impersonate`    | Mint a short-lived JWT for a seed role (E2E storageState) | 2.1 (routing), 3.10    |
| `/event/bonus-xp` | Create a time-bounded Bonus XP event for cross-role flows | 2.1 (routing), 3.11    |

Task 2.1 ships the routing, Zod-validated request bodies, CORS, and
`ENV_ID=audit-staging` gating. Tasks 3.1–3.11 extend each handler with the
real Supabase side effects.

## Safety contract

- `ENV_ID != 'audit-staging'` → `403` before any work is done.
- `ENV_ID == 'production'` → explicit `403` in addition to the equality check.
- Every request body is Zod-validated via `schemas.ts` before any side effect
  (requirements.md §13.4).
- Service-role key is read from `SUPABASE_SERVICE_ROLE_KEY` once per request
  and never logged.

## Local test (Task 2.1)

```bash
supabase functions serve audit-fixtures --env-file supabase/.env.audit-staging
```

`supabase/.env.audit-staging` must contain `ENV_ID=audit-staging` plus the
standard Supabase URL + service role key. An example env file lives at
`supabase/.env.audit-staging.example`.

## Deploy (Task 2.4)

Deploy is intentionally manual. See `docs/operations/audit-fixtures-deploy.md`.
Never deploy this function to the `production` environment.
