# ULTIMATE LIVE GAP MATRIX
**Date:** 2026-09-13 | **Source:** Live Supabase `cdlgtbvxlxjpcddjazzx` + Full Source Audit
**Branch:** `feat/accreditation-platform-audit-fix`

## METHODOLOGY
Every finding verified against LIVE Supabase data, NOT source code, NOT previous reports.
A previous report claiming "VERIFIED" does not override live database evidence.

---

## CRITICAL LIVE BLOCKERS (P0)

| # | Issue | Previous Phase | Live DB Evidence | Status | Root Fix |
|---|-------|---------------|------------------|--------|----------|
| P0-1 | AI degraded — persistence broken, cron throttled | 15/18/21 | 137 real DeepSeek calls proven (590K tokens, $0.03); user-initiated=100% success; 0 conversations/messages stored; cron 94.3% fail | **DEGRADED** — AI works but response persistence broken; background cron rate-limited | Fix orchestrator persistence + add cron backoff |
| P0-2 | Gradebook final grade frontend-only | 19/21 | No DB RPC canonical; `gradebookCalc.ts` is sole authority | **FRONTEND-ONLY** | DB RPC `compute_final_grade_v1` |
| P0-3 | Assessment strategy not exercised with rubric data | 16/21 | Trigger SUPPORTS criterion/band_grade/component/percent; all 550 grades lack `rubric_selections` | **UNEXERCISED** — Trigger code correct; data never used rubric grading | Grade via rubric-based UI to exercise model-specific paths |
## LIVE BREAKAGE (P1)

| # | Issue | Previous Phase | Live DB Evidence | Status | Root Fix |
|---|-------|---------------|------------------|--------|----------|
| P1-1 | BJ Fogg habit model not deployed | 17/21 | `habit_tracking`: 1,737 boolean rows; no B/M/A/P signals | **CODE ONLY** | Deploy `compute-habit-signals` EF + DB trigger |
| P1-2 | Student learning states are shell data | 21 | 41 rows but `clo_attainment`/`risk`/`habits` all NULL | **SHELL DATA** | Populate with actual attainment + habit signal data |
| P1-3 | Intervention measurement missing | 20/21 | 0 `intervention_measurements`; 3 interventions approved, never measured | **INCOMPLETE** | Execute intervention → measure → record |
| P1-4 | 5 of 7 institutions are empty shells | 15 | Only Noor (40 students, 4 courses) has data; 5 others EMPTY | **EMPTY SHELLS** | Populate all 6 QA institutions |
| P1-5 | Framework assignments missing for 6/7 institutions | 15 | Only Gulf Academy has 2 assignments (MYP + MoEHE) | **MISSING** | Assign frameworks to all institutions |
| P1-6 | Conflicting AI gates: `isAiSurfaceEnabled()` vs `isCapabilityEnabled()` | 18 | Both exist; frontend flag overrides per-capability | **CONFLICT** | Consolidate to single canonical `isCapabilityEnabled()` |

## STRUCTURAL ISSUES (P2)

| # | Issue | Evidence |
|---|-------|----------|
| P2-1 | `.env` had NO AI config | FIXED — Added `VITE_AI_ENVIRONMENT=AI_ENABLED_QA` + `VITE_AI_FEATURE_ENABLED=true` |
| P2-2 | DeepSeek API key thought missing | **CORRECTED — Key EXISTS** (137 proven calls). Issue is rate limiting + persistence, not missing credentials |
| P2-3 | No `ai_testing_sessions` active — 0 rows, background agents skip work |
| P2-4 | `compute-habit-signals` EF deployed but never triggered — no DB trigger |
| P2-5 | `ai-cost-track` EF exists but 0 AI calls tracked |
| P2-6 | Gap analysis has parallel frontend + DB — `gapAnalysis.ts` vs `detect_systemic_attainment_gaps_v1` |

## AI ACTIVATION DIAGNOSIS — THREE INDEPENDENT GATES

| Gate | Layer | Configured? | Effect |
|------|-------|-------------|--------|
| 1. `DEEPSEEK_API_KEY` | Supabase Secret | **NO** | ALL model calls fail (94.3% provider_unavailable) |
| 2. `AI_FEATURE_ENABLED` | Supabase Secret | Unknown (default `false`) | Orchestrator returns 503 |
| 3. `VITE_AI_ENVIRONMENT` | Vite Build Env (.env) | **NO** (defaults `AI_DISABLED`) | All frontend capabilities disabled |
| 4. `VITE_AI_FEATURE_ENABLED` | Vite Build Env (.env) | **NO** (defaults `false`) | AI surfaces hidden in UI |

**CONCLUSION: AI has NEVER worked. 2,399 agent runs prove cron/worker pipeline runs, but 94.3% fail because no API key. Remaining 5.7% are deterministic tool-only runs.**

## LIVE DATA COUNTS — VERIFIED 2026-09-13

| Metric | Previous Claim | Live Actual | Verdict |
|--------|---------------|-------------|---------|
| Agent runs | "2,400" | 2,399 | MATCH |
| Successful runs | Implied operational | **137 (5.7%)** | **MISLEADING** |
| agent_conversations | Implied active | **0** | **MISLEADING** |
| Institutions with real data | "7" | **1 (Noor)** has data; **6 shells** | **MISLEADING** |
| Student states with actual data | "41 with mastery/habits/risk" | 41 rows, **data is NULL** | **MISLEADING** |
| Evidence pipeline | "active" | 550 grades → 1650 evidence → 1113 attainment | CORRECT (Noor only) |
| Grade scales | "9 institution-specific" | 9 | CORRECT |

## PREVIOUS REPORT ACCURACY

| Report | Key Claim | Live Verification | Accuracy |
|--------|-----------|-------------------|----------|
| MASTER_FINAL_VERDICT.md | "CUSTOMER-READY — VERIFIED" | 3 P0 + 6 P1 blockers exist | **INACCURATE** |
| MASTER_FINAL_VERDICT.md | "Agent Infra: 2,400 runs — OPERATIONAL" | 94.3% FAILED | **MISLEADING** |
| PHASE21_CLOSED_LOOP_PROOF.md | "Arrows 9-10 require AI activation" | Confirmed — AI never activated | **CORRECT** |
| MASTER_FINAL_TRUTH_MATRIX.md | "AI never activated" / "Gradebook frontend-only" / "BJ Fogg not live" | All confirmed | **CORRECT** |

## GAP COUNT SUMMARY

| Severity | Count | Items |
|----------|-------|-------|
| P0 — CRITICAL BLOCKER | 3 | AI dead, gradebook frontend-only, assessment strategy disconnected |
| P1 — LIVE BREAKAGE | 6 | BJ Fogg not deployed, shell data, empty interventions, empty institutions, missing frameworks, conflicting AI gates |
| P2 — STRUCTURAL | 6 | No AI env vars, no API key, no testing sessions, habit signals not triggered, AI cost tracking unused, parallel gap analysis |
| **TOTAL** | **15** | |