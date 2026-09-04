# PostHog Setup Guide (US region, two projects)

Do these steps in the PostHog web UI once. Region: **US** (`https://us.i.posthog.com`).

## 1. Create the two projects

1. app.posthog.com → Organization settings → **Projects** → New project:
   `edeviser-prod` (this may be the existing project, renamed) and `edeviser-qa`.
2. For each: Settings → Project → copy **Project API key** (`phc_…`) — public token,
   safe for the browser.

> Free plan note: multiple projects are supported on the org; the 1M events/month
> quota is shared across the organization. QA project traffic is small, so this fits.
> If PostHog ever blocks a second project on the current plan, fallback = single
> project + `account_type` filters (the tagging in Phase 1 makes this work either way).

## 2. Tag-based test-account filtering (BOTH projects)

1. Settings → Project → **Filter out internal and test users** → add:
   - Person property: `account_type` — operator `exact` — value `seed`
2. Apply to existing insights: Settings → same section → **Existing insights** →
   "Turn on for existing insights". Or bulk via API:
   ```bash
   curl -X POST 'https://us.posthog.com/api/projects/<PROJECT_ID>/insights/bulk_set_test_account_filter/' \
     -H 'Authorization: Bearer <POSTHOG_PERSONAL_API_KEY>' \
     -H 'Content-Type: application/json' -d '{"enabled": true}'
   ```
   (Needs a personal API key with `insight:write` from an org admin.)
3. Do NOT use email-domain filters — seed emails are intentionally legitimate-looking
   (`@demo.com`, `@noor-international.edu`); filtering is by `account_type` only.

## 3. Vercel environment variables (both `edeviser-kiro` project and local)

| Variable                     | Production                 | Preview/Development        |
| ---------------------------- | -------------------------- | -------------------------- |
| `VITE_POSTHOG_PROJECT_TOKEN` | edeviser-prod `phc_…`      | edeviser-qa `phc_…`        |
| `VITE_POSTHOG_HOST`          | `https://us.i.posthog.com` | `https://us.i.posthog.com` |

Local dev: put the **qa** token in your local `.env.local` (never commit).

## 4. Session replay

- edeviser-qa: Record 100% of sessions.
- edeviser-prod: Settings → Replay → recording rules — start at 25–50% sampling;
  input + text masking is enforced in code (`maskAllInputs`, `maskTextSelector: "*"`).

## 5. Verify end-to-end (2 minutes)

1. Open the live app, accept analytics cookies in the banner.
2. PostHog → **Live events** → click around the app → events appear within seconds.
3. Log in as a seed account → person shows `account_type: seed`.
4. Check the QA project for preview-deployment traffic.

### 5.1 The connected project token

- Token already supplied by the owner: `phc_voQrUVRwLKFpCLqcqcdBpfrr7EeYss7Fq6XSDah7VRmh`
  (host `https://us.i.posthog.com`). Put this (or the edeviser-prod token, if you
  prefer a rename) in the **Production** `VITE_POSTHOG_PROJECT_TOKEN`. Put the
  **edeviser-qa** token in Preview/Development + local `.env.local`.
- This token currently has **zero events** because events are consent-gated and the
  Phase-1 code is not yet deployed. After deploy: accept cookies once → events flow.
- ⚠️ Do **not** apply the generic integration snippet's `capture_pageview: false`,
  raw `posthog.capture()/identify()` calls, or the
  `email contains "@edeviser.com"` filter — see `README.md` §10 for why.

### 5.2 CSP (only if a CSP is added later)

Allow `https://*.posthog.com` in `script-src`, `connect-src`, and `worker-src`.
The SDK lazy-loads bundles from `*-assets.i.posthog.com` (covers `worker-src blob:`
for replay) and ingests to `us.i.posthog.com`. Today the repo ships no CSP.

## 6. Dashboards

Run `node scripts/posthog-provision.mjs` (Phase 3 task) with
`POSTHOG_PERSONAL_API_KEY` + `POSTHOG_PROJECT_ID` env vars, or build the 4 dashboards
by hand from `design.md` §Dashboards. Free-plan alert limit is 5 alerts — reserve
them for: login DAU drop, exceptions spike, purchase_failed spike, grade→XP drift.
