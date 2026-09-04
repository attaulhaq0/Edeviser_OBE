# Continuous Product Verification — Context & Session Record

> **Purpose:** Single source of truth for the Edeviser continuous-verification initiative
> (PostHog observability + chain testing + drift detection). Written so ANY agent or
> teammate can resume with zero context loss. Work proceeds **by phase and task** —
> see [`tasks.md`](./tasks.md). Rules in [`requirements.md`](./requirements.md),
> architecture in [`design.md`](./design.md).

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
   quiz_updated). Exceptions capture ON. An earlier AI built 17 PostHog insights with
   "filter test accounts" ON → seed data excluded → zeros. Fix = tag seed accounts with
   `account_type` person property + filters; two PostHog projects (prod/qa).
4. **Existing verification assets (do not rebuild):** Playwright 1.59 (e2e/ incl.
   intelligence-chain-obe.spec.ts), pgTAP RLS suite, 10 GitHub workflows
   (scheduled-health, security-gates, pre-deploy-audit), Sentry + CI release job,
   scripts/check-* gates, load-tests/, docs/codebase-review-pack/.
5. **Supabase answer:** Supabase Pro covers the DB half (pgTAP, Log Explorer, Advisor,
   Realtime as test observer) but NOT browser/workflow/product-analytics layers —
   those are Playwright + PostHog.
6. **Decision — seed accounts locked (live-verified):** 74 auth users total.
   73 seed = 5 × `@demo.com` (institution `00000000-…-0001`) + 68 × Noor International
   (institution `4de6a0a2-758b-47f3-ab7e-984bb974d88b`). 1 real user:
   `atta@edeviser.com`.
7. **Task executed — seed email rename (user request):**
   `@noor-international.test` → `@noor-international.edu` (TLD exactly `.edu`,
   nothing appended). Live DB updated atomically in `auth.users` (68),
   `auth.identities.identity_data->>'email'` (68; NOTE: `email` column is GENERATED —
   never UPDATE the column directly), `public.profiles` (68),
   `institutions.allowed_email_domains` (text[]), `login_attempts` (10),
   `parent_student_links.invited_email` (20). Repo updated in 7 files
   (QA manual, tenant-readiness audit, QA-Demo-Credentials guide, noorSeedPlan.ts,
   LoginPage.tsx, quickLoginNoor.test.tsx, roleProfileScreens.test.tsx).
   Verified 0 residual rows/references. `@demo.com` left as-is (already legit).
   ⚠️ Passwords unchanged; accounts remain login-functional.
8. **Decision — PostHog region US** (user confirmed). Host: `https://us.i.posthog.com`.
9. **Decision — no Slack integration for now** (revisit later; PostHog native Slack
   alerts are the planned path).
10. **PostHog project connected (2026-02):** user connected a PostHog US project and
    supplied token `phc_voQrUVRwLKFpCLqcqcdBpfrr7EeYss7Fq6XSDah7VRmh`, host
    `https://us.i.posthog.com`. PostHog reported **no events in 30 days** — expected,
    NOT an SDK failure: events are consent-gated behind `CookieConsentBanner`, so
    nothing flows until a user clicks **Accept All**. The pasted integration snippet
    would have broken this (double pageviews, consent bypass, inverted test filter —
    see `posthog-setup-guide.md` §5.1). To get events: deploy Phase-1 code → accept
    cookies in the app → Live events populates within seconds.
11. **Decision — "make all dashboards/visualizations in PostHog" recorded.** Phase 3
    owns dashboard provisioning; `scripts/posthog-provision.mjs` is the reproducible
    path (needs `POSTHOG_PERSONAL_API_KEY` + `POSTHOG_PROJECT_ID`).

## Non-negotiables (from AGENTS.md)
- Never modify: `supabase/migrations/`, `.kiro/` steering/config, `src/types/database.ts`,
  `.env.local`. (This spec ADDITION resides in `.kiro/specs/` per the user's explicit
  request for Kiro support; no steering/config files were touched.)
- No `any`; TanStack Query hooks for DB access; business logic in `src/lib/`.
- Pre-commit: `npm run lint` (zero warnings) → `npx tsc --noEmit` → `npm test`.
- Never run mutation agents against Production; QA storms only on staging/Preview
  or the PostHog **qa** project.

## Key files map
| Concern | File |
|---|---|
| PostHog init/identify/capture | `src/lib/analyticsConsent.ts` |
| Cookie consent gate | `src/components/shared/CookieConsentBanner.tsx` |
| Seed account classification | `src/lib/seedAccounts.ts` |
| Env vars | `.env.example` (`VITE_POSTHOG_*`) |
| Locked seed registry | `seed-accounts-registry.md` |
| PostHog setup + dashboards | `posthog-setup-guide.md` |
| Phased work | `tasks.md` |
| QA manual | `docs/qa/EDEVISER-QA-SYSTEM-VERIFICATION-MANUAL.md` (+ PDF) |