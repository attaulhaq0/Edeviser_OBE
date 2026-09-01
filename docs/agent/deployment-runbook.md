# Deployment Runbook — Agentic Intelligence Platform (8.3)

Focused deployment guide. The consolidated operations reference is
[`agentic-platform-runbook.md`](./agentic-platform-runbook.md); rollback levers
live in [`rollback-guide.md`](./rollback-guide.md); provider/credential setup in
[`secret-setup-guide.md`](./secret-setup-guide.md). Known tracked deferrals are
listed in [`agentic-platform-completion-report.md`](./agentic-platform-completion-report.md).

## 1. Deployment impact classification (mandatory)

Every runtime-affecting change records this review block (repo governance):

```text
Deployment Impact: NONE | MIGRATIONS | EDGE_FUNCTIONS | BOTH | CONFIG
Runtime feature(s): [derived from scripts/runtime-dependency-manifest.json]
Affected functions: [derived from the runtime resolver]
Shared runtime changed: YES | NO
Production action required: YES | NO
```

Run `npm run check:runtime-dependencies` — it **fails closed** on any undeclared
Edge Function or unknown shared-runtime dependency. The agentic platform lives in
the `tutor-intelligence` runtime group; its shared paths are
`supabase/functions/_shared/ai/**`, `_shared/auth.ts`, `_shared/serverSecret.ts`,
`_shared/timing-safe-equal.ts`, and `agent-orchestrator/data-source.ts`.

## 2. Prerequisites

- Supabase CLI linked: `supabase link --project-ref <ref>`
- Secrets configured (see secret-setup-guide.md): `AI_PROVIDER=deepseek`,
  `DEEPSEEK_API_KEY`, `CRON_SECRET`
- Migrations applied via the Supabase MCP pipeline only — never hand-edit an
  already-applied file in `supabase/migrations/`; add a new forward migration.

## 3. Deploying Edge Functions

```bash
supabase functions deploy agent-orchestrator     # verify_jwt=true (browser-invoked)
supabase functions deploy agent-worker           # verify_jwt=false (system-invoked; isSystemCaller gate)
supabase functions deploy agent-evaluation-jobs  # verify_jwt=false (pg_cron-invoked)
supabase functions deploy intervention-jobs      # verify_jwt=false (pg_cron-invoked)
```

- When any `_shared/**` module changes, redeploy **every** function in the
  `tutor-intelligence` group (shared runtime changed: YES).
- Verify with `supabase functions list` — expect ACTIVE versions
  (verified live 2026-08-29: agent-orchestrator v20, agent-worker v20,
  agent-evaluation-jobs v8, intervention-jobs v8).
- **MERGE != DEPLOYMENT**: merging a PR never deploys by itself; deployment is an
  explicit, separately attested step.

## 4. Frontend (Vercel)

- Deploys automatically on merge to `main` (`vercel.json` →
  `git.deploymentEnabled.main`).
- Required Vercel env vars: `CRON_SECRET` (validates inbound Vercel Cron
  `Authorization: Bearer`), `SUPABASE_URL` (or `VITE_SUPABASE_URL`), and the
  managed server key consumed by `api/_utils/serverSecret.ts` (used as the
  Bearer credential when `invokeEdgeFunction` calls the edge runtime).

## 5. Schedules — Task 4.7 operator note

- **Vercel Cron is the SOLE agent-worker scheduler**:
  `vercel.json` → `/api/cron/ai-at-risk-prediction` daily `0 3 * * *` →
  `verifyCronSecret` → `invokeEdgeFunction("agent-worker", { action: "scheduled_scan" })`.
  Do **not** create a competing pg_cron job for agent-worker (spec non-goal: no
  duplicate cron schedules).
- Direct agent-worker invocation (bypassing Vercel) authenticates via the
  `x-cron-secret` header matching its `CRON_SECRET` env, or via the managed
  server key Bearer (`isSystemCaller`).
- pg_cron-managed loops (verified live in `cron.job` 2026-08-29):
  `agent-evaluation-jobs` hourly :20; `intervention-generation-jobs` daily :05;
  `intervention-evaluation-jobs` every 15 min. Their credentials are read from
  `private.cron_secrets` (row `cron_intervention_jobs`; schema revoked from
  anon/authenticated).
- If a pg_cron schedule silently stops firing: (a) `SELECT name FROM
private.cron_secrets;` (b) `SELECT jobname, schedule FROM cron.job;` (c)
  confirm the secret matches the function's `CRON_SECRET` env binding.

## 6. Post-deployment verification

1. `npm run check:runtime-dependencies` (pre-deploy, fails closed)
2. `supabase functions list` → all four functions ACTIVE
3. Gates: `npm run lint` → `npx tsc --noEmit` → `npm test` → `npm run i18n:check`
4. Supabase Security Advisor + Performance Advisor — zero critical findings
5. Cron evidence: `cron.job_run_details` recent successes for pg_cron loops;
   Vercel logs for the 03:00 UTC agent-worker scan
6. Record the deployment attestation separately from the merge record
