# Rollback Guide — Agentic Intelligence Platform (8.3)

Layered levers, fastest first. No lever requires a migration. Consolidated
context: [`agentic-platform-runbook.md`](./agentic-platform-runbook.md).

## 1. Instant levers (no redeploy)

| Lever               | Action                                                                                                                               | Effect                                                                                                             |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| AI kill switch      | Supabase secret `AI_ENABLED=false`                                                                                                   | Orchestrator returns 503 `ai_feature_disabled`; schema and data intact                                             |
| Protected writes    | Supabase secret `PROTECTED_WRITES_ENABLED=false`                                                                                     | Proposal execution paths blocked; read tools and proposals keep working                                            |
| Institution ceiling | `UPDATE institution_autonomy_settings SET operational_autonomy_ceiling='A0', auto_execute_low_risk=false WHERE institution_id=<id>;` | Strict-minimum resolver clamps every effective autonomy for that institution                                       |
| pg_cron stop        | `SELECT cron.unschedule('<jobname>');`                                                                                               | Stops `agent-evaluation-jobs`, `intervention-generation-jobs`, `intervention-evaluation-jobs` without code changes |
| Vercel cron stop    | Disable `/api/cron/ai-at-risk-prediction` (Vercel dashboard or remove from `vercel.json`)                                            | Stops the sole agent-worker proactive scan; agent-worker has no pg_cron entry                                      |

## 2. Code-level rollback

- **Edge functions**: `supabase functions deploy <slug>` from the previous
  commit (deployments are versioned by Supabase). MERGE != DEPLOYMENT — a bad
  merge only becomes live after an explicit deploy, and attestation is separate.
- **Frontend**: Vercel instant rollback to the previous deployment.
- **Migrations**: forward-only. NEVER edit an applied migration; write a new
  compensating migration via the MCP pipeline. Local files are not proof of
  live state — verify via MCP introspection first.

## 3. Fail-closed guarantees during rollback

- Unconfigured institution → schema defaults (A2 ceiling, auto-exec OFF,
  rollback ON).
- Malformed settings row or store error → SAFE posture (A0, auto-exec OFF): a
  settings outage can never RAISE agent autonomy.
- Protected actions (grades, official outcomes, enrollment, messaging, CQI)
  always require human approval regardless of flags or autonomy level — A3
  never bypasses approval.

## 4. Post-rollback verification

- Invoke the orchestrator with a valid session → expect `503 ai_feature_disabled`
  while `AI_ENABLED=false`.
- `cron.job` shows the unscheduled entries removed; `cron.job_run_details`
  shows no new failures.
- Supabase Security Advisor clean; `agent_runs` shows no new runs while disabled.
