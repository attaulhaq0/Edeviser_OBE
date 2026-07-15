# Tasks — Prototype Frontend Rebuild (Path A)

Parallel build → route-by-route cutover → legacy deletion. Backend/hooks/services
untouched throughout. `(Rn)` = requirement in `requirements.md`. Every screen ships
only after its Definition of Done (design.md §10).

---

## P0 — Design-system foundation

- [~] 0.1 Extract canonical tokens 1:1 from prototype → `src/design-system/tokens.css`; adopt `93.65deg`. **(done — additive, not yet wired)** (R2.1, R2.2)
- [x] 0.2 **DONE — token canonicalization.** `src/index.css`'s Shadcn semantic
  tokens (`:root` + `.dark`) are now mapped 1:1 to the **prototype** design
  system: `--primary`/`--ring` = brand blue `#3b82f6`, `--background` = slate-50,
  `--card` = white, `--foreground` = slate-900, `--secondary`/`--muted`/`--accent`
  = slate surfaces, `--border`/`--input` = slate-200, sidebar tokens brand,
  `--radius` = 12px, chart palette = brand+semantic. The Shadcn "New York"
  neutral/grayscale `--primary` (near-black) and gray surfaces **no longer leak**
  into any `ui/*` component. The `93.65deg` `--brand-gradient` + brand block are
  retained. `vite build` passes (4620 modules, no errors). Pixel parity per screen
  is still proven by `npm run test:visual` on the owner's machine. (R5.1)
- [ ] 0.3 L2 **primitives** — **REUSE, do not duplicate.** `src/components/ui/*` (Shadcn Button/Card/Badge/Input/Select/Table/Dialog/Sheet/Tabs/Tooltip) and `src/components/shared/*` (tactile `Button` variant, `.card-elevated`, `PrimaryCTA`, `GradientCardHeader`) already exist from the in-place effort. Adopt them as the design system's L2 primitives; add prototype-specific variants only where missing; verify against tokens. (R2.3, R5.1)
- [x] 0.4 **DONE** — the prototype design system is now a complete, self-contained component surface screens build from. `@/design-system` (`.ts` barrels — react-refresh-safe) re-exports **primitives** (Shadcn `ui/*` incl. Button `tactile`) + **patterns**: `PageHeader`, `PCard`, `SectionCard`, `SectionHeader`, `KPICard`, `HeroCard`, `StatusDot`, `StatePanel`, `EMeter`, + `MascotCharacter`/`MascotCompanion`. All prototype-faithful, using the live `--brand-gradient` (93.65deg) tokens. Reference migration: the student + parent **Fees** vertical now imports entirely from `@/design-system` (tests green). New screens MUST build from `@/design-system`, not `@/components/shared/*` (legacy, deleted at P5). 8 design-system render tests + 9 fees tests green; eslint/diagnostics clean. (Original note retained below.)
  - _(prior)_ L2 patterns audited against the prototype (PARITY.md §A). **Adopt existing `shared/*` (reuse, no duplication):** SectionHeader (`.sec-h .chip` ✓), KPICard (`.kpi` ✓), GradientCardHeader (`.pcard` gradient header ✓), AttainmentBar (attainment-level bar ✓), plus MasteryRing/SeverityIcon/ChatMessage/Mascot/EmptyState/ErrorState/SectionState/Shimmer. **Built the one genuine gap:** `design-system/patterns/EMeter.tsx` — the prototype `.emeter` semantic meter (brand-gradient default fill + `strong/good/attention/critical` + `pro` flat institution variant), reproduced 1:1 from `shared.css`, `role="meter"`, reduced-motion safe; unit + fast-check property tests green (`__tests__/{unit/EMeter.test.tsx, properties/emeter.property.test.ts}`), eslint clean. **Remaining:** verify/port each pattern just-in-time as screens consume it (P2/P3); minor: align `PrimaryCTA` gradient to canonical 93.65deg `--brand-gradient`. (R2.3, R3.2)
- [x] 0.5 **DONE** — mascot/character system at `design-system/mascot/`. Ported the prototype `EdvCharacter` 1:1: 3 characters (Foxi = companion · Owlie = AI tutor · Pengu = habit-buddy), 25 PNGs copied to `assets/characters/` + brand logo. `characters.ts` (pure catalog: authoritative emotion→pose map, `characterAssetUrl` via `import.meta.glob`, `pickMascot` gamification-state resolver, `mascotForMoment` integrating `@/lib/mascotGuidance`, `CHARACTER_SKINS` marketplace catalog priced in XP); `MascotCharacter.tsx` (46–200px scale, 5 motion presets, reduced-motion + a11y alt/`decorative`); `MascotCompanion.tsx` (character + speech bubble, RTL logical tail); `mascot.css` (ported `.chr*` → namespaced `edv-mascot*`). Tests: catalog↔asset integrity + resolver coverage + fast-check fallback + render — 11 green; eslint + diagnostics clean. Complements (does not replace) `shared/Mascot` (i18n coaching text). (R2.5)
- [x] 0.6 **DONE** — `design-system/PARITY.md` authored: §A class→component parity map (312 `shared.css` classes → `ui/*`+`shared/*` primitives, incl. demo-only classes marked not-ported), §B emoji→Lucide map (190 distinct prototype emoji categorized: nav/section-chip/status/medal/toggle-state/Bloom-camp/mood + content-art exclusions), §C per-screen diff tolerances (Tier A/B/C → `maxDiffRatio`, all 64 `screen-map.ts` ids covered once: A×7·C×24·B×33), §D demo artifacts never ported, §E fidelity caveats (light+LTR only; dark/RTL net-new). Verified: every screen-map id present, no dupes. (R2.4, R2.3)
- [~] 0.7 **Playwright visual-regression harness — DONE.** Isolated `playwright.visual.config.ts` + `visual/` suite: `screen-map.ts` (burn-down map, 37 screens × 4 viewports), `prototype-reference.spec.ts` (capture), `parity.spec.ts` (pixelmatch gate), dependency-free `scripts/serve-prototype.mjs`, npm scripts `test:visual` / `test:visual:capture`. Diffs rebuilt screen vs served prototype at 360/768/1024/1440 → annotated diffs in `test-results/visual-diffs/`. **Remaining (needs machine w/ browsers + network):** `npm run audit:install-browsers` then `npm run test:visual:capture` to commit baselines. Storybook (component review) still optional/TODO. (R2.6)
- [x] 0.8 **DONE** — scaffolded the Path-A tree (documented placeholder barrels, `export {};`, no screens): `src/app/` (shell), `src/features/{student,teacher,coordinator,admin,parent,shared}/` (L3 composition, incl. `shared/` for role-aware announcements/notifications/discussions/surveys/fees), and the design-system L2 homes `src/design-system/{primitives,patterns,mascot}/` + `src/design-system/index.ts` entry map. Additive, zero runtime impact; diagnostics + `eslint` clean (barrels intentionally not component re-exports, to avoid `react-refresh/only-export-components` warnings). (R5.2)

## P1 — App shell, navigation, auth

- [~] 1.1 **Chrome reused (already built by `ui-prototype-migration`):** `GlobalHeader`, `Sidebar`, `MobileTabBar` exist and consume `src/lib/navItems.ts` (Lucide icons already, student grouping + de-emphasis) — verified and adopted as-is for Path A rather than rebuilt (no duplication, per design "reuse the data; restyle the chrome"). Remaining P1 work needing the running app: auth screens (1.3) + 404 (1.4). (R4.1)
- [ ] 1.2 Role layouts (admin/coordinator/teacher/student/parent) + preserved gates: `SidebarProvider`, `EmailVerificationBanner`, `GuidedTour`, `SkipToMain`→`#main-content`, `usePageViewLogger`, **StudentLayout onboarding gate**. (R4.1, R4.5)
- [~] 1.3 Auth screens — **rebuilt to prototype `auth.html` (implementation complete; owner's visual-parity gate pending).** ⚠️ The earlier "preserve the dark gradient + frosted card" note is SUPERSEDED by `prototype-fidelity.md`: that dark full-screen card was the **legacy/deployed** design; the prototype auth is a **LIGHT split brand/form-panel** (`#f8fafc` canvas, `--hero-gradient` brand panel + white form panel). Delivered: new shared `AuthBrandPanel` (hero-gradient value panel: Sparkles mark, headline, 3 bullets Target/Bot/Flame, ShieldCheck/Globe chips); `AuthShell` rebuilt to the light split shell (so Reset/Update inherit it); `LoginPage` rebuilt (split layout, `.auth-tab` pill toggle Sign in|Create account, `.sso` Google/Microsoft/institution, "or with email" divider, `.fld` email+password w/ show/hide, keep-signed-in `Checkbox`, tactile `.btn3d` "Sign in →", magic-link; register tab: role segment [Student active, Teacher/Parent shown-but-disabled = honest, self-signup stays student], `.fld` fields, strength meter); `ResetPasswordPage`, `UpdatePasswordPage`, `/signup` (institution-browse), and `AcceptInvitePage` all rebuilt onto `AuthShell`+`.fld`+tactile. Prototype-exact additive utilities added to `index.css` (`.auth-brand-panel/.fld/.sso/.rseg-b/.auth-strength/.auth-tab`) + `sso.*`/`brand.*`/strength i18n keys in en+ar (parity green). **PRESERVED (G.1):** lockout, `signIn`/`signUp` side-effects + redirects, self-signup=student, DEV/env demo panels, all schemas. E2E selectors kept (sr-only `Sign in` heading + label-associated email/password + submit button). **Auth-surface ADDITIONS flagged for owner:** SSO→`signInWithOAuth` (`google`/`azure`), magic-link→`signInWithOtp` (existing supabase client, no new schema; fail into in-app error) — require enabling the providers/OTP in the Supabase dashboard, else they surface an error; decide keep-or-remove. Verified: diagnostics + `eslint --max-warnings 0` + `i18n:check` + `vite build` (4621 modules) + token/animation unit tests all green. **Remaining (owner gate):** flip `visual/screen-map.ts` `auth-login` → `rebuilt:true` and run `test:visual` (Tier A, 0.08) at 4 viewports. (R4.2)
- [x] 1.4 **DONE** — added `src/pages/NotFoundPage.tsx` composed from `@/design-system` (light `bg-background` canvas, brand-gradient `Compass` chip, tactile "Back to sign in" CTA + "Go back" via `navigate(-1)`; i18n `common.notFound` in en+ar, parity green). Router catch-all `path="*"` now renders it (was `Navigate→/login`); root `/`→`/login` unchanged. The prototype has no 404 screen, so it's composed from the nearest archetype per `prototype-fidelity.md`. Verified: diagnostics + `vite build` (4619 modules) + `i18n:check` green. (R4.1)

## P2 — Role dashboards (bind existing aggregate hooks)

- [ ] 2.1 Student dashboard (Today/gap→action) via `useStudentDashboardAggregate`. (R1.2)
- [ ] 2.2 Teacher dashboard (at-risk triage, AI drafts, CLO gaps) via `useTeacherDashboardAggregate`. (R1.2)
- [ ] 2.3 Parent dashboard (growth/wellbeing, no raw grades) via `useParentDashboardAggregate`. (R1.2)
- [ ] 2.4 Coordinator dashboard via `useCoordinatorDashboardAggregate`. (R1.2)
- [ ] 2.5 Admin dashboard via `useAdminDashboardAggregate`. (R1.2)

## P3 — All modules & the missing screens

> Drive from `missing-screens-catalog.md`. P/P\* = match the mock; D = compose from
> archetypes. For EVERY entity build the full set: list + create + edit + delete
> confirm + detail + empty/loading/error/success. (R3.1, R3.2)

- [ ] 3.1 Student modules: courses, course-detail, assignments+detail, adaptive-quiz (focus), post-quiz review, mastery-recovery, today, planner (+starter-week), journal, tutor (autonomy L1–L3 + persona + sources), habits (+analytics), leaderboard, challenges (+detail), team (+profile/create), marketplace (+my-items/history), portfolio, calendar, timetable, content, surveys, discussions (+thread), announcements-detail, settings (profile/reassessment/notification-prefs/sessions), onboarding wizard + complete-profile.
- [ ] 3.2 Teacher modules: CLOs (list/detail/form/sub-CLOs), rubrics (list/builder), assignments (list/form), grading (queue/interface), gradebook, baseline (list/config/results/question-form), quiz-generation (generate/review-queue/question-bank/explanation-review), quiz-analytics (question/quiz-CLO), quizzes (form), modules, announcements editor, attendance (marker/report), teams (+manage/form/health), challenges (list/form), tutor-analytics, tutor-handoffs, content-review, discussions moderation, calendar, timetable, profile.
- [ ] 3.3 Coordinator modules: PLOs (list/form), curriculum matrix, sankey, gap-analysis, coverage-heatmap, trends, cohort-comparison, outcome-chain, CQI (manager + dialogs), course-file generator, timetable, profile.
- [ ] 3.4 Admin modules: users (list/form/import wizard/invite/parent-invite/pending-onboarding), programs, courses (+enrollment), semesters, departments, ILO (list/form), reports, audit-log, bonus-events, badge-spotlight, marketplace (mgmt/sales/analytics/quests/economist), fees, data-import wizard, surveys (+results), graduate-attributes, competency-frameworks, historical-evidence, outcome-chain, institution settings, profile.
- [ ] 3.5 Parent modules: children, progress, attendance, planner (+per-student), profile.
- [x] 3.6 **DONE (both net-new screens built + functionally tested):**
  - **Transcript viewer** — `src/features/student/transcript/StudentTranscriptPage.tsx` consuming `useGenerateTranscript` (generate + download official PDF); route `/student/transcript` added to `StudentLayout` (additive lazy). Honest scope: on-screen GPA/grade table deferred (no read hook — would fake data, R17). 5 Testing-Library tests green (idle/click/pending/error/success).
  - **Admin Security console** — new read hook `src/hooks/useAdminSecurity.ts` over `blocked_ips` / `login_attempts` / `rate_limit_events` (no new backend logic) + `src/features/admin/security/security.ts` (pure classification: block-active / lock-status / event-severity) + `AdminSecurityPage.tsx` (KPIs + blocked-IP / lockout / event lists, status dots per §B.4, loading/error/empty states). Route `/admin/security` + admin sidebar nav item added (additive). 11 tests green (property + render).
  - eslint + diagnostics clean throughout. Pixel-parity + live-route verification deferred to the app/Playwright run. (R3.3)
- [ ] 3.7 Public: portfolio (public), terms, privacy.
- [ ] 3.8 State templates applied to every screen (shimmer/empty/error/success); confirm/delete dialogs standardized. (R3.2)

### P3 — Path-A net-new screens delivered so far (backend existed, no route)

Built in `src/features/*`, each with a functional Testing-Library test + additive
route (existing routes/guards untouched). Chrome/nav/dashboards reused (already exist).

- **Transcript** (`/student/transcript`) — `useGenerateTranscript`.
- **Admin Security** (`/admin/security`) — new read hook `useAdminSecurity` over
  blocked_ips/login_attempts/rate_limit_events + `features/admin/security`.
- **Student Fees** (`/student/fees`) + **Parent Fees** (`/parent/fees`) — `useStudentFees`
  /`useGenerateFeeReceipt`, sharing `features/shared/fees/FeePaymentList`.
- **Notifications feed** (`/student/notifications`) — `useNotifications` (the bell was a
  dropdown only).

Verified **already covered** (NOT built, would duplicate existing screens): Weekly Goals
(in `WeeklyPlannerPage`), Wellness (in Habits pages), Knowledge Quests (`KnowledgeQuestsTab`
+ existing route). Nav tests (`navItems`/`navGroups`) stay green with the added items.
Pixel-parity + live-route soak remain deferred to the running app + Playwright.

### P4 — Cutover progress (in-place screens → `@/design-system`)

- **Notifications feed** routed under all 5 role layouts; the bell dropdown
  (`NotificationCenter`) gained a role-aware **"See all"** → `/{role}/notifications`.
- **All 5 role dashboards cut over:** `ParentDashboardNew` (first), then
  `AdminDashboardNew`, `CoordinatorDashboardNew`, `TeacherDashboardNew`,
  `StudentDashboardNew` now build their common layer entirely from
  `@/design-system` (`WelcomeHero`, `KPICard`, `SectionHeader`, `SeverityIcon`,
  `MasteryRing`, `Shimmer`, `Badge`/`Button`/`Card`) instead of
  `@/components/shared/*` + `@/components/ui/*`. JSX unchanged (prop-compatible
  swap); `SeverityIcon` adopted into the barrel. Coordinator keeps its
  role-specific `CoordinatorInsightRail` from `shared/`. Tests green
  (`coordinatorDashboardNew` + `parentDashboardSections` = 8); diagnostics +
  `eslint --max-warnings 0` clean on all 4.
- **Coordinator in-place screens cut over:** `CoordinatorAccreditationNew`
  (`/coordinator/course-file`) and `CoordinatorOutcomeAttainmentNew` now source
  primitives + patterns from `@/design-system` (kept `CoordinatorInsightRail` +
  `EmptyState` from `shared/`). Tests green (`coordinatorAccreditationNew` +
  `courseFileGenerator` + `coordinatorOutcomeAttainmentNew` = 20); diagnostics +
  eslint clean.
- **Visual harness wired for the cut-over screens:** `visual/screen-map.ts` now
  carries `appPath` for the 4 net-new screens (`student-transcript`,
  `admin-security`, `shared-notifications`, `shared-fees`); dashboards already
  had theirs. Reference PNGs exist for all of these + the 5 dashboards (4
  viewports each). `rebuilt: true` intentionally NOT flipped — pixel parity is
  the owner's gate (run `npm run test:visual` on the machine holding the
  references; see `visual/README.md`). Parent Fees excluded (no `parent-fees.html`
  reference).
- Design-system additions: `Shimmer` primitive; `MasteryRing` + `WelcomeHero` +
  `SeverityIcon` adopted into the `@/design-system` barrel (internalized when
  legacy is removed at P5).
- **Cutover wave 2 — 13 more screens across all roles** now build their common
  layer from `@/design-system`:
  - Student: `StudentProgressNew`, `StudentCoursesNew`, `XPHistoryNew`,
    `StudentPortfolioNew`.
  - Parent: `ParentProgressPage`, `ParentAttendancePage`, `ParentPlannerView`.
  - Coordinator: `GapAnalysisView`, `CoordinatorProfileNew`, `CQIManager`.
  - Admin: `InstitutionSettings`. Public: `PublicPortfolio`. Teacher:
    `ExplanationReviewPage`, `TeacherHandoffPage`, `TutorAnalyticsPage`.
  - `GradientCardHeader` was **adopted into the `@/design-system` barrel**
    (alongside MasteryRing/WelcomeHero/SeverityIcon) to unblock the many section
    cards that use it.
  - **Design-system `Shimmer` corrected** to the canonical `animate-shimmer`
    gradient-sweep (it had used `animate-pulse`, contradicting design-system.md
    and 8 existing `.animate-shimmer` tests). It is now a true drop-in for the
    legacy shared `Shimmer`, so every current and future Shimmer cutover renders
    identically. (`StatePanel` keeps its own inline `animate-pulse`.)
  - Verified: 196 targeted tests green (Shimmer blast-radius suite + all migrated
    screens' tests); diagnostics + `eslint --max-warnings 0` clean on all 17
    touched files. Screens without a dedicated render test were verified
    structurally (diagnostics + eslint); import-source swaps don't change JSX.
- **Cutover wave 3 — 18 shared building-block widgets** now source
  `Shimmer`/`GradientCardHeader` from `@/design-system` (DataTable,
  AIAtRiskWidget, CellDetailSheet, CurriculumMatrix, ExtraAttemptUsageTable,
  HabitTracker, ProgramAccreditationManager, RubricPreviewDialog,
  SectionDrillDownDialog, SectionManager, SectionState, CourseStudyBreakdown,
  ProgressSummaryPanel, ReflectionDigestCard, StudyTimeChart, TodayTimeline,
  WeeklyGoalPanel, WeeklyReflectionPanel). Verified: 97 widget render-tests green,
  diagnostics + eslint clean, no circular-import breakage from importing the
  barrel (the barrel re-exports from `shared/` but none of these widgets are
  themselves re-exported).
- **P3 admin-CRUD module rebuilt onto the design system:** `DepartmentManager` +
  `SemesterManager` now compose from `@/design-system` primitives + the
  `PageHeader` pattern (list + create/edit `Form` dialog + `ConfirmDialog` delete
  + loading/empty states). `Form*` stays from `ui/form` (no design-system Form
  yet); `ConfirmDialog`/`EmptyState` stay from `shared/`. 11 tests green,
  diagnostics + eslint clean. This is the reference for the remaining admin-CRUD
  managers (Bonus Events, Graduate Attributes, Competency Frameworks, etc.).
- **Cutover wave 4 — page-level `Shimmer` propagation COMPLETE.** All 63
  remaining `src/pages/**` screens (26 student, 17 teacher, 12 admin, 4
  coordinator, 1 parent, 3 shared) now import `{ Shimmer } from "@/design-system"`.
  Verified: **zero** remaining `import Shimmer from "@/components/shared/Shimmer"`
  anywhere in `src` — the legacy `shared/Shimmer.tsx` is now fully **orphaned** (a
  clean P5 deletion candidate). `eslint --max-warnings 0` clean across all of
  `src/pages`; the shimmer-asserting suite (71 tests, incl. the swapped
  `historicalEvidenceDashboard`/`cloDetailPage`/`gradebookView`/
  `graduateAttributeManager`/`outcomeChainView`) + role batches (student 90,
  teacher 33) all green. Every `Shimmer` in the app now flows through
  `@/design-system`.
- **Genuine builds still ahead:** P1 auth screens (login/signup/reset), and the
  P3 net-new **sub-UI** (create/edit forms, delete confirms, detail pages,
  wizards, empty/error/success states) that the prototype never drew — these are
  real builds, not import swaps.

### Prototype-fidelity hardening (strict rule `prototype-fidelity.md`)

Owner rule: **everything matches the exact prototype; no design from the deployed
UI.** Encoded as always-on steering (`.kiro/steering/prototype-fidelity.md`);
`design-system.md` reconciled (CTA = `var(--brand-gradient)`, not the legacy
`from-teal-500 to-blue-600`).

- **Patterns reskinned to exact `shared.css` values:** `PCard`→`.pcard`
  (20px radius, 1px `#eef2f6` hairline, two-layer depth + hover-lift);
  `SectionHeader`→`.sec-h`/`.chip` (26px/9px gradient chip + teal halo; title
  13px/800/.02em/slate-900); `KPICard`→`.pcard`+`.kpi-ic` (38px/11px tile,
  removed the non-prototype `group-hover:scale-110`); `StatusDot`→`.dot` (8px).
- **`@/design-system` is now self-contained:** `MasteryRing`, `WelcomeHero`,
  `SeverityIcon`, `GradientCardHeader` were **internalized** into
  `src/design-system/patterns/` (design system no longer depends on
  `@/components/shared/*` for them). The barrel exports the local copies.
- **Legacy deletion (real):** the 5 now-orphaned legacy files were removed —
  `shared/{MasteryRing,WelcomeHero,SeverityIcon,GradientCardHeader}` and
  `shared/Shimmer.tsx`. Ground-truthed via `Select-String` (workspace
  `grep_search` false-negatived); 3 stale `vi.mock("@/components/shared/Shimmer")`
  repointed to `@/design-system/patterns/Shimmer`. Zero dangling refs remain.
- **`DepartmentManager` + `SemesterManager` CTAs** → `Button variant="tactile"`
  (`.btn-tactile` = `var(--brand-gradient)`), off the legacy gradient.
- **CRUD-manager CTA restyle wave (17 screens) — DONE.** Converted every
  remaining `*Manager` off the forbidden legacy CTA `from-teal-500 to-blue-600`
  → `Button variant="tactile"` (canonical `var(--brand-gradient)`), keeping only
  genuine layout classes (`w-full`/`text-xs`/`size`): **admin** (BadgeSpotlight,
  AcademicCalendar, Fee, GraduateAttribute, SaleEvent, CompetencyFramework,
  Survey, KnowledgeQuest, Timetable, BonusXPEvent), **teacher** (GradeCategory,
  Module, SubCLO, Team), **coordinator** (CQI), **shared** (ProgramAccreditation,
  Section). **Zero** `from-teal-500 to-blue-600` now remains in any `*Manager`.
  Verified: diagnostics + `eslint --max-warnings 0` on all 17 + `vite build`
  (4619 modules) + 42 manager tests green (fee / graduateAttribute /
  knowledgeQuest / section / cqi / saleEvent). Repo-wide legacy-CTA count:
  **184 → 156** (the remaining 156 across 115 files are non-manager pages/widgets,
  retired per-screen at cutover / P5).
- **Shared-widget + `PrimaryCTA` CTA wave — DONE.** Retired the legacy CTA from the
  shared component library: `PrimaryCTA` (the dashboard CTA used by **12** screens)
  → `variant="tactile"`; **27 button CTAs across 26 shared widgets**
  (session/goal/survey/dialog forms, `FocusTimer`×3, cards, banners, `TutorEntryButton`,
  `WeeklyCalendarGrid`) → `variant="tactile"` (keeping only layout classes); and
  **5 decorative brand gradients** (progress fills, icon chips, chat avatar) +
  `MasteryRecoveryPanel`'s conditional CTA → the exact `var(--brand-gradient)`
  arbitrary value `bg-[linear-gradient(93.65deg,#14b8a6_5.37%,#0382bd_78.89%)]`.
  **Zero** `from-teal-500 to-blue-600` now remains in `src/components/shared`.
  Verified: diagnostics (32 files) + `eslint --max-warnings 0` (whole shared dir) +
  `vite build` (4619 modules) + 109 widget tests green (primaryCTA 16;
  badgeAwardModal / smartGoalForm / goalSuggestionPanel / sessionCompletionForm /
  focusTimer 93); no test asserted the legacy class. Repo-wide legacy-CTA:
  **156 → 119**, and the remaining **119 are ALL in `src/pages`** (student 59 ·
  teacher 29 · admin 22 · coordinator 6 · shared 2 · parent 1) — per-screen page
  CTAs, retired as each screen is cut over / at P5.
- Verified: 121 targeted tests green (design-system + consumers + shimmer suite +
  the 2 screens); `eslint --max-warnings 0` clean on `src/design-system` +
  `src/components/shared`; diagnostics clean.
- **Token canonicalization (item A / P0.2) — DONE.** `src/index.css` `:root` +
  `.dark` Shadcn semantic tokens now hold prototype values (brand-blue
  `--primary`/`--ring`, slate surfaces, white cards, 12px radius). The
  Shadcn-neutral base no longer leaks into any `ui/*` component. `vite build`
  green. This restyles the whole app at the token layer — intentionally broad;
  the visual result is the owner's `npm run test:visual` gate.
- **More legacy design-system dups deleted (P5, partial):** `shared/KPICard` +
  `shared/SectionHeader` (superseded by the `@/design-system` versions) removed —
  the last `KPICard` test consumer (`sharedComponents.test.tsx`) was repointed to
  `@/design-system`. **7 legacy design-system files deleted total** (these 2 +
  MasteryRing/WelcomeHero/SeverityIcon/GradientCardHeader/Shimmer). `vite build`
  green after deletion. No legacy design-system primitive dups remain in
  `shared/` (design-system-only patterns like PCard/HeroCard/StatePanel/EMeter
  never had a shared twin).
- **Orphan triage (NOT deleted):** a scan found ~34 `shared/*` components with no
  importer — but these are **feature widgets** (e.g. `CaptchaChallenge`,
  `ComebackChallengeBanner`, `PeerTeachingMomentForm`, `PWAInstallPrompt`,
  `ToSAcceptanceDialog`, `NotificationCenter`, `TeamCard`…), not design-system
  files. Per `prototype-backend-parity` R2.3 these are **documented for triage**
  (some are backend-ready features awaiting a screen), not blind-deleted. Deleting
  them is a separate product decision.
- **RTL:** the reskinned design-system patterns use logical props (`ms-auto`) and
  the app has the `rtl` custom-variant — structurally RTL-safe.
- **Dark mode:** the reskinned patterns intentionally hardcode the light-only
  prototype values (white surfaces, slate-900 text); the `.dark` token pass
  brand-maps `--primary`/`--ring` for Shadcn primitives, but dark variants for the
  patterns are **net-new/deferred** (PARITY §E — prototype is light-only).
- **Remaining for full completion:** flip screens `rebuilt:true` + prove pixel
  parity via `npm run test:visual` (owner's machine); the net-new dark-mode + RTL
  design pass; and full P5 deletion of the remaining legacy `shared/*` after each
  screen's cutover + soak.

## P4 — Cutover & verification (per screen)

- [ ] 4.1 Route the new component at each path behind a flag; keep legacy as flag-off fallback.
- [ ] 4.2 Parity gate: visual-regression diff + functional parity. (R7)
- [ ] 4.3 i18n en+ar (no hardcoded strings, logical props); dark+light; a11y (axe/keyboard/contrast/44px/reduced-motion). (R4.3, R4.4, R4.5)
- [ ] 4.4 Performance: routes lazy, no CDN Tailwind, no dup providers/queries; TTI/bundle ≥ baseline. (R7)
- [ ] 4.5 Responsive matrix 360/768/1024/1440 × touch/pointer × LTR/RTL × light/dark; sidebar↔bottom-tab swap at `lg`; table→card degradation. (R2.7)
- [ ] 4.6 Flip flag → new UI default for the screen; soak on preview/production.

## P5 — Legacy deletion (clean codebase)

> Only after P4 cutover + soak per unit. Each deletion = own revertible PR; no
> backend/hook edits. (R6.3–6.5)

- [ ] 5.1 Per screen: confirm zero remaining imports of the legacy file (`npx tsc --noEmit` green + `knip` clean), then delete it.
- [ ] 5.2 Remove feature flags + old/new split wrappers → single component per route.
- [ ] 5.3 Remove superseded `src/pages/**` + unused `src/components/**` not reused by `design-system/`/`features/`.
- [ ] 5.4 **RETAIN the `prototype/` folder** (owner decision) — keep as the living design reference for future adjustments; do NOT delete. It is never imported by `src/` (G.2), so it has zero runtime/bundle impact.
- [ ] 5.5 Final green bar: `tsc --noEmit`, `knip`, `npm run lint`, `npm test`, Playwright visual-regression + e2e.

## Guardrails (every task)

- [ ] G.1 No edits to `supabase/**`, `src/hooks/**` behavior, `queryKeys.ts`, `supabase.ts`, `queryClient.ts`, `auditLogger.ts`, `AuthProvider` logic, `RouteGuard`, `database.ts`, route paths/guards. (R1)
- [ ] G.2 No `prototype/` imports, no CDN Tailwind, no `shared.css`/`shared.js` in `src/`. (R2.7)
- [ ] G.3 Components consume hooks only; never `supabase.*` directly. (R1.2)
- [ ] G.4 No new backend/tables/RLS/roles. (Non-goals)
