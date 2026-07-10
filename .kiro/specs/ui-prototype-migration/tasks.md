# Tasks — UI Prototype Migration

Incremental, reversible, presentation-only. Every task keeps the app fully functional. Each screen ships only after its Definition of Done (design.md §14). `(Ref R#)` = requirement in requirements.md.

---

## P0 — Design-system foundation (no page swaps)

- [x] 0.1 Reconcile brand tokens in `src/index.css`: **done** — `--brand-gradient` confirmed already canonical (`135deg,#14b8a6→#0382bd`); no `tailwind.config` (Tailwind v4 `@theme`). **Deferred:** aligning the `93.65deg` reference in the design-system steering doc — that file is under `.kiro/`, which `AGENTS.md` marks _do-not-modify_; flagged for explicit approval (index.css is the canonical source, so no code impact). (Ref R6.2, R6.4)
- [x] 0.2 Add tokenized primitives to `src/index.css` + `src/components/`: **done** — `.card-elevated` + `.btn-tactile` (+`--tactile-edge`) utilities in `index.css`; `SeverityIcon` (6 severities × 3 sizes, halo, a11y label), `MasteryRing` (attainment-color or brand-gradient), `SectionHeader` (gradient icon chip); tactile `Button` variant. All additive (unused until adopted → zero regression), dark-mode + reduced-motion aware. (Ref R6.3, R8, R10, R15)
- [~] 0.3 Restyle shared primitives (presentation only): **done** — `KPICard` value recolored to deep brand blue via backward-compatible `valueClassName` (default `text-sky-700` = `#0369a1`; semantic override supported). **Assessed already on-design (left as-is):** `WelcomeHero` (compact hero), `PrimaryCTA` (gradient CTA), `EmptyState` (dark-aware + i18n), `Shimmer`. **Deferred to P2/P3:** broad restyle of base `Button`/`Card`/`Badge`/`Tabs` + `DataTable` skeleton — changes appearance app-wide, so each ships behind a per-screen visual-parity gate (can't visually verify in this env). (Ref R9.2, R15)
- [x] 0.4 **done** — Feature-flag mechanism (`src/lib/featureFlags.ts` + `useFeatureFlag` hook; resolution order localStorage-override → env → default-off, reversible) + `FeatureBoundary` old/new boundary + DEV-only `DevFlagToggle`. Unit-tested (8/8). (Ref R13.2)
- [~] 0.5 **partial** — i18n key-parity **checker** built (`scripts/check-i18n-parity.mjs` + `npm run i18n:check`; all 8 en/ar namespaces confirmed in parity). New chrome/nav reuse EXISTING keys (no new copy yet), so key scaffolding is N/A until new strings are introduced. CI wiring of the checker: TODO. (Ref R7.1, R7.5)
- [ ] 0.6 Reconcile the duplicate profile language field (`preferred_language` vs `language_preference`) to one canonical field; document; no user-visible change. (Ref R7.4)
- [x] 0.7 Author the **page-archetype pattern library** (design.md §15): Dashboard, List/index, Management table, Form, Detail, Wizard/stepper, Full-screen focus, Analytics/report, Settings, and State templates (loading/empty/error) — each a documented composition of primitives + shared components with one worked example. Un-mocked screens are built from these. (Ref R16.3, R16.4) → **delivered:** `#[[file:archetypes.md]]` (also folds in the §18 responsive conventions for 0.8).
- [x] 0.8 Bake **responsiveness into every primitive & archetype** (design.md §18): **done** — new primitives use hover-capability gating (`.card-elevated` lifts only on `(hover:hover)`), reduced-motion gating, and logical props (RTL). Breakpoint conventions + capability rules (`(pointer:coarse)`→≥44px, `@container`, `100dvh`+safe-area, table→card degradation, no device toggle / no UA sniffing) are documented once in `#[[file:archetypes.md]]` and bind every archetype. (Ref R18.1–18.6)

## P1 — Chrome & navigation

- [x] 1.1 **done (flag-gated)** — `GlobalHeader` restyled behind `newUiChrome` (translucent frosted bar + shadow); logo→dashboard, hamburger, `LanguageSwitcher`, `NotificationBell`, `ProfileDropdown` all preserved; flag-off path byte-identical. ⌘K search + student stat pills deferred to a later pass. (Ref R2.1, R3.5, R14.2)
- [x] 1.2 **done (flag-gated)** — `Sidebar` restyled behind `newUiChrome` (brand-gradient active pill, frosted surface); ALL `navItems[role]`/`navGroups` (grouped student / flat others), de-emphasis, conditional Surveys, active-state, `viewTransition`, intent prefetch, RTL drawer logic shared; flag-off path byte-identical. (Ref R4.4, R7.2, R11.1, R12.1)
- [x] 1.2a **done** — `MobileTabBar` (fixed bottom bar, `lg:hidden`, first 5 core items from the SAME `navItems[role]`, ≥44px targets, safe-area inset, RTL via logical flow, brand-teal active). Rendered in the `Sidebar` new-chrome branch; a `:has()` CSS rule reserves content space so it never overlaps. Auto-swaps at `lg` (bottom bar <lg / sidebar ≥lg), no toggle/UA sniffing; header hamburger still opens the full-nav drawer on <lg. (Ref R18.5)
- [ ] 1.3 Redesign the 5 role `*Layout`s (`Admin/Coordinator/Teacher/Student/Parent`): new shell; **preserve** `SidebarProvider`, `EmailVerificationBanner`, `GuidedTour`, `main#main-content`. (Ref R3.1, R10.1)
- [ ] 1.4 Reproduce **StudentLayout onboarding gate** (`onboarding_completed===false → OnboardingWizard isDay1`) + `usePageViewLogger` in the redesigned StudentLayout; test a not-onboarded student. (Ref R5.3)
- [ ] 1.5 (Optional, reviewed) add a `NotFoundPage`; keep unauth `*`→`/login`. (Ref R3.4)
- [ ] 1.6 Verify EVERY route still renders in the new shell (public, all `/{role}/*` incl. deep links, `/student/focus/:sessionId` outside shell, index redirects). (Ref R3.1–3.3)

## P1b — Auth screens (preserve background + colors + Arabic)

- [ ] 1.7 Redesign `LoginPage` keeping the exact auth background (dark slate gradient + doodle overlay), logo, `bg-white/95 backdrop-blur-xl rounded-[2rem]` card, teal→blue tab/submit gradients, `#14b8a6` field accents, `LanguageSwitcher top-4 end-4`; logic via `useAuth().signIn`; DEV/env-gated demo panels intact. (Ref R5.1, R5.5, R6.1, R7.2)
- [ ] 1.8 Apply the same background/treatment to `SignUpPage`, `ResetPasswordPage`, `UpdatePasswordPage`; keep self-signup = student (no ignored role picker). (Ref R5.4, R6.1)
- [ ] 1.9 Verify auth screens in en (LTR) + ar (RTL), light + dark; account-lockout + redirect behavior unchanged. (Ref R7.5, R9.1)

## P2 — Role dashboards (bind to existing aggregate hooks)

- [ ] 2.1 Student `StudentDashboard`: "Today / gap→action" hero, mastery-first, review + tutor entry — via `useStudentDashboardAggregate`/`useStreak`/`useXP`/`useLearningPath`/`useReviewQueue`; add a thin `useTodayPlan` composing hook if needed (no new writes). (Ref R1.2, R1.4, R9.1)
- [ ] 2.2 Teacher `TeacherDashboard`: at-risk triage + AI feedback drafts + CLO gaps — via `useTeacherDashboardAggregate`/`useAtRiskPredictions`/`useAIFeedbackDraft`. Actions reuse existing mutations. (Ref R1.3, R14.1)
- [ ] 2.3 Parent `ParentDashboard`: growth/wellbeing framing (no raw grades) via `useParentDashboardAggregate`. (Ref R9.1)
- [ ] 2.4 Coordinator `CoordinatorDashboard`: attainment alerts + gaps via `useCoordinatorDashboardAggregate`. (Ref R9.1)
- [ ] 2.5 Admin `AdminDashboard`: trends + governance framing via `useAdminDashboardAggregate`; AI-autonomy controls are read-only/roadmap (no fabricated backend). (Ref R2.3, design §2 note)
- [ ] 2.6 Parity gate each dashboard: visual + functional + en/ar + light/dark + a11y + perf. (Ref R9, R10, R11, R12)

## P3 — Remaining modules (module-by-module, flagged)

> **Coverage rule (R16):** P3 migrates **every** remaining production screen to the new design — not only prototype-referenced ones. Prototype-referenced screens match their reference; **design-system-derived** screens (the majority — most CRUD / forms / detail / wizard / analytics / management views) are built from the P0 primitives + §15 archetypes, preserving each screen's existing function. **No production screen is left on the legacy style.** For each derived screen: read the existing page → pick the archetype → re-skin → keep all hooks.

- [ ] 3.1 Student modules: courses, assignments, AI tutor (memory/autonomy UI via existing tutor hooks), habits, leaderboard, marketplace, journal, progress, portfolio, calendar/timetable, focus mode (full-screen, outside layout). (Ref R3.3, R14.1)
- [ ] 3.2 Teacher modules: grading (+AI draft), curriculum/modules/content-review, CLOs/rubrics/assignments, teams/challenges, tutor-analytics/handoffs, baseline. (Ref R1.3)
- [ ] 3.3 Coordinator modules: PLOs, matrix, coverage-heatmap, gap-analysis, CQI, course-file, outcome-chain, sankey, timetable. (Ref R1.2)
- [ ] 3.4 Admin modules: users, programs, courses, semesters, departments, outcomes (ILO), reports, audit-log, fees, marketplace mgmt, surveys, bonus events, institution/profile settings. (Ref R1.1–1.3)
- [ ] 3.5 Parent modules: children, progress, attendance, planner, profile. (Ref R1.2)
- [ ] 3.6 Shared: `ProfilePage`/settings, notification preferences, calendar/timetable, portfolio (public route). (Ref R3.1)
- [ ] 3.7 **Coverage matrix:** the full route enumeration + classification is authored in **`coverage-matrix.md`** (every route → P / P\* / D + archetype + reuse-data + preservation notes, with per-role tables and summary counts). P3 uses it as the checklist: confirm every row is migrated, gated, and off the legacy style; update each row's status as its flag flips on. (Ref R16.1, R16.5) → see `#[[file:coverage-matrix.md]]`

## Cross-cutting verification (run each phase)

- [ ] V.1 Regression matrix: for every migrated feature verify works-before vs works-after — routes, APIs, mutations, forms, uploads, AI, realtime, notifications, caching, permissions. (Ref R13.3)
- [ ] V.2 Role verification: student/teacher/parent/coordinator/admin each see correct nav, dashboard, permitted actions; cannot reach unauthorized routes (guard redirects intact). (Ref R4)
- [ ] V.3 i18n: en+ar per screen, no hardcoded strings, logical props only, no missing-Arabic-key markers. (Ref R7)
- [ ] V.4 Theme: light+dark per screen. (Ref R8)
- [ ] V.5 A11y: axe/Lighthouse, keyboard, focus order, contrast, touch targets, reduced motion, skip link. (Ref R10)
- [ ] V.6 Performance: route bundle + TTI ≥ baseline; no duplicate queries/providers; no CDN Tailwind. (Ref R11)
- [ ] V.7 Responsive matrix (per screen): viewports 360/768/1024/1440 × {touch, pointer} × {LTR, RTL} × {light, dark}; verify sidebar↔bottom-tab swap at `lg`, table→card degradation, ≥44px targets on coarse pointers, `100dvh`/safe-area. No device toggle/UA sniffing anywhere. (Ref R12, R18)
- [ ] V.8 Coverage: no route renders in the legacy style; each derived screen conforms to its §15 archetype and preserves its original function. (Ref R16)

## Guardrails (apply to every task)

- [ ] G.1 No edits to `supabase/**`, `src/hooks/**` (existing behavior), `queryKeys.ts`, `supabase.ts`, `queryClient.ts`, `auditLogger.ts`, `AuthProvider` logic, `RouteGuard`, `database.ts`, route paths/guards. (Ref R1, design §13)
- [ ] G.2 No `prototype/` imports, no CDN Tailwind, no `shared.css`/`shared.js` in `src/`. (Ref R15.2)
- [ ] G.3 Components consume hooks only; never `supabase.*` directly. (Ref R1.2)
- [ ] G.4 Each module behind a feature flag; old component retained until parity signed off; reversible. (Ref R13.2, R13.1)

---

### Status

Not started. This spec stores the full migration context (requirements + design + tasks). Begin with **P0** only after the prototype design is approved; do not swap any production screen before its parity gate passes.
