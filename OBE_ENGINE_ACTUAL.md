# OBE ENGINE — ACTUAL IMPLEMENTATION AUDIT
**Date:** 2026-09-12 | **Source:** Codebase reverse-engineering

## 1. OUTCOME HIERARCHY REPRESENTATION

| Table | Purpose | Status |
|-------|---------|--------|
| `learning_outcomes` | Central outcome table (ILO/PLO/CLO/SUB_CLO) | ACTIVE |
| `outcome_mappings` | Parent→child edges (source=parent, target=child) | ACTIVE |
| `graduate_attributes` | GAs between ILO and PLO | ACTIVE |
| `graduate_attribute_mappings` | GA→outcome associations | ACTIVE |
| `outcome_attainment` | Computed attainment per outcome/scope | ACTIVE |
| `outcome_attainment_snapshots` | Historical attainment snapshots | ACTIVE |
| `sub_clos` | Sub-CLO detail table | ACTIVE |
| `baseline_attainment` | Pre-semester baseline scores | ACTIVE |

### Canonical Mapping Direction (CONFIRMED)
- `source_outcome_id` = parent (higher level)
- `target_outcome_id` = child (lower level)
- Allowed: ILO→PLO, PLO→CLO, CLO→SUB_CLO
- Source: `outcomeChain.ts` l12-19, hooks, SQL rollups

### Hierarchy (canonical)
```
Institution → ILO → Graduate Attribute → PLO → CLO → Sub-CLO → Assessment/Rubric → Evidence → Attainment
```

## 2. EVIDENCE CREATION PATH

Grades INSERT/UPDATE → trigger computes score_percent → creates evidence row (grade_id, submission_id, clo_id, plo_id, ilo_id, score_percent, attainment_level) → attainment_level per classifyAttainment() thresholds (85/70/50 default).

Evidence columns: clo_id, plo_id, ilo_id (outcome linkage), grade_id, submission_id (source traceability), score_percent (normalized), attainment_level (excellent/satisfactory/developing/not_yet), raw_score (JSON provenance).

## 3. ATTAINMENT ROLLUP

## 4. ATTAINMENT SCOPES

| Scope | Data |
|-------|------|
| `student_course` | One student, one course, one outcome |
| `course` | Aggregated from student_course |
| `program` | Aggregated from course |
| `institution` | Aggregated from program, mv_historical_evidence |

## 5. WHAT IS NOT IMPLEMENTED

| Feature | Status |
|---------|--------|
| Configurable attainment thresholds per institution | PARTIAL — code defaults 85/70/50, institution_settings has success_threshold only |
| Threshold per grade_scale | PARTIAL — grade_scales.definition is JSON but not consumed by trigger |
| Sub-CLO → CLO weighted rollup | PARTIAL — sub_clos exists but aggregation unclear |
| Framework-specific attainment policy versioning | CONTRACT ONLY — in FrameworkContext but not consumed |

## 6. GAP ANALYSIS

`src/lib/gapAnalysis.ts`: fully_mapped/partially_mapped/unmapped/no_evidence classification. DB RPCs: `detect_systemic_attainment_gaps_v1` (SQL-only), `classify_problem_cases_v1` (CLO problem case classification), `get_coordinator_cqi_patterns_v1`. Coordinator frontend gap-analysis page.

## 7. SOURCE OF TRUTH

| Calculation | Canonical Source | Duplicates |
|-------------|-----------------|------------|
| Evidence | DB trigger on grades | attainmentClassifier.ts (frontend only) |
| CLO attainment | calculate-attainment-rollup + outcome_attainment | useCLOProgress reads from DB |
| PLO attainment | Rollup from CLO | Coordinator dashboard aggregation |
| ILO attainment | Derived from PLO (labeled "derived alignment") | Per agent spec |
| Gap classification | detect_systemic_attainment_gaps_v1 (DB RPC) | gapAnalysis.ts (frontend presentation) |

## VERDICT: IMPLEMENTED, CONNECTED, EXECUTABLE, CUSTOMER-VISIBLE

The OBE engine is the most complete architectural subsystem. Evidence→attainment→rollup→CQI flows through the database as canonical authority.