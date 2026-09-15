# CURRENT INSTITUTION QATAR K–12 MATRIX

**Date:** 2026-09-12 | **Verified against:** Live Supabase DB

| # | Institution | ID | Type | Curriculum | Assessment | Grade Scale | Qatar Framework | Accreditation | Framework Pack | Courses | Students | Launch Ready |
|---|------------|----|------|-----------|------------|-------------|----------------|--------------|----------------|---------|----------|--------------|
| 1 | **Demo University** | 000...0001 | Higher Ed | NULL | NULL | Attainment thresholds | N/A (HE) | ABET | Generic-HigherEd | 0 | 1 | ❌ NOT QATAR K-12 |
| 2 | **Gulf Academy** | 9fb3... | K-12 | NULL | NULL | NULL | MYP + MoEHE assigned | QNSA | MYP + MoEHE | 0 | 0 | ❌ NO OPERATIONAL DATA |
| 3 | **Noor International** | 4de6... | K-12 IB | NULL | criterion | NULL | MYP framework (own) | IB | MYP 2026 (own) | 4 | 40 | ❌ framework_id=NULL on courses |
| 4 | **Multi-Track Academy** | 6736... | K-12 Multi | NULL | criterion+band+percent | NULL | 3 models configured | CIS | NONE assigned | 0 | 0 | ❌ NO OPERATIONAL DATA |
| 5 | **Qatar National** | fb24... | K-12 Qatar | NULL | percent | NULL | MoEHE | QNSA | NONE assigned | 0 | 0 | ❌ NO OPERATIONAL DATA |
| 6 | **IB MYP Academy** | 9cec... | K-12 IB | NULL | criterion | NULL | MYP | IB | NONE assigned | 0 | 0 | ❌ NO OPERATIONAL DATA |
| 7 | **IGCSE British** | 9055... | K-12 British | NULL | band_grade | NULL | IGCSE | BSO | NONE assigned | 0 | 0 | ❌ NO OPERATIONAL DATA |

**Summary:** 0 of 6 Qatar K–12 institutions are launch-ready.
- Noor: Has operational data but courses lack framework context
- Gulf Academy: Has framework assignments but no courses/students
- Remaining 4: Empty shells with only institution records

## LIVE DATABASE STATE

| Component | Count | Status |
|-----------|-------|--------|
| Institutions | 7 | 1 operational (Noor), 6 shells |
| Students (Noor) | 40 | ✅ Only institution with real users |
| Teachers (Noor) | 4 | ✅ |
| Courses (Noor) | 4 | ⚠️ ALL framework_id=NULL |
| Submissions | 552 | ✅ |
| Grades | 550 | ✅ |
| Evidence | 1,650 | ⚠️ raw_score=NULL for all sampled |
| Attainment (CLO/PLO/ILO) | 1,113 | ✅ Trigger-based |
| Learner States | 41 | ⚠️ Stale (fresh_until < now()) |
| Habit Logs | 27 | ❌ Effectively empty |
| Learning Interventions | **0** | ❌ DARK |
| Intervention Measurements | **0** | ❌ DARK |
| Agent Proposals | 2 | ❌ Wrong type, pending |
| Agent Executions | **0** | ❌ DARK |
| CQI Measurements | 0 | ❌ DARK |
| Habit Correlations | 0 | ❌ DARK |
| Accreditation Reports | 0 | ❌ NONE GENERATED |