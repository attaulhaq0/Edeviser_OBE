# SOURCE OF TRUTH MATRIX
**Date:** 2026-09-12 | **Source:** Codebase reverse-engineering

## CANONICAL SOURCE PER CALCULATION

| Calculation | Canonical Source | Location | Duplicates |
|-------------|-----------------|----------|------------|
| Assessment normalization (raw→percent) | DB trigger on grades | Migration trigger | quizScore.ts (frontend, parallel) |
| Attainment level classification (≥85 Excellent/≥70 Sat/≥50 Dev/<50 Not Yet) | DB trigger on grades | Migration trigger | attainmentClassifier.ts (frontend, identical logic) |
| CLO attainment percent | outcome_attainment table (DB) | calculate-attainment-rollup EF | useCLOProgress.ts (reads from DB) |
| PLO attainment percent | outcome_attainment table (DB) | Rollup from CLO attainment | Coordinator dash aggregation (reads from DB) |
| ILO attainment percent | outcome_attainment table (DB) | "derived alignment" from PLO rollup | N/A |
| Gradebook final weighted grade | gradebookCalc.ts (frontend lib) | src/lib/gradebookCalc.ts | NONE — no DB-backed canonical |
| Letter grade (A/B/C/D/F) | letterGradeMapper.ts (frontend lib) | src/lib/letterGradeMapper.ts | NONE — no DB-backed canonical |
| Gap classification (fully_mapped/partially_mapped/unmapped/no_evidence) | detect_systemic_attainment_gaps_v1 (DB RPC) | DB function | gapAnalysis.ts (frontend, parallel logic) |
| Problem case classification (student/teacher/assessment/prerequisite/curriculum-design) | classify_problem_cases_v1 (DB RPC) | DB function | NONE |
| Intervention effectiveness (IMPROVED/NO_MATERIAL_CHANGE/DECLINED) | intervention_measurements (DB) + interventionMeasurement.ts | DB table + frontend lib | NONE — frontend mirrors DB |
| CQI pattern detection | cqiInstitutionalLoop.ts (frontend lib) + detect_systemic_attainment_gaps_v1 (DB) | DB RPC is authoritative | Frontend lib does same computation |
| CQI effect measurement | cqiInstitutionalLoop.ts measureCqiEffect() | src/lib/cqiInstitutionalLoop.ts | DB evaluation RPCs (parallel) |
| Streak calculation | streakCalculator.ts (frontend lib) + process-streak EF | Process-streak EF is write authority | Frontend for display |
| Perfect day detection | perfectDay.ts (frontend lib) | src/lib/perfectDay.ts | habit_tracking.is_perfect_day (DB, set by process-streak) |
| XP calculation | award-xp EF + xpClient.ts | Edge Function is write authority | Frontend for display |
| Quiz auto-grading | auto-grade-quiz EF | Edge Function | quizGrader.ts (frontend, for preview) |
| Course assessment coverage | get_course_assessment_coverage_v1 RPC | DB function | Coordinator coverage-heatmap page |
| Learner state mastery | student_learning_states.mastery (DB) | Reconcile + refresh RPCs | Frontend reads from DB |
| Habit signals | student_learning_states.habits (DB) | DB JSON column | compute-habit-correlations EF |
| Risk signals | student_learning_states.risk_signals (DB) | compute-at-risk-signals EF | ai-at-risk-prediction EF (duplicate) |
| Accreditation reports | generate-accreditation-report EF | Edge Function | N/A |

## DUPLICATE FLAGGED (RISK OF DRIFT)

| # | Calculation | Primary (Canonical) | Secondary | Risk |
|---|------------|-------------------|-----------|------|
| 1 | Attainment classification | DB trigger (thresholds hardcoded) | attainmentClassifier.ts | LOW — identical logic, same thresholds |
| 2 | Gap classification | detect_systemic_attainment_gaps_v1 (DB) | gapAnalysis.ts | MEDIUM — DB is canonical but frontend has parallel |
| 3 | Quiz scoring | auto-grade-quiz EF | quizGrader.ts + quizScore.ts | LOW — EF is authoritative |
| 4 | CQI pattern detection | DB RPCs | cqiInstitutionalLoop.ts | MEDIUM — frontend has duplicating pure functions |
| 5 | Risk prediction | compute-at-risk-signals EF | ai-at-risk-prediction EF | HIGH — two EFs doing overlapping work |
| 6 | Intervention measurement | intervention_measurements table (DB) | interventionMeasurement.ts | LOW — frontend mirrors DB values |

## FRONTEND-ONLY CALCULATIONS (NO DB CANONICAL)

| Calculation | Location | Risk |
|-------------|----------|------|
| Gradebook final weighted grade | gradebookCalc.ts | MEDIUM — different frontend versions could disagree |
| Letter grade mapping | letterGradeMapper.ts | LOW — deterministic mapping |
| Quiz XP award | quizXpAward.ts | LOW — calls award-xp EF for persistence |
| Streak display | streakCalculator.ts | LOW — process-streak EF is write authority |
| Perfect day check | perfectDay.ts | LOW — DB has is_perfect_day flag |

## DB-ONLY CALCULATIONS (NO FRONTEND DUPLICATE)

| Calculation | Location | Status |
|-------------|----------|--------|
| Evidence creation from grades | DB trigger | CANONICAL — no frontend equivalent |
| Attainment rollup (CLO→PLO→ILO) | calculate-attainment-rollup EF | CANONICAL |
| Learner state reconciliation | reconcile_student_learning_state_measurements_v1 | CANONICAL |
| Historical evidence aggregation | mv_historical_evidence | CANONICAL |
| Problem case classification | classify_problem_cases_v1 | CANONICAL |
| Systemic gap detection | detect_systemic_attainment_gaps_v1 | CANONICAL |
| Intervention measurement evaluation | intervention-jobs EF + evaluate RPC | CANONICAL |

## VERDICT

**Canonical authority is predominantly database-side**, which is correct architecture. The main gaps are: (1) gradebook final grade has NO DB canonical — it's frontend-only, (2) two risk prediction EFs overlap, (3) CQI pattern detection and gap classification have parallel frontend implementations. Drift risk is LOW for most duplicates because they use identical deterministic mathematics, but MEDIUM for gap classification because the two implementations could diverge.