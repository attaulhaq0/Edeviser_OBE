-- cqi execution receipt tool
-- The CQI executor records a canonical protected-write receipt just like the
-- existing personal-action executor. Extend the closed check constraint rather
-- than bypassing the receipt table or weakening its other invariants.
ALTER TABLE public.agent_action_executions
  DROP CONSTRAINT agent_action_executions_tool_name_check;

ALTER TABLE public.agent_action_executions
  ADD CONSTRAINT agent_action_executions_tool_name_check
  CHECK (tool_name IN ('create_goal', 'create_planner_session', 'create_cqi_action'));
