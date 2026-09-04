# Continuous Product Verification — Context & Session Record

> **Purpose:** Single source of truth for the Edeviser continuous-verification initiative
> (PostHog observability + chain testing + drift detection). Written so ANY agent or
> teammate can resume with zero context loss. Work proceeds **by phase and task** —
> see [`tasks.md`](./tasks.md). Rules in [`requirements.md`](./requirements.md),
> architecture in [`design.md`](./design.md).
>
> ⚠️ **Canonical home:** this spec lives in **`.kiro/specs/continuous-verification/`**
> (Kiro reads `.kiro/specs/*` automatically and it is the repo's canonical spec
> location). This `docs/specs/` copy is a **thin pointer** — update `.kiro/...` in
> parallel and treat `.kiro/specs/continuous-verification/*` as the source of truth.

## Product context

Edeviser = Human-Centric OBE + Gamification platform for higher education (Qatar),
bilingual AR/EN. Live on Vercel + Supabase Pro. Roles: admin, coordinator, teacher,
student, parent. Engines: OBE (grade→evidence→CLO/PLO/ILO rollup), Habit/Gamification
(streaks, XP, marketplace, badges), AI/Agent (DeepSeek tutor, RAG, agentic proposals).

## Session record (what happened and why — 2026-02 session)

1. **QA manual** (`docs/qa/EDEVISER-QA-SYSTEM-VERIFICATION-MANUAL.md`) was extended with
   suites: §1 Onboarding/Auth, §2 Cross-role isolation, §3 Dashboards, §4 Realtime,
   §5 OBE Engine (17 tests), §6 Habit+Gamification (18 tests), §7 AI/Agent (15 tests).
   Content verified against live DB triggers (`trigger_attainment_rollup`,
   `trg_validate_outcome_mapping_hierarchy`, `trg_outcome_mapping_weight_sum`, etc.).
2. **User goal (verbatim intent):** fire all events / all sections / all profiles to
   cross-check data flow, routes, and functionality without manual UI testing; find
   drifts, chain breaks, rollup drift; verify Edeviser's promises are actually
   delivered; use PostHog (installed) + Supabase Pro + Docker; no Slack for now.
3. **PostHog findings:** `posthog-js@1.418` already in `package.json`; init in
   `src/lib/analyticsConsent.ts` **behind cookie consent** (users who never accepted
   cookies emit nothing — likely why dashboards looked empty); `identify()` sends
   role + institution_id; 9 custom events already captured client-side
   (assignment_submitted, quiz_attempt_submitted, adaptive_quiz_started/submitted,
   marketplace_item_purchased, tutor_message_sent, tutor_response_rated, quiz_created,
   quiz_updated). Exceptions capture ON. No session replay, no autocapture config yet.
   An earlier AI built 17 PostHog insights with "filter test accounts" ON → seed data
   excluded → zeros. Fix = tag seed accounts with `account_type` person property +
   filters; two PostHog projects (prod/qa).
4. **Existing verification assets (do not rebuild):** Playwright 1.59 (e2e/ incl.
   intelligence-chain-obe.spec.ts), pgTAP RLS suite, 10 GitHub workflows
   (scheduled-health, security-gates, pre-deploy-audit), Sentry + CI release job,
   scripts/check-\* gates, load-tests/, docs/codebase-review-pack/.
5. **Supabase answer:** Supabase Pro covers the DB half (pgTAP, Log Explorer, Advisor,
   Realtime as test observer) but NOT browser/workflow/product-analytics layers —
   those are Playwright + PostHog.
6. **Decision — seed accounts locked (live-verified):** 74 auth users total.
   73 seed = 5 × `@demo.com` (institution `00000000-…-0001`) + 68 × Noor International
   (institution `4de6a0a2-758b-47f3-ab7e-984bb974d88b`). 1 real user:
   `atta@edeviser.com`.
7. **Task executed — seed email rename (user request: "remove the test from the email
   so they look like legit users; just keep them at edu"):**
   `@noor-international.test` → `@noor-international.edu` (TLD exactly `.edu`,
   nothing appended). Live DB updated atomically in `auth.users` (68),
   `auth.identities.identity_data->>'email'` (68; NOTE: `email` column there is
   GENERATED — never UPDATE the column directly), `public.profiles` (68),
   `institutions.allowed_email_domains` (text[]), `login_attempts` (10),
   `parent_student_links.invited_email` (20). Repo updated in 7 files
   (QA manual, tenant-readiness audit, QA-Demo-Credentials guide, noorSeedPlan.ts,
   LoginPage.tsx, quickLoginNoor.test.tsx, roleProfileScreens.test.tsx).
   Verified 0 residual rows/references. `@demo.com` left as-is (already legit).
   ⚠️ Passwords unchanged; accounts remain login-functional.
8. **Decision — PostHog region US** (user confirmed). Host: `https://us.i.posthog.com`.
9. **PostHog project connected (2026-02 session):** The user connected to a PostHog
   US project and provided its project token
   (`phc_voQrUVRwLKFpCLqcqcdBpfrr7EeYss7Fq6XSDah7VRmh`, host `https://us.i.posthog.com`).
   PostHog reported **no events in the last 30 days** — expected, NOT an SDK failure:
   `posthog-js` is installed and initialized in `src/lib/analyticsConsent.ts` **behind
   the cookie-consent gate**, so events only flow once a user clicks **Accept All** on
   `CookieConsentBanner.tsx` (GDPR). The pasted setup prompt would have broken this if
   applied literally:
   - It suggested `capture_pageview: false` + manual `$pageview` — we already use
     `capture_pageview: "history_change"` (SPA-safe, no double pageviews). ✅ Do NOT add
     a PageViewTracker.
   - It suggested calling `posthog.capture()`/`identify()` directly — our
     `captureAnalyticsEvent()`/`identifyAnalyticsUser()` wrappers keep the consent
     gate; raw calls would bypass it. ✅ Use the wrappers.
   - Its filter `email contains "@edeviser.com" OR is_test_account=true` is WRONG —
     that would exclude the only real user and keep seed data. Ours is correct:
     person property `account_type = seed`. ✅ Do NOT use email-domain filters.
     **To get events flowing:** deploy the Phase-1 code, then in the live app
     **accept the analytics cookies** → events appear in PostHog Live within seconds.
10. **Decision — "make all dashboards/visualizations in PostHog" recorded.** Phase 3
    owns dashboard provisioning; `scripts/posthog-provision.mjs` is the reproducible
    path (needs `POSTHOG_PERSONAL_API_KEY` + `POSTHOG_PROJECT_ID`).

## Non-negotiables (from AGENTS.md)

- Never modify: `supabase/migrations/`, `.kiro/`, `src/types/database.ts`, `.env.local`.
- No `any`; TanStack Query hooks for DB access; business logic in `src/lib/`.
- Pre-commit: `npm run lint` (zero warnings) → `npx tsc --noEmit` → `npm test`.
- Never run mutation agents against Production; QA storms only on staging/Preview
  or the PostHog **qa** project.

## Key files map

| Concern                       | File                                                       |
| ----------------------------- | ---------------------------------------------------------- |
| PostHog init/identify/capture | `src/lib/analyticsConsent.ts`                              |
| Cookie consent gate           | `src/components/shared/CookieConsentBanner.tsx`            |
| Seed account classification   | `src/lib/seedAccounts.ts` (new)                            |
| Env vars                      | `.env.example` (`VITE_POSTHOG_*`)                          |
| Locked seed registry          | [`seed-accounts-registry.md`](./seed-accounts-registry.md) |
| PostHog setup + dashboards    | [`posthog-setup-guide.md`](./posthog-setup-guide.md)       |
| Phased work                   | [`tasks.md`](./tasks.md)                                   |
| Production deploy guard       | `scripts/deploy-guard.mjs` (new)                           |

## Session record — 2026-09-04 (evening): accidental CLI deploy + fix-forward audit

**Incident.** Owner ran `vercel --prod` from a dirty working tree, bypassing the
Git/CI workflow. Immediately afterwards, main moved forward via merged PRs
(#315–317) and Vercel built newer production deployments from Git, superseding
the accidental deploy. **Rollback deliberately NOT used** (per decision): the
fix-forward strategy converges Git onto production content instead.

**Live production audit (all verified against the deployed bundle).**

- Prod deployment serving `app.edeviser.com`: built from Git `main`
  (carries the `e-deviser-git-main` alias) → Production ≈ Git already.
- Live bundle contains: PostHog SDK ✅, prod project token (public `phc_*`) ✅,
  consent gate (`edeviser_cookie_consent`) ✅, PWA service worker ⚠️
  (stale-cache risk when verifying — use incognito or unregister SW).
- Live bundle LACKS: seed tagging (`account_type`), session recording,
  autocapture, environment properties, seed-email rename → these exist only as
  uncommitted local work and ship via this spec's fix-forward PR.
- Secret hygiene: no `service_role`/Sentry DSN in bundle; `.gitignore:32`
  covers all `.env*`; only `.env.example` is tracked. `.claude/skills/` ignored.
- PostHog project: **id 393668** ("Default project", US) — personal API key
  validated against it.

**Issues fixed in this session (fix-forward).**

1. `scripts/verify-posthog.js` deleted — broken (400 on `/capture/`) and
   redundant; the app itself is the verification path.
2. `scripts/posthog-provision.mjs` made **idempotent** (indexes existing
   dashboards/insights by name before writing; re-runs skip; orphans re-attached
   via PATCH) and the wrong attachment field (`dashboard_filters`) replaced with
   the correct `dashboards: [id]` — previously insights were created but never
   attached to dashboards.
3. `.env.example` gained a server-side-only section documenting
   `POSTHOG_PERSONAL_API_KEY` + `POSTHOG_PROJECT_ID` (no `VITE_` prefix ever —
   Vite inlines those into the public bundle).
4. `.env` (gitignored): the personal API key was stored under the invalid name
   `Personal API key post hog =` → renamed to `POSTHOG_PERSONAL_API_KEY`.
   ⚠️ **The phx\_ key value was accidentally lost during that rename (tooling
   error) and is unrecoverable — the owner must create a new Personal API key
   in PostHog → Settings → Personal API keys.**
5. Production deploy guard added (`scripts/deploy-guard.mjs`, npm
   `deploy:prod`) so direct owner CLI deploys cannot bypass clean-tree/main
   requirements again.

**Deploy Impact: NONE** (frontend analytics + local tooling only; no migrations,
no Edge Functions). All pre-commit gates run before PR.

## Session record — 2026-09-04 (night): real event catalog shipped (PRs #319–#320)
**Goal.** The four "no matching events" dashboards queried events nothing emitted.
Wired the real catalog at the correct call sites and made every provisioned
insight query an event the app actually sends.

**New client events (all consent-gated, via `captureAnalyticsEvent`):**
`outcome_created` (useCreateCLO/PLO/ILO/SubCLO, prop `outcome_type`),
`grade_submitted` (useCreateGrade, props `score_percent`, `ai_applied`),
`grade_viewed` (useGrade first-hit, session-deduped per submission),
`leaderboard_viewed` (useLeaderboard first page, session-deduped),
`badge_viewed` (useTieredBadges first load, session-deduped),
`streak_milestone_seen` (useStreakMilestones, deduped per milestone/day),
`signup_completed` (AuthProvider signUp success), `route_error_shown`
(PageErrorFallback mount). View events are session-deduped (module-level Set)
so refetch/polling can't inflate counts.

**Real bugs found during build verification (not just analytics):**
1. `useStreakMilestones` was **dead code** — connectivity matrix `targets: []`,
   no importers, tree-shaken from the build. `HeatmapGrid` always accepted a
   `milestones` prop but no page passed it → milestone markers (30/60/100-day)
   were never shown AND the new event could never fire. **Fixed in #320**:
   `HabitHeatmapPage` calls `useStreakMilestones(heatmapData)` and passes
   `milestones` to `<HeatmapGrid>`.
2. `quiz_attempt_submitted` **can never fire** — the static `QuizAttemptPage`
   is unrouted (imported by nothing; students use the adaptive flow at
   `/student/quizzes/:id/adaptive` which fires `adaptive_quiz_started/submitted`).
   Removed the two phantom insights from the provisioner; noted in a comment.
   **Product decision needed:** route the static quiz flow or drop it.

**Provisioner v2 (`scripts/posthog-provision.mjs`).** All insights query real
events; chain-pair insights read together ("OBE chain: submissions" vs "OBE
chain: grades released" — widening gap = grading pipeline stall). `--update`
flag PATCHes filters of existing same-name insights to repair already-created
broken dashboards. **Personal API key was lost in the earlier .env rename
incident and must be recreated by the owner before running.**

**Deploy Impact: NONE.** Gates: tsc 0, eslint 0, 6712/6712 tests, provisioner
`node --check` OK. Shipped via PRs #319 + #320 (proper Git/CI path); live prod
bundle verified (`index-Ftpqn5wm.js` post-#320).
