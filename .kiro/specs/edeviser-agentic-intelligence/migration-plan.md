# Migration Plan — Agentic Intelligence Platform

## Rules (workspace-mandated)

- Migrations are applied via Supabase MCP (`apply_migration`) and mirrored into
  `supabase/migrations/` with matching names — never hand-edited after application.
- Forward-compatible and replayable in order; guard REVOKE/GRANT/ALTER with
  `to_regprocedure(...)`/`to_regclass(...)` when they could precede CREATE on fresh replay.
- Every migration: local Docker replay clean (`db:check-replay`) → PR → green Supabase Preview
  (git_branch == head && pr_number matches) → merge → read-only production verification.
- Regenerate `src/types/database.ts` alongside any schema change.
- Security Advisor + Performance Advisor re-run after each migration.

## Planned migrations (sequenced, one concern each)

| # | Migration | Contents | Task |
|---|---|---|---|
| M1 | agent_observability_tables | agent_conversations, agent_messages, agent_tasks, agent_feedback, agent_evaluations (+ RLS) | 8.1 |
| M2 | intervention_tables | learning_interventions, intervention_outcomes, learning_state_events (+ RLS) | 8.1 |
| M3 | learning_state_versions | calculation_version/policy_version/model_version on student_learning_states | 4.1 |
| M4 | tool_calls_naming | rename or alias agent_tool_attempts ↔ agent_tool_calls (decide; avoid duplicate table) | 8.1 |
| M5 | autonomy_settings | institution ceilings column/jsonb on institution_settings + user preference storage | 7.1 |
| M6+ | per-feature migrations | only as Phase 4–7 slices need them | — |

## Rollback strategy

Every migration ships with a documented reverse (DROP TABLE/policy or restore column) kept in the
PR description; feature flags gate runtime behavior so a rollback is a config flip, not a data loss event.
No destructive ops without a backup table + explicit waiver.