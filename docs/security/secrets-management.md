# Secrets Management

## Overview

Edeviser uses three categories of secrets, each stored differently:

| Category | Where stored | Accessed by |
|----------|-------------|-------------|
| Client env vars (`VITE_*`) | `.env.local` / Vercel env vars | Browser (public) |
| Server env vars | Vercel env vars | Vercel API routes (cron) |
| Edge Function secrets | Supabase Vault | Supabase Edge Functions |

## Client Environment Variables

These are embedded in the built JS bundle — treat them as public.

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
VITE_SENTRY_DSN=https://xxx@sentry.io/yyy   (optional)
```

Set in Vercel: **Project Settings → Environment Variables** (all environments).

## Server Environment Variables (Vercel)

Used by `/api/cron/*` routes. Never exposed to the browser.

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
CRON_SECRET=<random-string>
```

Set in Vercel: **Project Settings → Environment Variables** (Production only recommended for service role key).

## Edge Function Secrets

Managed via the Supabase CLI or Dashboard.

### Setting secrets via CLI

```bash
# Resend (transactional email)
supabase secrets set RESEND_API_KEY=re_xxxxxxxx

# AI provider (choose one)
supabase secrets set OPENAI_API_KEY=sk-xxxxxxxx
# or
supabase secrets set ANTHROPIC_API_KEY=sk-ant-xxxxxxxx

# Cron authentication
supabase secrets set CRON_SECRET=your-cron-secret
```

### Setting secrets via Dashboard

1. Open **Supabase Dashboard → Edge Functions → Secrets**
2. Add each key-value pair
3. Secrets are available immediately to all Edge Functions via `Deno.env.get('KEY')`

### Listing current secrets

```bash
supabase secrets list
```

(Values are never displayed — only key names.)

## CI / GitHub Actions Secrets

Set in **GitHub → Repository Settings → Secrets and variables → Actions**:

| Secret | Purpose |
|--------|---------|
| `SENTRY_AUTH_TOKEN` | Upload source maps on deploy |
| `SENTRY_ORG` | Sentry organization slug |
| `SENTRY_PROJECT` | Sentry project slug |
| `SUPABASE_ACCESS_TOKEN` | Type generation in CI (`supabase gen types`) |

## Secret Rotation

1. Generate a new value for the secret
2. Update in the appropriate store (Vercel / Supabase / GitHub)
3. Redeploy the application (Vercel auto-redeploys on env var change)
4. Verify the application works with the new secret
5. Revoke the old secret value at the provider (Resend, OpenAI, etc.)

Rotate secrets immediately if you suspect a leak. The `SUPABASE_SERVICE_ROLE_KEY` can be rotated from **Supabase Dashboard → Settings → API → Regenerate**.
