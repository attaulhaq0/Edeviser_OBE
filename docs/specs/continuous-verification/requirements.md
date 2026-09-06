# Requirements — Continuous Product Verification

EARS-style (WHEN/THE SYSTEM SHALL). IDs: FR (functional), DR (data/quality).

## R1 — Account identity & seed tagging

- FR-1.1 WHEN a user is identified to PostHog, THE SYSTEM SHALL attach person
  properties: `account_type` (`seed`|`real`), `environment` (`production`|`preview`|
  `development`), `role`, `institution_id`, `email`.
- FR-1.2 THE SYSTEM SHALL classify `account_type=seed` via the locked registry in
  `src/lib/seedAccounts.ts` (domains `demo.com`, `noor-international.edu`; demo
  institution `00000000-0000-0000-0000-000000000001`). No user IDs may be hardcoded.
- FR-1.3 THE SYSTEM SHALL NOT send analytics events for users who have not granted
  analytics consent (existing behavior — preserve).
- DR-1.1 Seed accounts SHALL remain visually legitimate (`*.edu`/`*.com`), never
  `*.test`; login for all 73 seed accounts SHALL continue to work after any rename.

## R2 — PostHog projects (US region)

- FR-2.1 THERE SHALL exist two US-hosted PostHog projects: `edeviser-prod` and
  `edeviser-qa`, selected at build time via `VITE_POSTHOG_PROJECT_TOKEN` +
  `VITE_POSTHOG_HOST` per environment (Vercel env vars).
- FR-2.2 BOTH projects SHALL define "filter internal and test users" = person
  property `account_type = seed`, applied to existing and new insights.
- FR-2.3 Session replay SHALL be enabled with input+text masking (education/privacy).
- FR-2.4 Autocapture SHALL be ON in prod (pageviews, clicks) with SPA history-change
  pageview tracking.

## R3 — Dashboards (all built in PostHog; no Slack yet)

- FR-3.1 THE SYSTEM SHALL provision 4 dashboards (definitions in design.md):
  1. `Investor — Users & Engagement`, 2) `Engine Health — OBE`, 3) `Engine Health —
Habit/Gamification`, 4) `QA & Broken Chains` (+ AI/Agent health panel set).
- FR-3.2 Dashboard provisioning SHALL be reproducible via
  `scripts/posthog-provision.mjs` (PostHog API + personal API key), not hand-clicked.
- FR-3.3 Broken-chain detection SHALL rely on paired events (e.g. `assignment_graded`
  without later `xp_grade_awarded` same reference) surfaced as "has value < 1" alerts.

## R4 — Chain verification (e2e of the product)

- FR-4.1 THE SYSTEM SHALL have Playwright chain tests that perform a user action and
  then assert DB consequences via the staging Supabase client: grade→evidence→
  CLO/PLO/ILO attainment→XP→level→notification; submit→queue; purchase→balance.
- FR-4.2 Chain tests SHALL run against staging/Preview ONLY, never Production.
- FR-4.3 THE SYSTEM SHALL run the full route×role matrix (from `criticalRoutes.ts`)
  nightly in `scheduled-health.yml`; failures post a run summary (Slack later).
- FR-4.4 pgTAP invariant suites SHALL cover: XP idempotency, rollup bounds
  (attainment ∈ [0,100]), evidence immutability, mapping weight sums, mapping
  direction pairs (ILO→PLO, PLO→CLO, CLO→SUB_CLO), streak no-double-count.

## R5 — Drift & promise tracking

- FR-5.1 A promise→proof matrix SHALL live in `docs/specs/continuous-verification/
promise-matrix.md`, seeded from the QA manual PASS/BLOCKED/SUSPECTED statuses,
  reviewed after each verification run.

## R6 — Quality gates

- FR-6.1 Any change in this spec's scope SHALL pass `npm run lint`, `npx tsc --noEmit`,
  `npm test`, and the targeted test files before commit.

## R7 — Data integrity & provenance (F1, F3)

- DR-7.1 WHEN an assessment produces evidence, THE SYSTEM SHALL trace it to an existing, insert-only
  submission + grade (or a first-class assessment-attempt source); evidence with a non-existent
  source SHALL NOT be writable.
- FR-7.2 ALL evidence — assignment or quiz — SHALL flow through the SAME canonical attainment path
  (`trigger_attainment_rollup`); client-computed attainment SHALL NOT be written.
- FR-7.3 WHEN a course CLO has zero linked assessments, THE SYSTEM SHALL flag it at authoring time
  unless a documented exemption exists.

## R8 — Closed loop (F4, F5, F7)

- FR-8.1 THE SYSTEM SHALL materialize `student_learning_states` deterministically from canonical
  evidence (preserving version/freshness/hash invariants) for every populated tenant.
- FR-8.2 Intervention generation + evaluation SHALL run on schedule for configured tenants and SHALL
  produce rows (`learning_interventions`, `intervention_measurements`) with deterministic state
  transitions (PENDING → IMPROVED | NO_MATERIAL_CHANGE | DECLINED | INSUFFICIENT_EVIDENCE).
- FR-8.3 At-risk prediction SHALL persist rows (`ai_feedback`, `suggestion_type = at_risk_prediction`)
  only above the configured probability threshold and SHALL support teacher validation via
  `validated_outcome`.
- FR-8.4 THE SYSTEM SHALL provide a composed "post-unit attainment review" flow: section × CLO
  matrix → weak outcome → assessment items → affected classes → cited intervention draft → approval →
  tracked intervention.

## R9 — Scoped analytics (F6)

- FR-9.1 Gap / coverage / sankey analytics SHALL be served by program- and semester-scoped RPCs
  guarded by RLS; the client SHALL NOT read whole tables for analytics.
- FR-9.2 Deterministic analytics classification SHALL exist in exactly ONE source (SQL or a shared
  lib) reused by the server and any client preview.

## R10 — Ingestion governance (F8)

- FR-10.1 Curriculum ingestion SHALL extract candidate topics/outcomes/mappings via the AI provider
  as a DRY-RUN proposal; no writes occur before human approval.
- FR-10.2 Approved ingestion writes SHALL pass the existing outcome/mapping hierarchy + weight
  validations and SHALL leave an audit trail in `agent_action_proposals` / `agent_action_executions`.

## R11 — Framework presets (F9)

- FR-11.1 THE SYSTEM SHALL provide framework presets (MYP criteria A–D 0–8, IGCSE subject components,
  MoEHE National Curriculum learner attributes) as additive layers over outcomes and rubrics.
- FR-11.2 Criterion-marking math (0–8 per criterion; sum /32 → 1–7 grade) SHALL be deterministic and
  SHALL feed moderation-ready per-class distribution reports.

## R12 — Security baseline (F11)

- FR-12.1 Every RLS-enabled table with no policy SHALL be on a documented fail-closed allowlist or
  SHALL receive policies.
- FR-12.2 Mutable `search_path` warnings SHALL be closed; the authenticated-exposed SECURITY DEFINER
  surface SHALL be reviewed and minimized where feasible.

## R13 — Scoring-model abstraction (8.1, 8.3–8.6)

- FR-13.1 THE SYSTEM SHALL model assessment per course/section via `assessment_model`
  (`percent | criterion | band_grade | component`) with per-model grade scales, inheriting
  institution defaults where unset.
- FR-13.2 THE SYSTEM SHALL store raw, immutable score semantics (`evidence.raw_score jsonb`) in
  ADDITION to canonical normalized `score_percent`; percent-path arithmetic SHALL remain unchanged
  for existing tenants.
- FR-13.3 THE SYSTEM SHALL record multiple accreditation bodies per institution as free text
  (frame-independent); the higher-ed-only CHECK SHALL be relaxed forward-only.

## R14 — Framework packs as data (8.2, 8.4–8.6)

- FR-14.1 THE SYSTEM SHALL provide framework data packs (MYP criteria A–D, IGCSE/NC syllabi, MoEHE
  learner attributes + compulsory subjects) as seeded `competency_frameworks`/`competency_items`
  with weight-validated `competency_outcome_mappings`.
- FR-14.2 Pack creation and curriculum import SHALL be human-approval-gated
  (`agent_action_proposals`) and bilingual (AR/EN).

## R15 — Criterion / band / component attainment (8.3, 8.4)

- FR-15.1 Criterion attainment (MYP A–D 0–8) SHALL be deterministic and best-fit per IB rules and
  convert via a versioned boundary table to 1–7; raw criterion data SHALL NOT be represented by
  percent alone.
- FR-15.2 Band/component models (IGCSE A\*–G/9–1, A-Level, AP 1–5) SHALL support weighted
  assessment-objective attainment and coursework/moderation evidence semantics.

## R16 — Decision intelligence (8.9)

- FR-16.1 THE SYSTEM SHALL answer the decision stack — What is failing / Why / Who is affected /
  What intervention / Who performs it / Did it work / Should the curriculum change — as typed
  problem cases with deterministic classification across student, teacher, assessment,
  prerequisite, and curriculum-design causes, each with cited evidence and confidence.
- FR-16.2 AI explanation SHALL cite ONLY authorized evidence; deterministic metrics SHALL NOT be
  model-authored.

## R17 — Closed-loop ideal flow (8.10)

- FR-17.1 THE SYSTEM SHALL run the PLAN→TEACH→ASSESS→MEASURE→DIAGNOSE→INTERVENE→VERIFY→IMPROVE loop
  end-to-end, each stage writing its canonical tables.
- FR-17.2 THE SYSTEM SHALL expose a loop-health surface (stage row counts; stage age) consumed by
  dashboards.
- FR-17.3 Loop stages SHALL be deterministic and idempotent; identical seed input SHALL produce
  identical measurement deltas.

## R18 — Decision & loop tests (8.9-QA, 8.10-QA)

- FR-18.1 THE SYSTEM SHALL have ONE deterministic test per decision question (Q1–Q8) and per
  closed-loop stage, runnable against a seeded fixture.

## R19 — TEACH stage (8.11)

- FR-19.1 Lessons and lesson activities SHALL link to CLO/sub-CLO outcomes and SHALL belong to a
  course module; `class_sessions` SHALL reference a lesson and carry the unit's outcome ids.
- FR-19.2 The teacher planner and student learning path SHALL consume the module→lesson→activity
  structure; lesson content SHALL be bilingual (AR/EN) and RLS-scoped to the course.

## R20 — ASSESS blueprint (8.12)

- FR-20.1 `assessment_blueprints` SHALL map course→unit→assessment slots with weights + CLO ids and
  SHALL auto-flag under-assessed / over-assessed / unassessed outcomes at course scope.
- FR-20.2 AI-drafted blueprints SHALL be approval-gated (`agent_action_proposals`,
  coordinator/admin); assignment/quiz authoring SHALL inherit slot `clo_weights` when created under
  a slot; a whole-course coverage matrix SHALL render.

## R21 — Discovery gate (8.13)

- FR-21.1 NO scoring-model build task (8.1 specifics) SHALL proceed before the Discovery-sprint
  contract (1 IB + 1 British multi-track school; MYP 0–8 best-fit, IGCSE AO weights, DP component
  weights, NC bands) is recorded in README and reviewed.
- FR-21.2 The percent-canonical + `raw_score` product decision SHALL be recorded in README and SHALL
  govern 8.1; raw semantics SHALL remain immutable and never be replaced by normalization.
