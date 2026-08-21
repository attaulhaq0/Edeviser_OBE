# E DEVISER ACTUAL APPLICATION
# POST-PR256 INDEPENDENT ENGINEERING + QA RECONCILIATION

Current main SHA: `dba5503852a2596ee62d6ef44a168c1d42a8e6bb` (PR #258 merged while this audit ran; PR #256 baseline was `7952d657218794169712c18f2618069d1568df3d`)

Production Supabase: `cdlgtbvxlxjpcddjazzx` (ACTIVE_HEALTHY)

Production Vercel SHA: unverified by Vercel CLI; latest production deployment was READY at 2026-08-17 22:31 AST, with aliases `edeviser.com`, `app.edeviser.com`, and `e-deviser.vercel.app`.

Audit timestamp: 2026-08-17 22:40 AST

Scope: read-only repository, GitHub, Supabase, and Vercel investigation. No application code, migrations, deployment, production data, or secrets were changed. The initially open local worktree was dirty and behind `origin/main`; it was not used as source-of-truth. Repository evidence below is from GitHub `main` / `origin/main` as available at the time of each check.

## 1. EXECUTIVE VERDICT

**PARTIALLY DRIFTED — REMEDIATION REQUIRED**

The current source architecture is materially healthier than the historical report: it uses one shared orchestrator, DeepSeek-only generation, a deterministic learner-state/queue contract, scoped five-role delivery, protected-write approval, and a now-merged measured-loop PR. The old missing `agent_suggestions`/`learning_state_vectors_v2` contract is not present in current executable code.

However, production migration history stops at `20260823000022`, while the live database contains agentic objects from repository migrations `20260827000001` through `20260830000001` and deployed agent functions. This is schema-history drift. It makes clean replay, rollback, forensic provenance, and “what is deployed?” assertions unreliable. The agent feature is also deployed but disabled/unproven: live secrets contain `DEEPSEEK_API_KEY`, but none of `AI_FEATURE_ENABLED`, `AI_PROACTIVE_AGENTS_ENABLED`, `AI_PROTECTED_WRITES_ENABLED`, or `AI_AUTO_LOW_RISK_ENABLED`; the config defaults the primary flag to false. All agent/runtime tables are empty.

## 2. TOP FINDINGS

| ID | Severity | Area | Finding | Evidence | User impact | Action required |
|---|---|---|---|---|---|---|
| P0-1 | HIGH | Release/schema | Production contains agentic schema/RPCs absent from its migration history. | `supabase migration list`; live `to_regclass`; migrations `20260827000001`–`20260830000001`. | Replay/rollback and next deployment can diverge. | Reconcile history using the established controlled migration process; do not recreate objects blindly. |
| P0-2 | HIGH | Agent rollout | Agent functions are deployed but runtime flags are absent/default-off and no execution has occurred. | live functions `agent-orchestrator`/`agent-worker` active; secret-name list; `_shared/ai/config.ts:100-136`; agent tables all zero. | Claimed proactive intelligence is not end-to-end proven. | Create one guarded enablement/production-smoke PR after history reconciliation. |
| P1-1 | MEDIUM | Security | `sync_learning_state_measurements_v1()` is anonymously executable SECURITY DEFINER in the live advisor result. | live Security Advisor finding; migration `20260830000001`. | Unauthenticated call surface to a privileged state-changing function. | Review/revoke anon/public execute and add a direct privilege regression test. |
| P1-2 | MEDIUM | Secrets hygiene | `GEMINI_API_KEY` and `OPENROUTER_API_KEY` remain configured without current executable consumers. | live secret-name inventory; executable-code provider search. | Unnecessary secret exposure/operational ambiguity. | Remove through approved secret-management change after confirming no external consumer. |
| P1-3 | MEDIUM | RAG | RAG schema and service-only replacement path exist, but production has 0 embeddings. Arabic retrieval has no demonstrated quality test. | migrations `20260820000002`, `20260827000002`–`07`; `embed-course-material`; live count 0. | RAG cannot be claimed operational. | Add controlled ingestion and bilingual retrieval evaluation. |

## 3. PREVIOUS-CLAIM CORRECTION TABLE

| Claim | Verdict | Evidence / correct interpretation | Action |
|---|---|---|---|
| A. PR #256 is not merged. | FALSE | GitHub: #256 MERGED 2026-08-17, merge SHA `7952…`. | No |
| B. Orchestrator expects missing `agent_suggestions` / `intelligence_feed_items`. | FALSE | `git grep` of current executable source found none of the named legacy objects/RPCs. | No |
| C. `learning_state_vectors_v2` is required. | FALSE | No current repository occurrence; canonical state is `student_learning_states`. | No |
| D. Need six independent agents. | FALSE | `_shared/ai/orchestrator.ts`, `contracts.ts`, registry, and two entry functions implement shared orchestration plus bounded specialists. | No |
| E. profiles/courses/outcomes/etc. are empty. | FALSE | Live counts: profiles 74, courses 4, learning_outcomes 19, outcome_attainment 1113, submissions 552. | No |
| F. Agent architecture is only ~45–55% connected. | PARTIALLY_TRUE / STALE | Source contract is connected; production enablement and runtime proof are absent. | Yes, P0-1/P0-2 |
| G. Primary P0 is rebuilding Agent ↔ DB contract. | STALE | Do not rebuild it. The live contract exists; reconcile migration provenance and prove it. | Yes, scope changed |

## 4. AGENT ARCHITECTURE RECONCILIATION

Repository: one shared `runAgentOrchestrator` with specialist registry (`tutor`, `mastery`, `habit`, `risk`, `intervention`, teacher, parent, coordinator, admin, evaluator). Entrypoints are `supabase/functions/agent-orchestrator/index.ts` (interactive/proposal decisions) and `agent-worker/index.ts` (bounded scheduled/evidence work). `SupabaseToolDataSource` is the scoped tool-data boundary; `createAIProvider` only constructs DeepSeek; `createSupabaseEmbeddingProvider` is the RAG interface. No direct provider bypass was found in current executable agent code.

Migration: audit/proposals in `20260827000001`; embeddings `…00002`–`07`; learner state/protected execution `20260828000001`; queue `20260829000001`; measured intervention loop `20260830000001` (PR #258).

Production DB: all core agent tables, queue, learner-state table, queue RPCs, and `sync_learning_state_measurements_v1` exist. Their migration versions are not recorded in production history. Status: **DRIFTED provenance; objects present**.

Edge Functions: live `agent-worker` ACTIVE version 3 (`verify_jwt=false`, system-key/cron-secret handler check) and `agent-orchestrator` ACTIVE version 3 (`verify_jwt=true`, handler auth). Their update timestamps coincide with the current release. Deployment code hash-to-Git SHA parity is not exposed by the CLI, so exact content parity is **UNPROVEN**.

Frontend: `src/app/RoleAppShell.tsx`, `src/hooks/useEDeviserIntelligence.ts`, `src/lib/edeviserIntelligence.ts`, and `EDeviserIntelligencePanel.tsx` consume the authenticated feed/orchestrator. UI is feature-gated by `VITE_AI_FEATURE_ENABLED`.

Tests: current main contains migration, orchestrator, tool-registry, worker security, approval/execution, DeepSeek, embedding, RAG authorization, and PR #258 measured-loop tests. The local checkout was not at main; only the locally available DeepSeek test ran (6/6). GitHub check evidence for #258 reports CI lint/type/test/SQL/RLS-smoke/build success; per-role pre-deploy E2E was **SKIPPED**.

## 5. DATABASE CONTRACT MATRIX

| Object | Repo/migration | Production | Consumer | Grants/RLS | Test status | Status |
|---|---|---|---|---|---|---|
| `student_learning_states`, `refresh_student_learning_state_v1` | `20260828000001` | exists | worker, data source | table RLS; refresh service-only | contract tests | DRIFTED provenance |
| `proactive_agent_jobs`, enqueue/claim/complete/fail | `20260829000001` | exists | worker | table/service RPCs service-only | proactive tests | DRIFTED provenance |
| `agent_runs`, `agent_tool_attempts`, proposals | `20260827000001` | exists | orchestrator/worker | service-only tables | migration/security tests | DRIFTED provenance |
| `agent_action_executions` / protected execution | `20260828000001` | exists | orchestrator | service-only receipt/audit; approval re-checks | approval/execution tests | DRIFTED provenance |
| `get_my_proactive_intelligence_v1` | `20260829000001` | exists; authenticated execute only | hook/UI | identity/role/institution recheck | contract tests | DRIFTED provenance |
| `intervention_measurements`, sync function | `20260830000001` | sync function exists | PR #258 path | advisor says anon execute | PR #258 tests | DRIFTED + security review |

## 6. LEARNING STATE / SIGNAL / PROACTIVE PATH

Canonical raw evidence is assignments/submissions, `outcome_attainment`, habits, goals/actions and interventions. `refresh_student_learning_state_v1` deterministically projects it into `student_learning_states`; `risk_signals` drives `enqueue_proactive_agent_jobs_v1`; jobs route only to active, same-institution student/teacher/verified-parent/coordinator/admin recipients. Claim uses `FOR UPDATE SKIP LOCKED`, bounded 10/25 batches, lease recovery, capped retries, dead-letter, unique institution/idempotency key, A0 and per-user/institution opt-outs. The worker invokes the shared orchestrator, stores a recommendation/proposal, and `get_my_proactive_intelligence_v1` rechecks delivery scope.

Main now also includes PR #258’s `intervention_measurements` and state-sync loop. It closes the source-level measured loop but is not production-proven because its migration provenance and runtime data are absent.

Competing legacy learner-state representations: every requested legacy name is **ABSENT** from current repository executable, migrations, tests, and docs search output. `student_learning_states` is **CANONICAL**; `intervention_measurements` is supporting history/measurement once reconciled.

## 7. DEEPSEEK / PROVIDER / EMBEDDING / RAG STATUS

`_shared/ai/config.ts` permits only `AI_PROVIDER=deepseek`, official `https://api.deepseek.com`, and `deepseek-v4-flash`/`deepseek-v4-pro`; `_shared/ai/providers/deepseek.ts` is the only active generation implementation. Active OpenAI/Gemini/OpenRouter/Anthropic/Groq generation: **0 found**. Automatic provider fallback: **NO**.

`GEMINI_API_KEY` and `OPENROUTER_API_KEY` are live secret names but have no current executable consumer: **dead configuration, not active provider use**. Embeddings use Supabase-native `gte-small`, versioned 384 dimensions, scoped course/institution retrieval (`search_course_materials_v2`), metadata/citations, and atomic service-only replacement. Production `course_material_embeddings=0`: architecture present, real ingestion not proven. No Arabic/multilingual retrieval quality test was found.

## 8. HUMAN APPROVAL + EXECUTION SECURITY

Protected actions are persisted as proposals, checked on approval (`requiredApproverUserId`, role, institution, target ownership), and execution invokes registered typed tools through `executeApprovedProposal`; execution writes an idempotent receipt/audit then refreshes learner state. Source checks cover stale/approval/role/institution boundaries. The most material gap is runtime proof: no live proposal/execution rows and no production negative test. Recheck rules are strong in source; production parity remains **UNPROVEN** due history drift.

## 9. FIVE-ROLE PRODUCT CONNECTIVITY

| Role | Critical connected surfaces | Status |
|---|---|---|
| Student | courses, assignments/submissions, habits, learner state, intelligence panel | LIKELY_COMPLETE; proactive runtime unproven |
| Teacher | assignments, grading, attendance, CLOs, risk intelligence | LIKELY_COMPLETE; cross-role E2E skipped |
| Parent | verified linking, child attendance/course/assignment read, intelligence | PARTIAL / security-scoped in source |
| Coordinator | programme/outcome/CQI/attainment and scoped intelligence | LIKELY_COMPLETE source; no live E2E |
| Admin | institutions/users/settings/analytics and scoped intelligence | LIKELY_COMPLETE source; no live E2E |

## 10. OBE + HABITS + CQI

Production has populated OBE data: 19 outcomes, 24 mappings, 1113 attainment rows, 13 rubrics/36 criteria, 552 submissions. Repository migrations and tests model ILO→PLO→CLO and CLO→PLO→ILO rollups; no independent production mathematical reconciliation was performed in this non-destructive audit, so that claim is **UNPROVEN** rather than failed.

Habits are stored and measured (1737 tracking rows, 14 logs), feed learner-state calculation, and can inform intelligence. Prompt text is bounded by deterministic evidence packets, but causal-language quality has no dedicated test. CQI has 3 plans and UI/function support; a closed effectiveness loop to future evidence is **PARTIAL**.

## 11. MULTI-TENANT SECURITY

Source and migration controls are substantially better than the historical claim: RLS isolation properties, preview RLS smoke, institution filters, verified parent links, course/program ownership, service-key scoping, and feed rechecks exist. Service-key edge functions remain high-value review surfaces. The worker accepts only a managed server key or timing-safe cron secret; the orchestrator derives identity from authenticated requests. No destructive cross-tenant production test was performed. Classification: **SAFE_BY_CONTRACT, runtime proof incomplete**.

## 12. SECURITY ADVISOR

Current advisor was run read-only. Material findings:

- **MEDIUM:** anonymous SECURITY DEFINER `sync_learning_state_measurements_v1()`; direct action required before enablement.
- **NEEDS_MANUAL_CONFIGURATION:** `citext` and `vector` extensions in `public`.
- **NEEDS_REVIEW:** legacy anonymous invitation/portfolio SECURITY DEFINER RPCs and authenticated helper/dashboard functions. These may be intentional, but each needs explicit grant/search-path/tenant-contract review; do not blanket-revoke.

## 13. PERFORMANCE ADVISOR

The live advisor reports many multiple-permissive-RLS-policy warnings (including programs, quizzes, rubrics, surveys, student courses/profiles). These are hygiene/per-query-cost warnings, not demonstrated regressions. No agent/RAG query-path incident was shown. Prioritize dashboards, gradebook, attendance, and OBE after collecting query evidence; do not mass-add/drop indexes from advisor output alone.

## 14. DEPLOYMENT / CI / EDGE PARITY

GitHub main is `dba550…`, one material commit beyond #256 (#258). Production Vercel is READY but Git SHA was not exposed, therefore parity is **UNVERIFIED**. Production has 50+ Edge Functions; repository has corresponding current function directories, but per-function content hash-to-commit comparison is unavailable. Agent worker/orchestrator are deployed. CI has lint, typecheck, unit/property tests, build, SQL replay/static schema checks, Supabase Preview RLS smoke, and prototype firewall. Critical gap: production migration history is not checked as a release gate against deployed Edge contracts. Smallest permanent control: a required post-deploy read-only job that compares `supabase_migrations.schema_migrations` with the release manifest and asserts all declared table/RPC/function contracts before Edge rollout.

## 15. QA COVERAGE

Passed: GitHub #258 lint, typecheck, unit/property, SQL lint, RLS preview smoke, build, security scan, and standard E2E check report success; local DeepSeek unit test 6/6.

Skipped: Pre-deployment per-role E2E, Nova UX audit, Sentry release, and some optional checks. Skipped browser tests are not treated as passed.

Highest-value missing proof: (1) production schema-history parity; (2) staged feature-on agent worker smoke; (3) cross-tenant worker/feed negative tests; (4) anonymous execution regression for state sync; (5) teacher→student→parent grade flow; (6) verified-parent revocation; (7) Arabic RAG relevance/citations; (8) protected proposal replay/tamper; (9) queue lease/dead-letter recovery against preview; (10) OBE fixture mathematical reconciliation.

## 16. DATA READINESS

Live exact counts: profiles 74, institutions 3, programs 4, courses 4, class_sessions 480, student_courses 160, assignments 21, submissions 552, rubrics 13, rubric_criteria 36, attendance_records 4800, learning_outcomes 19, outcome_mappings 24, outcome_attainment 1113, habit_tracking 1737, habit_logs 14, cqi_action_plans 3. Agent/RAG: embeddings 0, learner states 0, jobs 0, runs 0, tool attempts 0, proposals 0, executions 0. Data supports academic workflow testing, not agent or RAG operational claims.

## 17. ACTUAL APPLICATION COMPLETION ESTIMATE

Code completion: **70–80%** across broad role workflows, OBE, habits, and agent source architecture.

Institution-ready proof: **35–50%**. The main reduction is not feature breadth; it is production release provenance, feature-on evidence, RAG ingestion/evaluation, role E2E coverage, and operational/security proof.

## 18. REMEDIATION BACKLOG

P0 — **Reconcile production migration history with actual schema** (M). Affected: migrations `20260827000001`–`20260830000001`, `schema_migrations`, agent functions. Why: release provenance drift. Solution: compare normalized object definitions, record only validated already-applied versions through the established governed process, then run clean preview replay and post-deploy contract read. Tests: migration-list parity + function/table/RPC manifest test.

P1 — **Feature-on agentic preview smoke and rollout contract** (M). Affected: worker/orchestrator/config/queue. Why: deployed/disabled/empty is not operational proof. Solution: isolated preview fixture with flags enabled, one deterministic low-mastery signal, five scoped recipients, proposal approval and measured result. Tests: role and cross-tenant negative cases.

P1 — **Close anonymous state-sync execute exposure** (S). Affected: `sync_learning_state_measurements_v1`. Why: advisor finding. Solution: explicitly revoke public/anon and retain only the required trigger/service execution model after dependency review. Tests: `has_function_privilege` regression.

P2 — **RAG ingestion plus Arabic evaluation** (M). Affected: embedding function/RPC and QA fixtures. Why: no real corpus or multilingual proof. Solution: controlled course material lifecycle test and bilingual benchmark with citation checks. Tests: deletion/re-index and tenancy tests.

P3 — **Advisor policy/performance triage** (L). Affected: RLS-heavy dashboards/OBE tables. Why: warnings are numerous but unprioritized. Solution: EXPLAIN/query telemetry-led consolidation only where measurable. Tests: dashboard/gradebook latency and policy result parity.

## 19. WHAT NOT TO CHANGE

Do not rebuild the Agent ↔ Database contract; do not introduce six autonomous agents; do not revive legacy feed/vector tables; do not add provider fallback. Preserve the shared orchestrator, bounded specialists, deterministic learner state, queue idempotency/lease/dead-letter model, service-only internal RPCs, protected proposal boundary, and DeepSeek-only generation contract.

## 20. NEXT RECOMMENDED PR

**`fix(release): reconcile agentic production migration history and assert post-deploy contracts`** — a single bounded, read/verification-first release-engineering PR. It should codify migration-history/object parity for the already-live agentic schema, block future Edge deployments whose required migration/RPC/table manifest is absent, and include a preview replay test. It should not enable agents or change product behavior.
