# Prototype Demo Data Dictionary

`demo-data.js` is the source of truth for the Student refinement overlay. It is a static frontend-only object and has no backend, API, storage, or Supabase connection.

| Domain | Canonical values |
|---|---|
| Student | Sarah Ahmed; Level 4; 750 / 1000 XP; wallet 750; 12-day streak; Daily Goal 65% / 390 of 600 XP |
| Course | CS301 Database Design; 72%; Module 5 of 8 |
| Focus | Normalization · CLO 3; 62%; Developing; medium evidence confidence |
| Path | Level 3 — Apply; 65%; 2 / 5 concepts; +18% |
| Assignment | Assignment 3 / Database Assignment 3; Normalize a Schema; +25 XP; ~30 min; Friday; Due in 2 days |
| Review & focus | 5 cards due today; 25-minute focus window |
| Tutor governance | Guided L2 teaching style; A1 Suggest; teacher handoff requires approval |
| Other courses | Web Development 45%; AI Fundamentals 88%; Software Engineering 30%; Statistics 58% |
# Admin / Institution deterministic state

`window.EDEVISER_ADMIN` is the centralized frontend-only source of truth for the August 2026 Admin prototype. It does not call Supabase, production APIs, or external runtime services.

- `demo`: fixed date label, current period, and freshness wording.
- `institution`: Gulf Academy identity plus global learner, engagement, mastery, retention-review, department, program, and course facts.
- `institutionOutcomes`: ILO definitions, attainment, target, trend, evidence confidence, program contribution count, coverage, and CQI state.
- `qualityTrend`: five fixed periods of institution attainment and evidence coverage.
- `departments` / `programContribution`: institution-safe aggregates used by Analytics and Home.
- `evidenceHealth` / `hierarchyHealth`: evidence sufficiency, mappings, missing states, and quality warnings.
- `cqi`: open/closed state, remeasurement, measured lift, and Coordinator-originated improvement summaries.
- `readiness`: evidence-readiness score, evidence families, blockers, and the Aug 20 milestone. It is not an accreditation score.
- `approvals`: protected proposals with pending/reviewed metadata. UI transitions support approval or rejection before any execution implication.
- `aiGovernance`: provider/model labels, A2 institution ceiling, policy version, tool calls, usage, cost, latency, safety, budget, pending actions, and authorization matrix. No credentials are stored.
- `academicCalendar`: Summer 2026 Active, Fall 2026 Upcoming, and Spring 2026 Past; no live `Date()` calculation is used.
- `people`, `security`, `fees`, `marketplace`, `badges`, `importPreview`: deterministic operational summaries and preview rows.

Values are intentionally reused by rendering functions rather than copied across individual Admin HTML routes.
