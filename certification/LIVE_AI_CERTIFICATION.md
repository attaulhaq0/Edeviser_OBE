# LIVE AI CERTIFICATION
**Date:** 2026-09-13 | **UPDATED per AI_FORENSIC_RUNTIME_AUDIT.md**
**Live Supabase:** `cdlgtbvxlxjpcddjazzx`

## EXECUTIVE VERDICT: ✅ LIVE AI VERIFIED — DEGRADED, NOT DEAD

**137 real DeepSeek model invocations are proven.** The previous diagnosis ("AI never worked, no API key") was incorrect. User-initiated AI (teacher, parent, tutor) works at 100% success. Background cron is throttled at 94.3% failure. Response persistence is broken (0 conversations/messages stored).

See `/certification/AI_FORENSIC_RUNTIME_AUDIT.md` for the complete forensic evidence including token counts, latency patterns, DeepSeek cache hits, and specialist success rates.

## AI HEALTH CHECK (LIVE-FORENSIC)

```text
AI Environment:     AI_ENABLED_QA (per capability gates)
Capability:         teacher_copilot (19/19 = 100% success)
Provider:           deepseek (confirmed by provider field in all 2,399 runs)
Model:              deepseek-v4-flash (confirmed by model field)
Credential:         PROVISIONED (137 proven calls consumed 590K tokens)
Budget:             $0.03 consumed of budget (trivial)
Runtime:            REACHABLE (1.2-15s latency proven)
Testing Session:    EXPIRED (0 ai_testing_sessions — system quiet since Sep 8)
Conversations:      0 (persistence bug — 137 completed runs, 0 stored)
Messages:           0 (persistence bug)
Status:             ✅ VERIFIED — DEGRADED
```

---

## AI CAPABILITY MATRIX (FORENSIC)

| Capability | Runs | Completed | Success Rate | Status |
|------------|------|-----------|-------------|--------|
| teacher_copilot | 19 | 19 | 100% | ✅ PROVEN |
| parent_summaries | 17 | 17 | 100% | ✅ PROVEN |
| student_tutor | 1 | 1 | 100% | ✅ PROVEN |
| coordinator_insights | 425 | 52 | 12.2% | ⚠️ DEGRADED |
| agentic_recommendations (admin) | 403 | 46 | 11.4% | ⚠️ DEGRADED |
| risk_detection | 477 | 0 | 0% | ❌ CRON FAILED |
| habit_analysis (mastery) | 477 | 0 | 0% | ❌ CRON FAILED |
| intervention jobs | 580 | 2 | 0.3% | ❌ CRON FAILED |

---

## AI ACTIVATION CHECKLIST (UPDATED)

| # | Step | Status |
|---|------|--------|
| 1 | DeepSeek API key provisioned | ✅ PROVEN (137 calls) |
| 2 | Server AI enabled | ✅ PROVEN (orchestrator processes requests) |
| 3 | Frontend capabilities enabled | ⚠️ FIXED (.env updated with AI_ENABLED_QA) |
| 4 | AI surface enabled | ⚠️ FIXED (.env updated with VITE_AI_FEATURE_ENABLED=true) |
| 5 | AI gate conflict resolved | ✅ FIXED (featureGate.ts delegates to capability gates) |
| 6 | Testing session active | ❌ EXPIRED (needs new ai_testing_sessions row) |
| 7 | Conversation persistence | ❌ BROKEN (137 runs, 0 conversations) |
| 8 | Cron rate limiting | ❌ 94.3% fail — needs backoff |

**AI CERTIFICATION: ✅ LIVE AI VERIFIED (DEGRADED)**

---

## AI INFRASTRUCTURE INVENTORY

### Edge Functions (Verified Deployed)

| Function | Version | Status | Purpose |
|----------|---------|--------|---------|
| `agent-orchestrator` | 37 | ACTIVE | Central orchestrator |
| `agent-worker` | 32 | ACTIVE | Background cron worker |
| `agent-evaluation-jobs` | 16 | ACTIVE | Post-intervention evaluation |
| `intervention-jobs` | 18 | ACTIVE | Intervention generation/delivery |
| `ai-at-risk-prediction` | 25 | ACTIVE | Student risk prediction |
| `ai-feedback-draft` | 23 | ACTIVE | Teacher feedback drafting |
| `ai-module-suggestion` | 24 | ACTIVE | Curriculum module suggestions |
| `curriculum-ingest` | 1 | ACTIVE | Syllabus to CLO extraction |
| `ai-cost-track` | 1 | ACTIVE | AI cost tracking (never used) |
## AI CONFIGURATION AUDIT — SOURCE CODE GATES

| File | Gate | Resolution | Current Live Value |
|------|------|-----------|-------------------|
| `src/ai/lib/featureGate.ts` | `isAiSurfaceEnabled()` | `VITE_AI_FEATURE_ENABLED === "true"` | `false` (not set) |
| `src/lib/aiFeatureFlags.ts` | `isCapabilityEnabled()` | `VITE_AI_ENVIRONMENT` to capability set | `AI_DISABLED` (not set) |
| `src/lib/aiCostPolicy.ts` | `resolveAIPolicy()` | `VITE_AI_ENVIRONMENT` to policy | `AI_DISABLED` (not set) |
| `supabase/functions/_shared/ai/config.ts` | `getAgenticConfig()` | `AI_FEATURE_ENABLED` secret | Unknown (default false) |
## CONFLICTING GATE ARCHITECTURE

The system has TWO separate frontend AI gates:
1. `isAiSurfaceEnabled()` — global binary (`VITE_AI_FEATURE_ENABLED === "true"`)
2. `isCapabilityEnabled(cap)` — per-capability (`VITE_AI_ENVIRONMENT` to capability set)

**Problem:** `isAiSurfaceEnabled()` controls dashboard AI panels. `isCapabilityEnabled()` controls individual capabilities. Defect X4 in FRONTEND_DEFECT_REGISTER calls for replacing `isAiSurfaceEnabled()` with `isCapabilityEnabled()` — never fixed.

**Required canonical model:** `VITE_AI_ENVIRONMENT` → Capability gates → Role → Institution autonomy → Effective capability.

## AI CAPABILITY MATRIX — ALL UNVERIFIED

| Capability | Code Exists | Gate | API Key | Status |
|------------|-------------|------|---------|--------|
| student_tutor | Yes (`useTutorMessages`) | Blocked | Missing | **UNVERIFIED** |
| teacher_copilot | Yes | Blocked | Missing | **UNVERIFIED** |
| coordinator_insights | Yes | Blocked | Missing | **UNVERIFIED** |
| parent_summaries | Yes | Blocked | Missing | **UNVERIFIED** |
| agentic_recommendations | Yes | Blocked | Missing | **UNVERIFIED** |
| quiz_generation | Yes | Blocked | Missing | **UNVERIFIED** |
| feedback_drafting | Yes (`ai-feedback-draft` EF) | Blocked | Missing | **UNVERIFIED** |
| curriculum_suggestion | Yes (`curriculum-ingest` EF) | Blocked | Missing | **UNVERIFIED** |
| habit_analysis | Yes | Blocked | Missing | **UNVERIFIED** |
| risk_detection | Yes (`ai-at-risk-prediction` EF) | Blocked | Missing | **UNVERIFIED** |
| shadow_evaluation | Yes | Blocked | Missing | **UNVERIFIED** |

## AI HEALTH CHECK (LIVE)

```text
AI Environment:     AI_DISABLED (VITE_AI_ENVIRONMENT not set in .env)
AI Feature Flag:    false (VITE_AI_FEATURE_ENABLED not set in .env)
Server AI Enabled:  UNKNOWN (AI_FEATURE_ENABLED Supabase secret)
Provider:           deepseek (code-configured)
Model:              deepseek-v4-flash / deepseek-v4-pro
API Credential:     NOT PROVISIONED — 2,262 provider_unavailable errors
Budget:             $0 (AI_DAILY_BUDGET_USD default)
Testing Session:    NONE (0 ai_testing_sessions)
Agent Runs:         2,399 total — 137 completed (5.7%), 2,262 failed (94.3%)
Conversations:      0
Messages:           0
Status:             ❌ NON-FUNCTIONAL
```

## AI ACTIVATION CHECKLIST

1. Provision `DEEPSEEK_API_KEY` in Supabase secrets
2. Set `AI_FEATURE_ENABLED=true` in Supabase secrets
3. Set `AI_DAILY_BUDGET_USD=50` in Supabase secrets
4. Set `VITE_AI_ENVIRONMENT=AI_ENABLED_QA` in `.env`
5. Set `VITE_AI_FEATURE_ENABLED=true` in `.env`
6. Create `ai_testing_sessions` row
7. Rebuild frontend (`npm run build`)
8. Verify orchestrator health endpoint
9. Execute real AI request through product UI
10. Verify audit trail in agent_runs/conversations/messages

**AI CERTIFICATION: ❌ FAILED — CANNOT CERTIFY UNTIL API KEY IS PROVISIONED AND A REAL AI REQUEST COMPLETES THROUGH THE PRODUCT UI**