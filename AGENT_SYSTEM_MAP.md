# AGENT SYSTEM MAP — ACTUAL IMPLEMENTATION AUDIT
**Date:** 2026-09-12 | **Source:** Codebase reverse-engineering

## 1. ARCHITECTURE: SINGLE ORCHESTRATOR, NOT MULTI-AGENT

Despite "multi-agent" branding, the architecture is:
- **1 Orchestrator** (agent-orchestrator Edge Function)
- **10 Specialist prompt variants** (not independent agents)
- **1 Shared tool registry** (21 read tools + 10 write tools)
- **1 Background worker** (agent-worker, cron-driven)

Specialists do NOT have: separate memory, independent goals, inter-agent communication, separate tool sets, or independent execution loops. The orchestrator selects a specialist based on the request context and injects the corresponding protocol prompt block + tools.

## 2. SPECIALIST MAP

| Specialist | Purpose | Protocol | Structured Output |
|-----------|---------|----------|-------------------|
| `tutor` | Student-facing AI tutor (RAG) | Chat with course materials | Source citations |
| `mastery` | CLO/PLO attainment analysis | "derived alignment" for ILO | `MasteryAnalysis` |
| `habit` | Habit signal analysis | Evidence-cited, no invented scores | `HabitAnalysis` |
| `risk` | At-risk detection | Categorical levels, no numeric scores | `RiskAssessment` |
| `intervention` | Recommend next action | Draft→proposal, positive effect preference | `InterventionPlan` |
| `teacher` | Teacher copilot | Drafts only, publication needs proposal | `TeacherCopilotOutput` |
| `parent` | Parent child summary | Privacy-aware, authorized scope only | `ParentChildSummary` |
| `coordinator` | CQI drafts + governance | Explain/draft only, never mutate | `CqiCoordinatorDraft` |
| `admin` | ILO governance | Outcome-governance write tools only | N/A |
| `evaluator` | Intervention effectiveness | Read-only, explain measured effects | `EvaluatorAssessment` |

## 3. READ TOOLS (21 tools)

`get_student_learning_context`, `get_course_mastery`, `get_outcome_chain`, `get_habit_context`, `get_at_risk_signals`, `search_course_materials`, `get_assignment_context`, `get_teacher_course_context`, `get_parent_child_progress`, `get_coordinator_outcome_context`, `get_admin_institution_context`, `get_intervention_effects`, `get_institution_ilos`, `get_ilo_detail`, `get_ilo_attainment`, `get_ilo_attainment_trend`, `get_ilo_mapping_coverage`, `get_ilo_program_contributions`, `get_ilo_evidence_summary`, `get_unmapped_program_outcomes`, `get_outcome_hierarchy_health`. ## 4. WRITE TOOLS (10 tools, ALL require human approval)

| Tool | Approver | Writes |
|------|----------|--------|
| `create_goal` | student | New weekly_goal |
| `create_planner_session` | student | New study_session |
| `create_cqi_action` | coordinator | New cqi_action_plan |
| `create_learning_intervention` | teacher | New learning_intervention |
| `publish_official_content` | teacher | Course content mutation |
| `ingest_curriculum` | coordinator | CLO/PLO/ILO + mappings |
| `create_ilo` | admin | New ILO |
| `update_ilo` | admin | ILO mutation |
| `delete_ilo` | admin | ILO deletion (blocked if mapped) |
| `reorder_ilos` | admin | ILO display order |

## 5. AGENT EXECUTION MODEL

**Synchronous**: User message → frontend calls requestEDeviserIntelligence() → agent-orchestrator invoked → builds system prompt + specialist protocol + framework hints → DeepSeek called with tool defs → read tools invoked (validated: role, context, input) → tool data returned → model produces response + optional proposals → proposals persisted to agent_action_proposals → response returned → UI renders proposals for human approval.

**Asynchronous (cron)**: agent-worker cron (every 5 min) → claims proactive_agent_jobs → builds AgentExecutionContext → invokes agent-orchestrator → proposals created → job completed or dead-lettered after 3 retries.

**Evaluation (cron)**: agent-evaluation-jobs cron (every 20 min) → claims executed intervention measurements → invokes evaluator specialist → produces evaluator assessment → updates intervention_measurements.evaluation_state.

## 6. AGENT CONTEXT (verified from contracts.ts)

AgentExecutionContext: requestId, runId, sessionId, identity (userId, role, institutionId), page (route, studentId?, courseId?, programId?), specialist, framework? (FrameworkContext: accreditationBodies, primaryAccreditation, frameworkId, frameworkCode, curriculumCode, keyStage, assessmentModel, gradeScaleId, assessmentPolicyVersion, attainmentPolicyVersion, defaultLanguage).

Framework context is RESOLVED at runtime from institution_settings + course metadata but only INFLUENCES PROMPT TEXT. The deterministic computation path does not use framework context.

## 7. IS THIS TRULY MULTI-AGENT? NO.

This is a single orchestrator with: 1 LLM call per request (DeepSeek), specialist = prompt variant, all specialists share the same tool registry, no inter-specialist communication or handoff, no independent memory/goals/state per specialist. "Agent transfer" exists in orchestrator code but is a prompt re-route, not an actual agent handoff. Best described as: **Single orchestrator + multi-prompt + tool-augmented LLM**.

## 8. AUDIT TRAIL

agent_runs (2,399 rows), agent_messages, agent_tool_calls, agent_action_proposals, proactive_agent_jobs (845 jobs), agent_evaluations, agent_feedback, agent_tasks, tutor_llm_logs — all ACTIVE with real data.

## VERDICT

IMPLEMENTED, CONNECTED, EXECUTABLE with real runtime data. Production-deployed but AI surfaces gated by default behind VITE_AI_FEATURE_ENABLED. NOT genuinely multi-agent — single orchestrator with specialist prompt variants + tool-augmented LLM with strong guardrails.