# Edge Function Deployment Guide

The 14 edge functions below received security fixes (substring auth pattern → exact comparison + ownership checks). Pick **one** of the three deployment methods below.

## Functions to Deploy

### Critical (4) — auth bypass + privilege escalation fixes

| Function | Fix |
|----------|-----|
| `award-xp` | Exact token comparison (was `.includes(serviceRoleKey)`) |
| `check-badges` | Ownership check + exact token comparison |
| `process-streak` | Ownership check + exact token comparison |
| `send-email-notification` | Exact token comparison |

### Important (10) — substring auth pattern fixes

`calculate-attainment-rollup`, `ai-at-risk-prediction`, `ai-module-suggestion`, `check-login-rate`, `compute-at-risk-signals`, `compute-habit-correlations`, `notification-digest`, `streak-risk-cron`, `update-question-analytics`, `weekly-summary-cron`

---

## Method 1: Automated Script (Fastest — Recommended)

### Windows (PowerShell)

```powershell
# Authenticate once (browser opens)
npx supabase login

# Or use a Personal Access Token
$env:SUPABASE_ACCESS_TOKEN = "sb_pat_xxxxxxxxxx"

# Preview what will be deployed
pwsh scripts/deploy-edge-functions.ps1 -DryRun

# Deploy critical 4 only
pwsh scripts/deploy-edge-functions.ps1 -Critical

# Deploy all 14
pwsh scripts/deploy-edge-functions.ps1
```

### macOS / Linux / Git Bash

```bash
# Authenticate
npx supabase login

# Make script executable
chmod +x scripts/deploy-edge-functions.sh

# Preview
bash scripts/deploy-edge-functions.sh --dry

# Deploy critical 4 only
bash scripts/deploy-edge-functions.sh --critical

# Deploy all 14
bash scripts/deploy-edge-functions.sh
```

**Get a Personal Access Token**: <https://supabase.com/dashboard/account/tokens>

---

## Method 2: Supabase CLI Manual (One at a Time)

```bash
# Authenticate
npx supabase login

# Deploy each function
npx supabase functions deploy award-xp --project-ref cdlgtbvxlxjpcddjazzx
npx supabase functions deploy check-badges --project-ref cdlgtbvxlxjpcddjazzx
npx supabase functions deploy process-streak --project-ref cdlgtbvxlxjpcddjazzx
npx supabase functions deploy send-email-notification --project-ref cdlgtbvxlxjpcddjazzx
npx supabase functions deploy calculate-attainment-rollup --project-ref cdlgtbvxlxjpcddjazzx
npx supabase functions deploy ai-at-risk-prediction --project-ref cdlgtbvxlxjpcddjazzx
npx supabase functions deploy ai-module-suggestion --project-ref cdlgtbvxlxjpcddjazzx
npx supabase functions deploy check-login-rate --project-ref cdlgtbvxlxjpcddjazzx
npx supabase functions deploy compute-at-risk-signals --project-ref cdlgtbvxlxjpcddjazzx
npx supabase functions deploy compute-habit-correlations --project-ref cdlgtbvxlxjpcddjazzx
npx supabase functions deploy notification-digest --project-ref cdlgtbvxlxjpcddjazzx
npx supabase functions deploy streak-risk-cron --project-ref cdlgtbvxlxjpcddjazzx
npx supabase functions deploy update-question-analytics --project-ref cdlgtbvxlxjpcddjazzx
npx supabase functions deploy weekly-summary-cron --project-ref cdlgtbvxlxjpcddjazzx
```

---

## Method 3: Supabase Dashboard (No CLI)

Use this if you don't have local CLI access. **Slower but no install required.**

### Steps for each function

1. Open <https://supabase.com/dashboard/project/cdlgtbvxlxjpcddjazzx/functions>
2. Click on the function name (e.g. `award-xp`)
3. Click **Edit Function**
4. Open the local file in your editor: `supabase/functions/<name>/index.ts`
5. **Select all** (Ctrl+A / Cmd+A) and **copy**
6. In the dashboard editor, **select all** and **paste** to replace
7. Click **Deploy**
8. Wait for "Deployed successfully" toast
9. Repeat for the next function

### Order to deploy (highest impact first)

1. `award-xp` (large file, ~1355 lines)
2. `check-badges` (medium)
3. `process-streak` (medium)
4. `send-email-notification` (medium)
5. The remaining 10 in any order

---

## Verification

After deploying, confirm the new versions are live:

```bash
# Via CLI — version number should increment
npx supabase functions list --project-ref cdlgtbvxlxjpcddjazzx | grep -E "award-xp|check-badges|process-streak"
```

Or via dashboard: each function's page shows the **deployment count** (was 1, should now be 2+).

---

## Rollback (if needed)

Supabase keeps prior versions. To revert a single function:

```bash
# List versions
npx supabase functions list --project-ref cdlgtbvxlxjpcddjazzx

# Rollback
npx supabase functions rollback <name> --project-ref cdlgtbvxlxjpcddjazzx
```

Or in the dashboard: function page → **Versions** tab → click the previous version → **Restore**.

---

## Troubleshooting

### "Not authenticated"
Run `npx supabase login` (browser opens) or set `SUPABASE_ACCESS_TOKEN`.

### "Function not found"
The function name must match the directory under `supabase/functions/`. Check `ls supabase/functions/` for the exact name.

### "Permission denied"
Your access token must have **deploy permissions** on the project. Verify at <https://supabase.com/dashboard/account/tokens>.

### Deploy succeeds but old behavior persists
Edge functions cache for ~30 seconds at the gateway. Wait 60s and retest. If still cached, redeploy with the same code to force a refresh.
