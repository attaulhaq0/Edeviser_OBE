# QATAR K-12 RUNTIME CONFIGURATION MATRIX
**Phase 15 | Date:** 2026-09-12

## CURRENT INSTITUTIONS IN DATABASE

| # | Institution | Track | Curriculum | Assessment Strategy | Grade Scale | Framework | Evidence Policy | Language | Status |
|---|------------|-------|-----------|-------------------|-------------|-----------|----------------|----------|--------|
| 1 | Noor International School | IB MYP | IB Middle Years Programme | **criterion** (catalog) → percent (runtime) | DEFAULT_GRADE_SCALES | IB | Standard evidence trigger | en/ar | **PARTIAL** — assessment_model on course is "percent" despite IB framework; grade scale not consumed |
| 2 | Shell Institution 2 | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | Standard | UNKNOWN | **SHELL** — no data |
| 3 | Shell Institution 3 | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | Standard | UNKNOWN | **SHELL** — no data |
| 4 | Shell Institution 4 | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | Standard | UNKNOWN | **SHELL** — no data |
| 5 | Shell Institution 5 | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | Standard | UNKNOWN | **SHELL** — no data |
| 6 | Shell Institution 6 | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | Standard | UNKNOWN | **SHELL** — no data |

## REQUIRED CONFIGURATION PER INSTITUTION TYPE

### IB MYP School (e.g., Noor)
| Field | Required Value | Current | Gap |
|-------|---------------|---------|-----|
| assessment_model on course | "criterion" | "percent" | **MISMATCH** |
| Grade scale | IB MYP 1-7 scale | DEFAULT_GRADE_SCALES (A-F) | **MISMATCH** |
| Framework | IB (competency_frameworks) | Assigned via seed | OK |
| Evidence policy | Criterion-level evidence | Percent-only trigger | **MISMATCH** |
| attainment_thresholds | IB-aligned | 85/70/50 | **MISMATCH** |

### British/IGCSE School
| Field | Required Value | Current | Gap |
|-------|---------------|---------|-----|
| assessment_model on course | "band_grade" or "component" | Would default to "percent" | **NOT CONFIGURED** |
| Grade scale | 9-1 or A*-G scale | Would be DEFAULT_GRADE_SCALES | **NOT CONFIGURED** |
| Framework | IGCSE | Seed exists | **NOT ASSIGNED** |

### Qatar MoEHE National Curriculum
| Field | Required Value | Current | Gap |
|-------|---------------|---------|-----|
| assessment_model on course | "percent" | "percent" | OK |
| Grade scale | MoEHE percentage scale | DEFAULT_GRADE_SCALES (close enough) | MINOR |
| Framework | MoEHE Qatar NC | Seed exists | **NOT ASSIGNED** |
| Language preference | ar (primary) | en default | **NOT CONFIGURED** |

## ACTIONS REQUIRED

1. **Noor**: Set courses.assessment_model to "criterion", configure IB MYP 1-7 grade scale, configure IB attainment thresholds
2. **Shell institutions**: Bootstrap with legitimate curriculum data via bootstrap_tenant_v1
3. **Framework assignments**: Assign MoEHE/IGCSE frameworks to appropriate institutions
4. **Grade scales**: Create institution-specific grade scales (IB 1-7, IGCSE 9-1/A*-G) matching accreditation
5. **Assessment strategy runtime**: Enable assessmentStrategyEngine to be consumed by evidence trigger

## STATUS DEFINITIONS

- **VALID**: Configuration complete, runtime behavior matches accreditation requirements
- **INVALID**: Configuration exists but does not match requirements (e.g., IB school using percent model)
- **INCOMPLETE**: Partial configuration, missing key fields
- **SHELL**: Institution exists but has no operational data
- **UNKNOWN**: Cannot determine without live inspection