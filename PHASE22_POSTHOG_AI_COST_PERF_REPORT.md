# PHASE22 — POSTHOG INSTRUMENTATION + AI COST REPORT
**Date:** 2026-09-12

## 1. POSTHOG INSTRUMENTATION

### Existing Events (code-verified)
| Event | Source | Category |
|-------|--------|----------|
| `grade_submitted` | `useCreateGrade` → `captureAnalyticsEvent` | Assessment |
| `grade_viewed` | `useGrade` first-hit (session-deduped) | Student |
| `leaderboard_viewed` | `useLeaderboard` first page | Gamification |
| `outcome_created` | `useCreateCLO/PLO/ILO/SubCLO` with `outcome_type` prop | OBE |
| `ai_request_completed` | `aiCostTracker.trackAIRequest()` (Phase 18) | AI |
| Consent-gated | All events via `captureAnalyticsEvent` (consent check) | Privacy |

### Recommended Dashboards

**Activation Dashboard:**
- `user_signed_up` → onboarding funnel
- `profile_completed` → completion rate
- `first_course_created` → teacher activation
- `first_submission` → student activation
- `parent_link_verified` → parent activation

**Teacher Usage Dashboard:**
- `grade_submitted` → grading volume
- `assignment_created` → content creation
- `attendance_recorded` → attendance activity
- Filter: by institution, course, time period

**Learner Engagement Dashboard:**
- `submission_created` → assessment activity
- `habit_completed` → daily habits
- `streak_milestone` → streaks
- `badge_earned` → gamification

**Intervention Dashboard:**
- `intervention_proposed` → proposal volume
- `intervention_approved` → approval rate
- `intervention_executed` → execution rate
- `intervention_measured` → measurement rate
- `recommendation_accepted` vs `recommendation_rejected`

**AI Usage Dashboard:**
- `ai_request_completed` → request volume
- Filter by: capability (tutor, copilot, insights), success/failure
- Filter by: institution, workflow
- Metrics: tokens, latency, estimated cost

**AI Success Dashboard:**
- `ai_request_completed` with `success=true` → success rate
- `recommendation_accepted` → recommendation quality proxy
- Filter by: specialist, capability

**AI Cost Dashboard:**
- Sum estimated_cost by institution / workflow / capability
- Monthly budget vs actual
- Budget warning alerts

**Errors Dashboard:**
- `ai_request_completed` with `success=false` → AI failures
- Filter by: error_type (timeout, rate_limit, provider_error)
- Edge Function error logs

**Workflow Completion Dashboard:**
- Full funnel: submission → grade → evidence → attainment
- Intervention: proposal → approval → execution → measurement → evaluation

### PostHog Setup
- PostHog is configured in `App.tsx` via `<Analytics />` + `<SpeedInsights />`
- PostHog client: `posthog-js` v1.418.12 in package.json
- Project: Cuevo (id: 393668), Organization: Edeviser

## 2. AI COST TRACKING

### Existing Infrastructure (Phase 15 + 18)
| Component | File | Status |
|-----------|------|--------|
| Cost policy | `aiCostPolicy.ts` — 4 environments, graduated limits | ✅ |
| Cost tracking | `aiCostTracker.ts` — per-request tracking | ✅ |
| Server tracking | `ai-cost-track` Edge Function | ✅ |
| PostHog events | `aiCostTracker.trackAIRequest()` | ✅ |
| Feature flags | `aiFeatureFlags.ts` — 11 per-capability gates | ✅ |
| Deterministic guard | `DETERMINISTIC_ONLY_SYSTEMS` — 7 systems never use AI | ✅ |

### Cost Estimation Model
- Provider: DeepSeek (primary, per product constitution)
- Pricing: ~$0.0002 per 1K tokens
- Budgets per environment: AI_SHADOW=$10/mo, AI_QA=$50/mo, AI_PILOT=$200/mo

### Cost Tracking Events
`trackAIRequest()` captures: capability, tokensUsed, latencyMs, success, errorType, institutionId, studentId, workflow, estimatedCost

PostHog captures: `ai_request_completed` with safe props (no prompt/response content)

### Safe Budgets (recommended per environment)
| Environment | Per Student/Day | Per Institution/Month | Max Concurrent |
|------------|----------------|----------------------|----------------|
| AI_DISABLED | 0 | $0 | 0 |
| AI_SHADOW | 5 | $10 | 5 |
| AI_ENABLED_QA | 20 | $50 | 10 |
| AI_ENABLED_PILOT | 50 | $200 | 20 |

## 3. PERFORMANCE ANALYSIS (CODE-LEVEL)

### Potential Bottlenecks Identified
| Area | Risk | Mitigation |
|------|------|-----------|
| Unbounded list queries | MEDIUM — `useUsers`, `useCourses` fetch all rows | Add pagination |
| Dashboard aggregations | LOW — `useStudentDashboardAggregate` uses batch queries | Already batched |
| attainment rollup | LOW — Materialized view `mv_historical_evidence` | Materialized |
| Agent orchestration | MEDIUM — DeepSeek latency (typically 1-3s) | Timeout configurable |
| Gradebook matrix | MEDIUM — N students × M assessments computation | Client-side, acceptable for <100 students |
| Report generation | LOW — Async job via `accreditation_report_jobs` | Background task |
| Realtime subscriptions | LOW — Used only for XP, notifications, challenges | Selective channels |

### Scale Recommendations
| Learners | Dashboard | Assessment | Agent | Report |
|----------|-----------|------------|-------|--------|
| 500 | ✅ Acceptable | ✅ | ✅ | ✅ |
| 1,000 | ✅ | ✅ | ✅ (with batching) | ✅ |
| 5,000 | ⚠️ Add pagination | ✅ | ⚠️ Queue depth | ✅ |
| 10,000 | ⚠️ Need caching | ✅ | ⚠️ Rate limits critical | ✅ |

### Cannot Perform (requires live infrastructure)
- Real load testing with 500/1000/5000/10000 learners
- Database query profiling (EXPLAIN ANALYZE)
- Connection pool saturation testing
- Edge Function cold start measurement
- Real concurrent grading/approval scenarios