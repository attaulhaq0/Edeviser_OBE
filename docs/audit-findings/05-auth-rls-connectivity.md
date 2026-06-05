# Audit Findings 05 — Auth, RLS Posture, Realtime, Storage, Query/Cache, Env/Secrets, Error Monitoring

**Scope:** Cross-cutting infrastructure for the Edeviser platform (React + TS + Vite, Supabase Postgres + RLS + Realtime + Storage + Auth, TanStack Query).
**Method:** Static read of `src/` client code and `supabase/migrations/` SQL. No files were modified.
**Live DB context (given, treated as verified):** 131 public tables, all 131 with RLS enabled, zero tables RLS-enabled-but-no-policy (every table has ≥1 policy). 220 functions. `auth_user_role()` and `auth_institution_id()` are `SECURITY DEFINER`. Several `SECURITY DEFINER` RPCs are authenticated-executable by design.

Verdict legend: **WORKING** = correct & defensible · **PARTIAL** = works but has gaps/risks · **BROKEN** = incorrect or unsafe.

---

## 1. Auth Flow — **WORKING** (one misleading-UX flag)

**Session bootstrap.** `AuthProvider` initialises once (StrictMode-guarded via `initialised` ref), restores the persisted session with `supabase.auth.getSession()`, then subscribes to `supabase.auth.onAuthStateChange`.

- `src/providers/AuthProvider.tsx:131-181` — bootstrap effect: `getSession().then(syncSession)` + `onAuthStateChange` switch.
- `src/lib/supabase.ts:14-20` — client created with `autoRefreshToken: true`, `persistSession: true`, `detectSessionInUrl: true`.

**Role resolution (source of truth = `profiles`).** Role is _never_ read from JWT claims, `user_metadata`, or localStorage. It is always fetched from the `profiles` table and derived from that row.

- `src/providers/AuthProvider.tsx:78-103` — `fetchProfile()` selects an explicit column list from `profiles` and uses `.maybeSingle()` (zero-or-one safe).
- `src/providers/AuthProvider.tsx:282-283` — `const role = profile?.role ?? null; const institutionId = profile?.institution_id ?? null;` — derived solely from the DB row.

**Token refresh.** `TOKEN_REFRESHED` (and `SIGNED_IN` / `INITIAL_SESSION`) re-run `syncSession`, which re-fetches the profile so role/institution stay fresh after a refresh.

- `src/providers/AuthProvider.tsx:158-166`.

**Sign-out.** `signOut()` calls `supabase.auth.signOut()` then clears `user`/`profile`; the `SIGNED_OUT` event path also clears state defensively.

- `src/providers/AuthProvider.tsx:250-256` (method) and `:150-156` (event).

**`handle_new_user` trigger behavior.** AFTER INSERT on `auth.users`, `SECURITY DEFINER`, `SET search_path = public`. It forces `final_role := 'student'` for self-signup; a non-student role is only honoured when a real `invitation_id` is present in metadata. `join_mode` is validated server-side: `invite_only` rejects non-student self-signup (42501), `domain_restricted` enforces the email domain, `open` sets `status = 'pending_verification'`. Non-student invited roles also write a `pending_approval` audit row.

- `supabase/migrations/20260510084054_add_institution_join_modes.sql:101-189` (function body), `:191-195` (REVOKE from anon/authenticated, GRANT to postgres/service_role only).

**Role-trust flag (Low / UX).** The client `signUp` forwards `requestedRole` into `raw_user_meta_data.role`, and `LoginPage`'s register tab exposes a role `<select>` offering teacher/coordinator/admin/parent.

- `src/providers/AuthProvider.tsx:225-229` (`if (requestedRole) metadata.role = requestedRole;`).
- `src/pages/LoginPage.tsx:597-611` (role dropdown with admin/teacher/coordinator/parent options).

This is **not** a privilege-escalation hole: the trigger ignores the requested role for self-signup (no `invitation_id`) and always assigns `student` (`...20260510084054...:135-176`). The client never trusts the role it sent — it re-reads `profiles` after signup. The issue is purely misleading UX: a user can pick "Admin" and silently get a student account. The dedicated `SignUpPage.tsx` correctly hard-codes `requestedRole: "student"` (`src/pages/auth/SignUpPage.tsx:91`), so the `LoginPage` dropdown is the inconsistent surface.

**Invite flow.** `AcceptInvitePage` resolves the token via `get_invitation_by_token` RPC, signs up with the invited role, then calls `consume_invitation`. Note: the client passes `requestedRole: invitation.role` but does **not** pass an `invitation_id` into signup metadata, so the trigger's invitation branch (which would honour a non-student role) is not exercised by this path — invited non-student roles depend on a server/Edge path or admin approval rather than this client call.

- `src/pages/auth/AcceptInvitePage.tsx:99-145`.

---

## 2. Route Guards backed by Server RLS — **WORKING**

**Client guard.** `RouteGuard` reads `{ user, role, isLoading }` from `useAuth` (i.e. from `profiles`), shows a spinner while loading, redirects unauthenticated users to `/login`, and redirects authenticated-but-wrong-role users to their own dashboard.

- `src/router/RouteGuard.tsx:20-43`.
- Applied per role tree in `src/router/AppRouter.tsx` (e.g. `allowedRoles={["admin"]}` wrapping `/admin/*`, `["teacher"]` for `/teacher/*`, `["student"]` for `/student/*`, etc.).

**Server backing.** The guard is cosmetic; the real boundary is RLS. Policies use the `SECURITY DEFINER` helpers `auth_user_role()` and `auth_institution_id()`, both of which read `profiles WHERE id = auth.uid()` and bypass RLS internally to avoid recursion.

- `supabase/migrations/20260510045956_fix_auth_user_role_infinite_recursion.sql:7-31` — both helpers `SECURITY DEFINER STABLE SET search_path`, the canonical (latest replay-order) definition.
- `supabase/migrations/20260520065540_revoke_public_execute_rls_helpers.sql:3-12` — `EXECUTE` revoked from `PUBLIC`, granted to `authenticated` (needed because PostgREST evaluates as the caller's role).
- Steering pattern (`.kiro/steering/supabase-patterns.md`) confirms the institution-scoped template `auth_user_role() = 'admin' AND institution_id = auth_institution_id()`.

**Conclusion:** With every table RLS-enabled and policy-backed (given), a guard bypass (e.g. hand-editing the URL or tampering with client `role`) still cannot read cross-role or cross-institution rows, because PostgREST re-evaluates `auth_user_role()`/`auth_institution_id()` from the DB on every request. The property test `src/__tests__/properties/rlsInstitutionIsolation.property.test.ts` documents the accepted defense-in-depth carve-outs (staff-gated write policies whose real writer is a service-role Edge Function). _Unverifiable from code alone:_ the exact per-table policy bodies live in the DB; this audit relies on the stated live-DB invariant that all 131 tables are policy-backed.

---

## 3. Realtime — **PARTIAL** (two unscoped/whole-table subscriptions)

**Shared manager exists and matches the steering rule.** `useRealtime` provides channel dedup (`${table}:${event}:${filter}`), exponential backoff (1s→2s→…→30s cap), polling fallback with an `isLive` flag for the "Live updates paused" banner, and full teardown on unmount (`unsubscribe()` + timer clears).

- `src/hooks/useRealtime.ts:90-150` (subscribe/backoff/cleanup), `:73-88` (polling start/stop), `:46` (`enabled` gate).
- No component calls `supabase.channel(` directly — grep returned zero matches outside the manager. All 11 production call sites go through `useRealtime`.

**Correctly scoped subscriptions (filtered):**

- `src/hooks/useNotificationRealtime.ts:59-65` — `notifications` filtered `user_id=eq.<id>`.
- `src/hooks/useChallengeRealtime.ts:35-44` — `challenge_progress` filtered `challenge_id=eq.<id>`.
- `src/hooks/useTeamRealtime.ts:29-39` — `teams` filtered `institution_id=eq.<id>`.
- `src/pages/student/progress/CLOProgress.tsx:109-117` — `outcome_attainment` filtered `student_id=eq.<id>`.
- `src/hooks/useTeamLeaderboard.ts:66-83` — `teams` filtered `course_id` for course scope, and explicitly `enabled: scope !== "course" || !!courseId` to avoid an unfiltered subscription when `courseId` is missing; the global-scope carve-out is documented (`audit/baselines/realtime-filter-exceptions.json`).

**Flag 3a — whole-table subscription (Medium).** `TeacherDashboard` subscribes to `submissions` INSERTs with **no filter**, so it receives every institution's submission INSERTs the connection is allowed to see.

- `src/pages/teacher/TeacherDashboard.tsx:414-419` — `useRealtime({ table: "submissions", event: "INSERT", ... })` with no `filter`.
- Impact is bounded by RLS (a teacher only receives rows their policies permit) and the payload is only used to invalidate queries, not rendered directly. Still, it is broader than necessary and contradicts "always scope realtime subscriptions with filters." Recommend filtering by `course_id`/teacher scope.

**Flag 3b — conditional unfiltered subscription (Medium).** `useTeamBadges` subscribes to the `badges` table filtered by `team_id`, but does **not** pass `enabled`. When `teamId` is `undefined`, `filter` becomes `undefined` and the hook opens an **unfiltered whole-table `badges` INSERT** subscription until a `teamId` arrives.

- `src/hooks/useTeamBadges.ts:20-31` — `filter: teamId ? ... : undefined` with no `enabled` guard (contrast with `useTeamLeaderboard.ts:81`'s explicit `enabled`).
- Recommend `enabled: !!teamId` to match the established guard pattern.

---

## 4. Storage — **WORKING**

**Buckets and access model** (from `src/lib/storageUrl.ts:11-16` header + `fileUpload.ts` constants):

| Bucket                     | Visibility | Read access                  | Client validation                                                                         |
| -------------------------- | ---------- | ---------------------------- | ----------------------------------------------------------------------------------------- |
| `avatars`                  | **PUBLIC** | `getPublicUrl()`             | type (jpeg/png/gif/webp) + 2 MB cap — `fileUpload.ts:152-165`                             |
| `submissions`              | PRIVATE    | `getSignedUrl()`             | ext allowlist + 10 MB + path-traversal guard — `fileUpload.ts:75-99`                      |
| `session-evidence`         | PRIVATE    | `getSignedUrl()`             | (consumed via signed URL; see `useSessionEvidence`)                                       |
| `course-materials`         | PRIVATE    | `getSignedUrl()`             | n/a in this file                                                                          |
| `accreditation-reports`    | PRIVATE    | `getSignedUrl()`             | n/a in this file                                                                          |
| `tutor-attachments`        | PRIVATE    | short-lived signed URL (1 h) | image 5 MB / doc 10 MB, MIME allowlist, per-`auth.uid()` folder — `fileUpload.ts:198-281` |
| `announcement-attachments` | PRIVATE    | `getSignedUrl()`             | MIME allowlist + 10 MB — `fileUpload.ts:299-389`                                          |

- Signed-URL helpers: `src/lib/storageUrl.ts:35-50` (single) and `:56-78` (batch via `createSignedUrls`), TTL 1 h.
- `getPublicUrl` is used **only** for the `avatars` bucket — `src/lib/fileUpload.ts:177-179` and `src/hooks/useAvatarUpload.ts:159-161`. Grep confirms no other production `getPublicUrl` callers.
- Path-traversal hardening on every upload via `assertNoPathTraversal()` (`fileUpload.ts:64-70`), plus filename sanitisation (`replace(/[^a-zA-Z0-9._-]/g, "_")`) and uid/uuid-prefixed paths.

**Assessment.** The only public bucket is `avatars` (display images, low sensitivity); all student work, evidence, reports, tutor uploads, and announcement files are private behind signed URLs. Every upload path performs client-side type+size validation. No public bucket holds sensitive data; no upload skips validation. **WORKING.**

---

## 5. TanStack Query Config — **PARTIAL** (a few `.single()` on zero-row reads)

**Defaults** (`src/App.tsx:36-69`):

- `staleTime: 5 * 60 * 1000` (5 min), `gcTime: 30 * 60 * 1000` (30 min).
- `retry`: custom — no retry on HTTP 429 (rate limit), otherwise up to 3 (`failureCount < 3`).
- `retryDelay`: exponential `min(1000 * 2**attempt, 30000)`.
- `refetchOnWindowFocus: false`.
- Mutation `onError` surfaces a Sonner toast on 429.

**Query keys.** Centralised, hierarchical factory `createKeys(entity)` producing `all / lists() / list(filters) / details() / detail(id)`, with bespoke nested keys for heatmap/wellness/marketplace/tutor/etc. Structure is consistent and dedup-friendly.

- `src/lib/queryKeys.ts:1-8` (factory), `:200-420` (assembled `queryKeys` object).

**Error handling.** Hooks consistently follow the steering rule `if (error) throw error;` before returning data (e.g. `useTeamBadges.ts:40-43`, `useStreak.ts:24-27`, dozens more). The QueryProvider has no global `queryCache.onError`, so per-query error surfacing relies on each consumer reading `isError`/`error` — acceptable but worth a global fallback (see Improvements).

**Flag 5a — `.single()` on reads that can legitimately return zero rows (Medium).** `.single()` throws `PGRST116` when no row matches; these read paths should use `.maybeSingle()`:

- `src/pages/auth/AcceptInvitePage.tsx:128-132` — institution name lookup `.eq("id", ...).single()`; a missing/renamed institution turns a cosmetic label fetch into a thrown error inside the invite flow.
- `src/hooks/useSessionCompletion.ts:289-293` — session lookup `.eq("id", sessionId).eq("student_id", user.id).single()`; a non-matching session id throws instead of yielding a clean "not found".
- `src/hooks/useReflectionDigest.ts:75-78` and `:131-134` — digest fetch by id+student `.single()`.
- `src/hooks/useTeamProfile.ts:63-65` — `teams ... .eq("id", teamId).single()`.

  Most other `.single()` usages are **after** an `insert(...).select().single()` / `update(...).select().single()` where exactly one row is expected — those are correct and were not flagged (e.g. `useUsers.ts`, `useQuizzes.ts`, `useTeams.ts`). The codebase already prefers `.maybeSingle()` broadly (60+ call sites), so the above are the inconsistent reads.

---

## 6. Env / Secrets — **WORKING**

- Only `VITE_`-prefixed vars reach the client. Confirmed every `import.meta.env.*` reference: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SENTRY_DSN`, `VITE_DEMO_PASSWORD`, `VITE_CAPTCHA_SITE_KEY`, `VITE_CAPTCHA_PROVIDER`, plus build flags `DEV`/`PROD`/`MODE`.
  - `src/lib/supabase.ts:4-5`, `src/lib/envValidation.ts:23-26`, `src/lib/sentry.ts:27`, `src/lib/analyticsConsent.ts:45-46`, `src/lib/tutorApi.ts:39-53`, `src/components/shared/CaptchaChallenge.tsx:31-37`, `src/pages/LoginPage.tsx:48`.
- **No service-role key in client code.** Grep for `SERVICE_ROLE` / `service_role` in `src/**` matches only tests (`src/__tests__/integration-rls/*`, `cronAuth.test.ts`) and property-test comments — never runtime client code. The legitimate `SUPABASE_SERVICE_ROLE_KEY` usage lives in `api/` and `supabase/functions/` (out of client bundle), as intended.
- `process.env` appears only in test/integration helpers, not in shipped client modules.
- Startup validation (`validateEnv()` in `src/lib/envValidation.ts:22-41`) fails closed with a visible error screen (`src/main.tsx:9-25`) rather than a blank page when Supabase vars are missing.
- Demo passwords are env-gated: `VITE_DEMO_PASSWORD` defaults to `""` and the Quick Demo panel is hidden when unset, so no demo credential ships in production (`src/pages/LoginPage.tsx:48-50, 442-470`).

---

## 7. Error Monitoring — **PARTIAL** (Sentry wired, but consent gating is bypassed by a duplicate init)

**Wiring confirmed.**

- Error boundaries: outer `Sentry.ErrorBoundary` + custom `ErrorBoundary` wrap the whole app (`src/App.tsx:72-101`); `AppRouter` adds another `ErrorBoundary` with a page-level fallback (`src/router/AppRouter.tsx`), and the custom boundary reports to Sentry via `captureException` when initialised (`src/components/shared/ErrorBoundary.tsx:27-40`).
- Custom `ErrorBoundary` renders a recoverable `ErrorState` with retry (`:51-72`).

**Flag 7a — two competing Sentry init paths; consent gate is effectively defeated (High, privacy/compliance).** There are two initialisers with different configs and different gating:

1. `initSentry()` — rich config with `replayIntegration` (mask all text/inputs), `tracesSampleRate 0.1`, and a `beforeSend`/`beforeBreadcrumb` PII scrubber. Called **unconditionally at module load**.
   - `src/lib/sentry.ts:26-93`; invoked at `src/App.tsx:26` (top-level `initSentry();`).
2. `initAnalyticsIfConsented()` — **consent-gated**, simpler config (no PII scrubber, no replay masking config), `no-op` if `Sentry.isInitialized()`.
   - `src/lib/analyticsConsent.ts:38-56`; invoked at `src/main.tsx:28`.

Because `main.tsx` does `import App from "@/App"` (top of file), the `App.tsx` module body — including `initSentry()` — executes at **import time**, before `initAnalyticsIfConsented()` runs. Result: when `VITE_SENTRY_DSN` is set, Sentry **always initialises regardless of cookie consent**, and the later consent-gated call no-ops (`isInitialized()` is already true). The cookie-consent mechanism in `analyticsConsent.ts` therefore does not actually gate Sentry. (Silver lining: the config that _does_ win is the stricter PII-scrubbing one, so data minimisation is intact — but initialising analytics without consent is a GDPR/consent-banner correctness problem, and the two configs are confusing duplication.)

- Recommend: pick one path. Either gate `initSentry()` behind `hasAnalyticsConsent()` and delete the duplicate in `analyticsConsent.ts`, or have `analyticsConsent` call `initSentry()` so the scrubber config is the only one. Verified against `docs/operations/PRE-DEPLOYMENT-AUDIT-REPORT.md:283`, which only documents the `App.tsx` path and does not mention the consent conflict.

---

## Findings (ranked)

### Blocker

- _None._ Auth source-of-truth, RLS helper posture, and secret handling are sound.

### High

- **H1 — Sentry consent gating is bypassed (7a).** `initSentry()` runs at import time unconditionally; the consent-gated `initAnalyticsIfConsented()` then no-ops. Analytics/replay initialise without cookie consent. `src/App.tsx:26`, `src/lib/sentry.ts:26-93`, `src/main.tsx:28`, `src/lib/analyticsConsent.ts:38-56`.

### Medium

- **M1 — Whole-table realtime subscription** on `submissions` (no filter). `src/pages/teacher/TeacherDashboard.tsx:414-419`.
- **M2 — Conditional unfiltered realtime subscription** on `badges` when `teamId` is undefined (missing `enabled` guard). `src/hooks/useTeamBadges.ts:20-31`.
- **M3 — `.single()` on zero-row-capable reads** should be `.maybeSingle()`. `src/pages/auth/AcceptInvitePage.tsx:128-132`, `src/hooks/useSessionCompletion.ts:289-293`, `src/hooks/useReflectionDigest.ts:75-78,131-134`, `src/hooks/useTeamProfile.ts:63-65`.

### Low

- **L1 — Misleading signup role dropdown.** `LoginPage` register tab lets users pick admin/teacher/coordinator/parent, but the server forces `student` for self-signup. No security impact; confusing UX and inconsistent with `SignUpPage.tsx`. `src/pages/LoginPage.tsx:597-611`, `src/providers/AuthProvider.tsx:225-229`.
- **L2 — Invite path doesn't pass `invitation_id` into signup metadata**, so the trigger's non-student invitation branch isn't exercised client-side. `src/pages/auth/AcceptInvitePage.tsx:147-155` vs trigger `...20260510084054...:130-134`.
- **L3 — No global `QueryCache.onError`.** Per-query error surfacing depends on each consumer; a global fallback toast would harden the long tail. `src/App.tsx:36-69`.

---

## Improvements

1. **Single Sentry init, consent-gated (fixes H1).** Have the cookie-consent flow be the _only_ initialiser, and route it through the PII-scrubbing config in `sentry.ts`. Remove the bare `initSentry()` from `App.tsx` module scope (or wrap it in `if (hasAnalyticsConsent())`). Add a regression test asserting Sentry is **not** initialised when consent is absent.
2. **Scope the teacher `submissions` subscription (M1)** to the teacher's course(s) via a `filter` (e.g. `course_id=in.(...)` or a per-course channel), mirroring `useChallengeRealtime`/`useTeamRealtime`.
3. **Add `enabled: !!teamId` to `useTeamBadges` (M2)** so no whole-table `badges` channel opens before an id resolves — matching the explicit guard already used in `useTeamLeaderboard.ts:81`.
4. **Convert the flagged reads to `.maybeSingle()` (M3)** and return `null` on no-row, so missing rows are a clean empty state rather than a thrown query error.
5. **Align the two signup surfaces (L1).** Either remove the privileged options from the `LoginPage` role dropdown (leave student-only) or relabel it "Requested role (subject to approval)" to match server behaviour.
6. **Add a global `queryCache`/`mutationCache` `onError` (L3)** that logs and optionally toasts, as a safety net for hooks that forget to surface errors.
7. **Document the realtime filter exceptions** (`audit/baselines/realtime-filter-exceptions.json`) to also cover M1/M2 once fixed or formally accepted, so the scanner baseline stays meaningful.

---

## Unverifiable from code (flagged)

- Exact per-table RLS **policy bodies** are in the live DB, not in a single migration; this report trusts the stated invariant (all 131 tables policy-backed, helpers `SECURITY DEFINER`). The defense-in-depth claim in §2 is sound _given_ that invariant.
- Actual **bucket privacy flags** (public vs private) are set in Supabase Storage config; code comments and usage (`getPublicUrl` only for `avatars`) are consistent with the documented model but the bucket ACLs themselves were not read from the DB.
- Whether `VITE_DEMO_PASSWORD` / `VITE_SENTRY_DSN` are actually unset/set in the production build is an env/deploy concern not visible in source.
