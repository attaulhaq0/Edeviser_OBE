# API Contracts — Agentic Intelligence Platform

## Edge function endpoints

### POST /functions/v1/agent-orchestrator  (verify_jwt)
Request:
```json
{
  "route": "/teacher/courses/:courseId/outcomes",
  "pageContext": { "courseId": "uuid", "studentId": "uuid?", "programId": "uuid?" },
  "message": "string ≤ 4000",
  "conversationId": "uuid?",
  "autonomyPreference": "A0|A1|A2?"
}
```
Response (SSE or JSON): assistant message + tool-call trace summaries + citations +
suggestion/proposal cards. Errors: structured { error, code } — AI_CONFIGURATION_ERROR,
AI_FEATURE_DISABLED, TOOL_BOUNDARY (kind), PROPOSAL_EXPIRED, RATE_LIMITED, BUDGET_EXCEEDED.

Decision endpoint (approve/reject proposal):
```json
{ "proposalId": "uuid", "decision": "approved"|"rejected", "reason": "string?" }
```
Server re-validates: caller is requiredApprover, proposal not expired, authorization still holds → executes → agent_action_executions row.

### POST /functions/v1/chat-with-tutor  (live contract, unchanged)
SSE events: warning · citations · independence_nudge · token · handoff_suggestion · plan_update · done · error.
Errors: UNSUPPORTED_MODALITY, RATE_LIMIT_EXCEEDED, TOKEN_BUDGET_EXCEEDED, RAG_UNAVAILABLE, NO_AUTHORIZED_EVIDENCE, INVALID_CITATION, PROVIDER_UNAVAILABLE, AI_FEATURE_DISABLED.

### POST /functions/v1/agent-worker  (cron/service auth)
Job envelope: { jobFamily, batchCursor?, institutionId? } — idempotent per (jobFamily, cursor); dead-letter after retry limit.

## Tool invocation contract (internal)

executeRegisteredTool(name, input, context, dataSource):
1. name ∈ registry else unknown_tool
2. context.identity.role ∈ allowedRoles else unauthorized
3. context.page[requiredContext] present else missing_context
4. input validates against JSON schema else invalid_input
5. dataSource.authorizeScope(tool, input, context) else unauthorized
6. output validated else invalid_output

## Frontend hooks (planned)

- useAgentConversation(routeContext) → orchestrator streaming
- useAgentProposals(role) → pending proposals inbox
- useProposalDecision() → approve/reject mutation
- useProactiveCards(routeContext) → gated by AI_PROACTIVE_AGENTS_ENABLED
- useLearningState(studentId?) → student_learning_states read
- useAutonomyPreference() → get/set user preference (lower-only)

All hooks go through TanStack Query with stable keys; no direct supabase calls from components.