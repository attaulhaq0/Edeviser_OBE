# Requirements — UI Prototype Migration (Presentation-Layer Replacement)

## Introduction

Edeviser is a production application (React 18 + TypeScript + Vite, Supabase with RLS, TanStack Query, i18next Arabic/English, AI Tutor, OBE, gamification, habits, notifications, analytics). A new front-end **prototype** (in `prototype/`, static HTML/CSS/JS, mock data only) demonstrates an improved UI/UX, information architecture, navigation, and component design.

This spec governs replacing the **presentation layer only** with the prototype's design, while preserving **every** existing feature, route, permission, and business rule. The production backend remains the source of truth. The prototype is a **visual/UX reference, not code to port** — its CDN-Tailwind, `shared.css`, `shared.js`, inline styles, and emoji nav must **not** ship; each design decision is re-implemented with the app's real design system (Tailwind v4 `@theme` tokens in `src/index.css`, Shadcn/ui, Lucide, `cn()`), reusing existing hooks, routes, and providers.

Every migrated screen must reach **visual parity** (matches the approved prototype design) **and** **functional parity** (matches current production behavior) before it replaces the old UI.

### Scope

- **In scope:** layout/chrome (header, sidebar, role layouts), navigation, styling, component composition, animations, interaction patterns, and the redesigned dashboards/flows — for the **5 existing roles**: `admin`, `coordinator`, `teacher`, `student`, `parent`.
- **Out of scope:** backend, database, RLS, edge functions, RPCs, business logic, auth flows, and any new roles. The user's brief mentioned "Academic Advisor" and "Super Admin" — **these roles do not exist** in the codebase (`src/types/app.ts` `UserRole` has exactly 5). They are explicitly out of scope; adding them would be a separate backend+RLS effort.

### Glossary

- **Chrome:** `GlobalHeader`, `Sidebar`, role `*Layout` shells — the frame around routed content.
- **Design system:** tokens in `src/index.css` (`@theme` + brand CSS variables) + Shadcn primitives in `src/components/ui/` + shared components in `src/components/shared/`.
- **Parity gate:** the two-part (visual + functional) sign-off required before a screen replaces its predecessor.

---

## Requirement 1 — Backend & business logic are never modified

**User story:** As an engineer, I want the migration to change only presentation, so that no backend, data, or business rule can regress.

#### Acceptance Criteria

1.1 WHEN any screen is migrated THEN the system SHALL NOT modify any file under `supabase/` (migrations, edge functions), `src/hooks/`, `src/lib/queryKeys.ts`, `src/lib/supabase.ts`, `src/lib/auditLogger.ts`, or `src/types/database.ts`.
1.2 WHERE a screen needs data THEN it SHALL consume an existing TanStack Query hook from `src/hooks/` and SHALL NOT call `supabase.from(...)` / `supabase.auth.*` directly from a component.
1.3 WHEN a mutation is performed from migrated UI THEN it SHALL reuse the existing mutation hook (which already performs `logAuditEvent` and query invalidation) and SHALL NOT duplicate insert/update/audit logic.
1.4 IF a required hook does not yet exist for a prototype-only concept (e.g. a "Today plan" aggregate) THEN the system SHALL add a new hook following the standard pattern (`src/hooks/useCourses.ts` as reference) rather than embedding queries in components, and SHALL reuse `queryKeys` factory entries.

## Requirement 2 — Reuse existing state, no parallel state management

**User story:** As an engineer, I want the new UI to consume existing providers/query cache, so that there is one source of truth.

#### Acceptance Criteria

2.1 WHEN the new UI needs auth/user/role/institution THEN it SHALL read from `useAuth()` (exposes `user, profile, role, institutionId, isLoading, signIn, signUp, signOut, resetPassword, refetchProfile`) and SHALL NOT introduce a second auth store.
2.2 WHEN the new UI needs language/direction THEN it SHALL use `useLanguage()` / `useTranslation()`; for theme it SHALL use the existing `ThemeProvider`.
2.3 WHEN server data is displayed THEN it SHALL flow through the shared `QueryClient` (`src/lib/queryClient.ts`) and reuse `queryKeys`; the migration SHALL NOT add a second `QueryClientProvider` or change `staleTime`/`gcTime`/retry/backoff defaults.
2.4 WHERE URL-persisted UI state is needed (filters, tabs) THEN it SHALL use `nuqs` (already mounted via `NuqsAdapter`), consistent with existing list pages.
2.5 The provider nesting in `src/App.tsx` SHALL be preserved (Sentry → ErrorBoundary → BrowserRouter → NuqsAdapter → QueryClientProvider → MotionConfig → AuthProvider → LanguageProvider → ThemeProvider → {SkipToMain, AppRouter, Toaster}).

## Requirement 3 — Route & deep-link parity

**User story:** As a user, I want every existing URL, bookmark, and deep link to keep working after the migration.

#### Acceptance Criteria

3.1 WHEN the migration completes THEN every route currently registered in `src/router/AppRouter.tsx` SHALL still resolve to a working screen (public routes, all `/{role}/*` children, `index` redirects, `/student/focus/:sessionId`, root `/`, catch-all `*`).
3.2 WHEN a deep link to a nested route is opened (e.g. `/teacher/courses/:courseId/question-bank`, `/student/quizzes/:quizId/review/:attemptId`) THEN it SHALL render the correct screen inside the correct (redesigned) layout.
3.3 WHERE `/student/focus/:sessionId` renders OUTSIDE `StudentLayout` (full-screen) THEN the migration SHALL preserve that it is not wrapped in the student shell.
3.4 IF the new design introduces a 404 experience THEN a dedicated NotFound route SHALL be added AND the current `*` → `/login` redirect behavior SHALL be an explicit, reviewed decision (today there is no 404 page).
3.5 WHEN `viewTransition` and hover/intent prefetch (`useIntentPrefetch` + `prefetchRoute`) exist on nav links THEN the redesigned nav SHALL retain equivalent prefetch/transition behavior.

## Requirement 4 — RBAC & role parity (5 roles)

**User story:** As a security owner, I want role-based routing and permissions unchanged.

#### Acceptance Criteria

4.1 WHEN a route is guarded THEN it SHALL remain wrapped by `RouteGuard` with the same `allowedRoles`; the migration SHALL NOT weaken or remove any guard.
4.2 WHILE auth `isLoading` THEN a loading state SHALL render (no flash of protected content).
4.3 IF a user's `role` is not in a route's `allowedRoles` THEN the system SHALL redirect via `ROLE_DASHBOARD_MAP` exactly as today.
4.4 WHEN navigation renders THEN each role SHALL see exactly its own items from `src/lib/navItems.ts` (student grouped; admin/coordinator/teacher/parent flat), including the conditional Surveys item (visible only when `useSurveyAssignmentsCount() > 0`).
4.5 The migration SHALL treat client-side guards as UX only and SHALL NOT rely on them for security; Supabase RLS remains the enforcement boundary and is untouched.

## Requirement 5 — Authentication behavior preserved

**User story:** As a user, I want sign-in/up/out to behave exactly as before, including the engagement side-effects.

#### Acceptance Criteria

5.1 WHEN the redesigned login/signup submits THEN it SHALL call `useAuth().signIn` / `signUp` (never `supabase.auth.*` directly), preserving account lockout (client + server), the shell-first profile cache seeding, and role-based `redirectTo`.
5.2 WHEN a student signs in THEN the existing sequenced side-effects (login habit log → `process-streak` → `award-xp` → perfect-day) SHALL continue to fire from `AuthProvider.signIn` unchanged.
5.3 WHERE a student has `onboarding_completed === false` THEN `StudentLayout` SHALL continue to render the `OnboardingWizard` (isDay1) instead of the shell — the redesigned layout MUST reproduce this gate.
5.4 WHEN self-registration occurs THEN it SHALL continue to provision role `student` (server `handle_new_user` trigger) and the UI SHALL NOT expose a role picker that the backend ignores.
5.5 WHERE demo/quick-login panels exist THEN they SHALL remain DEV/`VITE_DEMO_PASSWORD`-gated and absent from production builds.

## Requirement 6 — Auth background & brand colors preserved (explicit user requirement)

**User story:** As the product owner, I want the new UI to keep my authentication background and the app's real colors.

#### Acceptance Criteria

6.1 WHEN the login/reset/update-password screens are redesigned THEN they SHALL preserve the existing auth background: root `bg-gradient-to-br from-[#1e293b] via-[#0f172a] to-[#020617]` + the doodle overlay (`/doodle-background.jpg`, `background-size:1200px`, repeat, `opacity 0.04`, `filter: invert(1)`), the `/edeviser-logo-final.png` logo, and the `bg-white/95 backdrop-blur-xl rounded-[2rem] ring-1 ring-white/20` auth card.
6.2 WHEN any screen is restyled THEN it SHALL use the app's real design tokens from `src/index.css` (`--brand-primary #3b82f6`, `--brand-secondary #14b8a6`, `--gradient-start #14b8a6`, `--gradient-end #0382bd`, `--brand-gradient`, `--hero-gradient`, semantic + surface tokens) and SHALL NOT introduce the prototype's CDN-Tailwind palette, `shared.css`, or hardcoded off-brand hexes.
6.3 IF a prototype design primitive is adopted (compact hero, mastery ring, elevated `.pcard`, severity-halo leading icon, tactile button, graded status) THEN it SHALL be re-implemented as real Tailwind v4 utilities/components bound to the existing tokens (not copied from `prototype/shared.css`).
6.4 WHERE the brand gradient angle diverges (steering doc `93.65deg` vs `index.css` `135deg`) THEN the migration SHALL pick ONE canonical value in `index.css`, document it, and use it everywhere.

## Requirement 7 — Arabic / i18n / RTL preserved (explicit user requirement)

**User story:** As an Arabic-speaking user, I want the new UI fully translated and correctly right-to-left.

#### Acceptance Criteria

7.1 WHEN any migrated screen renders text THEN all strings SHALL come from i18next locale files (`src/locales/{en,ar}/*.json`, 8 namespaces) via `t()`, with NO hardcoded English literals; new UI copy SHALL add matching keys to **both** `en` and `ar`.
7.2 WHEN the active language is Arabic THEN the migrated UI SHALL render correctly RTL: it SHALL use logical CSS properties (`ms-/me-/ps-/pe-/start/end`) rather than physical (`ml-/mr-/pl-/pr-/left/right`), and SHALL rely on `applyDirection` (sets `<html> dir/lang` + `Noto Sans Arabic`).
7.3 WHEN the language is switched THEN it SHALL continue to persist to `localStorage['edeviser-language']` and (debounced) to the profile, via the existing `LanguageProvider`/`LanguageSwitcher`.
7.4 WHERE two profile language fields exist (`preferred_language` read by `LanguageProvider` vs `language_preference` read by `AuthProvider`) THEN the migration SHALL reconcile to a single canonical field and document it (no behavior change for existing users).
7.5 WHEN a migrated screen is reviewed THEN it SHALL be verified in BOTH `en` (LTR) and `ar` (RTL) as part of the parity gate; missing Arabic keys SHALL surface via the existing missing-key marker.

## Requirement 8 — Dark mode preserved

#### Acceptance Criteria

8.1 WHEN the theme is dark THEN migrated screens SHALL render correctly using the `.dark` class strategy and dark token overrides in `src/index.css`; the migration SHALL NOT hardcode light-only colors.
8.2 WHEN the theme toggles THEN it SHALL continue to go through `ThemeProvider` (localStorage `theme` + `matchMedia` + debounced profile sync).

## Requirement 9 — Visual + functional parity gate

#### Acceptance Criteria

9.1 BEFORE a redesigned screen replaces the old one THEN it SHALL demonstrate **visual parity** with the approved prototype AND **functional parity** with the current production screen (same data, actions, mutations, permissions, empty/loading/error states).
9.2 WHEN a screen is migrated THEN its loading state SHALL use the existing shimmer (`animate-shimmer` / `Shimmer` / `DataTable` skeleton) and its empty state SHALL use the shared `EmptyState` variants — not full-page spinners.
9.3 IF parity cannot be met for a screen THEN the old screen SHALL remain in place behind the feature flag until parity is achieved (no half-migrated screen ships).

## Requirement 10 — Accessibility preserved or improved

#### Acceptance Criteria

10.1 WHEN chrome is redesigned THEN `SkipToMain` → `#main-content`, keyboard navigation, visible focus order, and `aria` roles/labels on header/sidebar SHALL be preserved.
10.2 WHEN interactive elements are restyled THEN they SHALL meet WCAG AA contrast, have ≥44×44px touch targets on mobile, and respect `prefers-reduced-motion` / `.reduce-animations` (all custom keyframes already gate on this).
10.3 WHEN color conveys status THEN it SHALL be paired with text/icon (never color alone), consistent with the existing accessibility posture.

## Requirement 11 — Performance maintained or improved

#### Acceptance Criteria

11.1 WHEN a screen is migrated THEN it SHALL NOT introduce duplicate queries, duplicate `QueryClientProvider`/contexts, duplicate renders, or request waterfalls; dashboards SHALL keep critical-first sequencing and the 120s dashboard stale time.
11.2 WHEN pages are code-split today (all routes are `React.lazy`) THEN the redesigned pages SHALL remain lazy; the migration SHALL NOT ship the prototype's CDN Tailwind runtime or a global CSS framework duplicate.
11.3 WHEN measured THEN route-level TTI/bundle size SHALL be equal or better than pre-migration for each migrated screen.

## Requirement 12 — Responsive across breakpoints

#### Acceptance Criteria

12.1 WHEN a migrated screen is viewed on desktop, tablet, and mobile THEN it SHALL be fully usable, and the mobile sidebar SHALL remain a drawer (RTL-aware `max-lg:-translate-x-full` / `rtl:translate-x-full`).

## Requirement 13 — Incremental, reversible, regression-free rollout

#### Acceptance Criteria

13.1 WHEN the migration proceeds THEN it SHALL be phased (design system → chrome → dashboards → modules) and the app SHALL remain fully functional at every step.
13.2 WHERE a module is migrated THEN it SHALL be behind a feature flag/toggle so it can be reverted without a redeploy, and the previous component SHALL remain until parity is signed off.
13.3 WHEN the full regression matrix (Requirement-linked) is executed THEN NO existing feature (routes, APIs, mutations, forms, uploads, AI, realtime, notifications, caching, permissions) SHALL regress.

## Requirement 14 — AI, notifications, realtime & analytics preserved

#### Acceptance Criteria

14.1 WHEN the AI Tutor UI is redesigned THEN it SHALL continue to use the existing tutor hooks/edge function (`chat-with-tutor`), conversation/persona/autonomy state, and integrity behavior — presentation only changes.
14.2 WHEN notifications render THEN they SHALL use the existing `NotificationBell`/realtime subscription and unread-count logic.
14.3 WHEN analytics/telemetry fire (Sentry, Vercel Analytics, page-view logger, guided tour) THEN they SHALL continue unchanged.

## Requirement 15 — Single design-system source of truth

#### Acceptance Criteria

15.1 WHEN new design primitives are needed THEN they SHALL be added to `src/index.css` (`@theme`/utility layers) and/or `src/components/shared/` + `src/components/ui/`, reused across roles — NOT duplicated per page or imported from `prototype/`.
15.2 The prototype's `shared.css`, `shared.js`, CDN `<script src="cdn.tailwindcss.com">`, and emoji-based nav SHALL NOT be introduced into `src/` in any form.

---

## Requirement 16 — Full design-system coverage (no screen left behind)

**User story:** As the product owner, I want _every_ screen on the new design — including features that have a backend but were never mocked in the prototype.

#### Acceptance Criteria

16.1 WHEN the migration is complete THEN EVERY production route/screen SHALL render in the new design system; NO screen SHALL remain on the legacy visual style, whether or not the prototype mocked it.
16.2 WHERE a screen HAS a prototype reference THEN it SHALL match that reference (visual parity per R9).
16.3 WHERE a production screen (real route + backend) has NO prototype reference THEN it SHALL be redesigned by composing the P0 design-system primitives and the standard **page archetypes** (design.md §15), preserving the screen's existing function, fields, actions, and data (functional parity) — and SHALL NOT be left in the old style, nor invent behavior beyond existing backend capability.
16.4 IF a production screen needs a pattern the prototype/design system does not yet define (e.g. a complex management data-table, a multi-step wizard, a charts/report view) THEN that pattern SHALL be authored ONCE in the design system (extending it) and reused — never one-off styled per page.
16.5 A coverage matrix SHALL classify every route as "prototype-referenced" or "design-system-derived"; both classes SHALL pass the same parity, i18n (en+ar), dark-mode, a11y, and performance gates.
16.6 WHEN designing a derived screen THEN the existing production page SHALL be read first to capture its exact behavior, then re-skinned via the matching archetype (function preserved, look replaced).

## Requirement 17 — AI tutor autonomy & AI curriculum: enhance existing backend (not new AI)

**User story:** As the product owner, I want the real app's AI Tutor to gain the human-controlled autonomy and course-curriculum tooling shown in the prototype — as an _improvement to already-built functionality_, not a new AI system.

#### Acceptance Criteria

17.1 WHEN the AI Tutor UI is redesigned THEN it SHALL surface the EXISTING per-conversation autonomy control — Hints (L1) / Guided (L2) / Direct (L3) via `useTutorAutonomy` + `useUpdateConversationAutonomy` — as a first-class, legible control, plus the EXISTING personas (socratic / step-by-step / explainer). It SHALL NOT introduce a new autonomy engine.
17.2 WHEN the tutor shows "what it knows about you" THEN it SHALL display only context the backend actually provides today (e.g. the per-CLO attainment snapshot `chat-with-tutor` already injects); richer long-term learner memory SHALL be labeled roadmap and SHALL NOT be faked.
17.3 WHEN the AI Curriculum ("Studio") UI is built THEN it SHALL compose EXISTING teacher AI capabilities — `embed-course-material`, `ai-module-suggestion`, `generate-quiz-questions`, `generate-plan-update`, `ai-feedback-draft`, and content-review / review-queue / question-bank — into one teacher-in-control flow (draft → teacher approves), reusing existing hooks/edge functions. No new generation backend is added by this migration.
17.4 WHERE a prototype AI concept exceeds current backend (platform-wide A0–A3 action autonomy, cross-agent orchestration, autonomous agents, one-click full-lesson decomposition) THEN it SHALL be presented as clearly-labeled roadmap / read-only, OR omitted — never wired to imply capability that does not exist.
17.5 WHEN any AI action is surfaced THEN it SHALL remain human-in-the-loop, explainable ("why am I seeing this"), and reversible; the existing academic-integrity guard/redirect and audit logging SHALL be preserved.
17.6 The migration SHALL treat these as UI/UX improvements over existing features (Requirement 1 still holds: no backend/edge/RLS changes); any genuinely-new AI capability is a SEPARATE spec.

## Requirement 18 — Responsive, adaptive & touch-optimized (mobile + web, automatic)

**User story:** As a user on any device, I want one app that automatically fits my screen and input — I should never pick "mobile vs laptop."

_(Extends Requirement 12 with the concrete responsive strategy.)_

#### Acceptance Criteria

18.1 The redesigned UI SHALL be a SINGLE responsive codebase that adapts automatically to viewport size (mobile → tablet → laptop → desktop), with **NO manual device toggle** and **NO user-agent sniffing** to branch UIs. The prototype's `📱 Mobile / 💻 Laptop` toggle is a demo simulator only and SHALL NOT ship.
18.2 Layouts SHALL be **mobile-first** (min-width breakpoints) using the app's existing Tailwind v4 breakpoints (`sm` 640 / `md` 768 / `lg` 1024 / `xl` 1280 / `2xl` 1536); `lg` remains the sidebar/desktop threshold.
18.3 Reusable components/archetypes SHOULD use **container queries** (`@container`, Tailwind v4) so a component responds to its container, not only the viewport — so a primitive works in any layout slot.
18.4 The UI SHALL adapt to **input capability, not device name**: WHERE `(pointer: coarse)` / `(hover: none)` THEN touch targets SHALL be ≥44×44px and there SHALL be no hover-only affordances; hover/`title` enhancements apply only WHERE `(hover: hover)`.
18.5 Navigation SHALL be responsive from the SAME `navItems` data: a **sidebar on ≥lg** and a **thumb-reachable bottom tab bar (or off-canvas drawer) on mobile**, preserving the RTL-aware drawer behavior. No separate mobile nav dataset.
18.6 Content SHALL reflow: single-column on mobile → multi-column/grid on larger screens; **data tables degrade gracefully** (horizontal scroll or card list) on small screens; media is responsive; `100dvh` + `env(safe-area-inset-*)` are respected on mobile/notched devices.
18.7 EVERY migrated screen SHALL be verified at each breakpoint, in touch + pointer modes, in LTR + RTL, and light + dark.
18.8 Installable PWA / app-like mobile packaging is OUT OF SCOPE for this presentation migration and SHALL be a separate decision (noted as roadmap).

## Role-by-role acceptance checklists (verification)

Each role must pass ALL before its migration is considered done.

- **Student:** grouped nav (learn/tools/growth/community) + de-emphasized items + conditional Surveys; onboarding gate; dashboard "Today/gap→action"; learn loop; spaced review; AI tutor; habits; leaderboard; marketplace; portfolio; focus mode (outside layout); XP/streak displays read real gamification data.
- **Teacher:** flat nav; dashboard (at-risk triage, AI feedback drafts, CLO gaps) bound to real hooks; grading; curriculum/modules; assignments/rubrics/CLOs; teams/challenges; tutor-analytics/handoffs; baseline.
- **Parent:** flat nav; growth/wellbeing framing (no raw grades) using real parent hooks; children; progress; attendance; planner.
- **Coordinator:** flat nav; PLO/matrix/gap-analysis/coverage-heatmap/CQI/course-file/outcome-chain/sankey; timetable.
- **Admin:** flat nav; users/programs/courses/semesters/departments/outcomes(ILO); reports/audit-log/fees; marketplace management; surveys; bonus events; institution + profile settings; AI-governance framing (map to existing capabilities only — do not invent backend).

## Non-goals

- No new backend features, tables, RLS policies, or roles.
- No porting of prototype static assets/CSS/JS into the app.
- No change to auth/session/lockout logic, only its presentation.
