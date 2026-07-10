# Design — UI Prototype Migration

## Guiding principles

1. **The prototype is a reference, not a source tree.** `prototype/*.html`, `shared.css`, `shared.js`, CDN Tailwind, inline styles, and emoji nav never ship. We extract _design decisions_ and re-build them with the real stack.
2. **Reskin in place.** We change chrome (header/sidebar/layouts) and restyle routed pages; we do **not** rewrite routing, data, or logic. Pages keep consuming the same hooks.
3. **One design system.** Tokens live in `src/index.css` (Tailwind v4 `@theme`, no `tailwind.config`). New primitives are added there / to `components/ui` + `components/shared`, reused everywhere.
4. **Preserve the invariants** the user called out: the **auth background**, the **real color tokens**, and **Arabic/RTL**.
5. **Incremental + reversible.** Feature-flag each module; keep the old component until the parity gate passes.

---

## 1. Current architecture map (Phase 1 deliverable)

| Layer                                         | Where it lives                                                                                | Migration disposition                                                              |
| --------------------------------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| **Routing**                                   | `src/router/AppRouter.tsx` (single `<Routes>`, all `React.lazy`), `RouteGuard.tsx`            | **Keep.** Only add an optional NotFound. Never touch guards/paths.                 |
| **Auth / session / RBAC state**               | `src/providers/AuthProvider.tsx`, `useAuth`, `RouteGuard`                                     | **Keep.** Consume only.                                                            |
| **Server state / data**                       | `src/hooks/*` (~200), `src/lib/queryKeys.ts`, `src/lib/supabase.ts`, `src/lib/queryClient.ts` | **Keep/consume.** New aggregate hooks may be added following the pattern.          |
| **i18n / RTL**                                | `src/lib/i18n.ts`, `directionManager.ts`, `LanguageProvider`, `src/locales/{en,ar}`           | **Keep.** Add locale keys for new copy; reconcile dup lang field.                  |
| **Theme**                                     | `ThemeProvider` (`.dark` class)                                                               | **Keep.**                                                                          |
| **Design tokens**                             | `src/index.css` (`@theme` + brand CSS vars)                                                   | **Extend.** Add re-usable primitives; keep tokens canonical.                       |
| **Chrome (presentation)**                     | `GlobalHeader`, `Sidebar`, `src/pages/{role}/{Role}Layout.tsx`, `navItems.ts`, `navGroups.ts` | **Redesign.** Thin shells → new visual design; reuse `navItems` data.              |
| **Routed pages (presentation + composition)** | `src/pages/**`                                                                                | **Restyle** per phase; keep hook usage.                                            |
| **Shared components**                         | `src/components/ui/` (20 Shadcn), `src/components/shared/` (~200)                             | **Restyle/extend** (KPICard, WelcomeHero, cards, buttons, DataTable, EmptyState…). |
| **Business logic / DB / RLS / edge**          | `supabase/**`, mutation hooks, `auditLogger`                                                  | **Do NOT modify.**                                                                 |

**Coupling verdict:** chrome↔data coupling is LOW (layouts hold almost no logic; all data flows through hooks), so a layout/component swap is well-scoped — provided the gates/side-effects in §Risks are preserved.

---

## 2. Prototype → Production mapping (Phase 2 deliverable)

Each prototype screen maps to an existing route + page + hooks. **No new backend.** ("Design ref" = prototype file; "Prod screen" = existing route/component to restyle; "Reuse hooks" = existing data source.)

| Prototype (design ref)                           | Prod route(s)                                                                                  | Prod page component                                                  | Reuse hooks (examples)                                                                          |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `auth.html`                                      | `/login`, `/signup`, `/reset-password`, `/update-password`                                     | `LoginPage`, `SignUpPage`, `ResetPasswordPage`, `UpdatePasswordPage` | `useAuth` (signIn/signUp/resetPassword)                                                         |
| `roles.html` (chooser)                           | — (demo only)                                                                                  | N/A                                                                  | Not migrated (prototype navigation aid)                                                         |
| `dashboard.html` (Today/gap→action)              | `/student/dashboard`                                                                           | `StudentDashboard`                                                   | `useStudentDashboardAggregate`, `useStreak`, `useXP`, `useLearningPath`, `useReviewQueue`       |
| `path.html` (learning path)                      | `/student/courses/:courseId` path views, `/student/today`                                      | `StudentCourseDetail`, `TodayViewPage`                               | `useLearningPath`, `useCLOProgress`                                                             |
| `lesson.html` (learn loop)                       | `/student/quizzes/:quizId/adaptive`, course lesson views                                       | `AdaptiveQuizSession`, `StudentCourseDetail`                         | `useAdaptiveQuiz`, `useMicroAssessments`, `useSessionReflections`                               |
| `review.html` (spaced review)                    | `/student/today`, review surfaces                                                              | `TodayViewPage`, `ReviewQueue` consumers                             | `useReviewQueue`, `useReviewSchedule`                                                           |
| `tutor.html` (memory + autonomy)                 | `/student/tutor`, `/student/tutor/:conversationId`                                             | `TutorPage`                                                          | `useTutorConversations/Messages/Autonomy/Usage`                                                 |
| `progress.html`                                  | `/student/progress`                                                                            | `StudentProgressPage`                                                | `useStudentProgress`, `useOutcomeChain`, `useCLOProgress`                                       |
| `profile.html`                                   | `/student/settings/profile`                                                                    | `ProfileSettingsPage`                                                | `useStudentProfile`, `useAccessibilityPreferences`                                              |
| `journal.html`                                   | `/student/journal`                                                                             | `StudentJournalPage`                                                 | `useJournal`, `useReflectionTemplates`                                                          |
| `leaderboard.html`                               | `/student/leaderboard`                                                                         | `LeaderboardPage`                                                    | `useLeaderboard`, `useLeagueLeaderboard`, `useMostImproved`                                     |
| `marketplace.html`                               | `/student/marketplace`                                                                         | `StudentMarketplacePage`                                             | `useMarketplace`, `useInventory`, `usePurchase`                                                 |
| `team.html`                                      | `/student/team`                                                                                | `StudentTeamPage`                                                    | `useTeams`, `useTeamMembers`, `useTeamHealth`                                                   |
| `calendar.html`                                  | `/student/calendar`, `/student/timetable`                                                      | `CalendarView`, `TimetableView`                                      | `useCalendar`, `useAcademicCalendar`, `useTimetable`                                            |
| `settings.html`                                  | `/student/settings/profile`, `/student/notification-preferences`                               | `ProfileSettingsPage`, `NotificationPreferences`                     | `useNotificationPreferences`, `useLanguagePreference`, `ThemeProvider`                          |
| `learning-profile.html`                          | `/student/onboarding`, progress                                                                | `OnboardingWizardPage`, `StudentProgressPage`                        | `useOnboarding`, `useBloomsProgression`                                                         |
| `teacher-dashboard.html`                         | `/teacher/dashboard`                                                                           | `TeacherDashboard`                                                   | `useTeacherDashboardAggregate`, `useAtRiskPredictions`, `useAIFeedbackDraft`, `useGradingStats` |
| `teacher-students.html`                          | `/teacher/dashboard` triage, gradebook                                                         | `TeacherDashboard`, `GradebookView`                                  | `useAtRiskPredictions`, `useGradebook`                                                          |
| `teacher-curriculum.html` (AI Curriculum Studio) | `/teacher/modules`, `/teacher/courses/:courseId/generate-questions`, `/teacher/content-review` | `ModuleManager`, `GenerateQuestionsPage`, `ContentReviewPage`        | `useCourseModules`, `useGenerateQuestions`, `useAISuggestions`                                  |
| `teacher-grading.html`                           | `/teacher/grading`, `/teacher/grading/:submissionId`                                           | `GradingQueue`, grading detail                                       | `useGrades`, `useGradebook`, `useAIFeedbackDraft`                                               |
| `teacher-profile.html`                           | `/teacher/settings/profile`                                                                    | `ProfilePage`                                                        | `useStudentProfile`(shared profile), `useTeachingImpact`                                        |
| `parent-dashboard.html`                          | `/parent/dashboard`                                                                            | `ParentDashboard`                                                    | `useParentDashboardAggregate`                                                                   |
| `parent-progress.html`                           | `/parent/progress`                                                                             | `ParentProgressPage`                                                 | `useParentDashboard`, `useStudentProgress` (linked)                                             |
| `parent-support.html`                            | `/parent/planner`, messaging                                                                   | `ParentPlannerView`                                                  | `usePlannerTasks`, notifications                                                                |
| `parent-profile.html`                            | `/parent/profile`, `/parent/settings/profile`                                                  | `ParentProfilePage`                                                  | profile hooks                                                                                   |
| `coordinator-dashboard.html`                     | `/coordinator/dashboard`                                                                       | `CoordinatorDashboard`                                               | `useCoordinatorDashboardAggregate`                                                              |
| `coordinator-outcomes.html`                      | `/coordinator/plos`, `/coordinator/outcome-chain`                                              | `PLOListPage`, `OutcomeChainView`                                    | `usePLOs`, `useOutcomeChain`, `useSectionAttainment`                                            |
| `coordinator-curriculum.html`                    | `/coordinator/matrix`, `/coordinator/coverage-heatmap`, `/coordinator/gap-analysis`            | `CurriculumMatrixPage`, coverage/gap pages                           | `useCurriculumMatrix`, `useAdminPLOHeatmap`                                                     |
| `coordinator-accreditation.html`                 | `/coordinator/course-file`, `/coordinator/cqi`                                                 | `CourseFile`, `CQIPlans`                                             | `useCourseFile`, `useCQIPlans`, `useAccreditationReport`                                        |
| `admin-dashboard.html`                           | `/admin/dashboard`                                                                             | `AdminDashboard`                                                     | `useAdminDashboardAggregate`                                                                    |
| `admin-analytics.html`                           | `/admin/reports`, `/admin/marketplace/analytics`                                               | `ReportGeneratorPage`, `MarketplaceAnalyticsPage`                    | `useAdminDashboard`, `useMarketplaceAnalytics`, `useVisualizationData`                          |
| `admin-governance.html` (AI governance)          | map to existing surfaces: `/admin/audit-log`, settings                                         | `AuditLogPage`, `InstitutionSettings`                                | `useAuditLogs`, `useInstitutionSettings` — **UI framing only; no new backend autonomy engine**  |
| `admin-users.html`                               | `/admin/users`                                                                                 | `UserListPage`                                                       | `useUsers`, `useInviteUsers`                                                                    |

> **Note on `admin-governance` / AI-autonomy tiers:** the prototype shows autonomy tiers, an AI action audit log, and memory/privacy. In production, only the _audit log_ and _institution settings_ exist today. The migration surfaces those; the autonomy-tier controls are presented as **read-only/roadmap UI** unless/until a backend is built (separate spec). Do not fabricate backend behavior.

---

## 3. Component migration strategy (Phase 4 deliverable)

Two buckets: **chrome** (swap once, benefits all pages) and **content primitives** (restyle shared components; pages inherit).

### 3.1 Chrome (do first — P1)

- **`GlobalHeader`** — redesign visual only; keep logo→role-dashboard link, hamburger (`useSidebar().toggle`), `LanguageSwitcher`, `NotificationBell`, `ProfileDropdown`. Optionally add the ⌘K `SearchCommand` + stat pills (student streak/XP) seen in the prototype top bar, reading real gamification hooks.
- **`Sidebar`** — redesign visual only; keep consuming `navItems[role]` + `navGroups` (grouped student vs flat others), de-emphasis, conditional Surveys, active-state logic, `viewTransition`, intent prefetch, RTL drawer. The prototype's "role-aware rail/MORE" concept maps onto the existing grouped structure — no data changes.
- **Role `*Layout`** — redesign the shell (header + sidebar + content region). **Must preserve:** `SidebarProvider`, `EmailVerificationBanner`, `GuidedTour`, `main#main-content`, and **StudentLayout's onboarding gate** + `usePageViewLogger`.

### 3.2 Content primitives (P0 design system, applied P2/P3)

Re-implement the prototype's premium/gamified decisions as real, tokenized components/utilities:

| Prototype primitive                                  | Production implementation                                                                                                                                                                                         |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Compact gamified hero                                | Restyle `WelcomeHero` (`components/shared/WelcomeHero.tsx`) — avatar level ring + XP-to-next + reward teaser; tokens only.                                                                                        |
| KPI number treatment (no harsh black; brand-blue)    | Restyle `KPICard` — value color `--brand-primary-dark`/deep brand blue, weight 800, tight numerals; semantic values keep semantic color.                                                                          |
| Elevated card + hover lift (`.pcard`)                | Add a `.card-elevated` utility (or extend Shadcn `Card`) in `index.css`: soft layered shadow, `rounded-xl/2xl`, hover translate — tokenized, dark-mode aware.                                                     |
| Section header with gradient icon chip (`.sec-h`)    | A `SectionHeader` shared component (icon chip uses `--brand-gradient`).                                                                                                                                           |
| Severity leading icon w/ halo ring (`.lead.sev-*`)   | A `SeverityIcon`/`StatusAvatar` shared component (tinted tile + ring): high=destructive, med=warning, low=success, brand/info variants; pairs with a Badge (never color alone). Replaces any left "status spine". |
| Tactile pressable button (`.btn3d`)                  | A `Button` variant (`variant="tactile"` or a `.btn-3d` layer) — subtle solid bottom edge that compresses on `:active`; primary deepest, secondary flat; respects reduced-motion.                                  |
| Mastery ring                                         | A `MasteryRing` shared component (SVG progress ring, `--brand-*`/semantic stroke).                                                                                                                                |
| Graded status (amber=soon, red=overdue only)         | Reuse semantic tokens + `Badge`; NO permanent red framing (matches the design-system + color-in-context rationale).                                                                                               |
| Learn Loop card / spaced review / tutor memory panel | Compose from existing hooks into the relevant pages (AdaptiveQuizSession, TodayView, TutorPage) — behavior via existing hooks.                                                                                    |

**Rule:** components consume hooks; primitives are presentation-only. No business logic enters `components/shared/`.

---

## 4. Route migration plan (Phase 5 deliverable)

- **Keep `AppRouter.tsx` structure verbatim.** The redesign happens _inside_ layouts and page components, so all routes, deep links, guards, `index` redirects, and `/student/focus/:sessionId` (outside `StudentLayout`) keep working with zero route edits.
- **Optional additions (reviewed):** a dedicated `NotFoundPage` for `*` (today it redirects to `/login`); if adopted, unauthenticated `*` still routes to `/login` while authenticated unknown paths show NotFound within the role shell.
- **No path renames.** Any nav label change is i18n-only (`navItems.labelKey`), never a `to` change, to protect bookmarks.

## 5. API integration plan (Phase 6 deliverable)

- Every redesigned component binds to the **existing** hook for its data (see §2 table). No new Supabase calls in components.
- For prototype-only aggregates (e.g. student "Today" = weakest CLO + due reviews + next action), add a thin composing hook (e.g. `useTodayPlan`) that **calls existing hooks / RPCs**, reusing `queryKeys`; it performs no new writes.
- Mutations reuse existing mutation hooks (audit + invalidation already handled). `useStandardMutation` wraps error handling/toasts.

## 6. State management integration plan (Phase 7 deliverable)

- **Auth/role/institution:** `useAuth` only.
- **Server cache:** shared `QueryClient`; reuse `queryKeys`; keep defaults and dashboard critical-first sequencing.
- **Language/direction:** `useLanguage`/`useTranslation`; **Theme:** `ThemeProvider`.
- **URL state:** `nuqs`.
- **Ephemeral UI state:** local `useState`/component state only. **No** new global stores, no second providers. If impersonation/focus-mode UI is wanted, mount the existing (currently unmounted) providers deliberately rather than inventing new state.

## 7. Design tokens, auth background, i18n/RTL & dark-mode preservation

### 7.1 Tokens (Requirement 6)

- **Canonical source:** `src/index.css`. Do not add `tailwind.config.js` (project is Tailwind v4 `@theme`). Do not import the prototype's CDN Tailwind or `shared.css`.
- **Reconcile the gradient divergence:** pick ONE `--brand-gradient` (recommend keeping `index.css`'s `linear-gradient(135deg,#14b8a6 0%,#0382bd 100%)`), update the steering doc's `93.65deg` reference to match, and use the token everywhere (no inline gradient literals).
- New primitives (`.card-elevated`, `SeverityIcon`, tactile button layer, `MasteryRing`, `SectionHeader`) reference tokens (`--brand-*`, semantic, surface) so they adapt to dark mode automatically.

### 7.2 Auth background (Requirement 6.1) — reproduce exactly

When redesigning `LoginPage`/`SignUpPage`/`ResetPasswordPage`/`UpdatePasswordPage`, keep:

- Root: `min-h-screen relative overflow-hidden bg-gradient-to-br from-[#1e293b] via-[#0f172a] to-[#020617]`.
- Doodle overlay: `absolute inset-0 opacity-[0.04]`, `backgroundImage: url('/doodle-background.jpg')`, `backgroundSize:'1200px'`, repeat, `filter:'invert(1)'`.
- Logo `/edeviser-logo-final.png` (h-32), tagline `text-blue-400`.
- Auth card: `bg-white/95 backdrop-blur-xl rounded-[2rem] ring-1 ring-white/20 shadow-2xl`.
- Tabs/submit gradient: `from-[#14b8a6] to-[#3b82f6]` (hover `from-[#0d9488] to-[#2563eb]`); field focus accent `#14b8a6`.
- `LanguageSwitcher` pinned `top-4 end-4`. Logical props throughout.
- Logic unchanged: `useAuth().signIn/signUp`, DEV/env-gated demo panels, self-signup = student.
  Any prototype auth styling (split-screen, SSO buttons, magic link, role picker on signup) is adopted ONLY as far as it composes over this background and calls real auth; SSO/magic-link are **not** wired unless a backend exists (present as roadmap/disabled otherwise).

### 7.3 i18n / RTL / Arabic (Requirement 7)

- All new copy → keys in `src/locales/en/*.json` **and** `src/locales/ar/*.json` (correct namespace: `common` for nav/chrome, role namespaces for role screens, `auth`/`gamification`/`ai` as fitting). Never hardcode strings.
- Use logical CSS props (`ms-/me-/ps-/pe-/start/end`) exclusively; audit each migrated screen for physical props.
- Keep `applyDirection` (html `dir`/`lang` + `Noto Sans Arabic`) and `LanguageProvider` persistence. **Reconcile** `preferred_language` (LanguageProvider) vs `language_preference` (AuthProvider `applyProfileLanguage`) to one field; document the choice; migrate reads consistently (no user-visible change).
- Parity gate requires screenshot verification in `ar` (RTL) and `en` (LTR).

### 7.4 Dark mode (Requirement 8)

- Keep `.dark` class strategy + token overrides. Every new primitive must be verified in light and dark. No light-only literals.

## 8. Accessibility plan (Phase 12)

Preserve `SkipToMain`→`#main-content`, keyboard order, focus rings, header/sidebar aria roles/labels, `prefers-reduced-motion` gating, WCAG AA contrast, ≥44px targets, status = color + icon/text. Re-run axe/Lighthouse a11y per migrated screen.

## 9. Performance plan (Phase 11)

Keep all routes lazy; no CDN Tailwind runtime; no duplicate providers/queries; dashboards keep critical-first + 120s stale. Measure route bundle + TTI before/after each screen (SpeedInsights + Lighthouse); regressions block the parity gate.

## 10. Risks & mitigations (Phase — deliverable 11)

| #   | Risk                                                                  | Mitigation                                                                                                                                   |
| --- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | **Only 5 roles exist** (no super-admin/advisor from the brief)        | Explicitly scope to 5; document that advisor/super-admin need a separate backend+RLS+types spec. Do not stub fake roles.                     |
| R2  | **Onboarding gate** embedded in `StudentLayout`                       | Reproduce the `onboarding_completed===false → OnboardingWizard isDay1` short-circuit in the redesigned layout; test a not-onboarded student. |
| R3  | **Focus mode** route is outside `StudentLayout`                       | Swapping the student shell won't cover it; migrate `FocusModePage` separately as a full-screen page.                                         |
| R4  | **Login side-effects** live in `AuthProvider.signIn`                  | New login UI must call `useAuth().signIn`; never bypass to `supabase.auth`. Verify streak/XP/habit/perfect-day still fire for students.      |
| R5  | **No 404 page**                                                       | Decide explicitly; if added, keep unauth `*`→`/login`.                                                                                       |
| R6  | **Token/lang-field divergence** (gradient angle; two language fields) | Pin canonical values in one place; reconcile before mass migration to avoid inconsistent restyles.                                           |
| R7  | **Dark + RTL applied imperatively to `<html>`**                       | Keep `.dark` class + `applyDirection`; new UI must not assume LTR/light.                                                                     |
| R8  | **Unmounted providers** (Impersonation/FocusMode)                     | If new UI needs them, mount deliberately in `App.tsx`; otherwise leave out.                                                                  |
| R9  | **Porting prototype CSS/JS** would fork the design system             | Hard rule (Req 15): re-implement with tokens/Shadcn/Lucide; lint/PR-review to block `prototype/` imports and CDN Tailwind.                   |
| R10 | **Regressions during phased swap**                                    | Feature-flag per module; keep old component until parity; run regression matrix each phase.                                                  |
| R11 | **i18n drift** (missing Arabic keys)                                  | Missing-key marker + `test:rls`/i18n key-parity check; ar verification in parity gate.                                                       |
| R12 | **Realtime/notifications/AI coupling**                                | Reuse existing hooks/subscriptions; presentation-only changes; smoke-test realtime + tutor per phase.                                        |

## 11. Rollback plan (deliverable 12)

- **Feature flag per module** (e.g. `VITE_NEW_UI_<MODULE>` or a runtime flag) selecting old vs new component; default OFF until parity signed off.
- **Keep the old component** in the tree until its replacement passes the gate; removal is a separate cleanup PR.
- **Reversible by config** (flip flag) without redeploy where possible; otherwise `git revert` of the module PR.
- **No DB/logic changes** means rollback never risks data — only presentation reverts.

## 12. Phased migration roadmap (P0–P3, deliverable 13)

- **P0 — Design system foundation.** Reconcile tokens in `index.css`; add primitives (`.card-elevated`, `SeverityIcon`, tactile `Button` variant, `MasteryRing`, `SectionHeader`); restyle `KPICard`, `WelcomeHero`, `Button`, `Card`, `Badge`, `EmptyState`, `Shimmer`, `DataTable` shells. Add locale keys scaffolding. **No page swaps yet.** Gate: primitives verified light/dark, en/ar, a11y.
- **P1 — Chrome/navigation.** Redesign `GlobalHeader`, `Sidebar`, and the 5 role `*Layout`s (reusing `navItems`/`navGroups`, preserving onboarding gate, EmailVerificationBanner, GuidedTour, SkipToMain). Optional ⌘K + stat pills. Gate: every route still renders inside the new shell; RTL drawer; role nav correct.
- **P2 — Dashboards.** Restyle the 5 role dashboards to the prototype (Today/gap→action for student; triage/AI-drafts for teacher; growth/wellbeing for parent; attainment/gaps for coordinator; trends/governance-framing for admin) — bound to existing aggregate hooks. Gate: functional + visual parity per role dashboard.
- **P3 — Remaining modules.** Courses/assignments/AI-tutor/habits/marketplace/leaderboard/journal/progress (student); grading/curriculum/CLOs/teams (teacher); coordinator matrix/CQI/course-file; admin users/programs/courses/reports/marketplace/surveys; parent progress/attendance/planner. Migrate module-by-module behind flags. Gate: regression matrix green per module.
- **P-final — Cleanup.** Remove flags + dead old components; delete `prototype/` (or keep as design archive, never imported).

## 13. Files to MODIFY vs files that must NOT be modified (deliverables 14 & 15)

### Allowed to modify (presentation)

- `src/index.css` (extend tokens/utilities; keep existing token values).
- `src/components/ui/*` (restyle Shadcn variants — button/card/badge/tabs/etc.).
- `src/components/shared/*` chrome + primitives: `GlobalHeader.tsx`, `Sidebar.tsx`, `KPICard.tsx`, `WelcomeHero.tsx`, `PrimaryCTA.tsx`, `GradientCardHeader.tsx`, `EmptyState.tsx`, `Shimmer.tsx`, `DataTable.tsx` (presentation only), `SkipToMain.tsx`, and new primitives (`SeverityIcon`, `MasteryRing`, `SectionHeader`, `StatCard`).
- `src/pages/**` (restyle/compose; keep hook usage) — including `src/pages/{role}/{Role}Layout.tsx`, `LoginPage.tsx`, `SignUpPage.tsx`, `ResetPasswordPage.tsx`, `UpdatePasswordPage.tsx`, and role dashboards/module pages per phase.
- `src/lib/navItems.ts` / `src/lib/navGroups.ts` (labels/grouping/icons only; **never** change `to` paths).
- `src/locales/{en,ar}/*.json` (add keys).
- Optionally `src/router/AppRouter.tsx` — **only** to add a NotFound route (no path/guard changes).
- `src/App.tsx` — **only** if deliberately mounting an existing provider (e.g. Impersonation) or a feature-flag wrapper.

### Must NOT modify (logic / backend / contracts)

- `supabase/**` — migrations, edge functions, `config.toml`, seed.
- `src/hooks/**` — data/business logic (add new hooks only; don't change existing signatures/behavior).
- `src/lib/queryKeys.ts`, `src/lib/supabase.ts`, `src/lib/queryClient.ts`, `src/lib/auditLogger.ts`, `src/lib/i18n.ts` core init, `src/lib/directionManager.ts` (behavior).
- `src/providers/AuthProvider.tsx` (auth/session/side-effects/cache), `RouteGuard.tsx` (RBAC), `src/types/database.ts` (generated), `src/types/app.ts` `UserRole` union (no role changes).
- Route **paths**, guard `allowedRoles`, `index` redirects, `ROLE_DASHBOARD_MAP`.
- Anything under `prototype/` is **reference only** and must never be imported by `src/`.

## 14. Definition of done (per screen)

Visual parity ✓ · functional parity ✓ · en+ar verified ✓ · light+dark verified ✓ · a11y (axe/keyboard) ✓ · perf ≥ baseline ✓ · regression matrix row green ✓ · flag flipped on ✓ · old component removable ✓.

## 15. Coverage model & page-archetype pattern library (Requirement 16)

> **Full route-by-route classification lives in `#[[file:coverage-matrix.md]]`** — every
> production route tagged **P** (prototype-referenced 1:1), **P\*** (prototype pattern), or
> **D** (design-system-derived), with its archetype, reuse-data domain, and preservation
> notes. Summary at spec time: 40 P, 31 P\*, 93 D across 164 screen routes (~43%
> carry a direct prototype reference; ~57% are archetype-derived).

**Reality check:** the prototype is a _partial_ reference. It mocks the 5 role dashboards, the flagship student flows (Today/dashboard, learn loop, spaced review, AI tutor, path, progress, journal, leaderboard, marketplace, team, calendar, settings, profile), the auth screen, and a few teacher/parent/coordinator/admin surfaces. The production app has ~200 screens. **Most routes have NO prototype design** — most admin/coordinator/teacher CRUD, forms, detail pages, wizards, management tables, and analytics views.

**Rule (no screen left behind):** every screen still lands on the new design system, from one of two sources:

- **Prototype-referenced** → match the specific prototype page (visual parity).
- **Design-system-derived** → compose from the P0 primitives + a standard **page archetype** below, preserving the existing screen's function. We do **not** leave any screen on the legacy style, and we do **not** invent behavior beyond existing backend capability.

Instead of designing ~200 screens bespoke, we standardize **~10 page archetypes** (authored once in P0). Prototype pages become worked examples of these archetypes; every un-mocked screen picks the matching archetype.

| Archetype               | Composition                                                                 | Prototype example               | Production users (mostly derived / no ref)                                                                                                          |
| ----------------------- | --------------------------------------------------------------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dashboard               | Hero + KPI row + section cards                                              | `*-dashboard.html`              | all `*Dashboard`                                                                                                                                    |
| List / index            | Header + filters (nuqs) + card-grid/`DataTable` + pagination + `EmptyState` | `learn/leaderboard/marketplace` | `UserListPage`, `CourseListPage`, `CLOListPage`, `PLOListPage`, `ILOListPage`, assignment lists…                                                    |
| Management table (CRUD) | Restyled `DataTable` + row actions + `ConfirmDialog`                        | (none — derive)                 | `SemesterManager`, `DepartmentManager`, `FeeManager`, `AttendanceMarker`, `GradebookView`, `SurveyManager`, `QuestionBankPage`…                     |
| Form (create/edit)      | Auth-grade form styling + Shadcn `Form` + `PrimaryCTA`                      | `auth.html` form                | `UserForm`, `CourseForm`, `ProgramForm`, `CLOForm`, `PLOForm`, `ILOForm`, `QuizForm`, `ChallengeFormPage`…                                          |
| Detail (entity)         | Header + tabs + related sections + actions                                  | `course/assignment.html`        | `CLODetailPage`, `StudentCourseDetail`, `ChallengeDetailPage`, `TeamProfilePage`…                                                                   |
| Wizard / stepper        | Progress bar + steps + immersive frame                                      | `lesson.html`, onboarding       | `OnboardingWizard`, `BulkImportPage`, `GenerateQuestionsPage`, `CompleteProfilePage`                                                                |
| Full-screen focus       | Immersive, no chrome                                                        | `lesson/review.html`            | `FocusModePage`, `AdaptiveQuizSession`, `PostQuizReview`                                                                                            |
| Analytics / report      | Filters + Recharts + KPI cards                                              | `admin-analytics/progress.html` | `ReportGeneratorPage`, `CurriculumMatrixPage`, coverage-heatmap, sankey, `QuestionAnalyticsDashboard`, `TutorAnalyticsPage`, `TeamHealthReportPage` |
| Settings                | Sectioned cards + toggles + tier controls                                   | `settings/profile.html`         | `ProfilePage`, `InstitutionSettings`, `NotificationPreferences`                                                                                     |
| State templates         | `Shimmer`/`DataTable` skeleton, `EmptyState` (~40 variants), `ErrorState`   | prototype shimmer/empties       | every screen                                                                                                                                        |

**Process for a derived screen:** (1) read the existing production page to inventory its data/fields/actions; (2) pick the archetype; (3) re-skin using primitives + archetype; (4) keep every hook/mutation; (5) pass the same gates (consistency with the archetype, functional parity, en+ar, light+dark, a11y, perf). If the archetype is missing, author it in the design system first (Req 16.4), then use it.

**Where the design system exceeds the prototype:** for capabilities the prototype never visualized (accreditation report generation, fee management, competency frameworks, sankey/coverage analytics, audit log, etc.), we design them fresh _within the established design language_ — same tokens, primitives, archetypes — so they feel native to the new UI, not bolted on. The prototype is the _style guide_; the archetypes are how that style reaches screens the prototype never drew.

## 16. Research & UX reference material (context for building)

The gamification/UX rationale behind the redesigned surfaces is bundled into this spec so the build has the _intent_, not just the pixels. It is **UX reference**, not a feature backlog — the migration stays presentation-only (R1), so a mechanic's _look_ is built only where the backend already supports it, and the **"flow not goal" guardrail** (XP/emphasis tied to outcomes, never idle activity) is a binding design principle.

- **Duolingo feature-gaps (gamification/UX rationale):** #[[file:research-duolingo-feature-gaps.md]]
  Maps each Duolingo mechanic (learning path, daily-goal ring, mistakes/review, mastery checkpoints, companion persona, warm notifications, session recaps) to Edeviser's existing outcomes and to the design-system primitives/archetypes (§3, §15). Use it to decide _how gamified surfaces look and feel_; use §15 to decide _how every screen is assembled_.

- **AI-first strategy review (code-grounded AI/tutor/curriculum audit):** #[[file:research-ai-first-strategy-review.md]]
  Motivates the redesign's AI priorities and audits what the tutor/curriculum backend _actually_ is today. See **R17** + **§17** for the enhancement mapping (surface existing autonomy/curriculum capability; mark the rest roadmap).

**Sibling research (source-of-truth in `docs/product/`, referenced for deeper context):**

- `docs/product/onboarding-redesign.md` — onboarding flow + daily-goal commitment UX.
- `docs/product/student-ux-redesign.md` — student experience audit (SDT/Flow/Calm-Tech principles) driving the dashboard/nav IA.

**How these bind to the migration:** the redesigned student Dashboard (Today/gap→action), the mastery-first framing, the review/mistakes surface, and the AI-tutor persona all derive their _behavioral intent_ from these docs; their _visual form_ comes from the §3 primitives + §15 archetypes; their _data_ comes from existing hooks (§2). Nothing here authorizes new backend — only how existing capability is presented.

## 17. AI tutor autonomy & AI curriculum — enhancing existing backend (Requirement 17)

The prototype's tutor-autonomy control and "Curriculum Studio" are **UX upgrades over capabilities the app already has** — this migration makes them first-class and cohesive, reusing existing edge functions/hooks. It adds **no** AI backend (R1 holds). This is the concrete answer to "make the real app's AI tutor have that control and course-curriculum features like the prototype": _enhance and unify what exists in the new UI; everything past current backend is explicitly roadmap._

### 17.1 AI Tutor — surface & elevate what already exists

| Prototype UX                                                  | Existing backend/hook (reuse)                                                    | Status                                                                   |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| "Teaching style: Hints / Guided / Direct" toggle              | `useTutorAutonomy` + `useUpdateConversationAutonomy` (per-conversation L1/L2/L3) | **Exists** — surface prominently                                         |
| Persona voice                                                 | `chat-with-tutor` personas (socratic / step-by-step / explainer)                 | **Exists** — expose selection                                            |
| Answers grounded in course material                           | `chat-with-tutor` RAG (OpenAI embeddings + pgvector `search_course_materials`)   | **Exists** — indicate sources                                            |
| "What I know about you" panel                                 | per-CLO `outcome_attainment` snapshot injected today                             | **Partial** — show real CLO mastery; full long-term memory = **roadmap** |
| Proactive opener / nudge                                      | `generate-plan-update` (fires at 5+ same-CLO interactions), notifications        | **Exists (limited)** — surface; broader proactivity = roadmap            |
| Integrity redirect                                            | `tutorIntegrityDetector` regex + pedagogical redirect                            | **Exists** — preserve behavior                                           |
| Platform-wide autonomy tiers A0–A3 (act on the user's behalf) | none                                                                             | **Roadmap** — present read-only or omit                                  |

**UI outcome:** the redesigned Tutor screen makes the human control (L1/L2/L3), persona, source-grounding, and CLO context legible and central — improving the _presentation_ of the existing tutor while keeping it human-in-the-loop.

### 17.2 AI Curriculum "Studio" — unify existing teacher AI

| Prototype UX (upload → drafts → approve)  | Existing backend/hook (reuse)                            | Status                                                   |
| ----------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------- |
| Upload & index material                   | `embed-course-material` (chunks + embeds for RAG)        | **Exists**                                               |
| Suggest modules / structure               | `ai-module-suggestion`                                   | **Exists**                                               |
| Draft retrieval questions                 | `generate-quiz-questions` + review-queue / question-bank | **Exists**                                               |
| Draft feedback                            | `ai-feedback-draft`                                      | **Exists**                                               |
| Teacher approval gate                     | content-review / review-queue                            | **Exists** — keep teacher-in-control                     |
| One-click full micro-lesson decomposition | (no single backend op today)                             | **Roadmap** — compose from the above; never auto-publish |

**UI outcome:** the migration gathers today's scattered teacher AI functions into one coherent, teacher-approved "Curriculum Studio" surface — an IA/UX improvement that reuses existing functions; no new generation backend.

### 17.3 Governance rails (unchanged)

Human-in-the-loop, explainable ("why am I seeing this"), reversible, audit-logged, integrity guard intact. Any capability beyond the "Exists"/"Partial" rows above is deferred to a **separate AI spec** — this migration does not build it.

## 18. Responsive & adaptive strategy (Requirement 18)

**Where we are:** the production app is already responsive (Tailwind breakpoints; `lg` sidebar that becomes an off-canvas drawer on mobile via the hamburger). So "mobile + web" is not new — the migration **strengthens** it. The prototype's manual device toggle + phone-frame were **demo aids only**; the real app uses true Responsive Web Design (this is the "Option B — true responsive desktop" the research annex anticipated).

**Principles (industry standard):**

1. **One responsive codebase.** Adapt by CSS, not by shipping different UIs. **No UA sniffing, no manual device toggle.**
2. **Mobile-first.** Base styles target small screens; add complexity upward with min-width breakpoints.
3. **Capability detection > device detection.** Use `pointer`/`hover`/`any-pointer` media features for touch vs mouse — don't guess "phone."
4. **Container queries for components.** Tailwind v4 `@container` — archetype components respond to their slot, so the same card works in a 1-col mobile feed or a 3-col desktop grid.
5. **Fluid + intrinsic.** Prefer fluid grids, `min()/max()/clamp()`, `dvh`, and CSS grid `auto-fit/minmax` over fixed pixel breakpoints where possible.

**Breakpoints (existing Tailwind v4):** `sm 640 · md 768 · lg 1024 · xl 1280 · 2xl 1536`. `lg` = sidebar/desktop threshold (keep).

**Responsive navigation (an improvement):**

- **≥ lg:** fixed sidebar (redesigned) + `GlobalHeader` — as today.
- **< lg:** a **bottom tab bar** for the top ~4–5 primary items (thumb zone) + the rest via the existing off-canvas drawer (hamburger). Both read the SAME `navItems[role]`; RTL-aware (`rtl:translate-x-full`). This matches the prototype's intent (mobile tabs / desktop sidebar) but done responsively, no toggle.
- Student grouped nav collapses sensibly on mobile (groups → drawer sections; core items → bottom tabs).

**Capability adaptation:**

- `(pointer: coarse)` / `(hover: none)` → ≥44px targets, tap-friendly spacing, no hover-only menus; press states instead of hover states.
- `(hover: hover)` → hover lift/tooltips/intent-prefetch enhancements.

**Per-archetype responsive behavior (§15 archetypes):**
| Archetype | Mobile (<md) | Desktop (≥lg) |
|---|---|---|
| Dashboard | 1-col stack; KPI grid `grid-cols-2`; hero compact | KPI `grid-cols-4`; multi-column section grid; right rail if space |
| List / index | card list; filters in a sheet | `DataTable` or multi-col card grid; inline filters |
| Management table | horizontal-scroll table OR card-per-row | full `DataTable` with sticky header |
| Form | single column; sticky submit | 2-col field grid where sensible |
| Detail | stacked tabs/sections | side-by-side detail + related |
| Wizard / Full-screen focus | full-screen, one step; large touch controls | centered max-width column |
| Analytics/report | 1 chart per row, scrollable | multi-chart grid + side filters |

**Also:** `100dvh` (not `100vh`) for mobile chrome; `env(safe-area-inset-*)` padding for notched devices; responsive `srcset`/sizes for imagery; keep `prefers-reduced-motion` + `prefers-color-scheme` handling.

**Test matrix (parity gate):** for each migrated screen — 360px, 768px, 1024px, 1440px viewports × {touch, pointer} × {LTR, RTL} × {light, dark}. Verify bottom-tab vs sidebar swap at `lg`, table degradation, and 44px targets on coarse pointers.

**Out of scope / roadmap:** installable PWA (offline, home-screen install) and native wrappers — separate decision; not required for responsive web.
