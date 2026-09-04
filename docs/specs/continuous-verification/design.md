# Design — Continuous Product Verification

## Architecture (layered; Supabase ≠ test runner)

```
User action (real user OR agent-driven QA session)
  ↓ PostHog client events (consent-gated)          ← behavior truth
Edge Function / DB trigger consequences           ← server truth
  ↓ verified by: Playwright chain tests (staging)  ← functional truth
  ↓ verified by: pgTAP invariants (DB laws)        ← integrity truth
  ↓ observed by: Supabase Log Explorer / Advisor   ← ops truth
PostHog dashboards (prod=real users, qa=agents)   ← visibility
```

## Account classification (`src/lib/seedAccounts.ts`)

```ts
export const SEED_EMAIL_DOMAINS = [
  "demo.com",
  "noor-international.edu",
] as const;
export const SEED_INSTITUTION_IDS = [
  "00000000-0000-0000-0000-000000000001", // QA demo institution
  "4de6a0a2-758b-47f3-ab7e-984bb974d88b", // Noor International School (seed cohort)
] as const;
export function isSeedAccount(
  email?: string | null,
  institutionId?: string | null
): boolean;
```

`analyticsConsent.identifyAnalyticsUser` adds `account_type` + `environment`
(`import.meta.env.MODE`/`VERCEL_ENV`-derived) to person properties. PostHog filters
use `account_type`, NOT email patterns (emails look legit by design).

## PostHog config (final, phase 1 — `analyticsConsent.ts`)

```ts
posthog.init(token, {
  api_host: host,
  defaults: "2026-05-30", // official preset, matches install snippet
  person_profiles: "identified_only", // only create person profiles via identify()
  autocapture: true,
  capture_pageview: "history_change", // React Router SPA
  capture_exceptions: { ...existing },
  session_recording: { maskAllInputs: true, maskTextSelector: "*" },
});
```

> ⚠️ Config-key correction: in posthog-js 1.4xx the session-replay config key is
> `session_recording` (not `session_replay`); the modern preset is `defaults:
"2026-05-30"`. Verified against `@posthog/types/dist/posthog-config.d.ts`
> (`session_recording: SessionRecordingOptions`, `maskTextSelector`/`maskAllInputs`,
> `capture_pageview: boolean | 'history_change'`, `person_profiles`,
> `ConfigDefaults`). Do not "fix" these keys to the docs' older names — tsc validates.

CSP note: allow `https://*.posthog.com` in `script-src`/`connect-src`/`worker-src`
(only if a CSP is configured; none found in repo today).

## Event taxonomy (canonical names — use these everywhere)

Client (existing): `assignment_submitted`, `quiz_attempt_submitted`,
`adaptive_quiz_started`, `adaptive_quiz_submitted`, `marketplace_item_purchased`,
`tutor_message_sent`, `tutor_response_rated`, `quiz_created`, `quiz_updated`.
To add (client, in hooks — never components): `grade_viewed`, `streak_milestone_seen`,
`badge_viewed`, `leaderboard_viewed`, `marketplace_purchase_failed`,
`login_succeeded`, `login_failed`, `route_error_shown`.
Server (Phase 3+, via edge-function capture API): `xp_awarded` (props: source,
amount, reference_id), `attainment_updated` (scope, outcome_type), `badge_awarded`,
`at_risk_signal_computed`, `agent_action_proposed|approved|executed`.
Pairing rule: every XP award must carry `reference_id`; broken-chain insight =
awards missing for graded submissions in window X.

## PostHog projects & tokens

- `edeviser-prod` ↔ Vercel production env vars; `edeviser-qa` ↔ preview/development.
- Filters: person property `account_type = seed` on BOTH projects' internal-user
  setting; bulk-apply to existing insights via
  `POST /api/projects/:id/insights/bulk_set_test_account_filter/`.

## Dashboards (definitions; provisioned by script)

1. **Investor — Users & Engagement:** WAU/MAU trends; DAU/WAU stickiness; retention
   by signup cohort; funnel signup→onboarding→first submission→first grade;
   sessions/replay count; breakdown by role & institution (seed-filtered).
2. **Engine Health — OBE:** `assignment_submitted`→graded conversion; XP `grade`
   source count vs graded count (drift = chain break); attainment distribution by
   CLO (from server events once shipped).
3. **Engine Health — Habit/Gamification:** login DAU (streak proxy);
   `marketplace_item_purchased` & purchase_failed; tutor_message_sent DAU;
   quiz_attempt_submitted per student.
4. **QA & Broken Chains (+AI):** exception capture counts by page; route_error_shown;
   tutor response ratings avg; purchase_failed rate; (later) agent proposals
   approved/rejected; nightly verifier pass/fail via `qa_run` events.

## Chain tests (Playwright, staging only)

Extend `e2e/intelligence-chain-obe.spec.ts` pattern. Each spec: act as seeded persona
→ perform action → poll staging DB (`@supabase/supabase-js` with staging anon key +
test accounts) asserting: evidence rows, `outcome_attainment` deltas,
`xp_transactions` (unique reference_id), `student_gamification` totals, notifications.
Runners: PR = smoke only; nightly (`scheduled-health.yml`) = full matrix incl.
route×role sweep from `src/lib/criticalRoutes.ts`.

## pgTAP invariants (`supabase/tests/`, run via existing RLS harness pattern)

obe_invariants.test.sql / habit_invariants.test.sql / xp_idempotency.test.sql —
assert laws regardless of UI: idempotent XP per reference, attainment bounds,
immutable evidence, weight sums, mapping directions, streak single-count.
