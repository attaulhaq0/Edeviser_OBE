# PHASE20 — QATAR K-12 INSTITUTION MATRIX
**Date:** 2026-09-12 | **Scope:** Current Qatar K-12 launch only

## DOMAIN SEPARATION (distinct, non-collapsible)

| Domain | Meaning | Examples |
|--------|---------|----------|
| Curriculum | WHAT is taught | IB MYP, IGCSE 0580, MoEHE National |
| Assessment Model | HOW evaluated | percent, criterion(0-8), band_grade(9-1), component(AO) |
| Grade Scale | HOW reported | A-F, 1-7, 9-1, A*-G |
| Accreditation | WHO certifies | IB, CIS, BSO, QNSA |
| Framework | Outcome structure | IB MYP framework, IGCSE syllabus, MoEHE standards |
| Qatar Requirements | National mandates | Arabic, Islamic Studies, QNSA compliance |
| Reporting Policy | HOW presented | Percent transcripts, criterion portfolios, band certificates |

## CURRENT INSTITUTIONS

### ACTIVE

| # | ID | Name | Type | Population | Status |
|---|----|------|------|-----------|--------|
| 1 | `...000003` | Noor International | Qatar K-12 (IB MYP) | 5 users, 1 course, 1 assignment | **PARTIAL** — assessment_model mismatch |

### TO BE ONBOARDED (legitimate bootstrap only)

| # | Name | Type | Curriculum | Assessment | Grade Scale | Framework | Accreditation |
|---|------|------|-----------|-----------|-------------|-----------|--------------|
| 2 | Al Jazeera Academy | Qatar K-12 | MoEHE National | percent | A-F (MoEHE) | MoEHE NC | QNSA |
| 3 | Doha British School | Qatar K-12 | IGCSE | band_grade | 9-1 | IGCSE | BSO + QNSA |
| 4 | Qatar Multi-Track | Qatar K-12 | MYP+IGCSE+MoEHE | mixed | per-track | all 3 | IB+BSO+QNSA |

### ROADMAP (not launch-certified — explicitly marked)

| Item | Status |
|------|--------|
| Higher education | **ROADMAP — NOT LAUNCH CERTIFIED** |
| American AP/SAT | **ROADMAP — NOT LAUNCH CERTIFIED** |
| Indian CBSE/ICSE | **ROADMAP — NOT LAUNCH CERTIFIED** |
| French Bac | **ROADMAP — NOT LAUNCH CERTIFIED** |
| Additional exam boards (AQA, OCR, Edexcel) | **ROADMAP — NOT LAUNCH CERTIFIED** |

## NOOR — CURRENT GAPS + FIXES

| Domain | Current | Required | Action |
|--------|---------|----------|--------|
| Assessment Model | `percent` on ELA7 | `criterion` | UPDATE courses SET assessment_model='criterion' |
| Grade Scale | DEFAULT (A-F) | IB MYP 1-7 | Set institution_settings.grade_scales to IB 1-7 |
| Attainment Thresholds | 85/70/50 | IB-aligned (88/63/38) | Set institution_settings.attainment_thresholds |
| Evidence Policy | Percent-only trigger | Criterion-native preservation | Wire strategy-aware-evidence EF |
| CLOs | May be 0 | Mapped to MYP A/B/C/D criteria | Create criterion-mapped CLOs |
| Students | 1 | ≥5 for meaningful QA | Invite more students |
| Language | en default | en/ar bilingual | Set default_language='en' (Arabic via i18next RTL) |