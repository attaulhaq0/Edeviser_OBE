# Proactive Agentic Intelligence

## Purpose

E Deviser can turn a deterministic Student Learning State signal into bounded,
role-appropriate guidance without creating another attainment or risk engine.
The model explains evidence and recommends next steps. Deterministic code owns
risk, tenancy, authorization, proposals, approvals, and every official write.

## Flags and scheduler

The capability fails closed unless both `AI_FEATURE_ENABLED=true` and
`AI_PROACTIVE_AGENTS_ENABLED=true`. The shared browser panel is independently
hidden unless `VITE_AI_FEATURE_ENABLED=true`. Production defaults remain false.

The existing Vercel schedule remains the only proactive scheduler:

`/api/cron/ai-at-risk-prediction` → `agent-worker` `scheduled_scan`

No competing pg_cron job or risk calculator is introduced. Authorized platform
code may also invoke `evidence_event` with a student ID; that path first refreshes
the canonical Student Learning State and then uses the same queue.

## Deterministic trigger and routing

`enqueue_proactive_agent_jobs_v1` reads only fresh
`student_learning_states.risk_signals` records whose deterministic kind is
`low_mastery`. The trigger contract is
`student-learning-state/low-mastery/v1`. The LLM cannot create, change, or
upgrade this signal.

For each signal, server-side joins resolve currently authorized recipients:

| Role        | Scope rechecked at enqueue and feed read | Specialist  |
| ----------- | ---------------------------------------- | ----------- |
| Student     | Exact student                            | Mastery     |
| Teacher     | Current course owner                     | Risk        |
| Parent      | Verified parent-student link             | Parent      |
| Coordinator | Current program coordinator              | Coordinator |
| Admin       | Active profile in the institution        | Admin       |

Inactive institutions/profiles, A0 autonomy, and explicit institution or user
proactive opt-outs are suppressed. Each evidence packet contains only the
canonical state version/hash, the deterministic risk signal, and course/program
scope.

## One bounded orchestrator

Every claimed job runs through `runAgentOrchestrator`, the same orchestrator used
for interactive Intelligence. Role-specialist allowlists, tool-call steps,
total calls, and specialist transfers remain finite. Tool and evidence payloads
are labelled untrusted. There is no free agent-to-agent chat.

Protected actions can only create `agent_action_proposals`. They are never
executed by the worker. The shared five-role panel exposes the recommendation
and any proposal to its exact recipient. Approval and typed execution continue
through `agent-orchestrator`, including execution-time authorization rechecks.
Only registered protected tools can execute.

## Durability and observability

`proactive_agent_jobs` is both the durable work queue and minimized delivery
record:

- institution-scoped idempotency keys suppress unchanged duplicate work;
- scheduled enqueue is capped at 100 jobs and each worker claim at 25;
- `FOR UPDATE SKIP LOCKED` prevents competing workers from claiming one job;
- 30–600 second leases recover abandoned work;
- attempts use bounded backoff and terminate in `dead_letter` after the stored
  maximum attempt count;
- run, provider, model, proposal IDs, classification, timestamps, and terminal
  state are retained without raw prompts or credentials;
- `get_my_proactive_intelligence_v1` rechecks current role scope before returning
  completed guidance.

The cron response reports enqueue, claim, completion, retry, and dead-letter
counts. Operational inspection can filter `proactive_agent_jobs` by status and
institution without reconstructing failures from application logs.

## Proven flow

The rollback-only integration in `scripts/verify-agentic-protected-write.sql`
proves canonical signal → five-role routing → duplicate suppression → bounded
claim → completion/retry/dead-letter → authenticated feed. It also verifies that
all fixture rows disappear after rollback. Unit contracts cover fail-closed
authorization, shared-orchestrator ownership, prompt boundaries, and the absence
of legacy `ai_feedback` risk/proposal storage in the worker.

## Rollback

Set `AI_PROACTIVE_AGENTS_ENABLED=false` to stop enqueue and processing. Set
`VITE_AI_FEATURE_ENABLED=false` to hide the shared panel. Existing queue, audit,
proposal, and completed delivery records remain available for governance; no
schema rollback or data deletion is required.
