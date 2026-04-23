# Disaster Recovery — Supabase PITR

## Prerequisites

- Supabase Pro plan (PITR is not available on the free tier)
- Project owner or admin access in Supabase Dashboard

## Enabling Point-in-Time Recovery (PITR)

1. Open your project in the [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to **Settings → Addons → Point in Time Recovery**
3. Enable PITR and confirm billing
4. Default retention: **7 days** (configurable up to 30 days on Enterprise)

Once enabled, Supabase continuously archives WAL segments to object storage. No application changes are required.

## Restoring to a Point in Time

1. Go to **Database → Backups → Point in Time** in the Dashboard
2. Select the target timestamp (UTC) — must be within the retention window
3. Click **Restore** — this creates a new branch/project with the restored data
4. Verify data integrity (see checklist below)
5. If verified, swap the project URL in your environment variables

## Data Integrity Verification Checklist

After restoring, run these checks against the restored database:

- [ ] Row counts match expected ranges for core tables (`profiles`, `learning_outcomes`, `evidence`, `xp_transactions`)
- [ ] RLS policies are present on all tables (`SELECT tablename FROM pg_tables WHERE schemaname = 'public'` cross-referenced with `pg_policies`)
- [ ] Foreign key constraints are intact (`SELECT * FROM information_schema.table_constraints WHERE constraint_type = 'FOREIGN KEY'`)
- [ ] Materialized views exist and can be refreshed (`REFRESH MATERIALIZED VIEW leaderboard_weekly`)
- [ ] Auth users are present (`SELECT count(*) FROM auth.users`)
- [ ] Edge Function secrets are re-provisioned (secrets are NOT included in database backups)

## Daily Automated Backups

Supabase Pro also provides daily automated backups (separate from PITR). These are retained for 7 days and can be downloaded from **Database → Backups → Scheduled Backups**.

## Backup Monitoring

- Supabase sends email alerts if a scheduled backup fails
- Check backup status in the Dashboard under **Database → Backups**
- For programmatic monitoring, use the Supabase Management API: `GET /v1/projects/{ref}/database/backups`

## Secrets After Restore

Edge Function secrets (`RESEND_API_KEY`, `OPENAI_API_KEY`, etc.) are stored separately from the database. After a restore, re-provision them:

```bash
supabase secrets set RESEND_API_KEY=re_xxxxxxxx
supabase secrets set OPENAI_API_KEY=sk-xxxxxxxx
supabase secrets set CRON_SECRET=your-cron-secret
```
