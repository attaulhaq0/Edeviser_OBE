# Tasks — Continuous Product Verification (work in phases; check off as done)

> Update `README.md` session record when a phase completes. Never edit `.kiro/`,
> `supabase/migrations/`, `src/types/database.ts`, `.env.local`.

## Phase 0 — Groundwork ✅ (2026-02 session)
- [x] QA manual extended: OBE/Habit/AI/auth/realtime suites (verification-ready)
- [x] Live DB audit: engines, triggers, data counts (OBE/quiz/marketplace/agent)
- [x] Seed accounts locked & live-verified: 73 seed (5 `@demo.com`, 68 Noor),
      1 real user
- [x] Seed email rename `noor-international.test` → `noor-international.edu`
      (auth.users + auth.identities.identity_data + profiles + institution allowlist
      + login_attempts + parent_student_links + 7 repo files; 0 residuals; logins OK)
- [x] Repo inventory: PostHog/Sentry/Playwright/CI assets mapped (README.md)

## Phase 1 — PostHog wiring (code) ✅
- [x] 1.1 `src/lib/seedAccounts.ts` — locked-domain classification (no user IDs)
- [x] 1.2 `analyticsConsent.ts` — add `account_type` + `environment` person props;
      enable autocapture, `capture_pageview: "history_change"`, session recording
      (`session_recording` with maskAllInputs + maskTextSelector "*"), `defaults`
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
- [x] 6.7 `.env.example` token leak reverted (real phc_ token was pasted into
      the committed file); `POSTHOG_PERSONAL_API_KEY` stored in gitignored
      `.env` only
- [ ] 6.8 P3 follow-ups: student `notification-preferences` + `sessions` and
      coordinator `sessions`/`cohort-comparison` still link-orphaned (routes
      work; low-traffic surfaces); uncertain-caller Edge Functions
      (`generate-reflection-digest`, `resolve-mystery-reward`,
      `check-bonus-question`, `improvement-bonus-check`, `generate-fee-receipt`,
      `bulk-grade-export`) need a runtime tracing pass before any deletion;
      dashboard "Friends online" rail (StudentDashboardScreen) — hook + design
      documented, layout insertion pending
- [ ] 6.9 Friends seed data: populate demo friendships so the investor demo
      shows the feature populated (friendships table live, 0 rows)
- [ ] 5.3 (Deferred) Slack alerts · OpenTelemetry · mutation testing · k6 expansion
