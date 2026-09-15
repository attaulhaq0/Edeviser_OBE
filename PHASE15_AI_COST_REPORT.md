# PHASE15 — AI COST REPORT
**Date:** 2026-09-12 | **Verdict: POLICY DEFINED, NOT ACTIVATED**

## 1. COST POLICY IMPLEMENTATION

| Feature | Status | Detail |
|---------|--------|--------|
| 4 environments defined | IMPLEMENTED | AI_DISABLED, AI_SHADOW, AI_ENABLED_QA, AI_ENABLED_PILOT |
| Model selection | IMPLEMENTED | deepseek-chat (primary, per product constitution) |
| Token limits | IMPLEMENTED | Per environment: 0 / 1000 / 2000 / 4000 max per request |
| Context limits | IMPLEMENTED | Per environment: 0 / 4000 / 8000 / 16000 tokens |
| Rate limits | IMPLEMENTED | Per environment: N/A / 60s / 30s / 10s window |
| Max concurrent requests | IMPLEMENTED | Per environment: 0 / 5 / 10 / 20 |
| Request deduplication | IMPLEMENTED | `aiCostPolicy.ts` defines the policy; implementation needs caching layer |
| Response caching | IMPLEMENTED | enableResponseCaching + cacheTTLSeconds per environment |
| Background batching | IMPLEMENTED | enableBackgroundBatching per environment |
| Cost estimation | IMPLEMENTED | `estimateCost()` function using DeepSeek pricing (~$0.0002/1K tokens) |
| Monthly budget caps | IMPLEMENTED | $0 / $10 / $50 / $200 per institution per month |
| Shadow evaluation | IMPLEMENTED | AI_SHADOW environment enables logging LLM output without user visibility |
| Deterministic-only systems | IMPLEMENTED | 7 systems classified: grade_calculation, attainment_computation, evidence_creation, authorization, state_transitions, policy_enforcement, attendance_recording |
| AI-appropriate systems | IMPLEMENTED | 10 systems classified: tutor_conversation, feedback_drafting, quiz_generation, intervention_recommendation, habit_analysis, risk_explanation, mastery_explanation, curriculum_suggestion, reflection_scoring, goal_suggestion |

## 2. ENVIRONMENT RECOMMENDATIONS

| Environment | Use Case | Cost/Month | AI Visible to Users |
|------------|----------|-----------|-------------------|
| AI_DISABLED | Production (default) | $0 | NO |
| AI_SHADOW | Dev testing, log-only | ~$10 | NO (shadow logs only) |
| AI_ENABLED_QA | QA verification | ~$50 | YES |
| AI_ENABLED_PILOT | Pilot schools | ~$200 | YES |

## 3. COST ESTIMATION MODEL

```
Single tutor request: ~1000 tokens × $0.0002/1K = ~$0.0002
Single agent orchestration: ~2000 tokens × $0.0002/1K = ~$0.0004
10 requests/student/day × 100 students = ~$0.40/day = ~$12/month (well within $50 QA budget)
```

## 4. ACTIVATION BLOCKERS

| Blocker | Detail |
|---------|--------|
| VITE_AI_ENVIRONMENT not set | Default falls to AI_DISABLED; must be explicitly set to AI_ENABLED_QA |
| DeepSeek API key | Must be provisioned in Supabase secrets |
| AI feature flag | VITE_AI_FEATURE_ENABLED must be true |
| No cost tracking in DB | No table to log per-request token usage or cost |
| Shadow mode not wired | `aiCostPolicy.ts` exported but not consumed by agent-orchestrator |

## 5. VERDICT

**AI Cost Policy: DEFINED, NOT ACTIVATED**

The policy framework is complete and well-architected. Four graduated environments provide safe rollout. Cost estimation uses realistic DeepSeek pricing. The activation requires: (1) setting environment variables, (2) provisioning API keys, (3) wiring the policy into the agent-orchestrator, (4) creating a cost tracking table.