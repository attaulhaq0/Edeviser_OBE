# ASSESSMENT ENGINE — ACTUAL IMPLEMENTATION AUDIT
**Date:** 2026-09-12 | **Source:** Codebase reverse-engineering

## 1. SUPPORTED ASSESSMENT MODELS

### CONTRACT (from `contracts.ts`)
```typescript
export const ASSESSMENT_MODELS = ["percent", "criterion", "band_grade", "component"] as const;
```

### ACTUAL RUNTIME IMPLEMENTATION

| Model | Database Field | Evidence Creation | Attainment Calc | Status |
|-------|---------------|-------------------|-----------------|--------|
| `percent` | courses.assessment_model | Percent-based via trigger | Percent-based in attainment classifier | **IMPLEMENTED** |
| `criterion` | courses.assessment_model | SAME percent-based trigger | SAME percent classification | **CONTRACT ONLY** |
| `band_grade` | courses.assessment_model | SAME percent-based trigger | SAME percent classification | **CONTRACT ONLY** |
| `component` | courses.assessment_model | SAME percent-based trigger | SAME percent classification | **CONTRACT ONLY** |

**Finding**: Changing `assessment_model` on a course does NOT change the evidence creation or attainment calculation pipeline. All four models use the identical percent-based trigger and classifier. The assessment model is metadata that influences agent prompts but not deterministic computation.

## 2. ASSESSMENT TYPES

| Type | Table | Evidence | Status |
|------|-------|----------|--------|
| `assignment` | assignments | grade_id → submission_id → evidence | IMPLEMENTED |
| `quiz` | quizzes, quiz_attempts, quiz_questions | Auto-grade → evidence via trigger | IMPLEMENTED |
| `project` | assignments (type field) | Same as assignment | IMPLEMENTED |
| `exam` | assignments (type field) | Same as assignment | IMPLEMENTED |
| `baseline` | baseline_test_config, baseline_attainment | Pre-semester diagnostic | IMPLEMENTED |
| `micro_assessment` | micro_assessment_schedule | Small frequent checks | IMPLEMENTED |
| `survey` | surveys, survey_questions, survey_responses | Not linked to OBE evidence | PARTIAL |
| `adaptive_quiz` | quiz_attempts via adaptiveEngine.ts | Same quiz pipeline | IMPLEMENTED |

## 3. NORMALIZATION & GRADE MAPPING

### Grade → Evidence Pipeline
```
grade INSERT/UPDATE on grades table
  → DB trigger fires
  → score_percent computed from raw_score or direct field
  → attainment_level classified: ≥85 Excellent, ≥70 Satisfactory, ≥50 Developing, <50 Not_Yet
  → evidence row created (clo_id, plo_id, ilo_id from assignment/question mapping)
```

### Gradebook Weighted Calculation (`gradebookCalc.ts`)
- Categories with weights → subtotal_percent per category
- Excludes categories with 0 graded assessments (exclude-and-renormalize)
- `finalPercent = weightedSum / effectiveWeightTotal * 100`
- Returns null when no category has graded work

### Grade Scales
- `grade_scales` table with JSON `definition` field
- `validate_grade_scale_partition` RPC for validation
- Grade scales are INSTITUTION-SCOPED or COURSE-SCOPED
- NOT currently consumed by evidence creation trigger

## 4. DUPLICATE CALCULATION PATHS

| Calculation | DB (Canonical) | Frontend (Presentation) |
|-------------|----------------|------------------------|
| Attainment level | DB trigger (evidence.attainment_level) | attainmentClassifier.ts identical logic |
| CLO attainment | outcome_attainment table | useCLOProgress.ts reads from DB |
| Weighted grade | N/A (no DB function) | gradebookCalc.ts (canonical frontend) |
| Letter grade | N/A (no DB function) | letterGradeMapper.ts (canonical frontend) |
| Score percent | DB trigger | quizScore.ts (parallel logic) |
| Gap classification | detect_systemic_attainment_gaps_v1 (DB) | gapAnalysis.ts (frontend) |

## 5. FRONTEND ASSESSMENT INPUT

### Teacher Grading Flow
```
TeacherGrading.tsx → GradingInterface.tsx → useGrades.ts
  → supabase.from("grades").upsert({ student_id, assignment_id, score, feedback })
  → DB trigger fires → evidence created → attainment computed
```

### Student Quiz Flow
```
AdaptiveQuizSession.tsx → useAdaptiveQuiz.ts
  → quiz_attempts INSERT → auto-grade-quiz Edge Function
  → grade INSERT (by Edge Function, not trigger)
  → evidence trigger fires → attainment computed
```

### Auto-Grade Quiz (Edge Function)
```
auto-grade-quiz/index.ts
  → Compares student answers against quiz_questions.correct_option
  → Inserts grade row (auto-graded, not teacher-graded)
  → Evidence trigger fires downstream
```

## 6. EVIDENCE PROVENANCE

| Source | Stored In |
|--------|-----------|
| grade_id | evidence.grade_id (direct link) |
| submission_id | evidence.submission_id (direct link) |
| raw_score | evidence.raw_score (JSON, original score before normalization) |
| attainment_level | evidence.attainment_level (Enum, set by trigger) |
| score_percent | evidence.score_percent (numeric, normalized) |
| clo_id/plo_id/ilo_id | evidence.clo_id/plo_id/ilo_id (outcome linkage) |

## 7. CANONICAL AUTHORITY

**Evidence at rest in `evidence` table, written by DB trigger on `grades` = CANONICAL AUTHORITY.**

Frontend calculations (attainmentClassifier.ts, gradebookCalc.ts, letterGradeMapper.ts) are PRESENTATION-ONLY and should always agree with DB values because they use the same mathematics. The DB trigger is the write path; the frontend reads from the normalized tables.

## VERDICT

Assessment engine is IMPLEMENTED for percent-based model. Criterion/band_grade/component models exist in contracts and schema but are NOT runtime-distinct — they all use identical percent-based computation. The evidence pipeline (grade→trigger→evidence→attainment) is solid. Gradebook weighted calculation is frontend-side only (no DB-backed canonical computation).