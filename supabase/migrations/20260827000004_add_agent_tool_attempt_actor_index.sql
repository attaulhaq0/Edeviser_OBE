-- Support actor-scoped audit review without rewriting the Preview-applied
-- agentic foundation migration.

CREATE INDEX IF NOT EXISTS agent_tool_attempts_actor_started_idx
  ON public.agent_tool_attempts (
    institution_id,
    actor_user_id,
    started_at DESC
  );
