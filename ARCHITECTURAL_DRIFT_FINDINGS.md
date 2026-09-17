# ARCHITECTURAL DRIFT FINDINGS
**Date:** 2026-09-12 | **Source:** Codebase reverse-engineering

## P0 — CRITICAL (Product Integrity)

| # | Finding | Location | Impact |
|---|---------|----------|--------|
| P0-1 | **Assessment model contract vs runtime gap**: `ASSESSMENT_MODELS = ["percent", "criterion", "band_grade", "component"]` defined in contracts.ts, but ALL evidence creation and attainment calculation uses percent-based path regardless of courses.assessment_model value | contracts.ts, DB trigger, attainmentClassifier.ts | Multi-framework claims are unsupported at runtime |
| P0-2 | **AI features gated by default**: VITE_AI_FEATURE_ENABLED gates all AI surfaces; end users do not see intelligence features without explicit enablement | App.tsx, TutorPage.tsx, useEDeviserIntelligence.ts | Core product differentiator is invisible |

## P1 — HIGH (Architecture Integrity)

| # | Finding | Location | Impact |
|---|---------|----------|--------|
| P1-1 | **Single orchestrator presented as multi-agent**: 10 specialists are prompt variants sharing one tool registry; no independent agents. "Multi-agent" branding is inaccurate | orchestrator.ts, specialists/protocols.ts | Architectural narrative ≠ implementation |
| P1-2 | **"BJ Fogg Habit Engine" does not exist**: No MAP model, no behavior definitions, no motivation tracking. Actual implementation is a streak tracker + 4 daily habit checkboxes | perfectDay.ts, habit_logs table | Product claim unsupported |
| P1-3 | **Gradebook final grade is frontend-only**: No DB-backed canonical final grade. computeFinalWeightedGrade() lives in frontend lib | gradebookCalc.ts | Two users could see different grades if frontend versions differ |
| P1-4 | **Attainment thresholds hardcoded**: DEFAULT_ATTAINMENT_THRESHOLDS = 85/70/50 in both frontend AND DB trigger, not configurable per institution/framework | types/app.ts, attainmentClassifier.ts | Cannot vary by institution or accreditation body |
| P1-5 | **Framework context is prompt-only**: FrameworkContext (assessmentModel, accreditationBodies, etc.) is injected into agent system prompt but not consumed by deterministic computation | contracts.ts, outcome-context-builder.ts | Framework awareness is AI-only, not architectural |

## P2 — MEDIUM (Operational)

| # | Finding | Location | Impact |
|---|---------|----------|--------|
| P2-1 | **5 shell institutions**: Only Noor has operational data. 5 institutions exist as empty shells | institution table (live data) | Multi-tenant stress not proven |
| P2-2 | **Duplicate calculation paths**: attainmentClassifier.ts duplicates DB trigger logic for attainment classification; gapAnalysis.ts duplicates detect_systemic_attainment_gaps_v1 | attainmentClassifier.ts, gapAnalysis.ts | Drift risk between frontend and canonical DB values |
| P2-3 | **Grade scales not consumed by evidence trigger**: grade_scales.definition is JSON but the evidence creation trigger uses hardcoded 85/70/50 thresholds | DB trigger, grade_scales table | Grade scale configuration is cosmetic only |
| P2-4 | **Intervention measurement has 1 proven cycle**: Only 1 complete proposal→approval→execution→measurement→evaluation cycle verified | intervention_measurements table | Intervention effectiveness model unproven at scale |
| P2-5 | **491 migrations**: Very high migration count suggests frequent schema changes | supabase/migrations/ | Migration replay risk; schema evolution history is complex |
| P2-6 | **Sub-CLO → CLO weighted rollup unclear**: sub_clos table exists but aggregation logic not clearly implemented in attainment rollup | sub_clos table, calculate-attainment-rollup | Sub-CLO data may not contribute to CLO attainment |

## P3 — LOW (Code Quality / Maintenance)

| # | Finding | Location | Impact |
|---|---------|----------|--------|
| P3-1 | **~280+ hook files**: Very large hook surface area; many single-purpose hooks | src/hooks/ | Code navigation overhead |
| P3-2 | **~155+ lib files**: Large utility library with mixed concerns (business logic + presentation + clients) | src/lib/ | Some lib files import React (violates src/AGENTS.md contract) |
| P3-3 | **Frontend-only letter grade calculation**: letterGradeMapper.ts has no DB equivalent | letterGradeMapper.ts | Inconsistent with evidence (DB-backed) |
| P3-4 | **Quiz score computed in both edge function and frontend**: auto-grade-quiz Edge Function + quizScore.ts have parallel scoring logic | auto-grade-quiz/index.ts, quizScore.ts | Minor drift risk |
| P3-5 | **Multiple legacy log/audit files in repo root**: ~50+ .log files and ~30+ console/page dumps cluttering root | Repository root | Cleanup needed |

## RANKING SUMMARY

| Priority | Count | Key Theme |
|----------|-------|-----------|
| P0 | 2 | Assessment model gap, AI gating |
| P1 | 5 | Architecture claims vs implementation |
| P2 | 6 | Operational gaps, data scale |
| P3 | 5 | Code quality, maintenance |
| **TOTAL** | **18** | |