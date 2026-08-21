# Data Model — Agentic Intelligence Platform

## Existing (live-verified)

### OBE core
- **learning_outcomes**: id, institution_id, program_id, course_id, type (ILO/PLO/CLO/SUB_CLO), title, bloom_level, weight, tutor_autonomy_level (L1–L3), parent_outcome_id (Sub-CLO link). CHECKs: canonical shape, title length, weight range. Triggers: scope enforcement, mapped-delete guard.
- **outcome_mappings**: source_outcome_id (parent), target_outcome_id (child), weight ∈ [0,1]. Triggers: hierarchy validation, DEFERRABLE weight-sum.
- **outcome_attainment**: outcome_id, student_id, scope ('student_course' CLO / 'course' PLO / 'program' ILO), attainment_percent; maintained by `trigger_attainment_rollup` (canonical direction).
- graduate_attributes / graduate_attribute_mappings: dedicated tables (unchanged).

### Agent core (live)
- **agent_runs**: one row per orchestrator run (model, tokens, cost, latency, status).
- **agent_action_proposals**: action type/description/reason/evidence/affected entities/outcome level/risk/reversibility/required approver/expiry/payload + status lifecycle (draft→pending_approval→approved/rejected/expired→executing→completed/failed/cancelled). Approver decision fields folded here (documented deviation from separate approvals table).
- **agent_action_executions**: execution records with re-validated authorization results.
- **agent_tool_attempts**: per-tool-call attempts (naming reconciliation with PDF's "agent_tool_calls" — decide rename vs alias in task 8.1).

### Digital Twin (live)
- **student_learning_states** (one row per student): version bigint, calculated_at/fresh_until/freshness jsonb, mastery jsonb{object}, habits jsonb{object}, risk_signals jsonb[], strengths[], opportunities[], goals[], active_interventions[], recent_evidence[], recommendation_history[], approved_executed_actions[], measured_intervention_effects[], state_hash(32), updated_at. RLS: self-read within own institution (+ staff read policies).
- Indexes on (institution_id, fresh_until).

### Tutor (live)
tutor_conversations (persona, clo_scope, autonomy_override, recommended_persona, xp_awarded), tutor_messages (role, content, source_citations, token_count, flagged_integrity, autonomy_level, nudge_type, satisfaction_rating), tutor_usage_limits (daily message/token budget), tutor_llm_logs (model, tokens, latency, status), tutor_plan_updates.

## Planned deltas

| Change | Purpose | Task |
|---|---|---|
| calculation_version/policy_version/model_version columns (or versions jsonb) on student_learning_states | PDF §28 versioning | 4.1 |
| agent_conversations, agent_messages | agent conversation persistence distinct from tutor | 8.1 |
| agent_tool_calls vs agent_tool_attempts naming reconciliation | align with PDF §37 vocabulary | 8.1 |
| agent_tasks | background/proactive task inbox | 8.1 |
| agent_feedback | thumbs up/down + correction capture on agent outputs | 8.1 |
| agent_evaluations | evaluator-agent scoring runs | 7.4/8.1 |
| learning_interventions, intervention_outcomes | first-class intervention records + measured outcomes (currently jsonb sections) | 4.x/8.1 |
| learning_state_events | append-only state-change history (audit/trend) | 8.1 |
| student_support_states (optional) | handoff/consent state if product wants it explicit | 4.2 decision |

All new tables: institution_id + RLS (self/staff scoping mirroring student_learning_states), no medical/psychological data, no secrets/tokens logged.

## Retention & privacy

- Conversation/message retention policy defined before launch of Phase 3 UI (student-facing).
- Redaction at write time for logs (observability module); raw prompts stored only where pedagogically required (tutor_messages) under existing RLS.