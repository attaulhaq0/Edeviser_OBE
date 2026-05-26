# Implementation Plan — UI Consistency Global Fixes

## Overview

This plan implements 111 tasks across 7 phases to fix 26 UI consistency defects. It covers database migrations, shared design-system primitives, auth surfaces, role dashboard adoption, i18n coverage, property-based tests, monitoring, and a full-width global header with role-based notifications.

## Task Dependency Graph

```json
{
  "waves": [
    { "ids": ["1"] },
    { "ids": ["2", "3", "4", "5", "6", "7", "8", "9"] },
    { "ids": ["10"] },
    { "ids": ["11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22"] },
    { "ids": ["23", "24", "25", "26", "27", "28", "29", "30", "31", "32", "33", "34", "35"] },
    { "ids": ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45"] },
    { "ids": ["46", "47", "48", "49", "50", "51", "52", "53", "54", "55", "56", "57", "58", "59", "60", "61", "62", "63", "64", "65", "66", "67", "68", "69", "70", "71", "72", "73", "74"] },
    { "ids": ["75", "76", "77", "78", "79", "80", "81", "82"] },
    { "ids": ["83", "84", "85", "86", "87", "88", "89", "90", "91", "92", "93"] },
    { "ids": ["94", "95"] },
    { "ids": ["96", "97", "98", "99", "100", "101", "102", "103", "104", "105", "106", "107", "108"] },
    { "ids": ["109", "110", "111"] }
  ]
}
```

## Tasks

### Phase 0 — Exploration

- [x] 1. Write bug condition exploration property test
  - **Property 1: Bug Condition** — UI Consistency Global Defects (C(X) from design.md §2)
  - **CRITICAL**: This test MUST FAIL on the unfixed code — the failure confirms the 26 defect clauses are observable in the current build.
  - **DO NOT attempt to fix the test or the code when it fails in this task.** Document the counterexamples and proceed.
  - **GOAL**: Surface concrete counterexamples from the live codebase that demonstrate `isBugCondition(X)` (design.md §2) holds for at least one `n ∈ {1..26}`.
  - **Scoped PBT approach (design.md §2)**: Generate `X = { role ∈ {admin, coordinator, teacher, student, parent}, page ∈ everyRouteUnderRole(role), theme ∈ {light, dark}, locale ∈ {en, ar-QA}, profileState ∈ {new, resuming, completed-onboarding}, dataState ∈ {empty, populated, error} }` and assert the disjunction over the 26 `clause_1_n_holds(X)` predicates.
  - [x] 1.1 Create `src/__tests__/properties/uiConsistencyBugCondition.property.test.ts`
    - Use `fast-check` with `numRuns: 100` minimum.
    - `fc.record({ role, page, theme, locale, profileState, dataState })` generator.
    - Encode each of the 26 `clause_1_n_holds(X)` predicates as an individual `async` probe (DOM scan via Testing Library, performance mark for 1.20, AST scan for 1.26, etc.).
    - Property: `expect(atLeastOneClauseHolds(X)).toBe(true)` — the test passes **if** the bug is observable.
    - Wire the probes through the existing test harness (`vitest`, `@testing-library/react`, `jsdom`) and the existing mock Supabase stub so the test runs without a live DB.
  - Run test on the UNFIXED codebase via `npm test -- uiConsistencyBugCondition`.
  - **EXPECTED OUTCOME**: test PASSES (i.e. at least one clause holds → the bug exists → the exploration succeeded). Note the counterexamples in the PR description.
  - This file is **deleted in Task 93** once the 7 per-clause property tests (83–89) are green, because leaving it in CI would poison the build by design (it asserts the presence of a bug that no longer exists).
  - _Bug_Condition: isBugCondition(X) per design.md §2_
  - _Requirements: bugfix.md §Bug Analysis; clauses 1.1–1.26_

---

### Phase 1 — Database migrations + seed (Tasks 2 – 10)

Per design.md §5 (migration file plan) and ADR-12 … ADR-17 (multi-institution scalability, email verification, CDN avatars, rate limiting, translation memory).

- [x] 2. Migration `supabase/migrations/20260901000001_add_tour_progress_and_theme_preference.sql`

  - Add columns to `public.profiles`:
    - `tour_completed_at timestamptz`
    - `theme_preference text CHECK (theme_preference IN ('light','dark','system')) DEFAULT 'system'`
    - `language_preference text CHECK (language_preference IN ('en','ar')) DEFAULT 'en'` _(moved to dedicated migration in task 7; placeholder here only if Task 7 fails review)_
  - Backfill `theme_preference = 'system'` for existing rows.
  - Extend `profiles` RLS: users may UPDATE their own `tour_completed_at`, `theme_preference`.
  - _Design: ADR-01, ADR-02_
  - _Requirements: 2.10, 2.15_

- [x] 3. Migration `supabase/migrations/20260901000002_add_handle_new_user_trigger.sql`

  - Create `public.handle_new_user()` function (`SECURITY DEFINER`, `SET search_path = public`) that `AFTER INSERT ON auth.users` inserts a matching `public.profiles` row.
  - Read `institution_id` + `role` + `full_name` from `NEW.raw_user_meta_data`.
  - **Extended per ADR-13**: validate the requested `role` against the target institution's `join_mode` column (open / invite_only / domain_restricted); reject invalid (`RAISE EXCEPTION`) when an anonymous self-signup requests a non-student role or when `join_mode = 'invite_only'` and no valid invite token was presented.
  - Set `profiles.status = 'pending_verification'` for `join_mode = 'open'`, else `'active'`.
  - Insert `audit_logs` row when the invited role is not `student` for admin review.
  - Attach trigger `on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user()`.
  - _Design: ADR-03, ADR-13, ADR-14_
  - _Requirements: 2.11, 2.12_

- [x] 4. Migration `supabase/migrations/20260901000003_tighten_avatars_bucket_policies.sql`

  - Drop the permissive avatars INSERT/UPDATE/DELETE policies (if any); re-create folder-scoped policies so only `storage.foldername(name)[1] = auth.uid()::text` may write.
  - Keep SELECT authenticated (existing `20260504033018_restrict_avatars_bucket_listing.sql`).
  - Set bucket `cache-control` default to `public, max-age=31536000, immutable` (ADR-15).
  - _Design: ADR-04, ADR-15_
  - _Requirements: 2.18_

- [x] 5. Migration `supabase/migrations/20260901000005_create_invitations_table.sql`

  - `CREATE TABLE public.invitations (id uuid PK, institution_id uuid FK NOT NULL, email citext NOT NULL, role text CHECK (role IN ('admin','coordinator','teacher','student','parent')) NOT NULL, token text UNIQUE NOT NULL, expires_at timestamptz NOT NULL DEFAULT now() + interval '7 days', used_at timestamptz, created_by uuid FK auth.users NOT NULL, created_at timestamptz DEFAULT now(), UNIQUE(institution_id, email, role))`.
  - Index `(token)` for accept-lookup, `(institution_id, used_at)` for admin dashboards.
  - Enable RLS. Policies:
    - `admin_insert`: admin of same institution can INSERT (WITH CHECK `auth_user_role() = 'admin' AND institution_id = auth_institution_id()`).
    - `admin_select`: admin of same institution can SELECT.
    - `admin_delete`: admin of same institution can DELETE unused invites.
    - **No** public policy — the accept-by-token flow goes through a `SECURITY DEFINER` function `get_invitation_by_token(token text) RETURNS invitations` that exposes invitation only by token presentation (never lists).
  - _Design: ADR-12, §5.3_
  - _Requirements: 2.11_

- [x] 6. Migration `supabase/migrations/20260901000006_add_institution_join_modes.sql`

  - Add to `public.institutions`:
    - `slug text` (backfill from existing name via slugify), then `UNIQUE NOT NULL`.
    - `logo_url text`.
    - `allowed_email_domains text[] DEFAULT '{}'`.
    - `join_mode text CHECK (join_mode IN ('open','invite_only','domain_restricted')) NOT NULL DEFAULT 'invite_only'`.
  - Backfill existing rows with `join_mode = 'invite_only'` (ADR-13 default, preserves existing trust boundary).
  - Add `profiles.email_verified_at timestamptz` and `profiles.status text CHECK (status IN ('active','pending_verification','suspended')) NOT NULL DEFAULT 'active'`.
  - Public-anon SELECT policy on `institutions` for the browse-during-signup list (`id, slug, name, logo_url, join_mode` columns only via a view `public.institutions_public`).
  - _Design: ADR-13, ADR-14_
  - _Requirements: 2.11_

- [x] 7. Migration `supabase/migrations/20260901000007_add_language_preference.sql`

  - Add `profiles.language_preference text CHECK (language_preference IN ('en','ar')) DEFAULT 'en'` (if not already added in Task 2).
  - Backfill `'en'` for existing rows.
  - Users may UPDATE their own `language_preference`.
  - _Design: §5.4, ADR-11_
  - _Requirements: 2.26_

- [x] 8. Migration `supabase/migrations/20260901000008_add_rate_limiting_audit.sql`

  - `CREATE TABLE public.rate_limit_events (id bigserial PK, ip_address inet NOT NULL, event_type text NOT NULL, occurred_at timestamptz DEFAULT now(), metadata jsonb)`.
  - Index `(ip_address, event_type, occurred_at DESC)` for windowed counts.
  - `CREATE TABLE public.blocked_ips (ip_address inet PK, blocked_until timestamptz NOT NULL, reason text, created_at timestamptz DEFAULT now())`.
  - Extend `audit_logs.event_type` check/enum to allow `signup_rate_limit_exceeded`, `invite_accept_rate_limit_exceeded`, `captcha_challenge_issued`.
  - RLS: service-role only (Edge Functions bypass RLS via service key).
  - _Design: ADR-16_
  - _Requirements: 2.11_

- [x] 9. Migration `supabase/migrations/20260901000004_seed_demo_data.sql` — scale-realistic seed

  - **Shape**: 3 institutions × (500 students + 50 teachers + 5 coordinators + 2 admins + 200 parents) = ~2,271 profiles total, with full 6-month history so dashboards never render empty in demo/staging.
  - Use deterministic UUIDs (`uuid_generate_v5(namespace, name)`) so reruns are idempotent.
  - [x] 9.1 Seed institutions
    - 3 rows with distinct `slug`s, `join_mode`s (one `open`, one `invite_only`, one `domain_restricted` with a sample `allowed_email_domains`), and placeholder `logo_url`s.
    - _Design: §5.4, ADR-13_
    - _Requirements: 2.11_
  - [x] 9.2 Seed profiles
    - Per institution: 500 students, 50 teachers, 5 coordinators, 2 admins, 200 parents.
    - Deterministic `full_name`, `email` (domain-aligned with `allowed_email_domains` of the domain-restricted institution), `role`, `institution_id`, `status = 'active'`, `theme_preference = 'system'`, `language_preference` mixed en/ar, `tour_completed_at = NULL` (tour will launch on first login per role).
    - _Design: §5.4, ADR-13, ADR-14_
    - _Requirements: 2.15, 2.21_
  - [x] 9.3 Seed programs + courses
    - 5 programs × 4 courses per institution (60 courses total) aligned to Qatar MOEHE program naming.
    - _Design: §5.4_
    - _Requirements: 2.22_
  - [x] 9.4 Seed semesters
    - Current semester + 1 past semester per institution, with realistic start/end dates.
    - _Design: §5.4_
    - _Requirements: 2.22_
  - [x] 9.5 Seed ILO/PLO/CLO chains with `outcome_mappings`
    - 6 ILOs per institution, 4 PLOs per program linked to ILOs (weights sum to 100 per child), 5 CLOs per course linked to PLOs (weights sum to 100 per child).
    - Enforce the domain rule: all `outcome_mappings.weight` for a given child-to-parent relationship sum to 100.
    - _Design: §5.4; domain-knowledge.md (OBE)_
    - _Requirements: 2.22_
  - [x] 9.6 Seed assignments + evidence + xp_transactions
    - 6 months of history: 2 assignments per course per month × 60 courses × 500 students.
    - Per evidence row: deterministic score, `created_at` spread across the 6-month window.
    - `xp_transactions` derived to produce realistic leaderboard/level distributions.
    - _Design: §5.4; domain-knowledge.md (OBE, gamification)_
    - _Requirements: 2.22_
  - [x] 9.7 Seed habit_tracking + grades + notifications + audit_logs
    - Habit tracking: 6 months of daily rows per student (some perfect days, some partials, some missed).
    - Grades: released grades for every submitted assignment.
    - Notifications: 10 per student across the 6-month window.
    - Audit logs: representative admin/coordinator actions per institution.
    - _Design: §5.4_
    - _Requirements: 2.22, 2.23_
  - [x] 9.8 Seed badge spotlight history + leaderboard state
    - Weekly badge spotlight rows for the past 12 weeks per institution (`week_start` = valid Mondays).
    - Materialized-view refresh so `leaderboard` queries return populated data on cold mount.
    - _Design: §5.4, §8.7_
    - _Requirements: 2.22_
  - [x] 9.9 Onboarding progress seeding — **bugfix 2.14 anchor**
    - For a single designated demo student account (documented in seed comments), set `onboarding_progress.current_step = 'welcome'` with all completion flags false so the first-time-login path can be demonstrated from step 1.
    - For every other student: randomize `current_step` across valid values to test the resume path without conflating it with first-time-login detection.
    - _Design: §5.4, §8.8; ADR-13_
    - _Requirements: 2.14_

- [x] 10. Regenerate `src/types/database.ts` via the protected script
  - Run `pwsh scripts/regen-types.ps1` (Windows) or `bash scripts/regen-types.sh` (macOS / Linux).
  - **Do not** use `npx supabase gen types … > src/types/database.ts` directly (corrupts the file on Windows per `types-regeneration.md`).
  - Verify file contains `export type Database` and size > 1 KB before committing.
  - _Design: §5; project convention (types-regeneration rule)_
  - _Requirements: 2.11, 2.15, 2.18_

---

### Phase 2 — Shared primitives: stores, hooks, lib (Tasks 11 – 22)

- [x] 11. Create `src/stores/themeStore.ts` (Zustand)

  - Slice: `{ themeMode: 'light' | 'dark' | 'system', setThemeMode(mode), effectiveTheme: 'light' | 'dark' (derived) }`.
  - Persist to `localStorage` (unauth) and to `profiles.theme_preference` (auth) via a subscribe-to-authStore bridge.
  - Apply `.dark` class on `document.documentElement` reactively when `effectiveTheme === 'dark'`.
  - _Design: ADR-01_
  - _Requirements: 2.10_

- [x] 12. Create `src/stores/tourStore.ts` (Zustand)

  - Slice: `{ tourActive: boolean, currentRoleTourId: UserRole | null, tourFeatureFlag: boolean, start(role), skip(), complete(role) }`.
  - `tourFeatureFlag` defaults to `false`; flipped to `true` globally in Task 90.
  - Persist `tourFeatureFlag` to `localStorage`; persist completion to `profiles.tour_completed_at` when auth.
  - _Design: ADR-02_
  - _Requirements: 2.15_

- [x] 13. Create `src/hooks/useTheme.ts`

  - Thin hook around `themeStore` exposing `{ themeMode, effectiveTheme, setThemeMode }`.
  - Writes to Supabase only when `auth.user` exists (uses `useStandardMutation` from Task 19 for error mapping).
  - _Design: ADR-01_
  - _Requirements: 2.10_

- [x] 14. Create `src/hooks/useOptimisticToggle.ts`

  - Signature: `useOptimisticToggle<TRow>({ queryKey, mutationFn, field }): { isChecked, onToggle, isOptimistic }`.
  - Implements TanStack Query `onMutate` → `onError` rollback → `onSettled` invalidate pattern.
  - `isOptimistic` flag for caller to render an adjacent Loader2 without disabling the Switch.
  - _Design: ADR-10_
  - _Requirements: 2.25_

- [x] 15. Create `src/hooks/useGuidedTour.ts`

  - Wraps `tourStore` + `react-joyride` `Joyride` instance; exposes `{ steps, run, stepIndex, onCallback }`.
  - Reads role from `AuthProvider`, selects the matching `{role}TourSteps` from `src/lib/tours/`.
  - Suppresses Radix `onInteractOutside` on Dialog/Sheet/Popover while `tourActive === true` (small helper `withTourAwareModal()`).
  - Respects `prefers-reduced-motion`.
  - _Design: ADR-02_
  - _Requirements: 2.15_

- [x] 16. Create `src/hooks/useAvatarUpload.ts`

  - Accepts `{ file: File }`; validates type/size with `avatarUploadSchema` (Task 21).
  - Resizes to ≤ 512×512 @ ≤ 150 KB via `browser-image-compression`.
  - Uploads to bucket `avatars` at key `{user_id}/{uuid}.{ext}`.
  - Updates `profiles.avatar_url`.
  - Invalidates `queryKeys.user.profile` + `queryKeys.user.list` so row avatars refresh across consumers.
  - _Design: ADR-04, ADR-15_
  - _Requirements: 2.18_

- [x] 17. Create `src/hooks/useInstitutionBrowse.ts`

  - Public-anon query on `institutions_public` view (slug, name, logo_url, join_mode).
  - Used by the signup institution-picker step; cached aggressively (5 min staleTime).
  - _Design: ADR-13_
  - _Requirements: 2.11_

- [x] 18. Create `src/hooks/useInviteUsers.ts`

  - `useMutation` for bulk invite: `{ institution_id, invites: [{ email, role }, ...] }`.
  - Calls the `send-invitation-email` Edge Function.
  - Logs to `audit_logs` on success; uses `mapSupabaseError` on failure.
  - _Design: ADR-12_
  - _Requirements: 2.11_

- [x] 19. Create `src/hooks/useStandardMutation.ts`

  - Wrapper around `useMutation` that auto-applies `mapSupabaseError` in `onError`, emits Sonner toast, logs raw error to Sentry (if configured).
  - Backward-compatible: existing `useMutation` call sites can migrate incrementally.
  - _Design: ADR-05_
  - _Requirements: 2.19_

- [x] 20. Create `src/lib/mapSupabaseError.ts`

  - Pure function `mapSupabaseError(err): { code: string; userMessage: string; fieldPath?: string }`.
  - Switch on PG codes 23505 (unique), 23503 (FK), 23502 (not-null), 23514 (check), 42501 (RLS).
  - Named-constraint table: `week_start_is_monday → { userMessage: 'Week start must be a Monday', fieldPath: 'week_start' }`, plus other known constraints from the current schema.
  - Arabic strings routed through `t()` at call sites (this file returns English keys; consumers call `t(userMessage)` to localize).
  - _Design: ADR-05_
  - _Requirements: 2.19, 2.26_

- [x] 21. Create `src/lib/schemas/avatarUpload.ts` + `src/lib/schemas/invitation.ts`

  - `avatarUploadSchema`: file type ∈ {png, jpg, webp}, size ≤ 2 MB.
  - `invitationSchema`: email, role ∈ enum, institution_id uuid; bulk variant accepts an array.
  - Exports shared types for form + Edge Function reuse.
  - _Design: ADR-04, ADR-12_
  - _Requirements: 2.11, 2.18, 2.19_

- [x] 22. Create `src/lib/i18nHelpers.ts`
  - Intl formatters factory: `formatDate(value, locale)`, `formatNumber(value, locale)`, `formatRelativeTime(value, locale)`, with `ar-QA` defaults (Arabic-Indic numerals, Arabic month names, Hijri-compatible formatting where relevant).
  - Single source of truth — call sites never instantiate `Intl.DateTimeFormat` directly.
  - _Design: ADR-11_
  - _Requirements: 2.26_

---

### Phase 2 — Shared components (Tasks 23 – 35)

- [x] 23. Create `src/components/shared/WelcomeHero.tsx`

  - Props: `{ name: string; role: UserRole; subtitle: string; stats?: ReactNode }`.
  - Renders the dark hero gradient (`linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #312e81 100%)`) with white text per design-system.md.
  - Greeting derived from `new Date().getHours()` + user's timezone.
  - Exposes `data-tour="welcome-hero"` anchor.
  - _Design: ADR-07, §8.1_
  - _Requirements: 2.21_

- [x] 24. Create `src/components/shared/TopBar.tsx`

  - Layout: `[left slot: breadcrumb / page title] … [right cluster: LanguageSwitcher] [ProfileDropdown] [SettingsIcon]` with RTL mirror.
  - Replaces the bespoke top bar in each role layout.
  - Exposes `data-tour="top-bar"`, `data-tour="language-switcher"`, `data-tour="profile"`, `data-tour="settings"`.
  - _Design: ADR-02, §8.2_
  - _Requirements: 2.13, 2.16_

- [x] 25. Create `src/components/shared/ProfileDropdown.tsx`

  - Avatar + full name + chevron; Shadcn `DropdownMenu` with items:
    - My Profile (routes to `/{role}/profile`)
    - Take the tour (calls `tourStore.start(role)`)
    - Theme (light / dark / system radio submenu)
    - Sign out (calls `supabase.auth.signOut()` then `navigate('/login')`)
  - Avatar renders transformed URL via Supabase Storage image transformation (`?width=64&height=64&resize=cover`) per ADR-15; falls back to initials if `avatar_url` is null.
  - _Design: ADR-02, §8.3_
  - _Requirements: 2.12, 2.13, 2.18_

- [x] 26. Create `src/components/shared/AvatarUpload.tsx`

  - Shadcn Card + dropzone, wired to `useAvatarUpload`.
  - Previews the resized image before upload confirmation.
  - Emits Sonner toasts on success/failure via `useStandardMutation`.
  - _Design: ADR-04_
  - _Requirements: 2.18_

- [x] 27. Create `src/components/shared/ThemeToggle.tsx`

  - Tri-state (light / dark / system) segmented control backed by `useTheme`.
  - Honors `prefers-color-scheme` when `themeMode === 'system'`.
  - _Design: ADR-01_
  - _Requirements: 2.10_

- [x] 28. Create `src/components/shared/GuidedTour.tsx`

  - Wraps `react-joyride`; consumes `useGuidedTour`.
  - Tour dialog styling respects both light and dark themes and RTL; `prefers-reduced-motion` disables the `Joyride` transitions.
  - _Design: ADR-02, §8.4_
  - _Requirements: 2.15_

- [x] 29. Create `src/components/shared/MondayWeekPicker.tsx`

  - Shadcn `Popover` + `react-day-picker` configured to disable non-Monday days (`disabled={(day) => day.getDay() !== 1}`).
  - Zod refinement used in every consuming form: `z.date().refine((d) => d.getDay() === 1, 'Week start must be a Monday')`.
  - Prevents the `week_start_is_monday` CHECK violation at input time (ADR-05 prevention-at-input strategy).
  - _Design: ADR-05, §8.9_
  - _Requirements: 2.19_

- [x] 30. Extend `src/components/shared/EmptyState.tsx`

  - Export shape `{ icon: LucideIcon; title: string; description: string; cta?: { label: string; onClick: () => void } }`.
  - Ship 8 named variants as named exports: `NoCourses`, `NoProgress`, `NoUsers`, `NoNotifications`, `NoBadges`, `NoEvidence`, `NoMarketplaceItems`, `NoLinkedStudents`.
  - All copy routed through `t()` (ADR-11).
  - _Design: ADR-08, §8.6_
  - _Requirements: 2.22, 2.26_

- [x] 31. Update `src/index.css` — full dark-mode HSL token pass (ADR-01)

  - Extend `:root` (light) and `.dark` (dark) blocks with complete HSL variables for `--background`, `--foreground`, `--card`, `--card-foreground`, `--popover`, `--popover-foreground`, `--primary`, `--primary-foreground`, `--secondary`, `--secondary-foreground`, `--muted`, `--muted-foreground`, `--accent`, `--accent-foreground`, `--destructive`, `--destructive-foreground`, `--border`, `--input`, `--ring`.
  - Confirm Tailwind v4 `@custom-variant dark (&:where(.dark, .dark *))` is present (already in file per design.md §8.1).
  - Brand gradient CTA text pinned to `text-white` regardless of theme (prevents clause 1.10 black-text regression).
  - _Design: ADR-01, §8.1_
  - _Requirements: 2.10, 3.1, 3.4, 3.7, 3.8_

- [x] 32. Modify Shadcn UI surfaces for dark-mode token compliance

  - Files: `src/components/ui/dialog.tsx`, `src/components/ui/sheet.tsx`, `src/components/ui/popover.tsx`, `src/components/ui/dropdown-menu.tsx`, `src/components/ui/select.tsx`.
  - Force `bg-background` (or `bg-popover` where appropriate) and `text-foreground` / `text-popover-foreground` instead of stray `bg-white text-black` literals.
  - Fixes clauses 1.5 (Create Bonus XP Event dialog black surface) and 1.10 (dark-mode surface leakage).
  - _Design: §8.1, §8.6_
  - _Requirements: 2.5, 2.10_

- [x] 33. Modify `src/components/shared/DataTable.tsx`

  - Header row `bg-muted text-foreground` (always visible; no hover-only visibility).
  - Body rows `text-foreground` on `bg-background`, alternating zebra via `even:bg-muted/40` optional.
  - Remove any `text-transparent` / `opacity-0` on header cells (clauses 1.7, 1.8).
  - _Design: §8.6_
  - _Requirements: 2.7, 2.8_

- [x] 34. Create role-specific tour step arrays

  - Files (one per role): `src/lib/tours/adminTour.ts`, `coordinatorTour.ts`, `teacherTour.ts`, `studentTour.ts`, `parentTour.ts`.
  - Each exports `{role}TourSteps: Step[]` with 7 steps targeting `data-tour` anchors: top-bar → sidebar nav → KPI row → primary action → role-specific card → language/theme switcher → profile dropdown.
  - All copy routed through `t('tour.{role}.stepN.title'|'content')`.
  - _Design: ADR-02, §8.5_
  - _Requirements: 2.15, 2.26_

- [x] 35. Install npm dependencies
  - Runtime: `react-joyride`, `browser-image-compression`, `react-day-picker` (verify not already present).
  - Dev: `i18next-cli`.
  - Pinned to exact versions; run `npm install --save-exact <pkg>@<version>`.
  - _Design: ADR-02, ADR-04, ADR-11_
  - _Requirements: 2.15, 2.18, 2.26_

---

### Phase 2 — Auth surfaces (Tasks 36 – 45)

- [x] 36. Create `src/pages/auth/SignUpPage.tsx` + `src/lib/schemas/signUpSchema.ts`

  - Two-step wizard:
    - **Step 1**: choose institution — Shadcn `Command` list populated from `useInstitutionBrowse` with logo + name + slug + join-mode badge.
    - **Step 2**: account form — email, password, full name; default role = `student`.
  - Conditional logic per institution `join_mode`:
    - `open`: allow signup; show "You'll need to verify your email" copy.
    - `invite_only`: block submit with "This institution requires an invitation — ask your admin", link to contact page.
    - `domain_restricted`: validate email domain client-side against `allowed_email_domains`.
  - Calls `supabase.auth.signUp({ email, password, options: { data: { full_name, institution_id } } })`.
  - hCaptcha/Turnstile token attached to the signup payload (Task 45).
  - _Design: ADR-03, ADR-13, ADR-14, §8.3_
  - _Requirements: 2.11_

- [x] 37. Create `src/pages/auth/AcceptInvitePage.tsx`

  - Route: `/accept-invite/:token`.
  - On mount, calls `rpc('get_invitation_by_token', { token })` (SECURITY DEFINER function from Task 5).
  - Shows pre-resolved role + institution; user sets password + full name; submit calls `supabase.auth.signUp(…, { data: { institution_id, role, invitation_id } })`.
  - `handle_new_user()` (Task 3) reads the metadata and stamps `profiles.role` to the invited role (skipping the default `student`).
  - Stamps `invitations.used_at` via a subsequent `rpc('consume_invitation', { token })`.
  - _Design: ADR-12_
  - _Requirements: 2.11_

- [x] 38. Create `src/pages/admin/users/InviteUsersPage.tsx`

  - Admin-only (guarded by `RouteGuard role="admin"`).
  - Bulk CSV invite: drag-drop or paste; Zod `invitationSchema.array()`.
  - Shows per-row status (pending / sent / failed) post-submit; uses `useInviteUsers`.
  - _Design: ADR-12_
  - _Requirements: 2.11_

- [x] 39. Create `supabase/functions/send-invitation-email/index.ts`

  - Deno Edge Function following the standard pattern (CORS preflight, service-role client, structured JSON error).
  - Input: `{ institution_id, invites: [{ email, role }] }`.
  - For each row: insert into `invitations`, generate a signed `token`, call Resend with the invite email template (ILO/PLO/CLO-free copy — this is an auth email).
  - Rate limits: 100 invites / admin / hour (ADR-16).
  - Secrets: `RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`.
  - _Design: ADR-12, ADR-16_
  - _Requirements: 2.11_

- [x] 40. Modify `src/pages/LoginPage.tsx`

  - Add "Create account" link below the sign-in form → routes to `/signup`.
  - Respect locale (ar link uses Arabic label via `t('login.createAccount')`).
  - _Design: ADR-03, §8.3_
  - _Requirements: 2.11_

- [x] 41. Modify `src/router/AppRouter.tsx`

  - Register routes: `/signup`, `/accept-invite/:token`, `/admin/users/invite`.
  - `/signup` and `/accept-invite/:token` are public (no `RouteGuard`).
  - `/admin/users/invite` gated to `role === 'admin'`.
  - _Design: ADR-03, ADR-12, §8.3_
  - _Requirements: 2.11_

- [x] 42. Modify `src/providers/AuthProvider.tsx`

  - Extend the profile fetch to include `avatar_url`, `tour_completed_at`, `theme_preference`, `language_preference`, `status`.
  - Push `theme_preference` + `language_preference` into `themeStore` + `i18n.changeLanguage()` on session hydrate.
  - Show email-verification banner when `status === 'pending_verification'` (Task 44).
  - _Design: ADR-01, ADR-02, ADR-11, ADR-14_
  - _Requirements: 2.10, 2.11, 2.15, 2.18, 2.26_

- [x] 43. Signup rate-limit Edge Function middleware

  - File: `supabase/functions/_shared/rateLimitMiddleware.ts` (shared helper for Edge Functions).
  - Checks `rate_limit_events` for the caller's IP over the configured window; rejects with 429 if exceeded.
  - Writes a `rate_limit_events` row on every check; writes an `audit_logs` entry on rejection (`event_type = 'signup_rate_limit_exceeded'`).
  - Wired into `send-invitation-email` and a new `signup-rate-check` Edge Function invoked by the signup page before the Supabase auth call.
  - _Design: ADR-16_
  - _Requirements: 2.11_

- [x] 44. Email-verification banner (ADR-14)

  - Shared component `src/components/shared/EmailVerificationBanner.tsx` rendered by every role layout when `profile.status === 'pending_verification'`.
  - Provides a "Resend verification email" button that calls `supabase.auth.resend({ type: 'signup', email })`.
  - Dismissible per-session (not per-user — persistent until verified).
  - _Design: ADR-14_
  - _Requirements: 2.11_

- [x] 45. Integrate hCaptcha/Turnstile (ADR-16)
  - Add component `src/components/shared/CaptchaChallenge.tsx` rendered conditionally on `/signup` and `/accept-invite` when the caller's IP has logged ≥ 3 signup events in the last hour (read via `rpc('check_rate_limit_approaching', …)`).
  - Passes the token to the Supabase auth call; server-side `signup-rate-check` Edge Function verifies the token via the provider's verify endpoint.
  - Env: `VITE_CAPTCHA_SITE_KEY`; server secret in Supabase Dashboard.
  - _Design: ADR-16_
  - _Requirements: 2.11_

---

### Phase 3 — Admin dashboard (Tasks 46 – 50)

- [x] 46. AdminLayout: adopt `<TopBar />`; remove QuickStartChecklist mount

  - File: `src/pages/admin/AdminLayout.tsx`.
  - Replace bespoke top-bar markup with `<TopBar />` (Task 24).
  - Remove the `<QuickStartChecklist />` mount (deletion of the component itself happens in Task 91).
  - Render `<EmailVerificationBanner />` above the main outlet when `profile.status === 'pending_verification'`.
  - _Design: ADR-02, ADR-07, §8.2_
  - _Requirements: 2.9, 2.12, 2.13, 2.16_

- [x] 47. AdminDashboard: add `<WelcomeHero />` as first child

  - File: `src/pages/admin/AdminDashboard.tsx`.
  - Insert `<WelcomeHero role="admin" name={profile.full_name} subtitle={t('admin.welcome.subtitle')} />` as the first child of the outer `<div className="space-y-6">`.
  - Remove any pre-existing bespoke greeting block.
  - **Student-parity note (2026-05-10):** this task is the direct Admin counterpart to Task 68's Student hero (clause 3.21) — the Admin dashboard currently opens cold into KPI tiles with no greeting while Student has "Good morning, {name} 👋". Post-fix the Admin hero SHALL render the same `<WelcomeHero>` primitive (same dark gradient, same greeting computation, same `stats` slot pattern) so the two dashboards share first-impression parity. The optional `stats` slot for Admin SHALL surface `{ totalUsers, atRiskCount }` per clause 2.21. This task jointly satisfies clause 2.21 and supports clause 2.32 (adding vertical weight above the fold reduces the perceived void below short content).
  - _Design: ADR-07, §8.1_
  - _Requirements: 2.21_

- [x] 48. Admin list pages: insert `<EmptyState />` on every list/grid with `data?.length === 0`

  - Files touched: `AdminUsersPage.tsx`, `AdminProgramsPage.tsx`, `AdminCoursesPage.tsx`, `AdminBadgesPage.tsx`, `AdminBonusXPPage.tsx`, `AdminBadgeSpotlightPage.tsx`, `AdminGameSlotsPage.tsx`, `AdminMarketplacePage.tsx`, `AdminAuditLogPage.tsx`, `AdminPendingOnboardingPage.tsx`, `AdminNotificationsPage.tsx`, and any other admin list view.
  - Use the appropriate named `EmptyState` variant from Task 30.
  - _Design: ADR-08, §8.6_
  - _Requirements: 2.22_

- [x] 49. Admin backend-bound switches: adopt `useOptimisticToggle`

  - Audit Shadcn `Switch` usages bound to mutations in admin pages (e.g., feature toggles on Admin Settings, course publish flags); migrate to `useOptimisticToggle`.
  - Confirm adjacent Loader2 renders while `isOptimistic === true` without disabling the switch.
  - _Design: ADR-10_
  - _Requirements: 2.25_

- [x] 50. Admin guided tour: wire `<GuidedTour />` with `adminTourSteps`
  - Mount `<GuidedTour />` inside `AdminLayout`.
  - Ensure `data-tour="…"` anchors are present on: top-bar cluster (from Task 24), sidebar nav items, KPI row (Task 47), Invite Users CTA, Settings icon.
  - Tour auto-starts when `tourFeatureFlag === true && !profile.tour_completed_at && currentRoleTourId === 'admin'`.
  - _Design: ADR-02, §8.5_
  - _Requirements: 2.15_

---

### Phase 3 — Coordinator dashboard (Tasks 51 – 55)

- [x] 51. CoordinatorLayout: adopt `<TopBar />`; remove QuickStartChecklist mount

  - File: `src/pages/coordinator/CoordinatorLayout.tsx`.
  - Same substitutions as Task 46.
  - _Design: ADR-02, §8.2_
  - _Requirements: 2.9, 2.12, 2.13, 2.16_

- [x] 52. CoordinatorDashboard: add `<WelcomeHero />` as first child

  - File: `src/pages/coordinator/CoordinatorDashboard.tsx`.
  - `<WelcomeHero role="coordinator" name={profile.full_name} subtitle={t('coordinator.welcome.subtitle')} />`.
  - _Design: ADR-07, §8.1_
  - _Requirements: 2.21_

- [x] 53. Coordinator list pages: insert `<EmptyState />` on every list/grid

  - Files: `CoordinatorProgramsPage.tsx`, `CoordinatorCurriculumMatrixPage.tsx`, `CoordinatorPLOsPage.tsx`, `CoordinatorCQIPage.tsx`, `CoordinatorCourseFilesPage.tsx`, and any other coordinator list view.
  - _Design: ADR-08_
  - _Requirements: 2.22_

- [x] 54. Coordinator backend-bound switches: adopt `useOptimisticToggle`

  - Audit and migrate (e.g., PLO publish flags, CQI action-plan status toggles).
  - _Design: ADR-10_
  - _Requirements: 2.25_

- [x] 55. Coordinator guided tour: wire `<GuidedTour />` with `coordinatorTourSteps`
  - `data-tour` anchors on Curriculum Matrix, CQI action plans, PLO list, etc.
  - _Design: ADR-02, §8.5_
  - _Requirements: 2.15_

---

### Phase 3 — Teacher dashboard (Tasks 56 – 60)

- [x] 56. TeacherLayout: adopt `<TopBar />`; remove QuickStartChecklist mount

  - File: `src/pages/teacher/TeacherLayout.tsx`.
  - _Design: ADR-02, §8.2_
  - _Requirements: 2.9, 2.12, 2.13, 2.16_

- [x] 57. TeacherDashboard: add `<WelcomeHero />` as first child

  - File: `src/pages/teacher/TeacherDashboard.tsx`.
  - _Design: ADR-07_
  - _Requirements: 2.21_

- [x] 58. Teacher list pages: insert `<EmptyState />` on every list/grid

  - Files: `TeacherCoursesPage.tsx`, `TeacherAssignmentsPage.tsx`, `TeacherGradingQueuePage.tsx`, `TeacherCLOsPage.tsx`, `TeacherRubricsPage.tsx`, and any other teacher list view.
  - _Design: ADR-08_
  - _Requirements: 2.22_

- [x] 59. Teacher backend-bound switches: adopt `useOptimisticToggle`

  - E.g., assignment publish flag, rubric lock toggle.
  - _Design: ADR-10_
  - _Requirements: 2.25_

- [x] 60. Teacher guided tour: wire `<GuidedTour />` with `teacherTourSteps`
  - `data-tour` anchors on Grading Queue, Assignments, Rubrics, CLOs.
  - _Design: ADR-02, §8.5_
  - _Requirements: 2.15_

---

### Phase 3 — Parent dashboard (Tasks 61 – 65)

- [x] 61. ParentLayout: adopt `<TopBar />`; remove QuickStartChecklist mount

  - File: `src/pages/parent/ParentLayout.tsx`.
  - _Design: ADR-02, §8.2_
  - _Requirements: 2.9, 2.12, 2.13, 2.16_

- [x] 62. ParentDashboard: add `<WelcomeHero />` as first child

  - File: `src/pages/parent/ParentDashboard.tsx`.
  - _Design: ADR-07_
  - _Requirements: 2.21_

- [x] 63. Parent list views: insert `<EmptyState />` on every list/grid

  - Files: `ParentLinkedStudentsPage.tsx`, `ParentProgressPage.tsx`, `ParentNotificationsPage.tsx`, any other parent list view.
  - Use `NoLinkedStudents` variant when parent has no linked students.
  - _Design: ADR-08_
  - _Requirements: 2.22_

- [x] 64. Parent backend-bound switches: adopt `useOptimisticToggle`

  - E.g., notification opt-in per linked student.
  - _Design: ADR-10_
  - _Requirements: 2.25_

- [x] 65. Parent guided tour: wire `<GuidedTour />` with `parentTourSteps`
  - `data-tour` anchors on Linked Students, Progress overview, Notification preferences.
  - _Design: ADR-02, §8.5_
  - _Requirements: 2.15_

---

### Phase 3 — Student dashboard (last; onboarding-coupled) (Tasks 66 – 70)

Student goes last because of coupling with onboarding wizard (clause 2.14 + 2.20).

- [x] 66. StudentOnboardingWizard: first-time-login detection + 2-phase complete (clauses 2.14, 2.20)

  - File: `src/pages/student/onboarding/OnboardingWizard.tsx`.
  - Add first-time-login check: compare `profile.created_at` to `profile.onboarding_progress.updated_at`; if `onboarding_progress` has not been advanced by an authenticated action, force `current_step = 'welcome'` regardless of seeded value.
  - Seed data sets demo student to `current_step = 'welcome'` (Task 9.9), so this check protects the genuine first-time path.
  - Optimistic navigation on "Complete & Go to Dashboard" (ADR-06): call `navigate('/student/dashboard')` **before** awaiting `processOnboarding.mutateAsync(…)`; surface mutation state via `queryClient.isMutating` as a non-blocking `<Progress>` in the top bar.
  - On server failure, Sonner toast with Retry action; `processOnboarding` re-runnable via the retry handler.
  - _Design: ADR-06, §8.8_
  - _Requirements: 2.14, 2.20_

- [x] 67. StudentLayout: adopt `<TopBar />`; remove QuickStartChecklist mount

  - File: `src/pages/student/StudentLayout.tsx`.
  - _Design: ADR-02, §8.2_
  - _Requirements: 2.9, 2.12, 2.13, 2.16_

- [x] 68. StudentDashboard: keep existing hero, thread through `<WelcomeHero />`; parallelize cold queries; lazy-mount below-fold sections (clause 2.20)

  - File: `src/pages/student/StudentDashboard.tsx`.
  - Migrate existing student greeting into `<WelcomeHero role="student" … stats={<XpLevelStreakChips />} />` to preserve Student hero output (clause 3.21) while standardizing across roles.
  - Replace parallel-blocking fetches with `useQueries` so above-fold (courses summary, XP/level/streak) renders first; below-fold sections (leaderboard, badges grid, habit heatmap detail) lazy-mount via `IntersectionObserver` or `React.lazy`.
  - Realtime channel subscription moved to an effect that runs after first paint.
  - _Design: ADR-06, ADR-07, §8.1, §8.10_
  - _Requirements: 2.20, 2.21_

- [x] 69. Student list/grid pages: insert `<EmptyState />` on every list/grid; habit heatmap fixes (clauses 2.22, 2.23, 2.24)

  - Files: `StudentCoursesPage.tsx`, `StudentProgressPage.tsx`, `StudentAssignmentsPage.tsx`, `StudentLeaderboardPage.tsx`, `StudentBadgesPage.tsx`, `StudentMarketplacePage.tsx`, `StudentEvidencePage.tsx`, `StudentNotificationsFeed.tsx`, and any other student list view.
  - **Habit heatmap legend fix (clause 2.23)**: correct the card padding so the legend swatch row is not clipped; wrap the swatch row in `<div className="flex items-center gap-2 flex-wrap">` with explicit `min-w-0` to prevent truncation.
  - **Habit heatmap hover smoothness (clause 2.24)**: wrap the grid in a single `<TooltipProvider delayDuration={200} skipDelayDuration={100}>`; wrap each cell in `React.memo` keyed by `${year}-${month}-${day}`; add `transition-transform duration-150 hover:scale-110` with `@media (prefers-reduced-motion)` disabling the zoom.
  - _Design: ADR-08, ADR-09, §8.6_
  - _Requirements: 2.22, 2.23, 2.24_

- [x] 70. Student guided tour + remaining micro-fixes (clauses 2.15, 2.25)
  - Wire `<GuidedTour />` with `studentTourSteps`; `data-tour` anchors on XP card, streak card, leaderboard, habit heatmap, assignments.
  - Migrate Wellness opt-in and Public profile switches to `useOptimisticToggle` (clause 2.25).
  - _Design: ADR-02, ADR-10, §8.5_
  - _Requirements: 2.15, 2.25_

---

### Phase 3 — Targeted fixes (Tasks 71 – 74)

- [x] 71. Admin Pending Onboarding Remind button (clause 2.17)

  - File: `src/pages/admin/AdminPendingOnboardingPage.tsx`.
  - Wire the Remind button to `send-onboarding-reminder` Edge Function via `useStandardMutation`; disable + Loader2 during call; Sonner success toast with recipient email; error toast with backend message; server-side dedupe per `(student_id, hour_bucket)` in the Edge Function.
  - Row-level idempotency guard: store the last-sent timestamp in `profiles.last_reminder_sent_at`; client-side debounce ≥ 1 s.
  - _Design: §8.7_
  - _Requirements: 2.17_

- [x] 72. Badge Spotlight: MondayWeekPicker + Zod Monday refinement (clause 2.19)

  - Files: `src/pages/admin/AdminBadgeSpotlightPage.tsx`, `src/pages/admin/BadgeSpotlightForm.tsx`.
  - Replace any free-form date input for `week_start` with `<MondayWeekPicker />` (Task 29).
  - Zod schema refinement: `z.date().refine((d) => d.getDay() === 1, { message: t('errors.weekStartMonday') })`.
  - Server rejection via `mapSupabaseError` maps `week_start_is_monday` to field-level message — belt-and-suspenders.
  - _Design: ADR-05, §8.9_
  - _Requirements: 2.19_

- [x] 73. Profile pages: wire `<AvatarUpload />` across all roles (clause 2.18)

  - Files: `src/pages/admin/AdminProfilePage.tsx`, `src/pages/coordinator/CoordinatorProfilePage.tsx`, `src/pages/teacher/TeacherProfilePage.tsx`, `src/pages/student/StudentProfilePage.tsx`, `src/pages/parent/ParentProfilePage.tsx`.
  - Insert `<AvatarUpload />` in each profile page's identity card.
  - Confirm Supabase Storage image-transformation URLs are used at row/top-bar consumer sites (64 px, 32 px, 128 px) per ADR-15.
  - _Design: ADR-04, ADR-15_
  - _Requirements: 2.18_

- [x] 74. `vite.config.ts`: route-level code-splitting for the 5 role dashboards (clause 2.20 TTI target)
  - Configure `manualChunks` or rely on `React.lazy` route imports in `AppRouter.tsx` so the initial bundle does not ship all five role trees.
  - Verify TTI target < 1500 ms on cold student dashboard load (validated by property test 89).
  - _Design: ADR-06, §8.10_
  - _Requirements: 2.20_

---

### Phase 4 — i18n coverage (Tasks 75 – 82)

- [x] 75. Install + configure `i18next-cli`

  - Create `i18next-cli.config.ts` at repo root with `input: ['src/**/*.{ts,tsx}']`, `output: 'src/locales/{{lng}}/{{ns}}.json'`, `otherLngs: ['ar']`, `translationMemory: 'src/locales/_translation-memory.json'`.
  - _Design: ADR-11, ADR-17_
  - _Requirements: 2.26_

- [x] 76. Extract all `t()` calls

  - Run `npx i18next-cli extract` and commit the updated `src/locales/en/*.json` files.
  - Confirm the extractor surfaces every namespace used across the codebase.
  - _Design: ADR-11_
  - _Requirements: 2.26_

- [x] 77. Write Qatar MOEHE MSA glossary

  - File: `src/locales/ar/glossary.md`.
  - Formal Qatar Ministry of Education and Higher Education (MOEHE) MSA terminology for OBE/accreditation concepts: ILO / PLO / CLO, Bloom's Taxonomy levels (Remembering … Creating), assessment, curriculum, accreditation, CQI, attainment, evidence, etc.
  - Serves as the translator reference for Task 78 and future languages.
  - _Design: ADR-11_
  - _Requirements: 2.26_

- [x] 78. Translate missing `ar.json` keys per glossary

  - Files: `src/locales/ar/*.json` for each namespace.
  - Every key present in `en/*.json` must have an `ar` counterpart (validated by property test 84).
  - _Design: ADR-11_
  - _Requirements: 2.26_

- [x] 79. Refactor hard-coded English JSX text to use `t()`

  - Sweep `src/pages/**/*.tsx` and `src/components/**/*.tsx`.
  - Every JSX text node that isn't in the allowlist (Task 82) must route through `t()`.
  - _Design: ADR-11_
  - _Requirements: 2.26_

- [x] 80. Commit `src/locales/_translation-memory.json` (ADR-17)

  - Auto-generated by `i18next-cli` on extraction.
  - Preserves past translations across refactors so future renames don't lose translator work.
  - _Design: ADR-17_
  - _Requirements: 2.26_

- [x] 81. Wire Intl formatters

  - Replace every bespoke `Intl.DateTimeFormat` / `Intl.NumberFormat` / `Intl.RelativeTimeFormat` call with the helpers from `src/lib/i18nHelpers.ts` (Task 22).
  - Confirm `ar-QA` is the locale tag in Arabic (not generic `ar`).
  - _Design: ADR-11_
  - _Requirements: 2.26_

- [x] 82. Update `audit/baselines/i18n-allowlist.json` with technical strings
  - Append: `MB`, `KB`, `%`, `URL`, `Edeviser`, `ILO`, `PLO`, `CLO`, `XP`, `CQI` (and any other technical acronyms / brand names that intentionally remain untranslated).
  - This allowlist is consumed by property test 84.
  - _Design: ADR-11_
  - _Requirements: 2.26_

---

### Phase 4-5 — Property tests (MUST PASS after fixes) (Tasks 83 – 89)

Each property test encodes the per-clause fix-checking AND preservation predicates per design.md §2 (`clause_2_n_holds(X)` ∧ `clause_3_n_holds(X_original, X_fixed)`). `fast-check` with minimum 100 iterations per project convention.

- [x] 83. `src/__tests__/properties/uiConsistency.property.test.ts`

  - **Property 2: Preservation** — Design-System Compliance (clauses 1.1–1.10, 2.1–2.10, 3.1–3.10)
  - **IMPORTANT**: These tests PASS on the fixed code and document the observed non-buggy behavior to be preserved.
  - fast-check `fc.record({ role, page, theme })` over every route × {light, dark}.
  - Assertions: brand-gradient CTAs equal the canonical gradient token; dialog/sheet/popover/dropdown surfaces use `bg-background`/`bg-popover`; no invisible text (contrast ratio via DOM-scan heuristic); no white strip above gradient section headers; KPI empty state renders the documented placeholder rather than bare `0`.
  - Preservation snapshot: non-buggy surfaces DOM-snapshot-matches pre-fix baseline at `audit/baselines/deployed-fixtures.json`.
  - numRuns: 100 minimum.
  - _Design: ADR-01, ADR-08, §2, §6_
  - _Requirements: 2.1–2.10, 3.1–3.10_

- [x] 84. `src/__tests__/properties/i18nCoverage.property.test.ts`

  - **Property 3: Preservation** — Arabic Translation Coverage (clauses 1.26, 2.26, 3.26)
  - AST scan of `src/pages/**/*.tsx` and `src/components/**/*.tsx`: every JSX text node routes through `t()`, excepting entries in `audit/baselines/i18n-allowlist.json` (Task 82).
  - Key-parity check: every key in `en/*.json` has a corresponding `ar/*.json` entry.
  - Intl formatter use enforced: no raw `new Intl.…` outside `src/lib/i18nHelpers.ts`.
  - Preservation: existing Arabic strings unchanged byte-for-byte versus pre-fix `ar/*.json`.
  - _Design: ADR-11_
  - _Requirements: 2.26, 3.26_

- [x] 85. `src/__tests__/properties/authSurfaces.property.test.ts`

  - **Property 4: Preservation** — Auth + Profile + Settings Affordances (clauses 1.11–1.13, 1.16, 2.11–2.13, 2.16, 3.11–3.13, 3.16)
  - Render each role layout; assert `TopBar` exposes language switcher → profile dropdown → Settings icon in that order (and RTL-mirrored in Arabic).
  - Render `/login`; assert "Create account" link is visible and routes to `/signup`.
  - Render `/signup`; assert the institution-picker step and account-form step exist.
  - Render `/accept-invite/<valid-token>`; assert pre-resolved role renders.
  - Preservation: existing sign-in flow returns a session for an existing user; existing `/login` layout unchanged beyond the added link.
  - _Design: ADR-02, ADR-03, ADR-12, ADR-13_
  - _Requirements: 2.11–2.13, 2.16, 3.11–3.13, 3.16_

- [x] 86. `src/__tests__/properties/onboardingFirstStep.property.test.ts`

  - **Property 5: Preservation** — First-Time Student Onboarding (clauses 1.14, 2.14, 3.14)
  - fast-check property: for any profile where `onboarding_progress.updated_at === profile.created_at` (never advanced), the wizard renders at step 1 (`welcome`) regardless of any seeded `current_step`.
  - For profiles where `updated_at > created_at`, the wizard resumes at the persisted step (preservation clause 3.14).
  - Complete & Go to Dashboard: click-to-nav-start < 200 ms (clause 2.20).
  - _Design: ADR-06, §8.8_
  - _Requirements: 2.14, 2.20, 3.14_

- [x] 87. `src/__tests__/properties/emptyStateCoverage.property.test.ts`

  - **Property 6: Preservation** — Empty State on Every List/Grid (clauses 1.22, 2.22, 3.22)
  - fast-check property: for every page in the enumerated list-surface registry (admin + coordinator + teacher + parent + student list pages from tasks 48, 53, 58, 63, 69), when `data` is `[]` the rendered tree contains an `<EmptyState>` with non-empty `title` + `description`.
  - Preservation: when `data.length > 0`, no `<EmptyState>` renders.
  - _Design: ADR-08_
  - _Requirements: 2.22, 3.22_

- [x] 88. `src/__tests__/properties/optimisticToggle.property.test.ts`

  - **Property 7: Preservation** — Optimistic Backend-Bound Toggles (clauses 1.25, 2.25, 3.25)
  - fast-check property: for every `Switch` wired to a mutation (registry of Wellness opt-in, Public profile, admin/coordinator/teacher switches from tasks 49/54/59/64/70), clicking the switch updates the UI synchronously (optimistic); on mutation error the UI rolls back.
  - Preservation: pure client-only switches (no `mutationFn`) continue to flip synchronously.
  - _Design: ADR-10_
  - _Requirements: 2.25, 3.25_

- [x] 89. `src/__tests__/properties/darkModeTokens.property.test.ts`
  - **Property 8: Preservation** — Dark-Mode Token Swap + Hero Gradient Containment (clauses 1.10, 2.10, 3.1, 3.4, 3.7, 3.8)
  - fast-check property over every route × {`.dark` toggled on, off}: CSS variables `--background`, `--foreground`, `--card`, `--card-foreground`, `--popover`, `--popover-foreground`, `--muted-foreground` differ between `.dark` and `:root` (prevents "dark mode didn't swap" regression).
  - Brand CTA text always `rgb(255,255,255)` in both themes.
  - Dark hero gradient `linear-gradient(135deg, #0f172a …)` only appears on `<WelcomeHero>` nodes (document.querySelectorAll filter); never on section cards, data tables, or page backgrounds (preservation clauses 3.1, 3.4, 3.7, 3.8).
  - _Design: ADR-01, §8.1_
  - _Requirements: 2.10, 3.1, 3.4, 3.7, 3.8_

---

### Phase 5 — QuickStart cleanup + tour activation (Tasks 90 – 92)

- [x] 90. Flip `tourFeatureFlag` to `true` globally

  - File: `src/stores/tourStore.ts`.
  - Change the default from `false` to `true`; update the `localStorage` migration so users with a previously-stored `false` get upgraded to `true` on next hydrate.
  - Verify auto-launch on all 5 role dashboards for a user with `profile.tour_completed_at IS NULL`.
  - _Design: ADR-02_
  - _Requirements: 2.15_

- [x] 91. Delete `src/components/shared/QuickStartChecklist.tsx` + all references

  - Remove the component file.
  - Sweep `src/pages/**` for any remaining import; remove stale JSX.
  - Re-run `npx tsc --noEmit` to catch orphan imports.
  - _Design: ADR-02, §8.5_
  - _Requirements: 2.15_

- [x] 92. Delete `src/components/shared/WelcomeTour.tsx` + all references
  - Remove the deprecated bespoke tour component (superseded by `<GuidedTour />`).
  - Sweep for imports; run `npx tsc --noEmit`.
  - _Design: ADR-02_
  - _Requirements: 2.15_

---

### Phase 5-6 — Cleanup + monitoring + final verification (Tasks 93 – 95)

- [x] 93. Delete `src/__tests__/properties/uiConsistencyBugCondition.property.test.ts`

  - Removes the Task 1 exploration test, which by design asserts the presence of the bug.
  - After Tasks 83–89 pass, the bug no longer exists; leaving this test would poison CI.
  - _Design: §2, §6_
  - _Requirements: bugfix workflow § exploration cleanup_

- [x] 94. Add Vercel Analytics + Sentry alerting for SLO breaches

  - Vercel Analytics already wired — confirm it captures Web Vitals (LCP, FID, CLS) per route.
  - Sentry alert rules:
    - `p95(nav-time) > 200 ms` on the Complete & Go to Dashboard flow.
    - `p95(TTI) > 1500 ms` on Student dashboard cold mount.
    - `signup_rate_limit_exceeded` events > 10 / hour.
    - `invite_accept_rate_limit_exceeded` events > 10 / hour.
  - Route alerts to the team channel; document runbook links in Sentry.
  - _Design: ADR-06, ADR-16, §7 Phase 6_
  - _Requirements: 2.11, 2.20_

- [x] 95. Final integration verification
  - Run in order (per `pre-push-checks.md`):
    1. `npm run lint` — zero warnings.
    2. `npx tsc --noEmit` — zero errors.
    3. `npm test` — Vitest full suite (including all 7 property tests from 83–89) passes.
  - Deploy to a preview environment via Vercel; smoke-test every role dashboard.
  - Open a PR and allow CodeRabbit to review; address feedback before merge.
  - Confirm `audit/baselines/deployed-fixtures.json` snapshot is refreshed so future PRs have the post-fix baseline.
  - _Design: §7 Phase 6_
  - _Requirements: all clauses 2.1–2.26, 3.1–3.26_

---

## Notes

### Cross-cutting notes

- **Task 1's exploration test is deleted in Task 93.** It exists to prove the bug exists on the pre-fix codebase; keeping it past Phase 5 would fail CI by design.
- **`tourFeatureFlag` stays `false` through Phases 2–4** so the guided tour does not compete with design-system / auth / i18n fixes during development, then flips on in Task 90.
- **Every task names the files it touches + the bugfix.md clauses it satisfies + the design.md ADR / section it implements** — maintainers can trace any line of code back to a requirement clause without re-reading the full design.
- **Sub-tasks are used only where scope genuinely splits** (Task 9 seed data, Task 1 test-file creation). Most tasks stay flat to preserve PR-sized units (50–500 LOC net change).
- **Property tests 83–89 are required, not optional**, per the bugfix workflow's Fix Checking ∧ Preservation Checking mandate (design.md §2).

---

### Phase 7 — Full-width global header + unified settings + role-based notifications (Tasks 96 – 108)

> Added 2026-05-10 after PR #124 audit feedback. Covers bugfix.md clauses 1.27 / 2.27 / 3.27, 1.28 / 2.28 / 3.28, 1.29 / 2.29 / 3.29, 1.30 / 2.30 / 3.30. Design anchors: ADR-18, ADR-19, ADR-20, ADR-21 and §3.5 (notification type enum). Phase 7 MUST land after Phases 2 + 3 — shared primitives (`ProfileDropdown`, `GuidedTour` anchors, `NotificationBell`) depend on Phase 2 infrastructure and role layouts being on the shared `TopBar` makes the migration to `GlobalHeader` a one-file swap per role.

- [x] 96. Create `src/lib/navItems.ts`

  - Export `navItems: Record<UserRole, NavItem[]>` where `NavItem = { to: string; labelKey: string; icon: LucideIcon }`.
  - Admin: Dashboard, Users, Programs, Courses, Outcomes, Audit Log, Invite Users.
  - Coordinator: Dashboard, Programs, Courses, Outcomes, Curriculum Matrix, CQI.
  - Teacher: Dashboard, Classes, Assignments, Grading, Surveys, Announcements.
  - Student: Dashboard, Courses, Assignments, Progress, Journal, Gamification, Planner.
  - Parent: Dashboard, Linked Students, Fees, Messages, Announcements.
  - Every `labelKey` points at `common:nav.*` (existing keys) or `common:header.primaryNav.*` (new keys added in Task 103's i18n pass).
  - _Design: ADR-18, §4 Table A_
  - _Requirements: 2.27_

- [x] 97. Create `src/components/shared/GlobalHeader.tsx`

  - Two-row primitive per ADR-18:
    - **Row 1** (`w-full px-6 py-3 flex items-center gap-4 border-b border-border bg-white dark:bg-background`): brand logo (`Link to={routes.dashboard}`, `h-10 w-auto`), `flex-1` spacer, `md:block` global search input (migrate the existing search from `DashboardHeader` / `TopBar`), `LanguageSwitcher`, `<NotificationBell />` (Task 98), `<ProfileDropdown />` (from Task 25, updated in Task 99).
    - **Row 2** (`w-full px-6 border-b border-border bg-white dark:bg-background overflow-x-auto`): renders `navItems[role]` as `NavLink`s with design-system active state (`bg-blue-50 text-blue-600` active; `text-gray-600 hover:bg-slate-50` inactive), `gap-2 py-2`, every icon `h-4 w-4`.
  - NO `max-w-*` wrapper anywhere — header spans the full viewport edge-to-edge (clause 2.27).
  - `sticky top-0 z-[100]`.
  - All spacing uses logical properties (`ms-*` / `me-*` / `ps-*` / `pe-*`); no physical `ml-*` / `mr-*` (clause 2.30 / ADR-21).
  - Exposes `data-tour="top-bar"`, `data-tour="primary-nav"`, `data-tour="profile"`, `data-tour="notification-bell"` anchors (replaces prior anchors on `TopBar`; update role tour step arrays in `src/lib/tours/*Tour.ts` to point at these anchors).
  - Accessibility: Row 1 root has `role="banner"`, Row 2 `<nav aria-label={t('common:header.primaryNav.label')}>`.
  - _Design: ADR-18, ADR-21, §4 Table A_
  - _Requirements: 2.27, 2.30, 3.27, 3.30_

- [x] 98. Create `src/components/shared/NotificationBell.tsx`

  - Bell icon button (Lucide `Bell`, `h-5 w-5`) with unread badge overlay:
    - Reads `useUnreadCount(user.id)` from `src/hooks/useNotifications.ts`.
    - When `count > 0`: render red badge (`end-0 top-0 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full absolute`) showing `1`–`9` or `9+`.
    - Badge hidden when `count === 0`.
    - Badge has `aria-live="polite"` + `aria-label={t('common:header.unreadCount', { count })}`.
  - Click opens Shadcn `Popover` (`align="end"`, `className="w-[380px] max-h-[480px]"`):
    - Popover reads `useNotifications(user.id)` and groups rows into Today / Earlier this week / Older via `date-fns`.
    - Each row: role-colored Lucide icon (mapped from `type` via a local `NOTIFICATION_ICONS` constant), `title`, `body` (2-line clamp), relative time via `i18nHelpers.formatRelativeTime`, primary CTA link via `resolveNotificationCta` (Task 100).
    - "Mark all as read" footer action via `useMarkAllAsRead`.
    - On Popover open: batch-mark visible rows as read via `useMarkAsRead` (collect IDs into a single UPDATE).
    - Empty state: shared `NoNotifications` variant from Task 30.
    - Realtime: consumed via `useNotificationRealtime(user.id)` at the bell level (subscribe on mount, unsubscribe on unmount) so a background INSERT increments the badge even when the popover is closed; the hook's existing Sonner toast fires unless quiet-hours in `notification_preferences` suppress it.
  - _Design: ADR-20, §3.5_
  - _Requirements: 2.29, 3.29_

- [x] 99. Modify `src/components/shared/ProfileDropdown.tsx` — fold Settings entries in, migrate tour anchor

  - Remove any `<SettingsIcon />` references in callers (Task 100).
  - Dropdown items (in this order):
    - My Profile → `/{role}/profile`
    - Profile Settings → role-scoped settings route
    - Institution Settings (admin only) → `/admin/settings/institution`
    - Theme submenu → `<ThemeToggle />` inline
    - Take the tour → `useGuidedTour().start()` (clause 2.15)
    - Sign out → `signOut()` + navigate `/login`
  - Add `data-tour="settings"` on the "Profile Settings" item so tour step arrays can keep highlighting the settings entry point.
  - _Design: ADR-19_
  - _Requirements: 2.28, 3.28_

- [x] 100. Create `src/lib/notificationCta.ts`

  - Pure function `resolveNotificationCta(n: Notification, role: UserRole): { labelKey: string; route: string } | null`.
  - Switch over `n.type` (full role-aware enum from ADR-20 §3.5) and derive route + `labelKey` from `n.metadata`:
    - `grade_released` → `{ labelKey: 'notifications.cta.viewGrade', route: '/{role}/grades/' + metadata.submission_id }`
    - `new_assignment` → `{ labelKey: 'notifications.cta.openAssignment', route: '/{role}/assignments/' + metadata.assignment_id }`
    - `badge_earned` → `{ labelKey: 'notifications.cta.viewBadge', route: '/student/gamification#badge-' + metadata.badge_id }`
    - `streak_at_risk`, `peer_milestone`, `perfect_day_nudge`, `prerequisite_unlocked` → student gamification / learning-path routes as documented in bugfix 1.29
    - `grading_queue_new` → `{ labelKey: 'notifications.cta.reviewGrading', route: '/teacher/grading' }`
    - `course_announcement_required` → `/teacher/announcements?courseId=' + metadata.course_id`
    - `at_risk_student_flagged` → `/teacher/students/' + metadata.student_id`
    - `cqi_plan_review_due` → `/coordinator/cqi/' + metadata.cqi_plan_id`
    - `curriculum_gap_flagged` → `/coordinator/matrix?gap=' + metadata.clo_id`
    - `outcome_attainment_drop` → `/coordinator/outcomes/' + metadata.outcome_id`
    - `pending_approval` → `/admin/users/' + metadata.profile_id + '/review'`
    - `rate_limit_exceeded` → `/admin/audit-log?filter=rate_limit'`
    - `system_alert` → `/admin/audit-log?filter=system_alert&id=' + metadata.audit_log_id`
    - `user_onboarded` → `/admin/users/' + metadata.profile_id`
    - `child_grade_released` → `/parent/linked-students/' + metadata.student_id + '/grades'`
    - `child_at_risk` → `/parent/linked-students/' + metadata.student_id + '/progress'`
    - `child_streak_milestone` → `/parent/linked-students/' + metadata.student_id + '/gamification'`
    - `fee_due` → `/parent/fees/' + metadata.fee_id`
    - `digest` → `/{role}/notifications`
  - Return `null` when the pair `(type, role)` is not allowed (defense-in-depth beside the server-side guard trigger).
  - 100% unit-test coverage: one case per `type` in a new `src/__tests__/unit/notificationCta.test.ts`.
  - _Design: ADR-20 §3.5, §4 Table A_
  - _Requirements: 2.29, 3.29_

- [x] 101. Migration `supabase/migrations/2026<tbd>_notifications_role_aware_types.sql`

  - Extend `notifications.type` CHECK constraint with the full union (ADR-20 §3.5) — use `ALTER TABLE … DROP CONSTRAINT IF EXISTS … ADD CONSTRAINT …` so re-runs are safe.
  - Create `public.notifications_type_role_guard()` trigger function (`SECURITY DEFINER`, `search_path = public`) that on `BEFORE INSERT` looks up `profiles.role` by `NEW.user_id` and raises `ERRCODE = 42501` if `NEW.type` is not in the role's allowed set (hard-coded `ROLE_TO_ALLOWED_TYPES` map).
  - Attach trigger `trg_notifications_type_role_guard BEFORE INSERT ON public.notifications FOR EACH ROW EXECUTE FUNCTION …`.
  - Create index `CREATE INDEX IF NOT EXISTS notifications_user_unread_idx ON public.notifications (user_id, is_read, created_at DESC)`.
  - Backfill any existing out-of-enum rows to `digest` (soft migration, no data loss).
  - Re-assert RLS: `notifications_user_read_own`, `notifications_user_update_own`; explicitly `REVOKE INSERT, DELETE ON public.notifications FROM authenticated` so clients can never self-emit.
  - Revoke + grant the trigger function to `postgres, service_role` per `supabase-patterns.md` §SECURITY DEFINER hardening.
  - Regenerate `src/types/database.ts` via `pwsh scripts/regen-types.ps1` (clause `types-regeneration.md`).
  - _Design: ADR-20 §3.5, §5 new migration row_
  - _Requirements: 2.29, 3.29_

- [x] 102. Create role-aware notification emitters (Edge Functions + triggers + pg_cron)

  - **Database triggers** (new migrations, one per domain event, timestamps continue the `2026<tbd>` sequence):
    - `grades AFTER INSERT` → emit `grade_released` to the grade's `student_id`.
    - `assignments AFTER INSERT` → emit `new_assignment` to every `student_id` enrolled in the assignment's course (via `student_courses`).
    - `badges AFTER INSERT` → emit `badge_earned` to the badge's `student_id`.
    - `audit_logs AFTER INSERT WHERE action = 'pending_approval'` → emit `pending_approval` to every admin of the invited profile's `institution_id`.
    - `rate_limit_events AFTER INSERT` (or on `blocked_ips AFTER INSERT`) → emit `rate_limit_exceeded` to every admin of the institution (single row per breach, dedup via 1h lookback).
    - `outcome_attainment AFTER UPDATE WHERE NEW.percent < threshold AND OLD.percent >= threshold` → emit `outcome_attainment_drop` to the program's coordinator.
  - **Edge Functions** (Deno, standard pattern):
    - `supabase/functions/notification-digest/index.ts` (new, cron Sun 09:00 UTC): aggregates last 7 days per user into one `digest` row when `notification_preferences.email = true AND notification_preferences.digest_only = true`.
    - `supabase/functions/at-risk-prediction-notify/index.ts` (new): on new `at_risk_predictions` row, emit `at_risk_student_flagged` to the course teacher + `child_at_risk` to every verified parent via `parent_student_links`.
    - `supabase/functions/streak-risk-notify/index.ts` (extend existing): ensure emits `streak_at_risk` to at-risk student.
    - `supabase/functions/perfect-day-prompt/index.ts` (extend existing): ensure emits `perfect_day_nudge`.
    - `supabase/functions/fee-overdue-check/index.ts` (extend existing): ensure emits `fee_due` to the parent for overdue `student_fees`.
    - `supabase/functions/cqi-review-reminder/index.ts` (new, cron Mon 09:00 UTC): emit `cqi_plan_review_due` to the plan's coordinator 7 days before `next_review_date`.
  - All emitters use the service-role client and write directly to `notifications`. Metadata payload is strictly typed per `type` (see Task 100 CTA mapping).
  - Idempotency: emitters that can run more than once (cron, replayed triggers) use a natural dedup key (`(user_id, type, metadata->>X)` unique partial index created alongside each emitter's first migration).
  - _Design: ADR-20_
  - _Requirements: 2.29, 3.29_

- [x] 103. Migrate every role layout to `GlobalHeader` (ADR-18) + remove sidebars

  - Files: `src/pages/admin/AdminLayout.tsx`, `src/pages/coordinator/CoordinatorLayout.tsx`, `src/pages/teacher/TeacherLayout.tsx`, `src/pages/student/StudentLayout.tsx`, `src/pages/parent/ParentLayout.tsx`.
  - Each layout reduces to:
    ```tsx
    const RoleLayout = () => (
      <>
        <GlobalHeader />
        <main className="w-full bg-slate-50 dark:bg-background p-6">
          <Outlet />
        </main>
      </>
    );
    ```
  - Remove `<aside className="w-64 ...">` blocks and any `ms-64` / `pl-64` body offsets from descendant pages.
  - Hunt for any direct `DashboardHeader` / `TopBar` usage outside these layouts (grepSearch) and replace with `GlobalHeader`, unless the surface is deliberately headerless (onboarding wizard, login, etc. — leave those alone).
  - Update role tour step arrays (`src/lib/tours/{role}Tour.ts`) to target the new `data-tour` anchors emitted by `GlobalHeader`.
  - _Design: ADR-18, ADR-19, §4 Table B_
  - _Requirements: 2.27, 2.28, 2.30, 3.27, 3.28, 3.30_

- [x] 104. Update i18n keys for the new header + notifications

  - Add to `src/locales/en/common.json` and `src/locales/ar/common.json`:
    - `common:header.primaryNav.{dashboard, users, programs, courses, outcomes, auditLog, inviteUsers, curriculumMatrix, cqi, classes, assignments, grading, surveys, announcements, journal, gamification, planner, linkedStudents, fees, messages, progress}` (every `labelKey` from Task 96).
    - `common:header.primaryNav.label` — aria-label for Row 2 nav.
    - `common:header.unreadCount` — "{count} unread notifications".
    - `common:header.notificationsLabel` — aria-label for bell button.
    - `common:header.markAllRead` — "Mark all as read".
    - `common:header.emptyNotifications.{title, description}` — popover empty state.
    - `common:header.groupLabel.{today, earlierThisWeek, older}` — popover grouping.
    - `notifications.cta.{viewGrade, openAssignment, viewBadge, reviewGrading, reviewStudent, reviewInvite, viewFee, viewAttainment, viewCqi, viewAnnouncement, …}` — every CTA label referenced by `resolveNotificationCta`.
    - Role-specific notification titles + bodies (one per `type` in ADR-20 §3.5, with `{{interpolation}}` for metadata-derived fields).
  - Arabic translations follow the MOEHE MSA glossary (`src/locales/ar/glossary.md`).
  - Run `npx i18next-cli extract --check` to confirm no missing keys.
  - _Design: ADR-11, ADR-18, ADR-20_
  - _Requirements: 2.26, 2.27, 2.29_

- [x] 105. Property test — full-width header structure + duplicate-settings removal (clauses 2.27, 2.28, 3.27, 3.28)

  - File: `src/__tests__/properties/globalHeader.property.test.ts`.
  - **Property: Full-width header** — mount each role layout under `fc.constantFrom(...roles)` + `fc.constantFrom('en', 'ar')`; assert: (a) the `<header role="banner">` element has computed width equal to `document.documentElement.clientWidth` (no `max-w-*` wrapper); (b) the brand logo's bounding box is at the logical-start edge of the header; (c) exactly one `<nav aria-label="…primaryNav…">` is rendered as Row 2; (d) no legacy `<aside className="w-64 …">` appears in the DOM; (e) under `dir="rtl"`, the right-cluster group is at the logical-end edge (viewport left) and the primary-nav first item is at the logical-start edge (viewport right).
  - **Property: Single settings entry point** — mount each role layout; assert exactly one DOM element carries the text `t('common:profileSettings')` (inside the profile dropdown), and zero standalone `button[aria-label="Settings"]` instances exist in the header row.
  - min 100 runs, 5 roles × 2 locales covers the matrix.
  - _Design: ADR-18, ADR-19_
  - _Requirements: 2.27, 2.28, 2.30, 3.27, 3.28, 3.30_

- [x] 106. Property test — notification bell end-to-end (clauses 2.29, 3.29)

  - File: `src/__tests__/properties/notificationBell.property.test.ts`.
  - **Property: Role-aware emission** — for each `role ∈ {admin, coordinator, teacher, student, parent}`, generate a random `type ∈ allowed[role]` and assert the bell popover renders a row whose icon + title + CTA matches the `resolveNotificationCta(type, role)` output; conversely, generate a `type ∉ allowed[role]` and assert the database INSERT is rejected with `ERRCODE = 42501` (defense-in-depth — the mock Supabase stub emulates the guard trigger).
  - **Property: Unread badge reactivity** — insert N notifications (`fc.integer({ min: 0, max: 30 })`) into the mock Supabase store; assert the bell renders `min(count, 9)` (digit) or `9+` (when > 9), and hides when `count === 0`.
  - **Property: Realtime invalidation** — fire a mock `postgres_changes` INSERT event; assert `queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all })` fires exactly once.
  - **Property: Quiet-hours suppression** — when `notification_preferences.quiet_hours_start/_end` brackets `now`, assert the Sonner toast is NOT invoked even though the badge increments.
  - **Property: Mark-all-as-read batches** — open popover with N unread; assert exactly one `UPDATE … WHERE id IN (...)` call covers all visible rows (single round-trip).
  - min 100 runs.
  - _Design: ADR-20_
  - _Requirements: 2.29, 3.29_

- [x] 107. Wire tour steps to the new header anchors (update existing tour arrays from Task 34)

  - Files: `src/lib/tours/{admin|coordinator|teacher|student|parent}Tour.ts`.
  - Replace anchors `data-tour="top-bar"`, `data-tour="profile"`, `data-tour="settings"`, `data-tour="sidebar-nav"` with the GlobalHeader equivalents: `data-tour="top-bar"` (Row 1 header), `data-tour="primary-nav"` (Row 2 nav), `data-tour="notification-bell"`, `data-tour="profile"` (profile dropdown trigger), `data-tour="settings"` (now on "Profile Settings" dropdown item per Task 99).
  - Re-run Task 89 property test to confirm tour walks every role layout without anchor mismatch.
  - _Design: ADR-18, ADR-19, §8.5_
  - _Requirements: 2.15, 2.27, 2.28_

- [x] 108. Delete legacy `TopBar.tsx` + `DashboardHeader.tsx` sidebar/header usages
  - After Task 103 migrates every layout to `GlobalHeader`, `src/components/shared/TopBar.tsx` is orphaned.
  - Delete `src/components/shared/TopBar.tsx`.
  - Evaluate `src/components/shared/DashboardHeader.tsx`: if unused after Task 103 (grepSearch confirms zero imports), delete it too. If still used by any non-layout surface (onboarding, print view, etc.), leave it alone and document why.
  - Run `npx tsc --noEmit` to catch orphan imports; run `npm run lint` to confirm zero warnings.
  - _Design: ADR-18, §4 Table C_
  - _Requirements: 2.27, 3.27_

---

### Phase 7 rollout notes

- Phase 7 lands **after** Phases 2 + 3 complete. Do not start Task 96 until the per-role dashboards already consume the shared primitives (`WelcomeHero`, `EmptyState`, `useOptimisticToggle`, role tour wiring) — otherwise the layout migration in Task 103 has to revisit each dashboard twice.
- Phase 7 is **additive** for existing users: nobody loses a route, the `notifications` table keeps all existing rows, and the `notification_preferences` email channel continues working unchanged (ADR-20 emits additional in-app rows, does not replace email).
- The new notification pipeline is **role-guarded at the database level** (CHECK constraint + `notifications_type_role_guard()` trigger) so a future misconfigured emitter cannot deliver a student-typed notification to an admin bell. This is the single most important invariant introduced by Phase 7.
- **Do not use `>` redirection** to regenerate `src/types/database.ts` after the Task 101 migration — follow the `types-regeneration.md` workspace rule (`pwsh scripts/regen-types.ps1`).

---

### Phase 7.5 — Transitional hot-fixes (land ahead of GlobalHeader rollout) — Tasks 109 – 111

> Added 2026-05-10 to cover bugfix clauses **1.31 / 2.31 / 3.31** (duplicate sidebar Profile item) and **1.32 / 2.32 / 3.32** (Admin dashboard black-area root cause). These tasks are intentionally small, ship independently of Phase 7, and are collapsed naturally into Phase 7 when `GlobalHeader` replaces the per-role sidebars (Task 103). Their purpose is to close two visible regressions immediately instead of waiting for the full chrome reshape.

- [x] 109. Remove duplicate Profile entry from every role sidebar nav

  - Files: `src/pages/admin/AdminLayout.tsx`, `src/pages/coordinator/CoordinatorLayout.tsx`, `src/pages/teacher/TeacherLayout.tsx`, `src/pages/student/StudentLayout.tsx`, `src/pages/parent/ParentLayout.tsx`.
  - In each file's `navItems` array, delete the entry whose `to` matches the role's profile route (e.g. `{ to: "/admin/settings/profile", icon: UserCircle, label: "Profile" }`).
  - Leave every other nav entry, the sidebar composition, and the `<QuickStartChecklist>` placement untouched.
  - Verify in each layout that the profile route is still reachable — it IS, via the top-bar `DashboardHeader` / `TopBar` profile dropdown's "My Profile" item.
  - No route changes, no page component changes, no RouteGuard changes.
  - Re-run `npx tsc --noEmit` to confirm no orphan `UserCircle` import remains per file (delete the import when it's no longer used).
  - _Design: ADR-22_
  - _Requirements: 2.31, 3.31_

- [x] 110. Fix Admin (and cross-role) dashboard black-area root cause

  - Files: `src/index.css`; every role layout under `src/pages/{admin,coordinator,teacher,student,parent}/{Role}Layout.tsx`; optionally `src/pages/admin/AdminDashboard.tsx` if it carries a stray hard-coded `bg-*` utility on a wrapper.
  - [x] 110.1 Document-level page background
    - In `src/index.css`, add inside the base layer: `body { background-color: hsl(var(--background)); }` so the document itself carries the design-system background token. Confirms that any DOM node whose parent has not set a background inherits the tone rather than the OS / browser default.
    - Do NOT change existing `:root` / `.dark` HSL variable values in this task — those are owned by Task 31.
  - [x] 110.2 Role-layout `<main>` background + `min-h-screen`
    - In each `{Role}Layout.tsx`, the outer flex container is currently `<div className="flex h-screen">` with the main as `<main className="flex-1 overflow-auto bg-slate-50">`. Swap to `<div className="flex min-h-screen">` and `<main className="flex-1 min-h-screen overflow-auto bg-slate-50 dark:bg-background">` so (a) the layout can grow beyond the viewport when content is taller than the viewport without the main getting clipped, and (b) the main always covers at least the full viewport height, closing the black-void gap below short content.
    - Verify the sidebar side still has `bg-white` / `bg-card` as today — the sidebar column is NOT the bleed source; only the `<main>` area is.
  - [x] 110.3 Property test — no hard-coded dark utilities on dashboard surfaces
    - Extend `src/__tests__/properties/darkModeTokens.property.test.ts` (from Task 88) with a new property: for every dashboard page (`src/pages/{admin,coordinator,teacher,student,parent}/*Dashboard.tsx`) AST-scan the JSX for `className` strings that match `/bg-(black|gray-900|slate-900|neutral-900|zinc-900)\b/` — fail the build if any match is found outside a deliberately-declared hero wrapper (allowlist: components inside `WelcomeHero.tsx`). This guarantees clause 1.32 (c) can never regress.
  - Verification:
    - `npm run lint` — zero warnings.
    - `npx tsc --noEmit` — zero errors.
    - `npm test -- darkModeTokens` — passes including the new property.
    - Manual smoke: toggle the browser zoom to 75% / 150% on every role dashboard and confirm the page background reaches the bottom of the viewport in both light and dark (post-Task 31) themes.
  - _Design: ADR-23_
  - _Requirements: 2.32, 3.32_

- [x] 111. Property test — single profile entry point in the chrome (clauses 2.31, 3.31)
  - File: `src/__tests__/properties/chromeEntryPoints.property.test.ts` (new; may be co-located with `globalHeader.property.test.ts` from Task 105 if preferred).
  - **Property: Exactly one Profile entry** — for each `role ∈ roles`, mount the role layout; assert that the number of DOM links whose `href` matches `/{role}/settings/profile` (or `/{role}/profile` for parent) is exactly 1. That single link must be inside the header's profile dropdown (Radix `role="menu"` descendant), not inside the sidebar nav.
  - **Property: No orphan Profile NavLink** — assert no `<a>` / `<NavLink>` with `to` matching the profile route exists inside any `<aside>` element on any role layout.
  - min 100 runs, 5 roles.
  - _Design: ADR-19, ADR-22_
  - _Requirements: 2.31, 3.31_

---

### Phase 7.5 rollout notes

- Task 109 is a one-file-per-role mechanical edit; it ships independently and takes precedence over Task 103 (which removes the entire sidebar). When Task 103 lands, the nav array doesn't need to be re-edited because Task 109 already deleted the Profile entry.
- Task 110 is orthogonal to Phase 7 and remains useful even after `GlobalHeader` replaces the sidebars — the `min-h-screen` + `body { background-color: ... }` contract is the correct long-term layout shape.
- Task 111's property test remains valid through Phase 7 (and indeed is reinforced by Phase 7's `GlobalHeader` / `ProfileDropdown` single-entry architecture) so the test does not need to be rewritten when the chrome reshapes.
