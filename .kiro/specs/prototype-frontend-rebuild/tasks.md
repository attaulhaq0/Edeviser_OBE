# Tasks — Prototype Frontend Rebuild (Path A)

## THE CONTRACT (read first)

Replace the **entire deployed front-end**, screen by screen, with a **pixel-exact
rebuild of the prototype** (`prototype/*.html` + `shared.css`) implemented on
`@/design-system` + existing hooks — then **delete the old screen**. The end state:
the deployed UI **is** the prototype, in React, wired to the real backend, and the
legacy UI is **gone** (not hidden behind a flag, not re-branded, not kept "just in
case").

**A screen is NOT "done" until it looks pixel-for-pixel like its `prototype/*.html`
reference (proven by `test:visual`) AND its legacy page/components are deleted.**

### What explicitly does NOT count as "rebuilt" (hard rule)

The following were done to most dashboards/pages already and **do not** satisfy this
spec. Any screen that only received these is **NOT started** for burn-down purposes:

- ❌ Swapping the CTA to the tactile brand-gradient (a token change).
- ❌ Repointing imports to `@/design-system` while leaving JSX/layout unchanged
  ("prop-compatible swap", "JSX unchanged").
- ❌ The global `index.css` token canonicalization (re-brands the old layout).
- ❌ Anything carried over from the superseded `ui-prototype-migration` reskin.

"Reskinned in place" ≠ "rebuilt to the prototype." The deployed `*DashboardNew`
components and the reskinned `src/pages/**` are the **old layouts wearing new
tokens** — they must be **rebuilt from their `prototype/*.html` reference and then
deleted**, exactly like any not-started screen.

---

## DEFINITION OF DONE — per screen (the only gate)

A screen row may be checked `[x]` only when **all** of these hold (design.md §8/§10,
requirements R2/R6/R7):

1. **Built** in `src/features/{role}/` (or `src/app` for shell) from the screen's
   `prototype/*.html` reference — layout, sections, cards, spacing, type, color,
   motion all composed from `@/design-system` (tokens + primitives + patterns +
   mascot). No arbitrary hex; emoji → Lucide (PARITY §B).
2. **Wired** to the existing hook(s) for its data + mutations (R1) — components never
   call `supabase.*` directly (R1.2); mutations reuse existing hooks (R1.3).
3. **Net-new sub-UI built** per `missing-screens-catalog.md`: every **F** (create/edit
   form), **Del** (delete/confirm), **Dt** (detail), **W** (wizard), **Mo** (modal/
   sheet), and **St** (empty/loading/error/success) the row lists.
4. **Pixel parity proven**: set `appPath` + flip `rebuilt: true` in
   `visual/screen-map.ts`, capture references, and `npm run test:visual` is **green
   at all four viewports** (360/768/1024/1440) within the screen's §C tolerance.
5. **Functional + i18n + a11y + perf**: data/actions/permissions parity; en + ar
   (logical props); light + dark (dark is net-new, reviewed); axe/keyboard/≥44px/
   reduced-motion; routes lazy, no CDN Tailwind, bundle/TTI ≥ baseline (R4, R7).
6. **Cut over**: the route in `AppRouter.tsx` renders the new component (path +
   guard unchanged, R4.1).
7. **Legacy deleted**: the old page/component(s) for this route are **removed** in a
   revertible change after proving **zero remaining imports** (`npx tsc --noEmit`
   green **and** `knip` clean). No flag left behind (§8, R6.3–6.5).

> Dark mode + Arabic/RTL are **net-new** (prototype is light+LTR only, R4.3/R4.4);
> they are verified per screen but cannot be diffed against the prototype.

## STATUS LEGEND

- `[x]` **Done per DoD above** (incl. `test:visual` green + legacy deleted).
- `[~]` **Partial** — real work exists but DoD not met (e.g. built but parity not
  proven, or legacy not deleted). The row says what remains.
- `[ ]` **Not started** — includes screens that were only reskinned-in-place.

---

## P0 — Design-system foundation

- [x] 0.1–0.8 **Foundation built and usable.** `src/design-system/` is a self-contained
      surface: `tokens.css` (1:1 from prototype, 93.65deg gradient), primitives (Shadcn
      restyled: Button+tactile, Card, Badge, Input, Select, Table, Dialog, Sheet, Tabs,
      Tooltip), patterns (PageHeader, PCard, SectionCard, SectionHeader, KPICard, HeroCard,
      StatusDot, StatePanel, EMeter, MasteryRing, WelcomeHero, SeverityIcon, GradientCardHeader,
      Shimmer), mascot (Foxi/Owlie/Pengu + 25 assets), `PARITY.md` (§A class map, §B emoji→Lucide,
      §C per-screen tolerances), and the Playwright visual harness (`visual/`, `screen-map.ts`,
      `test:visual`). Scaffold `src/app` + `src/features/{role}` exists. (R2.1–2.5, R5.1)
- [ ] 0.9 **Capture prototype reference baselines** (`npm run test:visual:capture`) on a
      machine with browsers, and commit them so every screen's parity gate can actually run.
      (Reference PNGs exist for a subset; complete the set as screens land.) (R2.6)

## P1 — App shell, navigation, auth

- [x] 1.1 **Chrome** (Header / Sidebar / MobileTabBar) reused from prior work, driven by
      `navItems.ts`. NOTE: chrome was **reskinned**, not proven pixel-exact — its parity is
      covered by each dashboard's `test:visual` (chrome is in-frame). (R4.1)
- [ ] 1.2 **Role layouts** (admin/coordinator/teacher/student/parent) rebuilt in `src/app`,
      preserving `SidebarProvider`, `EmailVerificationBanner`, `GuidedTour`, `SkipToMain`→
      `#main-content`, `usePageViewLogger`, and the **StudentLayout onboarding gate**. (R4.1, R4.5)
- [~] 1.3 **Auth screens rebuilt** to `auth.html` (Login/SignUp/Reset/Update/AcceptInvite):
  light split brand+form panel, tabs, SSO, `.fld`, strength meter, tactile CTA; lockout +
  `signIn`/`signUp` side-effects + self-signup=student preserved. **Remaining for DoD:** flip
  `auth-login` → `rebuilt:true` and pass `test:visual` (Tier A, 0.08) at 4 viewports; owner
  decision on SSO/magic-link providers (enable in Supabase or remove the buttons). (R4.2)
- [x] 1.4 **404 NotFoundPage** built from `@/design-system` + catch-all route. (R4.1)

## P2 — Role dashboards (REBUILD from prototype, then delete `*DashboardNew`)

> ⚠️ All 5 are currently **reskinned-in-place only** (`*DashboardNew` = old layout +
> new tokens, "JSX unchanged"). Per the contract that is **NOT** rebuilt. Each must be
> rebuilt from its `prototype/*.html` to match every section/card, then the
> `*DashboardNew` (and any legacy dashboard) deleted.

- [~] 2.1 **Student dashboard** → `dashboard.html` (`/student/dashboard`, `useStudentDashboardAggregate`).
  **Rebuilt** in `src/features/student/dashboard/StudentDashboardScreen.tsx` from the prototype on
  `@/design-system` (living hero w/ level ring + XP + Foxi, weakest-outcome, next-step CTA, My Courses
  rings, habits, continue-path, daily-review, weekly heatmap, announcements), wired to real hooks,
  **cut over**, and `StudentDashboardNew` **deleted** (PR #219, merged). **Remaining for DoD:** owner
  flips `student-dashboard` → `rebuilt:true` + `test:visual` green (hero carousel secondary slides
  deferred as flagged backend gaps).
- [~] 2.2 **Teacher dashboard** → `teacher-dashboard.html` (`/teacher/dashboard`, `useTeacherDashboardAggregate`).
  **Rebuilt** in `src/features/teacher/dashboard/TeacherDashboardScreen.tsx` from the prototype
  (hero + real chips, KPI row, Do-first triage via `useAtRiskStudents`+`useSendNudge`, at-risk AI
  prediction via `useAtRiskPredictions`, Bloom coverage, quick-actions, autonomy footer), **cut over**,
  `TeacherDashboardNew` **deleted** (PR #220, merged). **Remaining for DoD:** owner `test:visual` green
  (momentum/schedule slides, curriculum-studio/outcome-gaps/teaching-impact = course-scoped backend
  gaps, flagged not faked).
- [~] 2.3 **Parent dashboard** → `parent-dashboard.html` (`/parent/dashboard`, `useParentDashboardAggregate`).
  **Rebuilt** in `src/features/parent/dashboard/ParentDashboardScreen.tsx` from the prototype
  (growth & wellbeing story: AI banner, plain-words summary, growth + wellbeing, one-way-to-help,
  celebrate; avg_attainment → OBE band, **no raw grades**; child selector for multi-child), **cut over**,
  `ParentDashboardNew` **deleted**. **Remaining for DoD:** owner `test:visual` green (weekly auto-narrative,
  per-subject trend rows, mood/wellbeing check-ins = backend gaps, adapted to real signals not faked).
- [ ] 2.4 **Coordinator dashboard** → `coordinator-dashboard.html` (`/coordinator/dashboard`, `useCoordinatorDashboardAggregate`).
      Rebuild KPI row, attainment snapshot, curriculum-gap + at-risk cards. Delete `CoordinatorDashboardNew` + legacy.
- [ ] 2.5 **Admin dashboard** → `admin-dashboard.html` (`/admin/dashboard`, `useAdminDashboardAggregate`).
      Rebuild KPI row, users-by-role, activity, AI Co-Pilot + PLO heatmap panels. Delete `AdminDashboardNew` + legacy.

## P3 — All modules (rebuild every route; drive from `missing-screens-catalog.md`)

> For EVERY entity build the full set the catalog lists: list + **F** create/edit +
> **Del** confirm + **Dt** detail + **W** wizard + **Mo** modal + **St** empty/loading/
> error/success. Each row = the DoD above (parity green + legacy deleted). Screens that
> were only reskinned are **not started** here.

### 3.0 Net-new screens (backend existed, no route) — DONE

- [x] Student **Transcript** (`/student/transcript`, `useGenerateTranscript`) — built fresh in `src/features`, tested.
- [x] Admin **Security console** (`/admin/security`, new `useAdminSecurity` over blocked_ips/login_attempts/rate_limit_events) — built fresh, tested.
- [x] Student/Parent **Fees** (`/student/fees`, `/parent/fees`) + shared `FeePaymentList` — built fresh, tested.
- [x] **Notifications feed** (`/{role}/notifications`, `useNotifications`) — built fresh, tested.
  - [ ] Remaining for DoD on all four: `rebuilt:true` + `test:visual` green (references exist for security/notifications/fees/transcript). No legacy to delete (net-new).

### 3.1 Student modules (`/student/*`) — rebuild each from its prototype ref

- [ ] Courses (`learn.html`) + Course detail (`course.html`) + Materials — Dt, St
- [ ] Assignments list + **Assignment detail** (`assignment.html`) — submit/upload Mo, St
- [ ] Adaptive quiz (`lesson.html`, focus/full-screen) + Post-quiz review (`review.html`) — St
- [ ] Mastery recovery (`/courses/:courseId/recovery/:cloId`) — Focus/Dt, St
- [ ] Today (`path.html`) + Planner + Starter-week — **W**, Mo, St
- [ ] Focus mode (`focus.html`, outside shell) — Focus, St
- [ ] Journal (`journal.html`) — **F** entry dialog, Dt, St
- [ ] Tutor (`tutor.html`) — autonomy L1–L3 + persona + source Mo + history, St
- [ ] Habits + Habits analytics (`wellness.html`) — log Mo, analytics St
- [ ] Leaderboard (`leaderboard.html`) — St; **preserve anonymity opt-out + min-cohort lock + polling**
- [ ] Challenges list + detail (`quests.html`) — Dt, join Mo, St
- [ ] Team + Team profile + Create team (`team.html`) — **F**, Dt, invite Mo, St
- [ ] Marketplace + My items + History (`marketplace.html`) — purchase-confirm Mo, Dt, St
- [ ] Portfolio (`portfolio.html`) — public-share toggle Mo (preserve permission gate), St
- [ ] Progress (`progress.html`) — analytics St
- [ ] Badges (`badges.html`), Learning profile (`learning-profile.html`) — St
- [ ] Calendar (`calendar.html`) + Timetable — St
- [ ] Content — **F**, Del, St
- [ ] Surveys — **F** respond, St
- [ ] Announcement detail — Dt, St
- [ ] Discussions + thread (`discussions.html`) — **F** post, Dt, St
- [ ] Onboarding wizard + Complete-profile — **W** multi-step, St
- [ ] Settings: profile (`profile.html` / `settings.html`), reassessment, notification-prefs, sessions — **F**, revoke-session Del, St

### 3.2 Teacher modules (`/teacher/*`)

- [ ] CLOs list/detail/form + Sub-CLOs (`teacher-curriculum.html`) — **F**, Del, **Dt**, St
- [ ] Rubrics list + builder (`teacher-rubrics.html`) — **F/W** criteria builder, Del, St
- [ ] Assignments list/form — **F**, Del, St
- [ ] Grading queue + **Grading interface** (`teacher-grading.html`) — Dt (grade UI + AI draft) Mo, St
- [ ] Gradebook (`teacher-gradebook.html`) — cell-edit Mo, St
- [ ] Baseline list/config/results/question-form — **F**, **W** config, analytics St
- [ ] Quiz generation: generate (`teacher-questions.html`) / review-queue / question-bank / explanation-review — **W**, approve Mo, Dt, St
- [ ] Quiz analytics (question / quiz-CLO correlation) — analytics St
- [ ] Quizzes form/edit — **F**, St
- [ ] Modules (`teacher-materials.html`) — **F**, Del, reorder Mo, St
- [ ] Announcements editor — **F**, Del, St
- [ ] Attendance marker + report (`teacher-attendance.html`) — mark Mo, analytics St
- [ ] Teams + manage/form/health (`coordinator-teams.html` pattern) — **F**, Del, **Dt**, analytics St
- [ ] Challenges list/form — **F**, Del, St
- [ ] Tutor analytics + Tutor handoffs (`teacher-handoffs.html`) — Dt handoff, analytics St
- [ ] Content review — approve/reject Mo, St
- [ ] Discussions moderation, Calendar, Timetable, Profile (`teacher-profile.html`) — **F**, St

### 3.3 Coordinator modules (`/coordinator/*`)

- [ ] PLOs list/form (`coordinator-outcomes.html`) — **F**, Del, St
- [ ] Curriculum matrix (`coordinator-curriculum.html`) — cell-detail Mo, St
- [ ] Sankey, Trends, Cohort comparison, Outcome chain — analytics St
- [ ] Gap analysis, Coverage heatmap — cell Mo, St
- [ ] CQI manager (`coordinator-cqi.html`) — **F** action-plan, Del, Dt, status-transition Mo, St
- [ ] Course-file generator (`coordinator-course-file.html`) — **W** generate, Dt, St
- [ ] Competencies (`coordinator-competencies.html`), Timetable, Profile (`coordinator-profile.html`) — **F**, St

### 3.4 Admin modules (`/admin/*`)

- [ ] Users list + form + **import wizard** + invite + parent-invite + pending-onboarding (`admin-users.html`) — **F**, **W**, Del, Dt, St
- [ ] Programs, Courses (+ enrollment roster Mo), Semesters, Departments — **F**, Del, St
- [ ] ILOs list/form (`admin-structure.html`) — **F**, Del, Dt, St
- [ ] Reports (`admin-analytics.html`) — export Mo, St (fill "weekly active learners" chart)
- [ ] Audit log — filters, Dt drawer, St
- [ ] Bonus events, Badge spotlight — **F**, Del, St
- [ ] Marketplace mgmt/sales/analytics/quests/economist (`admin-marketplace.html`) — **F**, Del, Dt, analytics St
- [ ] Fees, Data-import wizard, Surveys (+results), Graduate attributes, Competency frameworks, Historical evidence, Outcome chain — **F**/**W**, Del, St
- [ ] AI Governance (`admin-governance.html`) — neutralize colored top, roadmap-labeled, St
- [ ] Institution settings + Profile (`admin-profile.html`) — sectioned **F**, toggles, St

### 3.5 Parent modules (`/parent/*`)

- [ ] Children (`parent-progress.html` chrome) — Dt, link-child Mo, St
- [ ] Progress (`parent-progress.html`) — analytics St
- [ ] Attendance — analytics St
- [ ] Planner + per-student (`parent-support.html`) — Mo, St
- [ ] Profile (`parent-profile.html`) — **F**, St

### 3.6 Public

- [ ] Public portfolio (`/portfolio/:student_id`) — public empty/not-shared/404 St
- [ ] Terms, Privacy — prose layout

## P4 — Per-screen cutover & parity (this is the DoD, not a later phase)

Steps 4–7 of the **Definition of Done** run **per screen** as part of finishing it —
they are not a separate deferred phase. A screen is not `[x]` until it is cut over,
parity-green, and its legacy is deleted.

- [ ] 4.1 Keep a live parity ledger: as each screen lands, flip its `visual/screen-map.ts`
      row to `rebuilt: true` and keep `npm run test:visual` green. The count of `rebuilt: true`
      rows **is** the true progress metric (today: 0).

## P5 — Final cleanup (after every route is on the new UI)

> Per-screen legacy deletion already happens in each screen's DoD (step 7). P5 is the
> final sweep once **all** routes are cut over.

- [ ] 5.1 Remove any remaining feature flags / old-vs-new split wrappers → one component per route.
- [ ] 5.2 Delete the reskinned `*DashboardNew` + superseded `src/pages/**` + `src/components/shared/*`
      not reused by `design-system/`/`features/` (prove zero imports: `tsc --noEmit` + `knip`).
- [ ] 5.3 Triage the ~34 orphaned `shared/*` feature widgets (product decision: wire a screen or delete).
- [ ] 5.4 **RETAIN `prototype/`** (owner decision) — living design reference, never imported by `src/`.
- [ ] 5.5 Final green bar: `tsc --noEmit` · `knip` · `npm run lint` · `npm test` · `npm run test:visual` (all rows) · e2e.

## Guardrails (every task)

- [ ] G.1 No edits to `supabase/**`, `src/hooks/**` behavior, `queryKeys.ts`, `supabase.ts`,
      `queryClient.ts`, `auditLogger.ts`, `AuthProvider` logic, `RouteGuard`, `database.ts`, or route paths/guards. (R1)
- [ ] G.2 No `prototype/` imports, no CDN Tailwind, no `shared.css`/`shared.js` in `src/`. (R2.7)
- [ ] G.3 Components consume hooks only; never `supabase.*` directly. (R1.2)
- [ ] G.4 No new backend/tables/RLS/roles. (Non-goals)

## Progress truth (as of this rewrite)

- **Done per DoD:** none yet (0 screens at `rebuilt: true`).
- **Built, parity-pending:** auth (P1.3), 404 (P1.4), 4 net-new pages (P3.0).
- **Reskinned-only (counts as NOT started):** all 5 dashboards + every `src/pages/**`
  screen touched by the CTA/token/import "cutover waves."
- **Remaining real rebuild:** P1.2 layouts, P2 (5 dashboards), P3 (all modules + net-new
  sub-UI), P4 parity per screen, P5 legacy deletion. This is the bulk of the work.
