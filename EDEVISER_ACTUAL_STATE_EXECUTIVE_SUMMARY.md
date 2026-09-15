# EDEVISER ACTUAL STATE — EXECUTIVE SUMMARY
**Date:** 2026-09-12 | **Audit Method:** Codebase Reverse-Engineering

---

## WHAT EDEVISER ACTUALLY IS TODAY

Edeviser is an **Institutional Learning Intelligence Platform** with a functioning OBE (Outcome-Based Education) engine, an AI orchestration layer powered by DeepSeek, and a gamification-driven student experience layer. It serves five distinct roles — Admin, Coordinator, Teacher, Student, Parent — across institution-scoped tenants with full Arabic/English bilingual support. The platform is deployed on Supabase with a PostgreSQL database, ~65 Edge Functions, pg_cron automation, and a React 18 SPA frontend.

**The platform genuinely delivers:**
1. **OBE attainment tracking** — CLO/PLO/ILO outcomes are mapped, evidence is generated from graded submissions, attainment percentages roll up through a canonical hierarchy, and the attainment cascade is stored in `outcome_attainment` rows with four scopes (student_course, course, program, institution).
2. **LMS fundamentals** — Courses, assignments, quizzes, gradebook (weighted categories), attendance, announcements, modules, discussion forums, calendar, and timetable management.
3. **Gamification layer** — XP transactions, badges (definitions + awards), streaks (with milestones, freezes, comeback challenges), leaderboards, teams, marketplace items, and league tiers.
4. **AI Tutor (RAG)** — Course material embedding + DeepSeek-powered chat with socratic_guide/summarizer/quiz_master personas, source citations, teacher handoff detection, and autonomy controls.
5. **Agentic Intelligence** — One orchestrator (agent-orchestrator) routes requests to 10 specialist prompt variants with 21 deterministic read tools and 10 human-approval-gated write tools. All protected actions require human approval.
6. **Intervention State Machine** — Proposals → approval → execution → measurement with deterministic evaluation (IMPROVED/NO_MATERIAL_CHANGE/DECLINED/INSUFFICIENT_EVIDENCE).
7. **Curriculum Gap Analysis** — Classification of outcomes as fully_mapped/partially_mapped/unmapped/no_evidence with recommendations.
8. **Habit Tracking** — Daily habits (login, submit, journal, read), perfect day detection, habit heatmap, and habit signal storage in student_learning_states.
9. **Parent Portal** — Verified parent-student links with RLS-enforced child data access (progress, attendance, planner, communications).
## THE ACTUAL EDEVISER FLOW

```
STUDENT submits quiz/assignment
  → auto-grade-quiz / teacher manual grading
  → grade stored in `grades` table (score, feedback)
  → trigger creates `evidence` row (grade_id → submission_id → clo_id/plo_id/ilo_id, score_percent, attainment_level)
  → calculate-attainment-rollup computes `outcome_attainment` (student_course scope)
  → materialized view `mv_historical_evidence` aggregates program/institution scopes
  → student_learning_states refreshed with mastery + habit signals
  → agent-worker cron (every 5 min) picks up proactive jobs
  → agent-orchestrator invokes specialist + read tools → produces proposals
  → proposals require teacher/coordinator/admin approval
  → approved proposals execute via protected write tools
  → intervention_measurements created for evaluation
  → intervention-jobs cron (hourly + every 15 min) evaluates effectiveness
  → CQI patterns detected via `detect_systemic_attainment_gaps_v1`
  → accreditation reports generated

FRONTEND: Student sees CLO progress, XP gains, streaks, habits
  → Teacher sees gradebook, attainment dashboard, student progress
  → Coordinator sees program/PLO attainment, CQI patterns, gap analysis, curriculum matrix
  → Admin sees institution-wide analytics, ILO management, user management
  → Parent sees verified child summaries (not raw data)
```

---

## THE FIVE BIGGEST ARCHITECTURAL TRUTHS

1. **Single Orchestrator, Not Multi-Agent** — Despite the "multi-agent" branding and 10 specialist types, the architecture is ONE orchestrator (agent-orchestrator) that selects a specialist prompt variant and routes through shared tool registries. Specialists are prompt specializations, not independent agents with separate memory/goals/tools.

2. **OBE Engine Is Real and Functional** — The ILO→GA→PLO→CLO→Assessment→Evidence→Attainment cascade is fully implemented with canonical mapping direction (source=parent, target=child), rollup computation, and four attainment scopes. This is the most architecturally complete subsystem.

3. **Percent-Based Assessment Is Primary** — Despite contracts defining `percent`, `criterion`, `band_grade`, and `component` models, the actual runtime evidence creation and attainment calculation uses percent scores exclusively. Framework context (assessmentModel) is injected into agent prompts but does not change the deterministic computation path.

4. **The Habit Engine Is Not BJ Fogg-Based** — There is no Motivation/Ability/Prompt model, no behavior definition system, no formal habit taxonomy. The "habit engine" is a streak tracker + daily habit logger (login/submit/journal/read) + perfect day checker. Habit signals are JSON blobs in student_learning_states.habits, not a structured behavior model.

---

## THE FIVE BIGGEST GAPS

1. **No Multi-Framework Runtime Adaptation** — Changing assessment_model from "percent" to "criterion" or "band_grade" does not change the evidence creation, attainment calculation, or normalization pipeline. The assessment strategy registry exists but is not runtime-pluggable.

2. **Agent AI Surfaces Gated by Default** — Tutor, feedback drafts, module suggestions, and at-risk predictions require `VITE_AI_FEATURE_ENABLED=true`. In default configuration, students do not see AI features.

3. **5 Shell Institutions / Only 1 Operational** — Only the Noor institution has real operational data (courses, outcomes, evidence, attainment). Five other institutions have shells but need onboarding.

4. **Habit-Learner State Fusion Is Shallow** — Habit signals stored in student_learning_states.habits are JSON blobs, not a structured behavior model with formalized signal types, normalization, or correlation computation. The compute-habit-correlations edge function exists but its live impact is limited.

5. **Closed-Loop Intelligence Is Partial** — The full loop has ALL nodes implemented, but several edges are CONTRACT ONLY or have limited live data. Intervention measurement has 1 proven complete cycle.

---

## THE FIVE HIGHEST-LEVERAGE NEXT ACTIONS

1. **Activate AI surfaces for real users** — The agent infrastructure is running (2,399 agent_runs, 845 jobs, 3 interventions) but AI features are gated. Enabling them would immediately deliver the intended intelligence layer to students and teachers.

2. **Onboard remaining shell institutions** — 5 institutions have empty shells. Real multi-tenant data would stress-test the platform and validate the bootstrap pipeline.

3. **Pluggable assessment strategy runtime** — Make the assessment_model on courses actually change the evidence normalization and attainment calculation pipeline, not just the agent prompt context.

4. **Deepen the habit model** — Move from 4 binary daily habits to structured behavior definitions with formalized signals (consistency, intensity, timing, recovery) that feed directly into learner state normalization.

5. **Browser E2E with DB verification** — Current E2E tests verify UI navigation (URL/smoke). Adding DB state verification would close the gap between "page loads" and "workflow produces correct data."

---

## FINAL PRODUCT CLASSIFICATION

**Edeviser is an: Institutional Learning Intelligence Platform**

**Why:**
- It has a complete LMS (courses, assignments, gradebook, attendance, modules, calendar)
- It has LXP elements (gamification, streaks, badges, leaderboards, marketplace)
- Its OBE engine is architecturally deeper than typical LMS/LXP platforms
- Its agentic intelligence layer (DeepSeek orchestrator + specialists + tools + human approval) distinguishes it from pure LMS/LXP
- Its intervention state machine and CQI pattern detection target institutional improvement, not just individual learning
- It is NOT a pure LMS (has intelligence, OBE, gamification axes that exceed LMS boundaries)
- It is NOT a pure LXP (has institutional OBE, accreditation, CQI that exceed LXP boundaries)
- "Learning Intelligence Platform" accurately captures the OBE + AI + institutional axes while "Institutional" reflects the accreditation/CQI/multi-tenant design

---

## DEPLOYMENT IMPACT
- **Runtime feature(s):** All features described above
- **Production action required:** NO (audit only)