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
- [ ] 5.3 (Deferred) Slack alerts · OpenTelemetry · mutation testing · k6 expansion
