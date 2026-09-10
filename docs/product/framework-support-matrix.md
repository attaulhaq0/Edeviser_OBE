# Edeviser Framework & Accreditation Support Matrix

> Qatar-market K-12 platform supporting 3 assessment models + 10 accreditation regimes. Last updated 2026-09-09.

---

## Supported Assessment Models

| Framework            | Grading Style                                         | Grade Bounds             | Criteria            | Market                                                      |
| -------------------- | ----------------------------------------------------- | ------------------------ | ------------------- | ----------------------------------------------------------- |
| IB MYP               | Criterion A-D (0-8 each), total /32 -> 1-7            | 1-7 (7 bands)            | 4 per subject       | 21 IB World Schools in Qatar; 17 DP/13 MYP/14 PYP/3 CP      |
| Cambridge IGCSE      | Assessment Objectives (AO1-AO3), weighted band grades | A\*-G / 9-1 (8 bands)    | 3-5 per subject     | 60+ British/international schools in Qatar                  |
| MoEHE Qatar National | Percentage (0-100) + Learner Attributes               | 0-100 + attribute rubric | Institution-defined | All Qatar national/private schools under Ministry oversight |

## Accreditation Regimes Supported

| Regime                      | Coverage                          | Evidence Pack Type                                      | Status                         |
| --------------------------- | --------------------------------- | ------------------------------------------------------- | ------------------------------ |
| QNSA                        | All Qatar MoEHE schools           | Bilingual AR/EN self-study pack with learner attributes | RPC deployed; 0 generated live |
| BSO                         | British-curriculum schools abroad | Evidence matrix with IGCSE AO alignment                 | RPC deployed                   |
| CIS                         | International schools globally    | Evidence matrix with PLO attainment                     | RPC deployed                   |
| IB Authorization/Evaluation | IB World Schools                  | Criterion-based evidence with moderation trails         | RPC deployed                   |
| NEASC                       | New England international schools | ILO/PLO attainment evidence                             | RPC deployed                   |
| HEC                         | Qatar tertiary institutions       | ILO/PLO/CLO evidence chain                              | RPC deployed                   |
| QQA                         | Qatar education quality           | Bilingual evidence pack                                 | RPC deployed                   |
| ABET                        | Engineering/technology programs   | Outcome-based assessment evidence                       | RPC deployed                   |
| NCAAA                       | Saudi/GCC institutions            | PLO attainment + CQI summary                            | RPC deployed                   |
| AACSB                       | Business schools                  | Learning assurance evidence                             | RPC deployed                   |

## Multi-Track Architecture

Edeviser supports institutions running MULTIPLE frameworks simultaneously (common in Doha where British schools also offer IB diploma, or MoEHE schools add IGCSE).

- Framework assignment: Institution -> one or more competency_frameworks via institution_framework_assignments
- Course-level model: Each course declares assessment_model (percent, criterion, band_grade)
- RLS isolation: institution_framework_assignments is RLS-scoped; framework data NEVER leaks between tenants
- Multi-track tenant: 1 institution = MYP + IGCSE + MoEHE possible; students see only their course model
- Grade boundary isolation: MYP students see criterion 1-7; IGCSE students see band 9-1/U; never crossed

## Qatar Market Positioning

| Competitive Advantage      | Detail                                                                          |
| -------------------------- | ------------------------------------------------------------------------------- |
| 3-curriculum native        | No competitor handles IB MYP, Cambridge IGCSE, AND MoEHE in one platform        |
| Bilingual first-class      | Arabic/English across ALL surfaces including accreditation reports              |
| QNSA ready                 | Self-study evidence pack generator with bilingual data + learner attributes     |
| OBE depth                  | ILO->PLO->CLO->Sub-CLO with canonical attainment rollup; not just gradebook     |
| Agentic AI with guardrails | DeepSeek tutor; curriculum ingestion; decision intelligence; all approval-gated |
| GCC compliance path        | QNSA + NCAAA + ABET + AACSB regimes supported; multi-regime evidence packs      |

## Implementation Status

| Component                             | Status         | Notes                                               |
| ------------------------------------- | -------------- | --------------------------------------------------- |
| MYP criterion grading                 | Math validated | 7 boundary tests green; needs live MYP tenant       |
| IGCSE band grading                    | Math validated | AO-weighted math green; needs live IGCSE tenant     |
| MoEHE evidence pack                   | RPC deployed   | Structure validated; 0 live generation              |
| Accreditation evidence pack generator | RPC deployed   | 10 regimes supported; audit trail ready             |
| Competency framework presets          | UI exists      | 0 rows live; needs seed population                  |
| Graduate attributes                   | UI exists      | 0 rows live; needs admin population                 |
| Multi-framework RLS isolation         | Live           | 2 framework assignments on Noor tenant              |
| PostHog accreditation dashboard       | Created        | Dashboard [2079405]; no framework-tagged events yet |

---

> For detailed QA verification, see [Comprehensive QA Manual](../qa/EDEVISER-COMPREHENSIVE-QA-MANUAL.md) and [Promise Matrix](../../.kiro/specs/continuous-verification/promise-matrix.md).
