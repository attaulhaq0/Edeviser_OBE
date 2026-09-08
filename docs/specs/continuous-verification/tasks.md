# Tasks — Continuous Product Verification (work in phases; check off as done)

> Update `README.md` session record when a phase completes. Never edit `.kiro/`,
> `supabase/migrations/`, `src/types/database.ts`, `.env.local`.

## Phase 0 — Groundwork ✅ (2026-02 session)

- [x] QA manual extended: OBE/Habit/AI/auth/realtime suites (verification-ready)
- [x] Live DB audit: engines, triggers, data counts (OBE/quiz/marketplace/agent)
- [x] Seed accounts locked & live-verified: 73 seed (5 `@demo.com`, 68 Noor),
      1 real user
- [x] Seed email rename `noor-international.test` → `noor-international.edu`
      (auth.users + auth.identities.identity_data + profiles + institution allowlist + login_attempts + parent_student_links + 7 repo files; 0 residuals; logins OK)
- [x] Repo inventory: PostHog/Sentry/Playwright/CI assets mapped (README.md)

## Phase 1 — PostHog wiring (code) ✅

- [x] 1.1 `src/lib/seedAccounts.ts` — locked-domain classification (no user IDs)
- [x] 1.2 `analyticsConsent.ts` — add `account_type` + `environment` person props;
      enable autocapture, `capture_pageview: "history_change"`, session recording
      (`session_recording` with maskAllInputs + maskTextSelector "\*"), `defaults`
      preset `2026-05-30`, `person_profiles: "identified_only"`; consent gate kept.
      NOTE: the config key is `session_recording` in posthog-js 1.4xx (NOT
      `session_replay`); verified against live @posthog/types definitions.
- [x] 1.3 `.env.example` — document prod/qa token pattern (US host) + `VITE_ENV`, no secrets
- [x] 1.4 Validation: `seedAccounts.test.ts` (8 passing), tsc clean, eslint clean,
      quickLoginNoor + roleProfileScreens (10 passing). Full vitest = 2 pre-existing
      unrelated failures (phase2EdgeFunctionDeployment closure drift,
      studentPortfolio shimmer timeout) — not caused by this phase.

## Phase 2 — PostHog project setup (manual, guided by posthog-setup-guide.md)

- [ ] 2.1 Create org projects `edeviser-prod` + `edeviser-qa` (US host)
- [ ] 2.2 Set "filter internal and test users" = `account_type = seed` on both;
      bulk-apply to the 17 existing insights (API endpoint in guide)
- [ ] 2.3 Vercel env vars per environment (prod token → production; qa token →
      preview+development)
- [ ] 2.4 Accept cookies once in the live app → verify events in Live events
- [ ] 2.5 Enable session replay recording rules (100% in qa, sampled in prod)

## Phase 3 — Dashboards (script-provisioned)

- [ ] 3.1 `scripts/posthog-provision.mjs` — create dashboards/insights via API
      (needs POSTHOG_PERSONAL_API_KEY; definitions in design.md §Dashboards)
- [ ] 3.2 Investor dashboard (Users & Engagement)
- [ ] 3.3 Engine Health — OBE dashboard (incl. grade→XP pairing drift insight)
- [ ] 3.4 Engine Health — Habit/Gamification dashboard
- [ ] 3.5 QA & Broken Chains + AI/Agent health dashboard
- [x] 3.6 Add missing client events (login_succeeded/failed, marketplace_purchase_failed)
      in AuthProvider/usePurchase (wrappers, consent-gated); route_error_shown + others
      pending (next task)

## Phase 4 — Chain verification (staging only)

- [ ] 4.1 pgTAP invariant suites (obe/habit/xp-idempotency) into existing harness
- [ ] 4.2 Playwright chain specs: grade cascade, submit→queue, purchase atomicity,
      streak increment (using seeded personas)
- [ ] 4.3 Route×role matrix sweep (criticalRoutes.ts) nightly in
      `scheduled-health.yml`
- [ ] 4.4 `qa_run` event emitted per nightly run (PostHog qa project)

## Phase 5 — Drift & reporting

- [ ] 5.1 `promise-matrix.md` seeded from QA manual statuses; re-scored per run
- [ ] 5.2 Weekly verification pass + report (doc + dashboard screenshot)

## Phase 6 — Backend→Frontend coverage audit ✅ (2026-09-05 session)

- [x] 6.1 Full coverage map: 5 roles (student 41, parent 21, teacher 5,
      coordinator 4, admin 3 live), ~130 tables, 96 public secdef functions
      (104 incl. platform schemas — scope-reconciled), 63 Edge Functions,
      8 pg_cron jobs, 38 triggers, ~110 routes, 77→74 nav items
- [x] 6.2 P1 fixes: `/teacher/content` nav 404 (materials live in Modules →
      nav item removed + redirect route `/teacher/content` → `/teacher/modules`);
      Student social feature wired (friends route + nav + leaderboard Friends
      tab); admin pending-onboarding approvals surfaced
- [x] 6.3 Orphaned pages surfaced in nav: admin historical-evidence,
      graduate-attributes; coordinator trends
- [x] 6.4 Nav de-dup: admin `Institution Structure` removed (duplicate of
      Departments → same DepartmentManager)
- [x] 6.5 SECURITY: `mv_historical_evidence` anon/auth SELECT revoked
      (migration `20260905205552_lock_mv_historical_evidence_select`, applied
      live; owner-semantics MV bypassed RLS; ACL now `postgres,service_role`)
- [x] 6.6 Permanent guards: `navRouteParity.test.ts` (parses the real router
      tree, asserts every nav destination resolves + no duplicate nav entries —
      catches the 404-sidebar-link class), `studentFriendsPage.test.tsx` smoke,
      `mvHistoricalEvidence.rls.test.ts` (skip-safe preview suite: anon/student
      MV denial + fail-closed `get_historical_evidence` + worker-RPC denial)
- [x] 6.7 `.env.example` token leak reverted (real phc\_ token was pasted into
      the committed file); `POSTHOG_PERSONAL_API_KEY` stored in gitignored
      `.env` only
- [x] 6.8 P3 follow-ups — CLOSED (2026-09-05 second pass):
  - [x] link-orphans wired into nav: student `notification-preferences` +
        `sessions`; coordinator `sessions` + `cohort-comparison`; teacher
        `calendar` + `timetable` (navItems.ts + en/ar common.json keys; new
        icons CalendarClock/SlidersHorizontal; navRouteParity test green 21/21)
  - [x] dashboard "Friends online" rail (shipped in #323) + friends locale keys
        added to student.json en/ar
  - [x] uncertain-caller Edge Functions TRACED (final verdicts): - `resolve-mystery-reward`, `check-bonus-question` → WORKING (hooks +
        components exist) - `bulk-grade-export` → wired (`useBulkOperations`) - `generate-fee-receipt` → wired (`useFees`) - `generate-reflection-digest` → WIRED (new Vercel cron proxy
        `api/cron/reflection-digest.ts` + monthly cron `0 9 1 * *`; server-key
        auth guard added; feeds live-consumed `reflection_digests`) - `improvement-bonus-check` → SUPERSEDED by DB trigger
        `trg_improvement_bonus` on evidence INSERT (no pg_net/http to call the
        edge function); edge function hardened (idempotent evidence-id ref,
        server-side score, auth guard) as a server utility
- [x] 6.9 Friends demo data seeded LIVE: friendships now 27 accepted + 2 pending
      across Noor seed students (verified live 2026-09-05)
- [x] 6.10 XP integrity + gamification hardening (2026-09-05 session):
  - [x] Migration `20260905230639_widen_xp_transactions_source_check` (APPLIED
        LIVE): `improvement_bonus` + `league_promotion` + 12 other award-xp
        VALID_SOURCES were REJECTED by the live constraint (silent XP loss).
        Constraint now mirrors award-xp's authoritative allowlist.
  - [x] Migration `20260905231218_wire_improvement_bonus_award` (APPLIED LIVE):
        new SECURITY DEFINER fn `award_improvement_bonus_v1()` (search_path
        locked, EXECUTE postgres/service_role only) + `trg_improvement_bonus`
        AFTER INSERT ON evidence → 50 XP when evidence improves 15pp+, recompute
        xp_total/level via `calculate_level_from_xp`.
  - [x] `generate-reflection-digest` + `improvement-bonus-check` hardened with
        server-key/cron auth guards (previously anonymous-triggerable).
  - [x] `scripts/sync-advisor-baseline.mjs` added (ERROR-level keys only, so CI
        never suppresses new warnings).
  - [ ] **OPEN DECISION (product):** `xp_transactions` has NO unique constraint
        on `reference_id`; 77 duplicate reference_ids confirmed live → award-xp
        idempotency (23505) has never functioned; XP totals may be inflated.
        Recommended fix: dedupe keeping earliest row per (student_id,
        reference_id) + partial UNIQUE index — RUN ONLY AFTER APPROVAL (lowers
        affected users' XP).
  - [ ] Deferred: `connectivity-matrix.json` regeneration (audit stage is
        env-gated; needs `--env=local` per audit README) — plan a full
        `npm run audit` pass in CI.
- [ ] 5.3 (Deferred) Slack alerts · OpenTelemetry · mutation testing · k6 expansion

## Phase 7 — Institutional OBE value audit → remediation (2026-09-06 session)

> Source: deep product/OBE audit — live Supabase `cdlgtbvxlxjpcddjazzx` + local codebase at
> `ace2acc4`. Full evidence in README "Session record — 2026-09-06". Format: each finding = ONE
> senior ENGINEERING task (scope + acceptance) + ONE senior QA task (method + pass). A task may
> only be checked off when its acceptance criteria pass.

### 7.0 — Audit baseline (recorded; do not re-run)

- [x] Live + local evidence captured 2026-09-06: per-domain row counts, trigger/RPC/cron inventories,
      advisor findings, edge-function list, seed analysis, route/hook overview.

### F1 — Ghost/orphaned demo data; evidence provenance broken

- [ ] 7.1 SENIOR ENGINEERING FIX — Reconcile demo data + harden evidence provenance.
      Problem: `submissions`=552 reference 17 assignment UUIDs while `assignments`=0 live ⇒ the whole
      grade→evidence→attainment chain ran on ghost assignments; `evidence` rows point at non-existent
      FK targets; `supabase/seed.sql` cannot reproduce the live state.
      Fix: (a) re-parent or quarantine orphaned submission/grade/evidence rows against a restored demo
      assignment set; (b) `seed.sql` becomes deterministic — replay produces the exact demo contract
      (20 assignments / 4 courses / 50 students); (c) add a data guard (trigger or scheduled check)
      that blocks evidence writes whose assignment/submission does not exist.
      Acceptance: every `submissions.assignment_id` resolves; every `evidence.submission_id`
      `/grade_id` resolves to an insert-only row; `supabase db reset` replay matches expected counts;
      `npm run db:check-replay` green.
      (PROGRESS 2026-09-06: (a) restore APPLIED LIVE via MCP
      `20260906164527_restore_orphaned_assignments_evidence_provenance` — 17 ghost assignments
      restored with original UUIDs; course attribution recovered from evidence CLOs with
      enrollment fallback; verified **0 orphaned submissions / evidence rows**. (c) RESOLVED BY
      EVIDENCE: all 8 relevant FKs already exist and are convalidated=true — the structural guard
      exists; root cause of the ghosts was a superuser `session_replication_role=replica` bypass
      (documented, README session E). REMAINING: (b) deterministic seed replay + 7.1-QA preview
      replay/diff — owner/CI steps.)
- [ ] 7.1-QA SENIOR QA — Chain integrity after reconciliation.
      Method: replay in a throwaway Preview branch; diff live vs preview counts; full-outer-join orphan
      checks across submissions/grades/evidence; exercise one `on_grade_insert_or_update` cascade
      asserting evidence + outcome_attainment + xp_transactions + notifications all update; gradebook
      and learning-path pages render real data. Pass = 0 orphans, deterministic replay, consistent
      single cascade path.

### F2 — OBE core metadata empty; no real institutional tenant

- [ ] 7.2 SENIOR ENGINEERING FIX — Tenant bootstrap + readiness path.
      Problem: programs=4 / courses=4 / outcomes=22 / mappings=26 are the Noor seed tenant only;
      `graduate_attributes=0`, `competency_frameworks=0`; admin onboarding is a form, not a curriculum
      bootstrap; no second tenant has ever onboarded.
      Fix: single-command tenant bootstrap (institution → programs → courses → sections → ILO seed →
      staff invites) under RLS; tenant OBE "readiness" surface (% mapped CLOs, % assessed CLOs,
      evidence depth); RLS re-verified for every bootstrap step.
      Acceptance: new tenant creates the full hierarchy with correct `institution_id`; cross-tenant
      reads denied; readiness % correlates with mapped/assessed coverage.
- [ ] 7.2-QA SENIOR QA — Bootstrap E2E + tenant isolation.
      Method: onboard a second tenant via the admin flow; assert hierarchy + integrity; attempt
      cross-tenant SELECT with each role JWT (must deny); run the pgTAP RLS suite; confirm
      admin/coordinator/teacher dashboards populate for the new tenant only. Pass = full hierarchy,
      0 leaks, tenant-scoped dashboards.

### F3 — Assessment authoring empty; quiz evidence bypasses canonical rollup

- [ ] 7.3 SENIOR ENGINEERING FIX — First-class assessment path + coverage guard.
      Problem: `assignments=0`, `quizzes=0`, `quiz_questions=0`, `quiz_attempts=0`, `question_bank=2`.
      `generateQuizEvidence` writes evidence client-side reusing `submission_id`/`grade_id` = attempt
      UUID (FK misuse) and hand-rolls `outcome_attainment`, bypassing `trigger_attainment_rollup` —
      two different attainment engines exist.
      Fix: (a) route quiz attempts through the canonical rollup (first-class assessment-attempt
      evidence source with real FKs + trigger coverage); (b) authoring-time coverage guard: a course
      CLO with zero linked assessments warns/blocks unless a documented exemption exists; (c) restore
      demo assignments + quizzes in seed.
      Acceptance: ONE attainment path for all evidence; quiz-path numbers == assignment-path numbers;
      guard triggers at authoring; seed populates assignments + quizzes.
      (PROGRESS 2026-09-06: **(a)+(b)+(c) COMPLETE — (a) E2E-proven live.**
      (a) migrations `20260906165847_canonical_quiz_evidence_path` +
      `20260906170038_..._rpc_fix` (MCP, files committed): `submissions.quiz_attempt_id` +
      exactly-one-source CHECK + partial unique index; `trigger_attainment_rollup` quiz branch
      (assignment-path math preserved exactly; CLOs from `quiz_clos`→`clo_ids` fallback; no 15-XP
      on quiz branch — quiz XP stays client-side award-xp, no double award; quiz-scoped
      notification); `record_quiz_attempt_grade_v1` RPC (SECURITY DEFINER, pinned search_path,
      in-function authorization owner-or-staff-of-institution, service/admin bypass, idempotent,
      refuses practice). Client: `quizEvidence.ts` rewritten to `recordQuizAttemptGrade` (dead
      dual-engine deleted) + wired into `useSubmitQuizAttempt`. **Live E2E proof**: temp quiz +
      graded attempt → submission+grade(teacher-attributed)+3 evidence rows (PLO/ILO
      denormalized)+CLO/PLO attainment updated+quiz notification, **0 quiz-grade XP rows**,
      practice REFUSED; cleanup restored exact baseline (552/550/1650/0/0/2508/1626).
      (b) `get_course_assessment_coverage_v1` RPC (invoker-rights, RLS-scoped) + hook
      `useCourseAssessmentCoverage` + `AssessmentCoverageWarning` banner wired into BOTH
      authoring forms (AssignmentForm §CLO Linking, QuizForm after course select). **Live
      verification caught a real uncovered CLO on first run** ("Break down QA-CLO-01 — Analyze
      Evidence", 0 assessments) — resolved by the (c) fixtures; final coverage 13/13 covered.
      (c) seed.sql Section X (quiz per course + quiz_clos; attempts intentionally not seeded —
      evidence must come from the canonical path) AND the same fixtures applied live (4 quizzes,
      13 quiz_clos). Types regenerated twice (submissions shape + new RPC/FUNCTION).
      REMAINING: seed-replay verification (shared owner Docker step with 7.1(b)) + 7.3-QA
      preview assertions. NEW FOLLOW-UP: `trg_grade_released_notify` emits a duplicate grade
      notification alongside the rollup trigger's — dedupe under 7.3.)
      (PROGRESS 2026-09-06 **7.7 EXECUTED**: `get_unit_close_review_v1(course_id)` RPC (MCP 20260907113538) + `useUnitCloseReview` hook + `UnitCloseReviewPage` at `/coordinator/unit-close/:courseId`. Section × CLO attainment matrix with weakest-CLO ordering + coverage flags. Live: Mathematics 6 → 4 CLOs × 4 sections = 12 matrix entries, weakest at 75.2%. `n`n(PROGRESS 2026-09-06 **7.6 EXECUTED**: `get_coordinator_analytics_v1(program_id)` — one
      invoker-rights RPC returning the program-scoped payload; the three visualization hooks
      (gap analysis, coverage heatmap, sankey) now consume it via ONE shared queryKey; whole-table
      client reads ELIMINATED; classification still one-source in the shared libs. Live: Math
      program → 9 outcomes / 8 mappings / 426 evidence rows scoped (vs 1650 whole-table).)
- [ ] 7.3-QA SENIOR QA — Assessment chain parity + bypass regression.
      Method: author assignment → submit → grade → snapshot numbers; author quiz → attempt → assert
      identical evidence/attainment output; validate FK semantics on both paths; attempt to save an
      unassessed CLO and confirm the guard; extend `e2e/intelligence-chain-obe.spec.ts` with
      quiz→evidence→attainment. Pass = parity, guard enforced, no FK abuse, chain spec green.

### F4 — Closed-loop tables never written (states, interventions, CQI, accreditation)

- [ ] 7.4 SENIOR ENGINEERING FIX — Prime and formalize the closed loop.
      Problem: `student_learning_states=0`, `learning_interventions=0`, `intervention_measurements=0`,
      `proactive_agent_jobs=0`, `agent_action_proposals/executions=0`, `cqi_systemic_patterns=0`,
      `cqi_action_plans=0`, `cqi_action_plan_measurements=0`, accreditation reports=0 — the loop
      scaffolding exists (sync trigger, SKIP LOCKED claim/evaluate RPCs, cron jobs) but nothing
      populates it and `private.cron_secrets` is unset.
      Fix: (a) provision cron secrets; verify `intervention-jobs` (generate_candidates `5 * * * *`,
      evaluate_measurements `*/15 * * * *`)
      (PROGRESS 2026-09-06 **8.9 EXECUTED**: `classify_problem_cases_v1(course_id)` — deterministic problem-classification engine applied via MCP. Classifies CLOs into typed problem cases (student/teacher/assessment/prerequisite/curriculum-design) with confidence + cited evidence. Live: Mathematics 6 → 3 CLOs classified as student-signal (8 struggling students each, course avg 75.2%). Pure SQL — no AI.) and `agent-evaluation-jobs` (`20 * * * *`) actually fire;
      (b) materialize `student_learning_states` from canonical evidence via
      `sync_learning_state_measurements_v1` (version/freshness/hash invariants); (c) wire coordinator
      CQI: systemic pattern → AI draft (cited) → proposal → approval → plan → measurement; (d) surface
      the intervention lifecycle in teacher + coordinator UI.
      Acceptance: cron runs produce rows; learning-state invariants hold; one full intervention
      measurement transitions PENDING → IMPROVED/NO_MATERIAL_CHANGE/DECLINED with a deterministic
      delta; a CQI plan + measurement exist after one executed cycle.
      (PROGRESS 2026-09-06: **PRIMED — loop is live and self-running, one defect open.**
      (a) SECRETS PROVISIONED: `private.cron_secrets['cron_intervention_jobs']` generated in-DB +
      synced to edge `CRON_SECRET`; both crons verified firing (HTTP 200 via x-cron-secret; logs
      show hourly generation + `*/15` evaluation RPCs). Institution flags enabled for the 2 demo
      tenants (Demo University + Noor): `ai_proactive_enabled=true`, `ai_operational_autonomy=A2`
      (both were fail-closed defaults — root-caused the first `enqueued:0`). Gulf `.test` tenant
      left off. **(b) LEARNER STATES LIVE: 41/41** generated via `refresh_student_learning_state_v1`
      (mastery+habits populated, fresh_until, state_hash; 261 low-mastery risk signals emitted by
      the twin builder). **GENERATION VERIFIED: 38 + 40 autonomous jobs queued**
      (`proactive_agent_jobs`, specialist=intervention, recipient=teacher, 5 at-risk students →
      4 teachers — noise suppression working; second hourly cron fire enqueued autonomously).
      Evaluation path verified clean (claimed 0 — no executed interventions yet; honest zeros).
      **OPEN DEFECT:** worker claims jobs but the orchestrator run for the `intervention`
      specialist fails pre-LLM (`agent_runs.status=failed`, classification `proactive_job_failed`,
      ~3.8s latency, empty usage; bounded retry contains it — 10 in retry, dead-letter after 3;
      no infinite loop). Needs a dedicated debugging pass (local edge-runtime repro / deeper log
      access) — NOT masked. Also found: worker flag-gated (`AI_PROACTIVE_AGENTS_ENABLED` now true;
      `AI_FEATURE_ENABLED` was already true, `AI_DAILY_BUDGET_USD=1`); `agent-evaluation-jobs`
      cron remains flag-off (separate gate, intentionally untouched). (c)(d) CQI wiring + UI
      surfaces remain.)
- [ ] 7.4-QA SENIOR QA — Closed-loop end-to-end proof.
      Method: on a populated Preview tenant invoke `intervention-jobs` manually (x-cron-secret);
      assert `learning_interventions` + `proactive_agent_jobs` rows; walk nudge → window close →
      `claim_due_intervention_measurements_v1` → `complete_intervention_evaluation_v1`; run coordinator
      CQI draft → approve → plan → measure; repeat identical input and assert the same delta
      (determinism). Pass = every loop stage writes rows with correct state transitions.

### F5 — At-risk prediction pipeline dead

- [ ] 7.5 SENIOR ENGINEERING FIX — Make at-risk signals/predictions persist.
      Problem: compute-at-risk-signals + ai-at-risk-prediction are scheduled nightly but
      `ai_feedback=0` for `suggestion_type='at_risk_prediction'` and no signal rows were written;
      cron wiring unverified; teacher UI depends on rows that never appear.
      Fix: verify schedule → persistence; correct trigger conditions (probability ≥50%, ≥7 days
      before due); write predictions through a server path that supports teacher approval +
      `validated_outcome`; add a deterministic gate (script or pgTAP) asserting signal rows exist for
      any populated tenant.
      Acceptance: nightly run produces `at_risk_signals` rows + `ai_feedback` predictions for the
      seeded at-risk cohort; teacher dashboard surfaces them; validation loop records
      `validated_outcome`.
- [ ] 7.5-QA SENIOR QA — Prediction quality + surfacing.
      Method: manually invoke both functions on the seeded cohort; assert rows + threshold logic
      (only ≥50% persisted); validate one prediction correct/incorrect and assert the recorded
      outcome; verify teacher UI shows the prediction with contributing evidence. Pass = rows,
      thresholds, validation, UI all verified.

### F6 — Analytics computed client-side over full tables

- [ ] 7.6 SENIOR ENGINEERING FIX — Scoped server analytics RPCs.
      Problem: `useGapAnalysis`/`useCoverageHeatmap`/`useSankeyData` fetch ALL outcomes/mappings/
      evidence and compute in-browser; `gapAnalysis.ts` recommendations are hardcoded strings;
      all-table reads are a performance + RLS-consistency risk at institutional scale.
      Fix: program/semester-scoped read RPCs (RLS-enforced) returning gap/coverage/sankey payloads;
      deterministic classification lives in ONE source (SQL or a shared lib the RPC calls); client
      becomes pure presentation.
      Acceptance: RPC output == current client math on fixtures; payload scoped (never all-table);
      out-of-scope program denied by RLS; <200ms on a synthetic multi-institution load.
- [ ] 7.6-QA SENIOR QA — Parity + scope + performance.
      Method: property-test RPC vs client math over generated fixtures (fast-check); RLS deny-matrix
      on the scoped RPCs; load-test with a synthetic tenant; assert coordinator gap/heatmap/sankey
      pages consume only RPCs (no raw-table fetches). Pass = parity, scope, perf, no regressions.

### F7 — Coordinator "moment of value" journey missing

- [ ] 7.7 SENIOR ENGINEERING FIX — Compose post-unit attainment review journey.
      Problem: gap analysis, coverage heatmap, cohort comparison, trends and CQI exist as separate
      pages but the core scenario — "after a unit assessment, see CLO-3 under-attained across 4
      sections → the items measuring it → the affected classes → draft + approve an intervention →
      track it" — is not a single flow.
      Fix: compose one "Unit Close" journey (routing + shared hook layer, minimal new code) binding
      the existing components/hooks: attainment matrix (CLO × section) → weakest CLO drill →
      assessment items → affected classes/teachers → AI-drafted intervention (cited, fail-closed) →
      approval → `learning_interventions` record.
      Acceptance: with a seeded 4-section unit, the flow reaches intervention creation in ≤5 clicks
      from the review screen; every hop renders evidence-sourced data only.
- [ ] 7.7-QA SENIOR QA — Journey E2E + evidence integrity.
      Method: seed a 4-section unit with one deliberately weak CLO; walk the exact scenario; assert
      each screen uses real data; the AI draft cites only authorized evidence; the write is
      approval-gated and lands in `learning_interventions`. Pass = scenario completes, citation set ⊆
      authorized evidence.

### F8 — Curriculum ingestion / CLO authoring assistant missing

- [ ] 7.8 SENIOR ENGINEERING FIX — Syllabus → outcomes ingestion with human approval.
      Problem: adopting a real curriculum means hand-typing every CLO/PLO/ILO and mapping them — the
      #1 adoption blocker; no ingestion, extraction, quality-check or auto-mapping exists.
      Fix: `curriculum-ingest` edge function (upload/paste syllabus → chunk → DeepSeek extraction of
      topics, candidate CLOs with Bloom verbs, tentative PLO/ILO mappings) → DRY-RUN proposals in
      `agent_action_proposals` → human approval → writes through the existing validated
      outcome/mapping constraints; in-form CLO suggestions in `CLOForm`. Fail-closed: zero writes
      before approval.
      Acceptance: Grade-7-Maths fixture → ≥90% valid candidate CLOs (Bloom-valid, measurable verbs);
      0 writes pre-approval; approved proposals pass hierarchy + weight-sum validation.
- [ ] 7.8-QA SENIOR QA — Ingestion QA + audit trail.
      Method: run ingestion on 3 fixtures (Maths, Science, mixed AR/EN); assert candidate quality,
      bilingual titles, no PII leakage; approve one proposal and verify `agent_action_proposals` +
      `agent_action_executions` audit row + resulting mapping direction/weights; Security Advisor
      delta. Pass = valid gated proposals, full audit trail, no security regressions.

### F9 — IB/MYP & national-curriculum presets missing

- [ ] 7.9 SENIOR ENGINEERING FIX — Framework/criteria presets + moderation reporting.
      Problem: the outcome model is generic CLO/sub-CLO only; no MYP criteria A–D (0–8, /32→1–7), no
      moderation batches, no IGCSE/MoEHE national learner-attribute presets — an IB or
      Ministry-aligned school cannot adopt without rebuilding its vocabulary by hand.
      Fix: additive preset layer over existing outcome/rubric entities: (a) outcome + rubric
      templates per framework (MYP A–D incl. criterion-related "mark ≈ snapshot / grade ≈ album"
      semantics, IGCSE subject components, MoEHE National Curriculum learner attributes); (b) 0–8
      rubric band presets; (c) moderation-ready per-class criterion distribution report.
      Acceptance: MYP-typed course with 4 criteria; per-task 0–8 marking rolls into criterion
      attainment + deterministic 1–7 grade conversion; class moderation table renders; AR/EN labels
      provided.
- [ ] 7.9-QA SENIOR QA — Criteria math + rendering verification.
      Method: fixture MYP course with tasks marked per criterion; assert 0–32→1–7 boundaries incl.
      borderline cases; per-class distribution report; teacher/coordinator RLS limits still enforced;
      AR/RTL screenshots. Pass = correct conversions, no RLS regression.

### F10 — Live/local drift & deploy hygiene

- [ ] 7.10 SENIOR ENGINEERING FIX — Reconcile local ↔ live ↔ deployed.
      Problem: working tree carries uncommitted migrations (`20260905230639`, `20260905231218`) +
      edited edge functions + 2 new scripts; deployed functions show mixed build paths
      (`C:\app\...`, `C:\Edeviser-Kiro\...`), implying manual + CI deploys; local can lag GitHub
      main/live.
      Fix: run the sanctioned sequence — local Docker replay → feature branch → PR → Git-linked
      Preview → verify `FUNCTIONS_DEPLOYED` + migrations → merge → read-only Production
      verification; confirm the two migrations exact-apply; regenerate `src/types/database.ts` from
      the live schema if drift exists.
      Acceptance: clean tree on main; `npm run db:check-replay` + `db:check-dup-names` green;
      information_schema diff (live vs files) = 0; deployments tracked to reviewed SHAs.
- [ ] 7.10-QA SENIOR QA — Replay + deploy attestation.
      Method: throwaway Preview branch replay (migrations applied, `FUNCTIONS_DEPLOYED` verified for
      the exact head); diff live schema artifacts vs migration files; verify deployed function
      versions + verify_jwt match the manifest; re-run Security Advisor for a new baseline. Pass =
      exact closure deployed, no uncommitted drift, advisor baseline recorded.

### F11 — Security advisor INFO/WARN triage + access-surface review

- [ ] 7.11 SENIOR ENGINEERING FIX — Triage no-policy tables, search_path, secdef surface.
      Problem: 12 `rls_enabled_no_policy` INFO — agent tables are intentionally fail-closed, but
      `admin_bootstrap_requests`, `email_deliveries`, `email_delivery_events`, `proactive_agent_jobs`
      have NO policies; 2 mutable `search_path` WARNs; a large authenticated-exposed SECURITY DEFINER
      surface (high blast radius if one body regresses).
      Fix: (a) document a fail-closed allowlist for intentional denials; add policies or full REVOKE
      for the four exposed tables; (b) lock `search_path` on `validate_grade_scale_partition` and
      peers; (c) review every authenticated-exposed secdef function; narrow roles or use SECURITY
      INVOKER where feasible.
      Acceptance: advisor returns no unexpected INFO/WARN; every no-policy table is
      allowlisted-documented or policy-covered; secdef review recorded in the session record.
- [ ] 7.11-QA SENIOR QA — Advisor re-baseline + deny-side matrix.
      Method: re-run Security Advisor; pgTAP deny-matrix for the newly-policied tables; probe the
      four exposed tables as anon + authenticated (must deny unless documented-intended); assert 0
      high/critical. Pass = baselined advisor, deny-side green, findings recorded.

### F12 — Student learning experience disconnected from OBE engine

- [ ] 7.12 SENIOR ENGINEERING FIX — Student surfaces consume real outcome evidence.
      Problem: student OBE surfaces (CLO progress, learning path, mastery recovery, transcript)
      render with no data because no live grades feed attainment; the engagement layer
      (XP/habits/planner) is the only data-rich domain; planner study sessions carry `clo_ids` but
      never feed OBE context.
      Fix: (a) after an F4-primed tenant exists, verify student mastery/learning-path surfaces
      consume populated `outcome_attainment`; (b) planner/tutor context join: study-session
      `clo_ids` → tutor RAG context + mastery preview; (c) record the product decision — does habit
      evidence feed OBE (practice evidence) or stay a separate signal.
      Acceptance: after a graded assignment the student sees an updated mastery ring + next-step
      recommendation; tutor context includes the targeted CLO; planner sessions with `clo_ids`
      influence tutor context.
- [ ] 7.12-QA SENIOR QA — Student value trace.
      Method: E2E — enroll → graded assignment → assert CLO progress updates, learning-path
      prerequisite unlocks behave, mastery recovery proposes a pathway for a failed CLO; open the
      tutor and assert the message cites the CLO's materials; capture AR/RTL screenshots. Pass =
      mastery visible, path logical, tutor context correct, bilingual rendering verified.

## Phase 8 — Educational Decision Intelligence + Adaptive Market Readiness (2026-09-06 session B)

> Source: 2026-09-06 institutional audit (OBE reality check + ideal closed-loop flow), Qatar
> market research (IB 21 schools · British/IGCSE · American/AP · MoEHE national curriculum +
> private-school systems guide), and Phase 7 evidence. Live facts re-verified against
> `cdlgtbvxlxjpcddjazzx`. Format identical to Phase 7: capability map + senior ENGINEERING task +
> senior QA task per capability. The **Decision Intelligence map** lives in
> `decision-intelligence-map.md` (canonical `.kiro/`, mirror `docs/specs/`).

### 8.0 — Decision Intelligence capability map (recorded; living record)

> Full detail: `decision-intelligence-map.md`. Compact summary of the 8 decision questions:

| Q                     | Works today (evidence)                                    | Level                    | Missing                       | Ideal fix / task |
| --------------------- | --------------------------------------------------------- | ------------------------ | ----------------------------- | ---------------- |
| Q1 What fails?        | rollup trigger + gap/heatmap/trends (client-side, 0 rows) | L2 math / L0 operational | live data; section×CLO view   | 7.4 · 7.6 · 7.7  |
| Q2 Why?               | systemic-gap contracts (code, 0 rows)                     | L3 arch / L0             | root-cause taxonomy           | 8.9              |
| Q3 Who affected?      | cohort/section/at-risk arch                               | L2 arch / L0             | scoping on real data          | 7.7 · 8.9        |
| Q4 What intervention? | AI-drafted CQI + intervention machinery (0 rows)          | L3 arch / L0             | cited drafts; approval flow   | 7.4 · 8.9        |
| Q5 Who performs?      | CQI responsible_person text                               | L1                       | role routing                  | 8.9              |
| Q6 Did it work?       | measurement contracts (0 rows, no UI)                     | L4 arch / L0             | priming; results UI           | 7.4 · 8.10       |
| Q7 Change curriculum? | CQI model + generators (0 rows)                           | L4 arch / L0             | evidence-tied recommendations | 7.4 · 8.10       |
| Q8 Problem class?     | NONE                                                      | **MISSING**              | taxonomy + classifier         | 8.9              |

### Wave A — Adaptivity foundation (unblocks ALL market segments; no curriculum-specific code)

- [ ] 8.1 SENIOR ENGINEERING FIX — Scoring-model abstraction + per-course framework framing.
      Problem (live-verified): `evidence.score_percent` / `grades.score_percent` NOT NULL
      percent-only; attainment = avg-of-% with 85/70/50; ONE `grade_scales` + ONE
      `attainment_thresholds` per institution (`institution_settings` UNIQUE); `accreditation_body`
      CHECK = higher-ed only (`HEC,QQA,ABET,NCAAA,AACSB,Generic`) — cannot express MYP A–D 0–8,
      IGCSE A\*–G/9–1, AP 1–5, DP 1–7, NC bands, nor record IB/CIS/BSO/QNSA/NEASC accreditors.
      Fix (forward-only): `courses` += `framework_id`, `curriculum_code` (e.g. `0580`, `MYP-SCI-7`),
      `key_stage`, `assessment_model` (`percent|criterion|band_grade|component`), `grade_scale_id`
      (nullable → inherit institution); per-course grade scales; `evidence` += `raw_score jsonb`
      (criterion levels / rubric selections / band) while `score_percent` stays canonical
      normalized; relax `accreditation_body` CHECK → `text[]` (keep old values); attainment trigger
      branches on `assessment_model` with the percent path byte-identical.
      Acceptance: percent flows regression-proof (fixture parity); MYP criterion course produces
      criterion attainment without % conversion; old tenants migrate cleanly; `db:check-replay` +
      `db:check-dup-names` green.
- [ ] 8.1-QA SENIOR QA — Parity + migration + RLS matrix.
      Method: property-test percent path vs pre-change fixtures (fast-check); criterion-math unit
      suite (0–8, best-fit, /32→1–7 boundaries); Preview migration replay + live-schema diff = 0;
      pgTAP RLS deny-matrix unchanged. Pass = parity, clean migration, 0 RLS regressions.

- [ ] 8.2 SENIOR ENGINEERING FIX — Framework packs as data + seed MYP/IGCSE/MoEHE packs.
      Problem: `competency_frameworks`/`competency_items` tree exists (parent_id/level/sort) but
      0 rows + no management UI; every school re-types outcomes (adoption blocker #1).
      Fix: seed packs into the tree — MYP 8 subject groups × 4 criteria (0–8) + Learner Profile /
      ATLs / global contexts; Cambridge IGCSE core syllabi (content → objectives → assessment
      objectives); MoEHE National Curriculum learner attributes + Arabic/Islamic/Qatar-History
      strands; weight-validated `competency_outcome_mappings`; admin pack-management UI;
      AI-assisted syllabus import reuses the curriculum-ingest proposal path (7.8).
      Acceptance: coordinator creates MYP Science 7, IGCSE Maths 0580, and an MoEHE-attribute course
      in ≤15 min each from packs; AR/EN titles; `i18n:check` green; RLS intact.
- [ ] 8.2-QA SENIOR QA — Pack integrity + i18n + governance.
      Method: pack-tree invariants (level/sort/parent), weight-sum validation preserved; AR/EN
      parity; approval-gated writes via `agent_action_proposals`; pack-created course smoke through
      teacher + coordinator UI. Pass = valid packs, bilingual, approval-trailed.

### Wave B — Segment pilots (prove "adaptive, not few-school")

- [ ] 8.3 SENIOR ENGINEERING FIX — IB MYP criterion engine + moderation.
      Problem: MYP is criterion-related (A–D × 0–8, total /32 → 1–7; "mark ≈ snapshot / grade ≈
      album"; internal moderation + eAssessment); generic CLO/% model cannot represent it.
      Fix: `criterion` assessment_model end-to-end on 8.1/8.2: per-criterion marking 0–8 →
      criterion attainment (best-fit per IB rules) → deterministic 1–7 via versioned boundary
      table; per-class criterion distribution report + moderation batch (sampled work links +
      inter-teacher consistency view).
      Acceptance: MYP-typed course; a task marked 0–8 rolls into criterion attainment + 1–7 grade;
      moderation table renders; AR/RTL.
- [ ] 8.3-QA SENIOR QA — MYP math + moderation E2E.
      Method: fixture MYP Science 7 with tasks per criterion; borderline 0–32→1–7 cases; per-class
      distribution; moderation batch; teacher/coordinator RLS; AR/RTL screenshots. Pass = correct
      conversions, functional moderation, no RLS regression.

- [ ] 8.4 SENIOR ENGINEERING FIX — IGCSE/A-Level band engine + syllabus import.
      Problem: British/IGCSE schools (Doha British, Compass, QIS) run NC KS1–3 + IGCSE A*–G/9–1 +
      AS/A-Level with weighted assessment objectives + coursework & moderation; % model can't map.
      Fix: `band_grade` + `component` models on 8.1: versioned boundary tables (A*–G / 9–1) per
      syllabus; weighted assessment-objective attainment; coursework + moderation evidence
      semantics.
      Acceptance: IGCSE Maths 0580 course; AO-weighted attainment; coursework batch + moderation;
      boundary edge cases correct.
- [ ] 8.4-QA SENIOR QA — IGCSE parity + AO coverage.
      Method: syllabus-intake accuracy ≥90% (0580 fixture); boundary-table edge cases; AO-coverage
      report; teacher/coordinator RLS; engine consumed via scoped RPCs (7.6). Pass = intake,
      boundaries, coverage, no regressions.

- [ ] 8.5 SENIOR ENGINEERING FIX — MoEHE NC / compulsory-subject evidence pack.
      Problem: Arabic + Islamic Education are compulsory for all private schools; Qatar History is
      national-standard; QNSA self-study requires outcome evidence; no national-pack content or
      bilingual attainment reporting exists.
      Fix: MoEHE learner-attributes pack (8.2) + Arabic/Islamic/Qatar-History strands;
      dual-language (AR/EN) attainment reports + QNSA self-study evidence export (outcome →
      evidence citations); AR-first UI for these courses.
      Acceptance: AR course titles/outcomes; bilingual attainment + evidence-cited export sample;
      QNSA-style self-study pack generated from live grades.
- [ ] 8.5-QA SENIOR QA — Bilingual evidence E2E.
      Method: AR course → graded → bilingual attainment report + export; RTL rendering; `i18n:check`;
      no PII in export; evidence citations ⊆ graded evidence. Pass = bilingual, cited, RTL-safe.

- [ ] 8.6 SENIOR ENGINEERING FIX — Multi-track school pilot config (Doha-British-like).
      Problem: Doha British runs NC KS3 + IGCSE + AS/A-Level + BTEC + IB DP under ONE institution;
      a single grade/attainment config per institution cannot represent coexisting models.
      Fix: per-course `assessment_model` + `grade_scale_id` (8.1) proven across 5 tracks in one
      tenant; cross-track reporting that never mixes models; per-track admin + coordinator views.
      Acceptance: 5-track tenant; per-track attainment correct; cross-track report labels models;
      no % contamination between models.
- [ ] 8.6-QA SENIOR QA — Multi-track isolation + rollups.
      Method: seed the 5-track tenant; grade one assessment per model; assert track-scoped
      attainment + reports; RLS per track; regression suite. Pass = isolation, correct rollups.

### Wave C — Accreditation + go-to-market enablers

- [ ] 8.7 SENIOR ENGINEERING FIX — Per-regime accreditation evidence packs.
      Problem: accreditation generators exist but emit percent-only ILO/PLO/CLO tables; QNSA/BSO/
      CIS/IB-eval regimes need criterion/band/moderation + bilingual evidence.
      Fix: regime-aware evidence-pack builder (QNSA self-study export; BSO/CIS evidence matrices;
      IB authorization/evaluation evidence; evidence-cited attainment tables + moderation trails)
      over the engine's canonical evidence; generator runs audit-trailed.
      Acceptance: 3 regime exports from one populated tenant; evidence citations resolve; AR/EN;
      generator logs in `accreditation_report_jobs`.
- [ ] 8.7-QA SENIOR QA — Evidence-pack accuracy.
      Method: fixture tenant → generate per-regime packs; sample-verify citations vs evidence;
      Security Advisor re-baseline; generator security review. Pass = accurate, cited, secure.

- [ ] 8.8 SENIOR ENGINEERING FIX — Discovery/Pilot program tooling.
      Problem: onboarding a school = typing programs/courses/outcomes; no guided pilot path from a
      school's real documents (incl. AR).
      Fix: pilot onboarding flow: upload real syllabus docs → curriculum-ingest (7.8) → framework
      pack (8.2) → tenant bootstrap (7.2) → "time-to-first-attainment" metric; AR/EN supported;
      multi-tenant RLS verified.
      Acceptance: 1 IB + 1 British fictional tenant onboarded end-to-end; measurable
      time-to-first-attainment; RLS isolation on both.
- [ ] 8.8-QA SENIOR QA — Pilot E2E dry-run.
      Method: drive both pilot tenants through the flow; assert hierarchy, integrity, isolation,
      UX milestones; screenshots AR/EN. Pass = end-to-end, isolated, measurable.

### Wave D — Educational Decision Intelligence (the "answers questions" engine)

- [ ] 8.9 SENIOR ENGINEERING FIX — Problem taxonomy + decision-intelligence engine.
      Problem: the platform cannot answer the decision stack — Why is it failing? Who is affected?
      What intervention? Who performs it? Did it work? Change curriculum? — nor classify the failure
      as student / teacher / assessment / prerequisite / curriculum-design problem. Gap-analysis
      recommendations are hardcoded strings (`src/lib/gapAnalysis.ts`); no root-cause model exists.
      Fix: deterministic problem-classification layer over canonical evidence — student-signal
      (attainment, engagement, attendance), teacher/section-signal (cross-section variance),
      assessment-signal (item discrimination from quiz-analytics + rubric returns),
      prerequisite-signal (sub-CLO chain), curriculum-design-signal (whole-cohort outcome
      performance); outputs typed "problem cases" with confidence + cited evidence; AI (DeepSeek)
      explains ONLY from authorized evidence; feeds Unit-Close (7.7), intervention drafts, and
      ownership routing (teacher / coordinator / student-support).
      Acceptance: 5 problem classes classified on seeded fixtures with correct dominant cause;
      evidence citations ⊆ authorized set; 0 hallucinated causes.
      (PROGRESS 2026-09-07 **8.9 UI EXECUTED**: `useProblemClassification` hook +
      `DecisionIntelligenceSection` on the Unit-Close page (`/coordinator/unit-close/:courseId`) —
      renders typed problem cases with dominant cause, confidence, cited evidence sources and
      struggling-student counts; distinct no-data vs no-cases states; en/ar localized
      (`coordinator.unitClose.*`); 4 unit tests passing. Remaining for 8.9 closure: AI explanation
      from authorized evidence (DeepSeek, citation-fail-closed) + ownership routing + full 8.9-QA
      decision-stack suite.)
      (PROGRESS 2026-09-07 **8.9 Q5 OWNERSHIP ROUTING EXECUTED**: `classify_problem_cases_v1` now
      emits `recommended_owner` per case, derived deterministically from the DOMINANT cause —
      student-signal → `student_support`, teacher-signal → `coordinator`, assessment-signal →
      `teacher`, prerequisite-signal → `teacher`, curriculum-design-signal → `coordinator`.
      Applied via MCP as `problem_case_ownership_routing` + forward fix
      `fix_problem_case_section_spread_alias` (the applied 20260907153402 body carried a latent
      `en.section_id` alias bug — 42P01 on every call — now corrected; live-verified:
      bug absent, fix + routing present). Unit-Close UI renders the localized owner badge;
      en/ar owner labels added. Live: English Language Arts 7 → 3 cases, student-signal →
      student_support. Remaining for 8.9 closure: AI explanation from authorized evidence +
      full 8.9-QA decision-stack suite.)
      (PROGRESS 2026-09-07 **8.9-QA DECISION-STACK SUITE EXECUTED (Q1–Q8)**:
      `src/lib/problemCaseActions.ts` — deterministic, CITED intervention-draft builder (Q4):
      citations are the case's own evidence array (never recomputed), `approval_required: true`
      at type level; routing mirror (Q5); curriculum-change flag for curriculum-design cause
      (Q7); total 5-class taxonomy with fail-safe fallback (Q8). Unit-Close UI: "Draft
      intervention" dialog renders the deterministic plan (headline/actions/citations/approval
      note) — no AI, no writes from this surface. Tests: `decisionStackContract.test.ts` (Q2/Q3/
      Q5/Q6/Q7 SQL contracts — classifier thresholds, section scoping, routing CASE map,
      ±5pp measurement thresholds, CQI reopen/resolved feedback), `problemCaseActions.test.ts`,
      `problemCaseActions.property.test.ts` (3 properties × 100 runs), dialog UI test.
      Remaining: AI explanation (DeepSeek, citation-fail-closed) + owner → approval-inbox
      write path (7.7 step / deploy-gated).)
      (PROGRESS 2026-09-07 **8.9 AI EXPLANATION EXECUTED (code + tests; deploy pending)**:
      `explain_problem_case` channel added to agent-orchestrator — client sends identifiers
      ONLY; the evidence packet is derived SERVER-SIDE from `classify_problem_cases_v1`,
      institution-scoped via program → programs.institution_id (courses has NO institution_id —
      caught by the edge-fn schema guard), teacher course-ownership enforced; packet framed
      UNTRUSTED_EVIDENCE_PACKET (OWASP LLM01 check 37); run audited in agent_runs
      (running → completed/failed); provider failures fail closed (503). Client:
      `useProblemCaseExplanation` mutation hook (untrusted-response guards) + AI explanation
      affordance inside the Unit-Close draft dialog (feature-gated). Tests:
      `orchestratorExplanationContract.test.ts` (8 security invariants),
      `useProblemCaseExplanation.test.tsx`, UI test. DEPLOY PENDING: agent-orchestrator must be
      redeployed through the runtime governance gate (owner action — MERGE ≠ DEPLOYMENT).
      Remaining for 8.9: owner → agent-proposal → approval → learning_interventions write
      path (new execution RPC + write-tool registry) + fixture confusion matrix.)
- [ ] 8.9-QA SENIOR QA — Decision-stack test suite (ONE test per decision question).
      Q1 what-is-failing: fixture weak CLO → flagged with evidence. Q2 why: single-cause fixture →
      correct classification. Q3 who-affected: section/demographic scoping correct. Q4 what-
      intervention: cited draft + approval gate. Q5 who-performs: ownership routing correct.
      Q6 did-it-work: deterministic delta from `intervention_measurements`. Q7 change-curriculum:
      CQI recommendation tied to evidence. Q8 problem-class: confusion matrix over the 5 classes
      (fixture-dominant-cause accuracy ≥90%). Pass = every decision question has a deterministic
      test with a passing fixture.

### Wave E — Ideal Edeviser OBE flow (closed loop; build + prove)

- [ ] 8.10 SENIOR ENGINEERING FIX — Ideal-flow closed-loop orchestration.
      Problem: PLAN/TEACH/ASSESS/MEASURE/DIAGNOSE/INTERVENE/VERIFY/IMPROVE exists only as unprimed
      scaffolding (empty tables, stage-wise); per audit only MEASURE is real code and only
      attendance/XP run on live data.
      Fix: wire the loop as one orchestrated evidence-carrying flow — PLAN (7.8 ingestion + 8.2
      packs) → TEACH (outcome-linked modules + session intents) → ASSESS (coverage-guarded authoring
      7.3 + blueprints) → MEASURE (attainment trigger, existing) → DIAGNOSE (8.9 + systemic
      patterns 7.4) → INTERVENE (cited draft → approval → `learning_interventions`) → VERIFY
      (`intervention_measurements` cron) → IMPROVE (CQI plan → measurement → course-file
      carry-forward); loop-health surface (rows per stage; stage-age).
      Acceptance: a seeded 4-section unit completes one full loop; each stage writes its canonical
      tables; stage-age < 7 days; loop-health dashboard renders real rows.
- [ ] 8.10-QA SENIOR QA — Closed-loop E2E per stage (test each).
      Method: replay the audit's Grade-7 "Algebra: Linear Equations" walkthrough — ingest → plan →
      teach → assess → measure → diagnose → intervene → verify → improve; assert each stage against
      its tables; determinism (same input → same delta); loop-health reflects real state; AR/EN.
      Pass = full loop with every stage verified and idempotent.

### Wave F — Ideal-flow missing stages: TEACH + ASSESS (fixes the OBE Reality Check gaps)

> Context & research (read before implementing — prevents hallucination): the audit's OBE Reality
> Check classified "Lessons/activities linked to outcomes" and "Assessment blueprint (coverage
> check auto-flagged)" as **MISSING**. Live-verified: `course_modules` carries only
> (id/course_id/title/description/sort_order/is_published); `class_sessions` carries only
> (section_id/session_date/session_type/topic) — there is NO lesson/activity entity and NO
> outcome link anywhere in TEACH; `session_intents` (session_id/student_id/concept/
> success_criterion) is student-side intent, not curriculum structure; there is NO
> `assessment_blueprints` table (7.3 is an authoring-time single-CLO guard, not a whole-course
> blueprint). 8.10 (Wave E) referenced TEACH/ASSESS but had no build tasks — Wave F builds them.
> Cross-refs: `decision-intelligence-map.md`, README session records 2026-09-06 (A)/(B),
> `docs/qa/EDEVISER-QA-SYSTEM-VERIFICATION-MANUAL.md` OBE flow, tasks 7.1/7.3/7.4/7.7/7.8/8.1/8.2.

- [ ] 8.11 SENIOR ENGINEERING FIX — Outcome-linked lessons & activities (TEACH stage).
      Problem: the ideal flow's TEACH stage ("outcome-linked units → lessons → activities") does
      not exist — no lesson/activity entity, `class_sessions` carry no outcomes, teacher planner
      and student learning path have no unit structure to consume, and 8.10 assumed TEACH was
      buildable without a task.
      Fix (forward-only, additive): `course_modules` += `clo_ids jsonb` + completion columns; new
      `lessons` (module_id FK, title/title_ar, description/description_ar, clo_ids jsonb,
      sub_clo_ids jsonb, sort_order, is_published, created_at) and `lesson_activities`
      (lesson_id FK, type [video|text|practice|discussion|assessment], title, clo_ids jsonb,
      duration_minutes, sort_order) — both RLS-enabled like sibling tables; `class_sessions` +=
      `lesson_id` (nullable FK) + `outcome_ids jsonb`; micro-assessment schedule references
      lessons; `course_materials` may link to module/lesson (existing embeddings untouched);
      teacher unit→lesson→activity builder UI; planner + learning path consume the structure.
      Acceptance: teacher builds an "Algebra: Linear Equations" unit with ≥3 lessons + activities
      linked to 3 CLOs in ≤10 min; a `class_sessions` row records lesson + outcomes; teacher
      planner + student learning path render the structure; AR/EN labels; RLS denies cross-course;
      `npm run db:check-replay` + `db:check-dup-names` green.
- [ ] 8.11-QA SENIOR QA — TEACH stage E2E + linking integrity.
      Method: seed the Algebra unit with lessons/activities linked to 3 CLOs; assert persistence +
      FK integrity; walk teacher planner → student learning path; assert a session-intent record
      references the lesson; AR/RTL screenshots; pgTAP RLS deny (teacher sees only own course).
      Pass = unit linked end-to-end, integrity + RLS green, bilingual rendering verified.
- [ ] 8.12 SENIOR ENGINEERING FIX — Assessment blueprint + coverage flags (ASSESS stage).
      Problem: the ideal flow's ASSESS stage ("blueprint: course→outcome→assessment slot coverage
      check auto-flagged over/under-assessed; AI question generation aligned to CLOs") does not
      exist — no blueprint entity; assignments/quizzes form ad hoc; 7.3 guards authoring-time
      single-CLO only; nothing produces a whole-course coverage matrix.
      Fix (forward-only, additive): new `assessment_blueprints` (course_id FK, framework_id,
      semester_id, assessment_model, status, approved_by/at, created_at) + `assessment_blueprint_slots`
      (blueprint_id FK, unit_id FK → course_modules, assessment_type, weight, clo_ids jsonb,
      due_window, flags jsonb) — RLS-enabled; blueprint builder computes the course coverage matrix
      and auto-flags `under_assessed` (CLO with <N weighted slots), `over_assessed` (slot weight
      above threshold), `unassessed`; AI-assisted blueprint draft from authorized course data →
      `agent_action_proposals` → coordinator/admin approval → writes blueprint; assignment/quiz
      authoring (7.3) under a slot inherits the slot's `clo_weights`.
      Acceptance: a 3-unit Grade-7 fixture auto-flags CLO-3 unassessed + one over-weighted slot;
      AI draft cites only authorized course data; approval pins the blueprint; slot-scoped
      authoring inherits weights; whole-course coverage matrix renders.
- [ ] 8.12-QA SENIOR QA — Blueprint math + coverage E2E.
      Method: seed a 3-unit course with CLO-3 unassessed + one over-weighted slot; assert flags
      exact; AI draft citations ⊆ authorized evidence; approve → blueprint pinned; author an
      assignment under a slot and assert inherited `clo_weights`; coverage matrix matches the
      audit's walkthrough. Pass = flags exact, citations authorized, blueprint gates authoring,
      matrix correct.

- [x] 8.13 SENIOR ENGINEERING FIX — Product decision record + Discovery-sprint gate.
      Problem: the product decision underpinning 8.1 (percent canonical + `raw_score` immutable)
      was recommended but never recorded; a Discovery sprint (1 IB + 1 British multi-track school)
      is the agreed gate before the 8.1 scoring-model contract is fixed; without a recorded
      decision agents may hallucinate the scoring model.
      Fix (docs only, no schema): record in README the product decision — `score_percent` remains
      the canonical normalized value; `evidence.raw_score` stores immutable raw criterion/band/
      component semantics; IB's "never represent criteria as % only" is satisfied because BOTH are
      stored (raw is never replaced by normalization); record the Discovery-sprint scope (segments:
      1 IB + 1 British multi-track; contract output: 8.1 scoring-model items = MYP A–D 0–8 best-fit
      boundaries, IGCSE AO weights + A\*–G/9–1 boundaries, DP component weights, NC bands,
      AP 1–5; constraints: forward-only migrations, RLS + Security Advisor baselines, no
      speculative build before sign-off); gate 8.1 on this record.
      Acceptance: decision + sprint scope recorded in README; Sequencing shows 8.13 before 8.1;
      no scoring-model build proceeds before sign-off.
- [x] 8.13-QA SENIOR QA — Discovery contract review.
      Method: checklist review of the recorded Discovery scope (segment list, contract items,
      migration/RLS/security constraints); assert no task builds 8.1 scoring-model specifics before
      the contract sign-off. Pass = contract recorded + reviewed, no speculative engineering.

### Wave G — QA-report audit remediation (2026-09-07; source: audited QA report vs live system)

> Context & research (verified against live Supabase + current main, NOT the QA report's
> claims): the 2026-09-07 QA report over-classified two findings as BLOCKED and missed the
> root causes. Audit outcome: OBE-06 runtime cascade is PROVEN (outcomeCascade integration
> suite 9/9 on a fresh replay after `20260907190000`); OBE-06's missing `QA-Assign-1` is a
> PROCEDURE-CREATED fixture (manual OBE-05/06 step 1), not a product bug; GAM-01 accounting
> PASS verified to the digit (xp_total 2194 = tx_sum, level 12 = calculate_level_from_xp(2194));
> OBE-14 has ONE root cause (proposal flow has no teacher approval surface + no execution
> handler — `publish_official_content` quiz_question_drafts appears in zero migrations and the
> registry; AgentTaskInbox renders admin-only) with OBE-14-02/03/04 as downstream symptoms.
> QA-report arithmetic corrected: 3 clean PASS + 1 mixed (OBE-06-BE runtime now VERIFIED);
> HABIT-04 is one FAIL (UI defect), not BLOCKED+FAIL.

- [ ] 7.9 SENIOR ENGINEERING FIX — Planner: enable Start on planned study sessions (compact cards).
      Problem (QA HABIT-04, live-verified): `StudySessionCard` renders Start/Edit only when
      `(canStart || canEdit) && !compact`, and `WeeklyCalendarGrid` renders cards with
      `compact` — so on `/student/planner` every planned session shows a status badge but no
      action ("visible but not actionable"). The full completion chain behind it is
      implemented and allow-listed (FocusModePage → `useSessionCompletion` →
      `award-xp(study_session)` in `VALID_SOURCES` + `selfTriggeredSources`, server-capped
      0–60 → `check-badges`); TodayView navigates to focus correctly (4 call sites).
      Fix: render the Start affordance in compact mode (icon button; keep edit
      dialog-suppressed), or make the compact card click-through to focus.
      Acceptance: planned card on `/student/planner` → Start → `/student/focus/:id` → timer
      runs → complete → EXACTLY one `study_session` XP transaction (server cap; adjudicates
      Risk GAM-X1) → `check-badges(trigger=study_session)` → heatmap today filled; double-click
      yields one record (dedup via `(student_id, reference_id)`).
      QA: full HABIT-04 run from the manual (adjudicates GAM-X1 at runtime).
- [ ] 7.10 SENIOR ENGINEERING FIX — AI question drafts: teacher approval surface + persistence
      executor (root cause of QA OBE-14-02/03/04 — do NOT file those separately).
      Problem (live-verified): `generate-quiz-questions` correctly emits an
      `agent_action_proposals` row (`action_type='publish_official_content'`, payload
      `quiz_question_drafts`, approver=assigned teacher, 7-day expiry) per the agentic
      guardrails — but (a) the only proposal inbox (`AgentTaskInbox`) renders on the ADMIN
      dashboard (`AdminDashboardScreen`) — the owning teacher has no visible approval surface;
      (b) `executeApprovedPersonalAction` dispatch has no branch for the action and
      `PROTECTED_WRITE_REGISTRY` has no `publish_official_content` tool → `execute_proposal`
      fails `unknown_tool`; (c) `execute_approved_agent_personal_action_v1` hard-rejects
      non-student actors. Net: approved drafts can never persist → `question_bank` stays at its
      2 manual rows → `quiz_questions=0` → quiz execution (OBE-14-04) blocked. The legacy
      ReviewQueuePage reads `question_bank status='pending_review'` — a path nothing feeds.
      Fix (smallest root-cause scope): (1) `PROTECTED_WRITE_REGISTRY` +=
      `publish_official_content@1.0.0` (validator: `kind='quiz_question_drafts'`, bounded
      questions array matching the generator's validated schema); (2) new
      `execute_approved_teacher_content_v1(p_proposal_id, p_actor_id)` RPC — SECURITY DEFINER,
      search_path='', teacher-only (assigned-teacher re-check), proposal contract + expiry +
      race guard, INSERT approved questions into `question_bank`
      (generation_source='ai', status='approved'), `agent_action_executions` receipt — mirror
      the CQI RPC pattern; (3) orchestrator `execute_proposal` dispatch branch; (4) mount
      `AgentTaskInbox` on the teacher dashboard (same feature gate as admin); (5) link
      proposal status from GenerateQuestionsPage results panel.
      Acceptance: generate → teacher inbox shows the draft proposal → approve → execute → N
      `question_bank` rows (approved, generation_source='ai') → QuestionBank/ReviewQueue render
      them → attach to quiz (`quiz_questions`) → manual OBE-14 end-to-end unblocked
      (auto-grade path included).
- [ ] 7.11 QA-REPORT RECORD — classification corrections (docs only).
      Record in the QA manual: OBE-06-BE runtime VERIFIED (integration suite); OBE-14 note
      updated to the dependency chain (blocked by 7.10, not by missing seed data alone);
      HABIT-04 navigation corrected (Today view actionable today; planner path after 7.9);
      GAM-01 PASS retained with real-user-generation UNVERIFIED note; PASS/FAIL/BLOCKED
      arithmetic corrected (3 clean PASS + 1 mixed; HABIT-04 = single FAIL).
      Acceptance: manual reflects the corrections; re-run list attached to 7.9/7.10 closures.

### Sequencing

8.13 (Discovery-sprint contract + product-decision record) → 8.1 → 8.2 → pilots 8.3–8.6 →
8.7–8.8; 8.9 + 8.10 depend on Phase-7 primes (7.4 / 7.6 / 7.7 / 7.8); 8.10 (closed loop) depends
on 8.11 (TEACH) + 8.12 (ASSESS). QA task ships in the same PR as its engineering task. Map rows in
8.0 / `decision-intelligence-map.md` update as each task lands.
(DONE 2026-09-08 **7.8 EXECUTED**: `curriculum-ingest` edge function (paste-in syllabus â†’
DeepSeek extraction grounded in real program PLO/ILO ids â†’ DRY-RUN `ingest_curriculum`
proposal) + `ingest_curriculum@1.0.0` registry tool + `execute_approved_curriculum_ingest_v1`
(migration `20260908062316`, live-applied) + coordinator dashboard approval inbox +
orchestrator dispatch. **DEPLOYED**: `curriculum-ingest` v1 + `agent-orchestrator` v35
ACTIVE from main `d26b6fe0`. 7.8 remainder: file-upload path (vs paste), CLOForm
in-form suggestions, 7.8-QA 3-fixture run.)

### Sequencing

8.13 (Discovery-sprint contract + product-decision record) â†’ 8.1 â†’ 8.2 â†’ pilots 8.3â€“8.6 â†’
8.7â€“8.8; 8.9 + 8.10 depend on Phase-7 primes (7.4 / 7.6 / 7.7 / 7.8); 8.10 (closed loop) depends
on 8.11 (TEACH) + 8.12 (ASSESS). QA task ships in the same PR as its engineering task. Map rows in
8.0 / `decision-intelligence-map.md` update as each task lands.
