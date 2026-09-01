# Secret Setup Guide — DeepSeek Provider (8.3)

## 1. Policy

- **DeepSeek is the only production LLM provider**: `AI_PROVIDER=deepseek` is
  mandatory; Gemini must never be required for production AI execution.
- Secrets live ONLY in Supabase secrets (edge runtime) and Vercel env vars
  (cron/api layer). Never in browser code, never in the repository, never
  printed in logs or docs. `.env.local` is gitignored and holds local dev
  values only.
- Client-visible keys are limited to the standard publishable anon key.

## 2. Supabase Edge secrets

```bash
supabase secrets set AI_PROVIDER=deepseek
supabase secrets set DEEPSEEK_API_KEY=<deepseek key>
supabase secrets set CRON_SECRET=<random, >=16 chars>   # validates x-cron-secret on system-invoked functions
```

- Generate CRON_SECRET with `openssl rand -hex 32`; never reuse values across
  environments.
- Verify with `supabase secrets list` — it shows NAMES only, never values.

## 3. Vercel env vars

| Variable                                              | Purpose                                                         |
| ----------------------------------------------------- | --------------------------------------------------------------- |
| `CRON_SECRET`                                         | Validates Vercel Cron → `/api/cron/*` (`Authorization: Bearer`) |
| `SUPABASE_URL` (or `VITE_SUPABASE_URL`)               | Target project for `invokeEdgeFunction`                         |
| Managed server key (via `api/_utils/serverSecret.ts`) | Bearer credential for edge invocation                           |

## 4. pg_cron credentials

- `private.cron_secrets` holds cron credentials (schema revoked from
  anon/authenticated). Row `cron_intervention_jobs` verified live 2026-08-29.
- If a schedule stops firing: check the row exists, `cron.job` has the entry,
  and the secret matches the function's `CRON_SECRET` env binding.

## 5. Rotation

1. Rotate `CRON_SECRET`: `supabase secrets set CRON_SECRET=<new>` and update
   the Vercel env var; verify the next scheduled firing succeeds.
2. Rotate `DEEPSEEK_API_KEY` at the provider dashboard, then
   `supabase secrets set DEEPSEEK_API_KEY=<new>`.
3. Rotation is a CONFIG deployment impact — no code change, no migration.

## 6. Prohibited

- No service-role keys in browser code; no provider keys outside the edge
  runtime; no secrets in git history (8.4 hygiene already removed the stale
  `GEMINI_API_KEY` / `TUTOR_PRIMARY_MODEL` lines from `.env.example`).
