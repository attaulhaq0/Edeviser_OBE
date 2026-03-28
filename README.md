# Edeviser Platform

Outcome-Based Education + Gamification platform for higher education institutions.

## Tech Stack

- React 18 + TypeScript, Vite 6, Tailwind CSS v4, Shadcn/ui
- Supabase (PostgreSQL + RLS, Auth, Realtime, Storage, Edge Functions)
- Deployed on Vercel

## Getting Started

```bash
npm install
cp .env.example .env.local   # fill in your Supabase credentials
npm run dev
```

## Scheduled Jobs (Cron)

The platform uses scheduled jobs for streak risk emails, weekly summaries, at-risk signal computation, perfect day prompts, streak resets, leaderboard refreshes, AI predictions, notification digests, and fee overdue checks.

Two approaches are supported depending on your Supabase plan:

### Option A: pg_cron (Supabase Pro / Self-Hosted)

pg_cron runs scheduled jobs directly inside PostgreSQL. This is the primary approach and requires the Supabase Pro plan (or a self-hosted instance).

The migration `20260615000001_conditional_pgcron_guard.sql` automatically detects whether pg_cron is available and creates the cron jobs if so. No manual configuration needed.

| Job | Schedule | Action |
|-----|----------|--------|
| leaderboard-refresh | Every 5 min | `REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_weekly` |
| streak-risk-email | Daily 8 PM UTC | Calls `streak-risk-cron` Edge Function |
| weekly-summary-email | Monday 8 AM UTC | Calls `weekly-summary-cron` Edge Function |
| compute-at-risk-signals | Daily 2 AM UTC | Calls `compute-at-risk-signals` Edge Function |
| perfect-day-prompt | Daily 6 PM UTC | Calls `perfect-day-prompt` Edge Function |
| streak-midnight-reset | Daily midnight UTC | Calls `process-streak` Edge Function |
| ai-at-risk-prediction | Daily 3 AM UTC | Calls `ai-at-risk-prediction` Edge Function |
| notification-digest | Daily 8 PM UTC | Calls `notification-digest` Edge Function |
| fee-overdue-check | Daily 6 AM UTC | Updates overdue fee payments |

### Option B: Vercel Cron Jobs (Free Tier Fallback)

If pg_cron is not available (Supabase free tier), Vercel Cron Jobs serve as the fallback. Cron schedules are defined in `vercel.json` and thin API routes in `/api/cron/` authenticate with `CRON_SECRET` and call the corresponding Supabase Edge Functions.

Required environment variables (set in Vercel dashboard):

| Variable | Description |
|----------|-------------|
| `CRON_SECRET` | Shared secret for authenticating cron requests |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server-side only, never exposed to client) |

The migration guard function `is_pgcron_available()` ensures cron job SQL is skipped on free tier, so migrations run cleanly regardless of plan.

### How It Works

1. Migrations run `CREATE EXTENSION IF NOT EXISTS pg_cron` — this succeeds on Pro, silently fails on free tier.
2. The guard migration checks `is_pgcron_available()` before calling `cron.schedule()`.
3. On free tier, Vercel Cron Jobs (configured in `vercel.json`) hit `/api/cron/*` routes which forward to Edge Functions.
4. Both approaches call the same Edge Functions, so behavior is identical.

## Deployment

The project is deployed on [Vercel](https://vercel.com) with GitHub integration:

- **Production**: auto-deploys on merge to `main`
- **Preview**: auto-deploys on every pull request (unique URL per PR)

Branch deployment is configured in `vercel.json` via the `git.deploymentEnabled` setting. Connect the GitHub repo in the Vercel dashboard under **Settings → Git** to activate the integration.

Required Vercel environment variables are listed in the Environment Variables section below.

## Environment Variables

| Variable | Where | Description |
|----------|-------|-------------|
| `VITE_SUPABASE_URL` | `.env.local` | Supabase project URL (client-side) |
| `VITE_SUPABASE_ANON_KEY` | `.env.local` | Supabase anon key (client-side) |
| `SUPABASE_URL` | Vercel env | Supabase project URL (server-side) |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel env | Service role key (server-side only) |
| `CRON_SECRET` | Vercel env | Secret for Vercel Cron authentication |

## Health Check & Uptime Monitoring

The platform exposes a health check Edge Function at `/functions/v1/health` that returns:

```json
{ "status": "ok", "database": "connected", "timestamp": "2024-01-15T10:30:00Z" }
```

It verifies database connectivity with a lightweight query and returns HTTP 503 if the database is unreachable.

### Uptime Monitoring Setup (BetterUptime / Checkly)

Configure your monitoring service to poll the health endpoint:

| Setting | Value |
|---------|-------|
| URL | `https://<project-ref>.supabase.co/functions/v1/health` |
| Method | `GET` |
| Check interval | 60 seconds |
| Confirmation period | 2 consecutive failures before alerting |
| Expected status | `200` |
| Expected body contains | `"status":"ok"` |

Alert channels (Slack, email, PagerDuty) are configured in the monitoring service dashboard. Target uptime SLA is 99.9%.

## Scripts

```bash
npm run dev       # Start dev server
npm run build     # Type-check + build
npm run lint      # ESLint (zero warnings)
npm test          # Vitest (single run)
```
