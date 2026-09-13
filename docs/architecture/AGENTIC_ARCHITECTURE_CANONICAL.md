# AGENTIC ARCHITECTURE — CANONICAL (v1.0)

**Status:** CURRENT · **ADR:** ADR-0001 · **Date:** 2026-09-12

## ARCHITECTURE STATEMENT

**Edeviser is currently a single-orchestrator agentic intelligence system.**

The orchestrator routes requests to specialist intelligence protocols.
Specialists share canonical context and a governed tool registry.
Protected writes require human approval.
The deterministic platform remains authoritative for educational and security-critical state.
A future multi-agent architecture is possible but not currently implemented or required.

## CURRENT ARCHITECTURE

```
                    EDEVISER AGENTIC SYSTEM

                              │
                              ▼
                    AGENT ORCHESTRATOR
                    (agent-orchestrator EF)
                              │
               ┌──────────────┼──────────────┐
               │              │              │
               ▼              ▼              ▼
            Tutor         Mastery          Habit
            Risk          Teacher       Coordinator
            Parent         Admin        Intervention
                           Evaluator
                              │
                              ▼
                      SHARED TOOL REGISTRY
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
                 READ TOOLS          WRITE TOOLS
                 (21 tools)         (10 tools)
                 role-gated         approval-gated
                 tenant-scoped      human-required
                    │                   │
                    │                   ▼
                    │            HUMAN APPROVAL
                    │                   │
                    │                   ▼
                    │           PROTECTED ACTION
                    │                   │
                    └─────────┬─────────┘
                              ▼
                          DATABASE
                    (RLS-enforced, deterministic core)

    BACKGROUND SYSTEMS:
    agent-worker (proactive jobs, cron every 5 min)
    agent-evaluation-jobs (evaluation, cron every 20 min)
    intervention-jobs (generate + evaluate, cron hourly/15 min)
```

## WHAT "SPECIALIST" MEANS

A specialist currently means:
- Specialized role (tutor, mastery, habit, risk, intervention, teacher, parent, coordinator, admin, evaluator)
- Specialized protocol (prompt instructions per specialist)
- Specialized context expectations (which data is relevant)
- Specialized tool usage (which read/write tools are appropriate)
- Specialized structured output (MasteryAnalysis, HabitAnalysis, RiskAssessment, etc.)

A specialist does NOT automatically mean:
- Independent agent with separate memory
- Independent goals or planning loops
- Independent lifecycle management
- Independent tool permissions (all use shared registry)
- Agent-to-agent messaging
- Autonomous execution without human approval

## TOOL CLASSIFICATION

| Category | Count | Risk | Approval | Examples |
|----------|-------|------|----------|----------|
| Read Tools | 21 | read | Not required | get_student_learning_context, get_course_mastery, get_outcome_chain |
| Write Tools | 10 | protected | Required | create_goal, create_learning_intervention, create_ilo |

## DETERMINISTIC CORE BOUNDARY

Agents are NOT authoritative for:
- Grades, assessment calculation, OBE attainment
- Tenant authorization, RLS, evidence integrity
- Intervention state transitions
- Measurement mathematics (delta, thresholds)

Agentic intelligence provides:
- Interpretation, synthesis, personalization
- Recommendation, explanation, drafting
- Conversation (tutor), analysis (mastery, habit, risk)
- CQI draft proposals, curriculum suggestions

## ARCHITECTURE FITNESS RULES

The following trigger an architecture review if introduced without an ADR:
1. New orchestrator or agent runtime
2. New independent execution loop
3. Specialist-specific memory system
4. Specialist-specific authorization (separate from shared registry)
5. Agent-to-agent messaging
6. Autonomous write without human approval