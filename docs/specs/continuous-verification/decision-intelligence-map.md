# Educational Decision Intelligence — Capability Map (2026-09-06)

> **Purpose.** Records how much of Edeviser's "Educational Decision Intelligence" already works,
> what is missing, and the ideal fix for each — so engineering work targets gaps, not rework.
> This is a LIVING record: update rows as tasks land. Canonical home is
> `.kiro/specs/continuous-verification/decision-intelligence-map.md`; the `docs/specs/...` copy
> is the parallel mirror.
>
> Level legend (from the OBE reality check): **L0 CRUD** (stores info) · **L1 Workflow** (connects
> records) · **L2 Automation** (performs work) · **L3 Intelligence** (analyzes + recommends) ·
> **L4 Closed-Loop** (learns + improves curriculum).
> Verification principle: every claim below was verified against live Supabase
> (`cdlgtbvxlxjpcddjazzx`) and local code (`ace2acc4`); no documentation-only claims.

## The Decision Stack (what the platform must answer)

1. **What is failing?** (outcome / CLO / PLO weakness)
2. **Why is it failing?** (root cause)
3. **Who is affected?** (students / classes / cohort)
4. **What intervention should happen?** (recommended action)
5. **Who should perform it?** (owner / role)
6. **Did it work?** (before / after measurement)
7. **Should we change the curriculum?** (CQI / curriculum improvement)
8. **Is this a student, teacher, assessment, prerequisite, or curriculum-design problem?**

## Capability Map

| Decision Q                                                             | Works today (live evidence)                                                                                                                                                                                                            | Level                   | Missing                                                                                                                    | Ideal fix                                                               | Tasks                  |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ---------------------- |
| Q1 What is failing?                                                    | `outcome_attainment` weighted rollup trigger (real, code-verified); coordinator gap analysis / coverage heatmap / semester trends / sankey (exist, client-side, 0 live rows); `trg_outcome_attainment_drop_notify` (<70%) real trigger | L2 math; L0 operational | No live data; no section×CLO composed view; all-table client reads                                                         | Prime loop (cron + learning states); scoped RPCs; Unit-Close journey    | 7.4 · 7.6 · 7.7 · 8.10 |
| Q2 Why is it failing?                                                  | `classify_problem_cases_v1` deterministic engine (live) + Unit-Close `DecisionIntelligenceSection` UI (typed cases, dominant cause, confidence, cited evidence); systemic-outcome-gap pattern contracts — 0 pattern rows               | L3 arch; L0 operational | AI explanation from authorized evidence not wired; no ownership routing; full decision-stack QA suite pending              | AI explanation (citation-fail-closed) + ownership routing               | 8.9                    |
| Q3 Who is affected?                                                    | Cohort comparison, section attainment, at-risk signals (all arch; 0 data rows live)                                                                                                                                                    | L2 arch; L0 operational | No section/demographic scoping on real data                                                                                | Affected-classes drill in Unit-Close; scoping RPCs                      | 7.7 · 8.9              |
| Q4 What intervention?                                                  | AI-drafted CQI (DeepSeek, citation-fail-closed) + intervention generation/evaluation machinery — 0 rows, cron gated on unset secrets                                                                                                   | L3 arch; L0 operational | No cited drafts from real data; no student-level recommendation flow                                                       | Provision cron secrets; loop priming; cited drafts + approval inbox     | 7.4 · 8.9              |
| Q5 Who performs it?                                                    | `classify_problem_cases_v1.recommended_owner` — deterministic routing from dominant cause (live-verified: student-signal → `student_support`); rendered on Unit-Close; CQI `responsible_person` free-text still exists                 | L1                      | Owner → intervention assignment flow not yet wired; other routing branches (teacher/coordinator) have no live fixtures yet | Wire owner into intervention drafts + approval inbox                    | 8.9                    |
| Q6 Did it work?                                                        | `intervention_measurements` deterministic evaluation (PENDING→IMPROVED/NO_MATERIAL_CHANGE/DECLINED/INSUFFICIENT_EVIDENCE) + `measureComparableCqiEffect` comparability — 0 rows, no UI                                                 | L4 arch; L0 operational | No live measurements; measurement results not surfaced                                                                     | Loop priming; measurement-results UI on interventions + CQI             | 7.4 · 8.10             |
| Q7 Should we change the curriculum?                                    | CQI action-plan model + AI draft + accreditation report generators — 0 plans/patterns, 0 reports                                                                                                                                       | L4 arch; L0 operational | No evidence-tied curriculum-change recommendation; course-file is a doc generator                                          | Systemic patterns → CQI plan → measurement; IMPROVE stage of ideal flow | 7.4 · 8.10             |
| Q8 Problem class (student/teacher/assessment/prereq/curriculum-design) | NONE — no entity, no classifier, no taxonomy                                                                                                                                                                                           | **MISSING**             | The entire taxonomy + deterministic classifier + AI explanation                                                            | Problem-taxonomy engine (5 classes; confidence + citations)             | 8.9                    |

## What is already real (do not rebuild) — the audit's "genuinely automated" core

- Grade → evidence → CLO/PLO/ILO weighted rollup + XP + notification (trigger, code-verified)
- Mapping hierarchy + weight-sum validation (triggers; canonical direction)
- Attendance roll-up + gamification (live data: 4830 records / 2508 XP transactions)
- Intervention measurement + CQI comparability contracts (code + cron, unprimed)
- AI: tutor RAG, feedback drafting, question generation, CQI drafting (all citation-fail-closed)
- Bilingual AR/EN + RTL across the UI

## What must be built (map → tasks)

| Gap                                                             | Task              |
| --------------------------------------------------------------- | ----------------- |
| Data priming (loop tables empty)                                | 7.4 (Phase 7)     |
| Scoped analytics RPCs (client-side reads)                       | 7.6 (Phase 7)     |
| Unit-Close journey (Q1/Q3 moment of value)                      | 7.7 (Phase 7)     |
| Curriculum ingestion (Q2 evidence source)                       | 7.8 (Phase 7)     |
| Framework packs (MYP/IGCSE/MoEHE)                               | 8.2 (Phase 8)     |
| Problem taxonomy + decision engine (Q2/Q3/Q4/Q5/Q8)             | 8.9 (Phase 8)     |
| Decision-stack tests (one per question)                         | 8.9-QA (Phase 8)  |
| Ideal closed-loop flow (Q1–Q7 end-to-end)                       | 8.10 (Phase 8)    |
| Closed-loop E2E per stage                                       | 8.10-QA (Phase 8) |
| TEACH stage: outcome-linked lessons/activities (ideal-flow gap) | 8.11 (Phase 8)    |
| ASSESS stage: assessment blueprint + coverage flags             | 8.12 (Phase 8)    |
| Product decision + Discovery-sprint gate (8.1 contract)         | 8.13 (Phase 8)    |

## Definition of "done" for decision intelligence

Edeviser answers the full stack with cited, deterministic evidence:

> "CLO-3 (Solve two-step equations) is failing at 52% across 4 sections of Grade 7 (Q1). The
> dominant cause is assessment design — items are below the CLO's Applying level (Q8). 61 students
> in sections A–C are affected; section B is a teacher-signal outlier (Q3). Recommended: reteach
> (Q4) by teacher B with a mastery-pathway micro-assessment (Q5), measured before/after (Q6). If
> attainment does not improve ≥5pp, the Q2 unit plan should be revised (Q7)."
