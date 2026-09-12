# CURRENT QATAR K-12 BACKEND CONFIGURATION REPORT
**Date:** 2026-09-12 | **Verified Against:** Live Supabase DB `cdlgtbvxlxjpcddjazzx`

## INSTITUTION MATRIX

| # | Institution | Curriculum | Assessment | Grade Scale | Framework | Accreditation | Courses | Students | Status |
|---|------------|-----------|------------|-------------|-----------|--------------|---------|----------|--------|
| 1 | Demo University | Higher Ed | percent | Default | N/A | ABET | 0 | 1 | ❌ NOT K-12 |
| 2 | Gulf Academy | MYP+MoEHE | criterion | MYP 1-7 | MYP+MoEHE | QNSA | 0 | 0 | ⚠️ SHELL |
| 3 | **Noor International** | **MYP** | **criterion** | **MYP 1-7** | **MYP** | **IB** | **4** | **40** | **✅ OPERATIONAL** |
| 4 | Multi-Track Academy | MYP+IGCSE+MoEHE | criterion+band+percent | Multi | 3 models | CIS | 0 | 0 | ⚠️ SHELL |
| 5 | Qatar National | MoEHE | percent | MoEHE | MoEHE | QNSA | 0 | 0 | ⚠️ SHELL |
| 6 | IB MYP Academy | MYP | criterion | MYP 1-7 | MYP | IB | 0 | 0 | ⚠️ SHELL |
| 7 | IGCSE British | IGCSE | band_grade | 9-1 | IGCSE | BSO | 0 | 0 | ⚠️ SHELL |

## NOOR INTERNATIONAL SCHOOL — CONFIGURATION AUDIT

### Courses (all configured)
| Course | Curriculum | Key Stage | Assessment | Grade Scale | Framework |
|--------|-----------|-----------|------------|-------------|-----------|
| Mathematics 6 | MYP | MYP1 | criterion | MYP 1-7 | IB MYP |
| English Language Arts 7 | MYP | MYP2 | criterion | MYP 1-7 | IB MYP |
| Science 8 | MYP | MYP3 | criterion | MYP 1-7 | IB MYP |
| Social Studies 7 | MoEHE | MYP2 | criterion | MYP 1-7 | MoEHE |

### Live Data
| Component | Count | Notes |
|-----------|-------|-------|
| Students | 40 | Active enrollments |
| Submissions | 552 | Graded |
| Evidence | 1,650 | raw_score on new inserts |
| Attainment | 1,113 | CLO/PLO/ILO |
| Learner States | 41 | Auto-refresh |
| Habit Logs | 27 | Auto-gen on new submissions |
| Interventions | 3 | Agent-sourced, approved |
| Agent Jobs | 845 | Queue active |

## FRAMEWORK REGISTRY
| Framework | Type | Accreditation | Status |
|-----------|------|--------------|--------|
| IB MYP 2026 | criterion | IB | ✅ LAUNCH CERTIFIED |
| MoEHE National Curriculum | component | QNSA | ✅ LAUNCH CERTIFIED |
| IB DP 2026 | criterion | IB | 🔮 ROADMAP |
| IGCSE 0580 | band_grade | BSO | 🔮 ROADMAP |
| IGCSE 0625 | band_grade | BSO | 🔮 ROADMAP |
| AP | band_grade | College Board | 🔮 ROADMAP |

## LAUNCH SCOPE
**Current launch QA tests:** Noor International School (IB MYP, 4 courses, 40 students)
**Future frameworks** (IB DP, IGCSE, AP) are in registries but marked ROADMAP / NOT LAUNCH CERTIFIED

## BOOTSTRAPPING SHELL INSTITUTIONS
Run for each shell:
```sql
SELECT start_pilot_onboarding('Institution Name', 'MYP');  -- or 'IGCSE', 'MoEHE'
```
This creates institution + programs + courses + outcomes in one idempotent transaction.