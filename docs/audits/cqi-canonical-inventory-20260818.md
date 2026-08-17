# CQI canonical inventory — 2026-08-18

## Live reconciliation (production `cdlgtbvxlxjpcddjazzx`)

Read-only MCP inspection confirmed the following live objects. The inventory is
therefore grounded in the production schema rather than only in repository
history.

| Object                                                                                                                      | Classification       | Live evidence                                                                                                                                                                                    |
| --------------------------------------------------------------------------------------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `public.cqi_action_plans`                                                                                                   | CANONICAL            | RLS enabled; program/outcome/semester scope and the existing CQI lifecycle are present. Coordinator writes are program-owner scoped and admin writes are institution scoped through `programs`.  |
| `public.outcome_attainment`, `outcome_attainment_snapshots`, `outcome_mappings`, `learning_outcomes`, `programs`, `courses` | CANONICAL SUPPORTING | These are the authoritative OBE evidence, aggregation, hierarchy, and mapping surfaces.                                                                                                          |
| `public.student_learning_states`                                                                                            | CANONICAL SUPPORTING | RLS-enabled learner-state record; it is not an institutional CQI record.                                                                                                                         |
| `public.proactive_agent_jobs`, `agent_action_proposals`, `agent_action_executions`                                          | CANONICAL SUPPORTING | RLS-enabled governed agent workflow. Its queue currently requires a student recipient, so it cannot directly represent an institution-level CQI pattern without a minimal extension.             |
| `public.intervention_measurements`                                                                                          | CANONICAL SUPPORTING | Existing deterministic `PENDING`/`IMPROVED`/`NO_MATERIAL_CHANGE`/`DECLINED`/`INSUFFICIENT_EVIDENCE` evaluation contract; it is student-scoped and must not be repurposed as a second CQI record. |
| CQI-specific pattern record and scoped CQI RPCs                                                                             | MISSING              | There is no pattern identity/version, cooldown, controlled proposal-to-plan link, deterministic CQI measurement link, or coordinator/admin CQI intelligence RPC.                                 |

### Live access-control finding

`cqi_action_plans` has RLS enabled and coordinator/admin policies, but its
current UI writes `result_attainment` directly. That value is therefore a
legacy manual result, not a deterministic official CQI measurement. The CQI
extension must preserve the existing plan as canonical while moving governed
AI drafts, approval, execution, and measurement onto a controlled path.

### Preview replay boundary

The disposable Preview branch `nncifchkzasxrllroxzk` cannot currently be used
for a CQI migration replay. Its history stops at `20260504032900` because the
existing, Production-applied `20260504032936_fix_mutable_search_paths` migration
fails on a clean replay while altering `public.validate_sub_clo_weights()` before
that function exists. This is an unrelated historical replay defect; it must be
remediated independently rather than by editing a historical migration or using
Production as a test environment.

## Current canonical

- `public.cqi_action_plans`: the authoritative CQI plan record. It already owns
  program/outcome scope, deterministic baseline/target/result values, action,
  owner, lifecycle status, and improvement evidence.
- `public.proactive_agent_jobs` and `agent-orchestrator`: the shared governed
  intelligence route. Its proposals require approval and execution-time scope
  validation.
- `public.intervention_measurements`: the canonical before/action/after
  measurement contract and evaluation-state vocabulary.
- Accreditation readiness: reads `cqi_action_plans`; it must remain the sole
  accreditation/reporting surface.

## Legacy / duplicate

- No second CQI table or alternate CQI plan schema was found.
- The existing Coordinator CQI page permits direct create, status change, and
  manual `result_attainment` entry. It is a legacy operational UI path and is
  not sufficient for governed AI CQI creation or deterministic measurement.

## UI-only

- `CQIManager` and `useCQIPlans` expose the existing action-plan lifecycle but
  have no systemic-pattern inbox, proposal receipt, or deterministic CQI
  measurement state.

## Backend-only

- The proactive queue, proposal approval, protected execution, and intervention
  measurement routes are implemented but currently model student interventions,
  not aggregate CQI patterns.

## Missing

- Institution-scoped deterministic pattern persistence with cooldown/version
  identity and evidence references.
- A CQI proposal/action bridge that reuses `cqi_action_plans` without letting AI
  author official values.
- CQI measurement rows and a controlled execution registration path.
- Scoped coordinator/admin read RPCs and a non-student-detail admin aggregate.
- Typed Coordinator output plus evidence-reference authorization at the shared
  orchestrator boundary.

The required implementation is an extension of the current canonical tables
and governed intelligence loop. It must not create `cqi_v2`, a second CQI
system, or a second accreditation engine.
