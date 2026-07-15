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
   call `supabase.*` directly (R1.2); mutations reuse existing hooks (R1.3). **Data-binding is
   auditable (G.5): every section AND card names the Supabase-backed hook it renders from,
   classified `Wired` / `Needs-wiring` / `No-backend`.** No hardcoded, mock, or `prototype/`
   demo data (R17). A `No-backend` section is a flagged GAP — omit or clearly mark it (never
   fake), and record it in the backend-gap list (`prototype-backend-parity` spec).
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

## P1 — App shell & chrome (per role), navigation, auth

> ⚠️ **The chrome is NOT "done".** The prototype's entire shell — top bar, left
> sidebar, mobile bottom-bar, and **right rail** — is generated per role by
> `prototype/shared.js` (`ROLE_NAV`, `ROLE_MORE`, `ROLE_STATS`, `ROLE_CMDK`,
> `ROLE_NOTIFS`, `railHTML`) + styled by `shared.css`. Today `src/` has only
> **reskinned** partial chrome (`GlobalHeader` = logo + LanguageSwitcher +
> `NotificationBell` + `ProfileDropdown`; `Sidebar` = flat `navItems` list;
> `MobileTabBar`; and a single unused `CoordinatorInsightRail`). Per the contract
> "reskinned ≠ rebuilt," and **large pieces are missing entirely** (⌘K palette in
> the header, role stat chips, the name+level+XP profile chip, the "why am I
> seeing this" popover, the sidebar primary/MORE split + student Upgrade card +
> level bar, and the **right rail for 4 of 5 roles + all student per-page rails**).
> Each region below is its own DoD-gated rebuild task, enumerated per role so
> nothing is dropped. Chrome parity is proven in-frame by each screen's
> `test:visual` at desktop (sidebar + rail) AND mobile (bottom-bar, no rail).

### 1.0 Shell layout & spacing system (all roles) — the "middle area / margins" fix

The deployed dashboards float their content in leftover space: a fixed `w-52` sidebar +
a `max-w-3xl mx-auto` feed with **no right rail**, so the middle column centres inside a
huge empty area (see the student-dashboard screenshot). Fix it **once, at the shell**, with
an explicit responsive **app-shell grid** whose region sizes are tokens in `tokens.css`, so
every role layout (§1.4) shares exact, identical margins for the four regions (top bar /
left sidebar / content / right rail) on both mobile and desktop. (Approach validated against
current practice: CSS-variable-driven canvas widths — cf. Porsche `--p-canvas-sidebar-start/
-end-width`; HBS three-column grid with an _optional_ right rail; container-query cards so a
rail card adapts to its ~320px column, not the viewport.)

- [ ] 1.0.1 **Layout tokens** (add to `src/design-system/tokens.css`): `--app-header-h: 56px`
      · `--app-sidebar-w: 15rem` (240px) · `--app-rail-w: 20rem` (320px) · `--app-content-max:
48rem` (768px) · `--app-gutter: 1.5rem` (24px) · mobile gutter `1rem`. **Reconcile the
      current `w-52` (208px) sidebar to the token — one width everywhere, all roles.**
- [ ] 1.0.2 **Desktop (≥ `xl`/1280) = 3-column grid** `[sidebar --app-sidebar-w] [content 1fr]
[rail --app-rail-w]`, `gap: --app-gutter`, under a sticky `--app-header-h` top bar. The
      content column is `1fr` (`min-width:0`); its inner block is capped at `--app-content-max`
      and **aligned to the column start with `--app-gutter` padding — NOT `mx-auto`-centred in
      empty space** (the bug fix). Rail is sticky; hidden on `data-norail` pages.
- [ ] 1.0.3 **Laptop (`lg` 1024–1279)** = 2-column `[sidebar] [content 1fr]` (rail hidden/below);
      content capped + start-aligned. **Tablet/mobile (< `lg`)** = single column, sidebar becomes
      the **bottom tab bar** (§1.2.1), no rail, content full-width at the mobile gutter, with
      `env(safe-area-inset-*)` respected and a bottom-bar-height spacer so content isn't occluded.
- [ ] 1.0.4 **Correctness (all layouts):** RTL via logical props (`ms/me/ps/pe`, `start/end`);
      `prefers-reduced-motion` on sidebar/drawer transitions; correct sticky z-order (header >
      sidebar/rail > content); a single content scroll container. Applied uniformly across all 5
      role layouts (§1.4) so every screen — dashboard and page alike — inherits identical margins.

### 1.1 Top bar (`.app-header`) — per role

Rebuild `GlobalHeader` to the prototype top bar. Regions (built by
`shared.js` `normalizeHeader`/`buildSearch`/`buildNotifs`/`buildStats`/
`buildProfileChip`):

- [ ] 1.1.1 **Brand** (left) + **⌘K global search** (`.top-search` → `SearchCommand`
      `.cmdk` palette). Per-role command items (`ROLE_CMDK`, "Go to" + "Actions"):
      student (Today/Path/Lesson/Review/Tutor/Progress + Fix-weakest-CLO/Ask-Tutor),
      teacher (Home/Triage/Studio/Grading + Draft-feedback/Upload→lessons),
      parent (Home/Growth/Support), coordinator (Home/Outcomes/Matrix/Accreditation),
      admin (Home/Analytics/Governance/People). `Cmd/Ctrl+K` + Esc; real route jumps.
      **Status:** `SearchCommand` exists but is NOT mounted in the header — wire + per-role items.
- [ ] 1.1.2 **Notifications** bell + panel (`.notif-bell`/`.notif-panel`, unread badge,
      mark-one/all-read, "View all →" → `/{role}/notifications`). Feed is REAL
      (`useNotifications`), not the mock `ROLE_NOTIFS`; match the panel look/behavior.
- [ ] 1.1.3 **Role stat chips** (`.top-stats`, `ROLE_STATS`): student `🔥streak · 💎XP`;
      teacher `🎓classes · ✍️to-grade`; parent `🟢 On track`; coordinator
      `🎯programs · ⚠️gaps`; admin `🏛️learners · %active`. Wire to real hooks
      (streak/XP, teacher KPIs, coordinator below-target, admin KPIs); flag any gap.
- [ ] 1.1.4 **Profile chip** (`.hdr-profile`: name + sub + avatar initial) via
      `ProfileDropdown`. Sub line per role (student `Lvl · XP`; teacher `Dept · N classes`;
      parent `Guardian of …`; coordinator `Program Coordinator`; admin `Institution Admin`).
- [ ] 1.1.5 **"Why am I seeing this?" popover** (`whyPop`, all roles) — explainability
      modal reused by hero/AI cards. Build as a `@/design-system` dialog/popover.

### 1.2 Left sidebar (desktop) + mobile bottom-bar — per role

Rebuild `Sidebar` + `MobileTabBar` to the prototype's split structure:

- [ ] 1.2.1 **Primary nav + FAB** (`ROLE_NAV`; mobile bottom-bar = these 4–5 tabs, one
      is a raised `.tutor-fab`): student Home·Learn·**Tutor(fab)**·Progress·Me;
      teacher Home·Students·**Studio(fab)**·Grade·Me; parent Home·**Growth·Support(fab)**·Me;
      coordinator Home·Outcomes·**Curriculum(fab)**·Accredit·Me;
      admin Home·Analytics·**AI-Gov(fab)**·People·Me. Active-tab logic per `setActiveTab`.
- [ ] 1.2.2 **"MORE" secondary links** (`.side-label` + `ROLE_MORE.links`, desktop sidebar):
      student (Courses·Review·Wellness·Focus·Quests·Leaderboard·Team·Journal·Calendar·Shop·
      Notifications·Settings); teacher (Triage·Studio·Question Bank·Rubrics·Materials·Handoffs·
      Grading·Gradebook·Attendance·Discussions·Announcements·Notifications·Settings);
      parent (Growth·Support·Fees·Announcements·Notifications·Settings);
      coordinator (Outcomes·Matrix·CQI·Course File·Team Health·Competencies·Accreditation·
      Discussions·Announcements·Notifications·Settings);
      admin (Analytics·Marketplace·Governance·People·Structure·Import·Badges·Security·Fees·
      Announcements·Notifications·Settings). (Reconcile with `navItems.ts`.)
- [ ] 1.2.3 **Student-only sidebar extras**: "Upgrade to Premium" card (`.side-upgrade` →
      marketplace) + student **level bar** (`.side-lvlbar`, Lvl · XP progress). Other roles: none.

### 1.3 Right rail (desktop only, `.right-rail`) — per role ⟵ **MISSING TODAY**

Rebuild the per-role "AI has prepared" rail (`buildRail`/`railHTML`; hidden on
mobile and on `data-norail` pages). Only `CoordinatorInsightRail` exists today.
Each card wires a real hook or is flagged (R17); enumerate every card:

- [ ] 1.3.1 **Teacher rail**: `🤖 AI prepared your day` (workload checklist),
      `At-risk students` (×3, `useAtRiskStudents`), `📊 Class pulse` (avg mastery /
      on-time / CLOs-below, `useTeacherKPIs`), `🧬 Curriculum Studio` (nav).
- [ ] 1.3.2 **Parent rail**: `🌱 This week` (study days / wellbeing / focus balance),
      `💬 Conversation starter`, `🎉 Celebrate`. (Wellbeing/study-days = gaps → flag.)
- [ ] 1.3.3 **Coordinator rail**: `📉 Attainment alerts` (×2, `useCoordinatorOutcomeAttainment`),
      `🗂️ Curriculum gap`, `📋 Accreditation` (`useCoordinatorAccreditationReadiness`).
      (Reskin/replace the existing `CoordinatorInsightRail`.)
- [ ] 1.3.4 **Admin rail**: `🏛️ Institution` (learners / weekly-active / retention),
      `🛡️ AI governance` (autonomy ceiling / auto-actions), `Departments`
      (`useDepartmentAnalytics`). (Weekly-active/retention/governance = gaps → flag.)
- [ ] 1.3.5 **Student per-page contextual rails** (rail changes by page, `railHTML`):
      **dashboard** (Daily Goal ring · Daily Quests · Gold League · Coming up · Streak
      protection · AI tutor); **learn/course** (Course snapshot · Next deadline · Weakest
      CLO); **assignment/lesson** (Need a hand → Tutor · Similar past work · Have a perk);
      **progress** (Focus next · vs last term · Class standing); **journal** (Journal streak ·
      Prompt ideas); **learning-profile** (Why this matters · Completeness); **settings**
      (Your data); **profile** (Latest badge · Academic · Portfolio · Account); **fallback**
      (Keep going). Wire to real hooks (courses/deadlines/CLO/leaderboard/reviews); the
      Quests / Gold-League-weekly / streak-freeze-inventory pieces are backend gaps → flag.

### 1.4 Role layouts / shell (`src/app`) — per role

- [ ] 1.4.1 **Role layouts** (admin/coordinator/teacher/student/parent) rebuilt in `src/app`
      composing 1.1–1.3, preserving `SidebarProvider`, `EmailVerificationBanner`, `GuidedTour`,
      `SkipToMain`→`#main-content`, `usePageViewLogger`, and the **StudentLayout onboarding
      gate**. Desktop = sidebar + `page-content` + right rail; mobile = bottom-bar only, no rail.
      (`src/app` is currently empty — layouts still live in `src/pages/{role}/{Role}Layout.tsx`.) (R4.1, R4.5)

### 1.5 Auth & entry screens

- [~] 1.5.1 **Auth screens rebuilt** to `auth.html` (Login/SignUp/Reset/Update/AcceptInvite):
  light split brand+form panel, tabs, SSO, `.fld`, strength meter, tactile CTA; lockout +
  `signIn`/`signUp` side-effects + self-signup=student preserved. **Remaining for DoD:** flip
  `auth-login` → `rebuilt:true` and pass `test:visual` (Tier A, 0.08) at 4 viewports; owner
  decision on SSO/magic-link providers (enable in Supabase or remove the buttons). (R4.2)
- [ ] 1.5.2 **Onboarding + entry** (`index.html` wizard, `start.html`, `roles.html` role picker):
      rebuild the multi-step onboarding shell (no chrome), the start/splash, and the role picker
      (dev/impersonation only where applicable). Preserve the real onboarding gate + `signUp` flow.
- [x] 1.6 **404 NotFoundPage** built from `@/design-system` + catch-all route. (R4.1)

## P2 — Role dashboards (REBUILD from prototype, then delete `*DashboardNew`)

> ✅ All 5 dashboards are now **rebuilt from their `prototype/*.html`** in
> `src/features/{role}/dashboard/*DashboardScreen.tsx` (single-column feeds on
> `@/design-system` + real hooks), **cut over**, and every `*DashboardNew` reskin
> **deleted**. They sit at `[~]` pending only the owner's `test:visual` parity flip
> (the sole remaining DoD item, same gate as auth P1.3). Backend-less prototype
> sections were adapted to real signals or omitted — never faked (R17).

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
- [~] 2.4 **Coordinator dashboard** → `coordinator-dashboard.html` (`/coordinator/dashboard`, `useCoordinatorDashboardAggregate`).
  **Rebuilt** in `src/features/coordinator/dashboard/CoordinatorDashboardScreen.tsx` as the prototype's
  single-column "program health" feed (no insight rail): hero + real action chips, KPI-filter row
  (`usePrograms`/aggregate/`useCoordinatorOutcomeAttainment`/`useCoordinatorAccreditationReadiness`),
  attainment alerts with decision context (trend/affected/root-cause from real weakestCourse +
  affectedStudents), curriculum-coverage (real CLO coverage %), accreditation-evidence checklist (real
  `pack`), CQI timeline (`useCQIPlans`) + program timeline (`useAcademicCalendarEvents`). **Cut over**,
  `CoordinatorDashboardNew` **deleted** (test repointed to the route page). **Remaining for DoD:** owner
  `test:visual` green (hero carousel slides + "Recovery pathways" are prototype-only/no-backend concepts,
  omitted not faked).
- [~] 2.5 **Admin dashboard** → `admin-dashboard.html` (`/admin/dashboard`, `useAdminDashboardAggregate`).
  **Rebuilt** in `src/features/admin/dashboard/AdminDashboardScreen.tsx` as the prototype's single-column
  institution feed: hero + real status chips (users/active/programs), KPI row (Users/Active/Avg mastery/
  Courses from the aggregate + `useDepartmentAnalytics`), factual "Institution insight" summary,
  "Departments by mastery" (real per-dept avg PLO attainment), "Users by role" (real `usersByRole`), and a
  static A2 autonomy footer. **Cut over**, `AdminDashboardNew` **deleted**. **Remaining for DoD:** owner
  `test:visual` green (the prototype's actual sections are hero/KPI/executive-insight/departments/AI-
  governance — the mock's AI-generated narrative, "weekly-active" login %, "retention risk" count, and
  AI-governance metrics/route have no backend, so they are adapted to real signals or omitted, not faked).

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

- [ ] **Student Triage** (`teacher-students.html`) — the "Students" primary-nav screen: priority
      tabs (Critical/Attention/Monitor), at-risk student cards with risk %, contributing signals,
      and Send-nudge / Assign-review / Book-1:1 actions (`useAtRiskStudents` + `useAtRiskPredictions` + `useSendNudge`; **no `/teacher/students` route today** — add it). Dt (student drill-in) Mo, St.
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
- [ ] **Accreditation** (`coordinator-accreditation.html`) — the "Accredit" primary-nav screen:
      evidence-readiness %, evidence checklist / per-course evidence status, approval chain, and
      pack generation (`useCoordinatorAccreditationReadiness` + `useAccreditationApprovals`). Dt, **W** generate, St.
- [ ] Competencies (`coordinator-competencies.html`), Timetable, Profile (`coordinator-profile.html`) — **F**, St

### 3.4 Admin modules (`/admin/*`)

- [ ] Users list + form + **import wizard** + invite + parent-invite + pending-onboarding (`admin-users.html`) — **F**, **W**, Del, Dt, St
- [ ] Programs, Courses (+ enrollment roster Mo), Semesters, Departments — **F**, Del, St
- [ ] ILOs list/form (`admin-structure.html`) — **F**, Del, Dt, St
- [ ] Reports (`admin-analytics.html`) — export Mo, St (fill "weekly active learners" chart)
- [ ] Audit log — filters, Dt drawer, St
- [ ] Bonus events, Badge spotlight, **Badge Definitions** (`admin-badges.html` — badge CRUD, condition/threshold editor, distinct from spotlight) — **F**, Del, Dt, St
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
- [ ] G.5 **Supabase is the ONLY source of truth (data-binding rule).** Every screen / section /
      card renders from a real `src/hooks/*` query (→ `supabase`), never hardcoded / mock /
      `prototype/` demo data. For each screen keep a **data-binding audit** — per section: the
      bound hook + one of `Wired` (hook exists & used) · `Needs-wiring` (hook exists, wire it) ·
      `No-backend` (no table/hook → GAP: build it via `prototype-backend-parity`, or mark N/A and
      omit — never fabricate). This is the standing check for "what is left to **build** vs
      **connect to backend** vs **has no backend to connect to**." (R1, R17)

## Progress truth (as of this rewrite)

- **Done per DoD:** none yet at `rebuilt: true` (the flip is the owner's `test:visual` gate).
- **Built, parity-pending (`[~]`):** all 5 role dashboards (P2.1–2.5 — rebuilt + wired +
  cut over + every `*DashboardNew` deleted), auth (P1.3), 404 (P1.4), 4 net-new pages (P3.0).
- **Reskinned-only (counts as NOT started):** every remaining `src/pages/**` screen touched
  by the CTA/token/import "cutover waves" (i.e. P3 modules not yet rebuilt).
- **Remaining real rebuild:** P1.2 layouts, P3 (all modules + net-new sub-UI), P4 parity per
  screen, P5 legacy deletion. This is the bulk of the work.
