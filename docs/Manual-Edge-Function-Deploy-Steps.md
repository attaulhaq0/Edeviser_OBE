# Manual Edge Function Deployment via Supabase Dashboard

This guide walks through deploying the 14 edge functions with security fixes through the Supabase Dashboard. No CLI required.

---

## Where to deploy

Open this URL (already scoped to your project):

**<https://supabase.com/dashboard/project/cdlgtbvxlxjpcddjazzx/functions>**

You'll see a list of all 50+ deployed functions.

---

## How the dashboard editor works

For each function listed below:

1. Click the function name (e.g. `award-xp`)
2. Click the **Edit Function** button (top-right) — this opens an in-browser code editor
3. **Select all** code in the editor (Ctrl+A / Cmd+A) and **Delete**
4. Open the local file from your repo (path provided below) — copy its **entire contents**
5. **Paste** into the dashboard editor
6. Click **Deploy** (top-right)
7. Wait for "Deployed successfully" toast (~5–10 seconds)
8. Move on to the next function

---

## Deploy in this exact order (highest impact first)

### Critical 4 — auth bypass + privilege escalation (deploy first)

| # | Function name | Local file path | Why critical |
|---|---|---|---|
| 1 | `award-xp` | `supabase/functions/award-xp/index.ts` | Substring auth pattern → exact match |
| 2 | `check-badges` | `supabase/functions/check-badges/index.ts` | Adds ownership check (caller must equal student_id) |
| 3 | `process-streak` | `supabase/functions/process-streak/index.ts` | Adds ownership check |
| 4 | `send-email-notification` | `supabase/functions/send-email-notification/index.ts` | Substring auth pattern fix |

### Important 10 — substring auth pattern fixes

| # | Function name | Local file path |
|---|---|---|
| 5 | `calculate-attainment-rollup` | `supabase/functions/calculate-attainment-rollup/index.ts` |
| 6 | `ai-at-risk-prediction` | `supabase/functions/ai-at-risk-prediction/index.ts` |
| 7 | `ai-module-suggestion` | `supabase/functions/ai-module-suggestion/index.ts` |
| 8 | `check-login-rate` | `supabase/functions/check-login-rate/index.ts` |
| 9 | `compute-at-risk-signals` | `supabase/functions/compute-at-risk-signals/index.ts` |
| 10 | `compute-habit-correlations` | `supabase/functions/compute-habit-correlations/index.ts` |
| 11 | `notification-digest` | `supabase/functions/notification-digest/index.ts` |
| 12 | `streak-risk-cron` | `supabase/functions/streak-risk-cron/index.ts` |
| 13 | `update-question-analytics` | `supabase/functions/update-question-analytics/index.ts` |
| 14 | `weekly-summary-cron` | `supabase/functions/weekly-summary-cron/index.ts` |

---

## Step-by-step example — deploying `award-xp`

### 1. Open the function in the dashboard

Direct link:
**<https://supabase.com/dashboard/project/cdlgtbvxlxjpcddjazzx/functions/award-xp>**

### 2. Click **Edit Function** (or **Edit code** depending on dashboard version)

A code editor will open with the currently-deployed source.

### 3. Open the local file

Path: `supabase/functions/award-xp/index.ts`

In Kiro / VS Code: open this file, click anywhere in the editor, press **Ctrl+A** then **Ctrl+C** to copy the entire contents.

### 4. Replace dashboard contents

In the dashboard's editor:
- Click anywhere in the code area
- Press **Ctrl+A** to select everything
- Press **Delete** (or just paste — paste will replace the selection)
- Press **Ctrl+V** to paste your local code

### 5. Click **Deploy**

The button is in the top-right corner of the editor. A toast will confirm deployment.

### 6. Verify

After deploy:
- The version number in the function header should increment (e.g. v1 → v2)
- The **Last deployed** timestamp updates to "just now"

---

## Direct links to each function (saves clicks)

Click the link, then **Edit Function**, paste, **Deploy**:

1. <https://supabase.com/dashboard/project/cdlgtbvxlxjpcddjazzx/functions/award-xp>
2. <https://supabase.com/dashboard/project/cdlgtbvxlxjpcddjazzx/functions/check-badges>
3. <https://supabase.com/dashboard/project/cdlgtbvxlxjpcddjazzx/functions/process-streak>
4. <https://supabase.com/dashboard/project/cdlgtbvxlxjpcddjazzx/functions/send-email-notification>
5. <https://supabase.com/dashboard/project/cdlgtbvxlxjpcddjazzx/functions/calculate-attainment-rollup>
6. <https://supabase.com/dashboard/project/cdlgtbvxlxjpcddjazzx/functions/ai-at-risk-prediction>
7. <https://supabase.com/dashboard/project/cdlgtbvxlxjpcddjazzx/functions/ai-module-suggestion>
8. <https://supabase.com/dashboard/project/cdlgtbvxlxjpcddjazzx/functions/check-login-rate>
9. <https://supabase.com/dashboard/project/cdlgtbvxlxjpcddjazzx/functions/compute-at-risk-signals>
10. <https://supabase.com/dashboard/project/cdlgtbvxlxjpcddjazzx/functions/compute-habit-correlations>
11. <https://supabase.com/dashboard/project/cdlgtbvxlxjpcddjazzx/functions/notification-digest>
12. <https://supabase.com/dashboard/project/cdlgtbvxlxjpcddjazzx/functions/streak-risk-cron>
13. <https://supabase.com/dashboard/project/cdlgtbvxlxjpcddjazzx/functions/update-question-analytics>
14. <https://supabase.com/dashboard/project/cdlgtbvxlxjpcddjazzx/functions/weekly-summary-cron>

---

## What to verify after deploy

After all 14 are deployed, return to <https://supabase.com/dashboard/project/cdlgtbvxlxjpcddjazzx/functions>

Each of the 14 should now show:
- **Status**: ACTIVE
- **Version**: 2 (or higher) — was 1 before
- **Last deployed**: today's date

If any function fails to deploy with a syntax/import error, the dashboard will keep the previous version live (no downtime).

---

## Time estimate

- ~30–60 seconds per function (open, copy, paste, deploy, wait)
- Total: **~10–15 minutes** for all 14

---

## After deployment

Test these flows in the production app:

| Flow | Tests |
|---|---|
| Student daily login | Logs in → XP +10 awarded → cannot self-trigger XP for another student |
| Student submits assignment | Auto-graded → evidence created → XP awarded |
| Student earns badge | `check-badges` rejects requests where `caller.id !== student_id` (403) |
| Student streak processing | `process-streak` rejects cross-user requests |
| Admin sends invitation email | `send-email-notification` works for admins |

If any flow returns 403 or 401 unexpectedly, the JWT/auth changes need investigation. Otherwise you're done.

---

## Rollback (if needed)

In the dashboard, click the function → **Versions** tab → click any previous version → **Restore**.

This reverts to the older code in seconds. No data loss.
