# Manual Steps — Supabase Audit Remediation

These steps cannot be automated via SQL migrations and must be performed manually in the Supabase Dashboard.

---

## 1. Enable Leaked Password Protection (Requires Pro Plan)

**Project**: Edeviser-Kiro (`cdlgtbvxlxjpcddjazzx`)
**Region**: ap-northeast-1
**Status**: ⏳ Deferred — requires Supabase Pro plan

### Steps (when upgrading to Pro)

1. Open the [Supabase Dashboard](https://supabase.com/dashboard/project/cdlgtbvxlxjpcddjazzx/auth/settings)
2. Navigate to **Authentication** → **Settings**
3. Scroll to the **Security** section
4. Toggle **Enable Leaked password protection** to ON

### Why this is deferred

Leaked password protection (HaveIBeenPwned integration) is only available on Supabase Pro plan. The free plan does not expose this toggle. Enable this when you upgrade to Pro for production deployment.

### Verification (after enabling)

Attempt to create a test account with a known compromised password (e.g., `password123`). The system should reject it with an error indicating the password has been found in a data breach.

---

## 2. Deploy Edge Functions — ✅ DONE

Edge Functions were successfully deployed on 2026-04-27 via:

```bash
./scripts/deploy-edge-functions.sh
```

All 37 Edge Functions deployed to the Supabase project.
