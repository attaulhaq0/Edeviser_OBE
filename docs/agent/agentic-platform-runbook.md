# Agentic Intelligence Platform — Operations Runbook (8.3)

Covers deployment, rollback, and secret setup for the agentic platform
(agent-orchestrator, agent-worker, agent-evaluation-jobs, intervention-jobs
edge functions + supporting schema). Canonical feature spec:
`.kiro/specs/edeviser-agentic-intelligence/`.

Focused guides: [`deployment-runbook.md`](./deployment-runbook.md),
[`secret-setup-guide.md`](./secret-setup-guide.md),
[`rollback-guide.md`](./rollback-guide.md).

## 1. Provider & Secrets (DeepSeek backbone)

`AI_PROVIDER=deepseek` is mandatory — Gemini must never be required for
production AI execution. Configure via Supabase secrets, never in browser code:

```bash
supabase secrets set AI_PROVIDER=deepseek
supabase secrets set DEEPSEEK_API_KEY=<key>
supabase secrets set CRON_SECRET=<random, >=16 chars>  # validates x-cron-secret
```

Client-visible keys are limited to the standard publishable anon key. The
browser never receives provider keys; all LLM calls run inside edge functions.

## 2. Deploying Edge Functions

```bash
supabase functions deploy agent-orchestrator
supabase functions deploy agent-worker
supabase functions deploy agent-evaluation-jobs
supabase functions deploy intervention-jobs
```

Verify with `supabase functions list` (expect ACTIVE versions) and confirm the
shared `_shared/ai/*` modules were bundled (run `npm run check:runtime-dependencies`
before deploying — it fails closed on unknown shared-runtime dependencies).

## 3. Migrations & Schedules

- Migrations are applied via the Supabase MCP pipeline only; never hand-edit
  `supabase/migrations/` for an already-applied file — add a new one.
- pg_cron schedules (intervention generation/evaluation, agent evaluation)
  read their credential from `private.cron_secrets`
  (schema revoked from anon/authenticated). If a schedule silently stops
  firing, check: (a) the row exists — `SELECT name FROM private.cron_secrets;`,
  (b) `cron.job` has the entry, (c) the secret matches the function's
  `CRON_SECRET` env binding.
- The agent-worker has NO pg_cron schedule: Vercel Cron
  (`/api/cron/ai-at-risk-prediction`, daily 03:00 UTC) is its sole proactive
  scheduler — do not create a competing pg_cron job (spec non-goal: no
  duplicate cron schedules). Direct invocation uses the `x-cron-secret` header
  (`CRON_SECRET`) or the managed server key.

## 4. Rollback Controls

1. **Feature flag (instant)**: `AI_ENABLED=false` (agentic config) returns 503
   `ai_feature_disabled` from the orchestrator while keeping schema intact.
2. **Protected writes**: `PROTECTED_WRITES_ENABLED=false` blocks proposal
   execution paths only; read tools and proposals keep working.
3. **Autonomy ceiling**: set `institution_autonomy_settings.operational_autonomy_ceiling`
   to `A0` (fail-closed default for unconfigured institutions is A2 with
   auto-execution off; the strict-minimum resolver clamps every effective
   autonomy to the institution ceiling).
4. **Cron stop**: `SELECT cron.unschedule('<jobname>');` for the pg_cron loops
   (`agent-evaluation-jobs`, `intervention-generation-jobs`,
   `intervention-evaluation-jobs`) — stops background loops without code
   changes. The agent-worker proactive scan is stopped on the Vercel side
   (disable `/api/cron/ai-at-risk-prediction`); it has no pg_cron entry.
5. **Function rollback**: redeploy the previous version — deployments are
   versioned by Supabase; MERGE != DEPLOYMENT, and attestation is separate.

## 5. Data Retention & Auditing

Every agent run, tool attempt, proposal, execution receipt and evaluation is
persisted (`agent_runs`, `agent_tool_attempts`, `agent_action_proposals`,
`agent_action_executions`, `agent_evaluations`). Tables are RLS deny-all to
clients unless an explicit policy grants scoped access (conversations,
messages and feedback are actor-scoped writable). Admin aggregates flow only
through the bounded `get_governance_summary` orchestrator channel.

## 6. Verification Gates

```bash
npm run lint            # ESLint, zero warnings
npx tsc --noEmit        # type safety
npm test                # Vitest unit suite
npm run test:rls        # pgTAP/integration RLS suite (Docker required)
npm run i18n:check      # en/ar key parity
npm run check:runtime-dependencies
```
