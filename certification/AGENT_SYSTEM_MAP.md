# AGENT SYSTEM MAP — ACTUAL IMPLEMENTATION

**Audit:** 2026-09-14 | **Source:** orchestrator v40 + specialist protocols

---

## IS EDEVISER MULTI-AGENT?

**No.** Edeviser has **one orchestrator with specialist protocols**. It is a single-agent system with role-scoped prompts and tools, not an independent multi-agent architecture.

## ARCHITECTURE

```
User Request → agent-orchestrator (v40, verify_jwt=true)
  ↓ authenticateRequest → identity (userId, role, institutionId)
  ↓ fetchInstitutionAutonomySettings
  ↓ SPECIALISTS_BY_ROLE → resolve specialist
  ↓ buildFrameworkContext (course + institution data)
  ↓ runAgentOrchestrator (single loop, max steps configurable)
    ↓ createAIProvider → DeepSeek API
    ↓ READ_TOOL_REGISTRY (role-scoped tool access)
    ↓ SPECIALIST_PROTOCOLS (role-specific system prompts)
    ↓ executeRegisteredTool (read tools) or propose_protected_action (write)
  ↓ Response + agent_runs + agent_conversations + agent_messages
```

## 8 SPECIALISTS (1 Orchestrator)

| Specialist | Role Access | Tool Access | Status |
|-----------|-------------|-------------|--------|
| teacher | teacher | get_teacher_course_context, get_student_learning_context, get_course_mastery, get_outcome_chain, get_at_risk_students, get_habit_analysis | LIVE |
| coordinator | coordinator | get_program_attainment, get_plo_gaps, get_outcome_chain, get_cqi_patterns | LIVE |
| tutor | student | get_student_learning_context, embed_course_material, generate_plan_update | LIVE |
| parent | parent | get_child_summary, get_child_attainment | LIVE |
| admin | admin | get_institution_health, get_governance_summary, get_accreditation_status | CODE |
| mastery | teacher | Deterministic mastery via OBE data | CODE |
| habit | teacher | BJ Fogg habit analysis | CODE (0 data) |
| risk | teacher | At-risk student detection | CODE |
| intervention | teacher | Intervention plan generation | CODE |

## TOOLS: 2 CATEGORIES

**Read Tools** (no approval needed, RLS-scoped, 12 tools):
get_teacher_course_context, get_student_learning_context, get_course_mastery,
get_outcome_chain, get_at_risk_students, get_habit_analysis, get_program_attainment,
get_plo_gaps, get_cqi_patterns, get_child_summary, get_institution_health,
get_accreditation_status

**Protected Write Tools** (require human approval via agent_action_proposals, 6 tools):
propose_create_ilo, propose_update_ilo_mapping, propose_create_intervention,
propose_curriculum_ingest, propose_cqi_action, propose_personal_action

## APPROVAL FLOW

```
Agent → propose_protected_action tool call
  ↓ agent_action_proposals (INSERT, status=pending, institution_id + idempotency_key)
  ↓ UI inbox (list_proposals channel, approver-role matched)
  ↓ Human approves (decide_proposal endpoint, re-checks identity + target scope)
  ↓ executeApprovedProposal (ProtectedWriteBoundary check)
  ↓ RPC execution + agent_action_executions audit
```

## AGENT CONTEXT (Actual Runtime)

The orchestrator injects:
- Identity: userId, role, institutionId
- Page context: route, studentId?, courseId?, programId?
- Framework context: assessmentModel, accreditationBodies, curriculumCode, keyStage, gradeScaleId, defaultLanguage
- Institution autonomy: ceiling (A0-A3), autoExecuteLowRisk, rollbackEnabled

NOT injected (missing from runtime):
- Learner state (habit signals, risk scores)
- Intervention history
- Prior agent recommendations
- B/M/A/P analysis

## COST

- Provider: DeepSeek only (provider-factory hard-fails on non-deepseek)
- Model: deepseek-flash
- Cost per call: ~$0.0001-0.0004
- Cache hit rate: 89.2% (system prompts reused)
- Total spend to date: ~$0.031