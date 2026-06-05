# Audit 04 — Roles & Navigation

**Scope:** Per-role navigation, routing guards, and page inventory across all roles
(admin, coordinator, teacher, student, parent, plus auth/public/shared).
**Codebase:** `f:\Edeviser-Kiro` — React 18 + TS + Vite, React Router v7, Supabase, TanStack Query.
**Method:** Static read of router, guard, nav, layouts, login/auth, and per-page hook usage. No files modified.
**Date generated:** from current working tree.

> Evidence is cited as `path:line`. Line numbers are from the files as read during this audit.
> Items I could not verify statically are explicitly flagged **[UNVERIFIED]**.

---

## 0. Key source files

| Concern                                  | File                                                                                  |
| ---------------------------------------- | ------------------------------------------------------------------------------------- |
| Route table                              | `src/router/AppRouter.tsx` (861 lines)                                                |
| Role guard                               | `src/router/RouteGuard.tsx`                                                           |
| Nav definitions (single source of truth) | `src/lib/navItems.ts`                                                                 |
| Sidebar renderer                         | `src/components/shared/Sidebar.tsx`                                                   |
| Header + profile menu                    | `src/components/shared/GlobalHeader.tsx`, `src/components/shared/ProfileDropdown.tsx` |
| Post-login redirect                      | `src/providers/AuthProvider.tsx` (`signIn` → `ROLE_DASHBOARD_MAP`)                    |
| Login page                               | `src/pages/LoginPage.tsx`                                                             |

### On-disk page counts (verified this run)

| Folder           | `.tsx` files                                         |
| ---------------- | ---------------------------------------------------- |
| admin            | 46                                                   |
| coordinator      | 14                                                   |
| teacher          | 48                                                   |
| student          | 62                                                   |
| parent           | 7                                                    |
| shared           | 6                                                    |
| auth             | 2                                                    |
| public           | 3                                                    |
| `src/pages` root | 3 (LoginPage, ResetPasswordPage, UpdatePasswordPage) |

Note: the task brief omitted teacher (= 48). Counts include non-page helpers (`columns.tsx`,
form sub-steps, tutor sub-panels), which is why total files exceed the number of routed pages.

---

## 1. Guard model (how protection works)

`RouteGuard` (`src/router/RouteGuard.tsx:17-42`) is the single gate:

- Loading → spinner (`:21-28`).
- No `user` → `<Navigate to="/login">` (`:30-32`).
- `role` missing or not in `allowedRoles` → redirect to the role's own dashboard, or `/login`
  if role is null (`:34-37`).
- Otherwise renders children (`:39`).

Role resolution: `useAuth()` → `AuthProvider` derives `role = profile?.role ?? null`
(`src/providers/AuthProvider.tsx:334`). Profile is fetched from the `profiles` table
(`AuthProvider.tsx:84-105`).

**Guard wiring in the router** — every role tree is wrapped once at the parent route:

| Tree                        | Guard                                 | Evidence                                     |
| --------------------------- | ------------------------------------- | -------------------------------------------- |
| `/admin/*`                  | `allowedRoles={["admin"]}`            | `AppRouter.tsx:453-460`                      |
| `/coordinator/*`            | `["coordinator"]`                     | `AppRouter.tsx:540-547`                      |
| `/teacher/*`                | `["teacher"]`                         | `AppRouter.tsx:592-599`                      |
| `/student/*`                | `["student"]`                         | `AppRouter.tsx:~700` (StudentLayout wrapper) |
| `/student/focus/:sessionId` | `["student"]` (separate, full-screen) | `AppRouter.tsx:819-827`                      |
| `/parent/*`                 | `["parent"]`                          | `AppRouter.tsx:830-838`                      |

All child routes inherit the parent guard via `<Outlet/>` in each layout
(`AdminLayout.tsx:18`, `StudentLayout.tsx:33`, etc.). **No child route re-declares a different
role**, so there is no role-mismatch leak inside a tree.

**Public routes (intentionally unguarded):** `/login`, `/signup`, `/accept-invite/:token`,
`/reset-password`, `/update-password`, `/portfolio/:student_id`, `/terms`, `/privacy`
(`AppRouter.tsx:444-451`). Root `/` and catch-all `*` both redirect to `/login`
(`AppRouter.tsx:841-847`).

---

## 2. Full route → role → page → guarded table

Legend for **Guarded**: ✅ = wrapped by `RouteGuard`; 🌐 = public by design; lazy = component is `React.lazy`.
All page components in `AppRouter.tsx` are lazy-loaded via `lazy(() => import(...))` (`AppRouter.tsx:9-420`).

### Public / auth (🌐, lazy)

| Path                     | Component          | File                                   |
| ------------------------ | ------------------ | -------------------------------------- |
| `/login`                 | LoginPage          | `src/pages/LoginPage.tsx`              |
| `/signup`                | SignUpPage         | `src/pages/auth/SignUpPage.tsx`        |
| `/accept-invite/:token`  | AcceptInvitePage   | `src/pages/auth/AcceptInvitePage.tsx`  |
| `/reset-password`        | ResetPasswordPage  | `src/pages/ResetPasswordPage.tsx`      |
| `/update-password`       | UpdatePasswordPage | `src/pages/UpdatePasswordPage.tsx`     |
| `/portfolio/:student_id` | PublicPortfolio    | `src/pages/public/PublicPortfolio.tsx` |
| `/terms`                 | TermsPage          | `src/pages/public/TermsPage.tsx`       |
| `/privacy`               | PrivacyPage        | `src/pages/public/PrivacyPage.tsx`     |

### Admin (`/admin/*`, role=admin, ✅, all lazy) — `AppRouter.tsx:461-538`

| Route                                                                                                      | Component                                                                                                              | In nav?                     |
| ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| `dashboard`                                                                                                | AdminDashboard                                                                                                         | ✅                          |
| `users`, `users/new`, `users/import`, `users/invite`, `users/invite-parent`, `users/:id/edit`              | UserListPage / UserForm / BulkImportPage / InviteUsersPage / ParentInvitePage                                          | nav→`users` only            |
| `programs`, `programs/new`, `programs/:id/edit`                                                            | ProgramListPage / ProgramForm                                                                                          | nav→`programs`              |
| `outcomes`, `outcomes/new`, `outcomes/:id/edit`                                                            | ILOListPage / ILOForm                                                                                                  | nav→`outcomes`              |
| `audit-log`                                                                                                | AuditLogPage                                                                                                           | ✅                          |
| `bonus-events`                                                                                             | BonusXPEventManager                                                                                                    | ✅                          |
| `courses`, `courses/new`, `courses/:id/edit`, `courses/:courseId/enrollment`                               | CourseListPage / CourseForm / CourseEnrollmentPage                                                                     | **no nav** (orphan, see §5) |
| `semesters`                                                                                                | SemesterManager                                                                                                        | ✅                          |
| `departments`                                                                                              | DepartmentManager                                                                                                      | ✅                          |
| `onboarding/pending`                                                                                       | PendingOnboardingPage                                                                                                  | **no nav**                  |
| `reports`                                                                                                  | ReportGeneratorPage                                                                                                    | ✅                          |
| `calendar`                                                                                                 | AcademicCalendarManager                                                                                                | ✅                          |
| `timetable`                                                                                                | TimetableManager                                                                                                       | ✅                          |
| `fees`                                                                                                     | FeeManager                                                                                                             | ✅                          |
| `import`                                                                                                   | DataImportPage                                                                                                         | **no nav**                  |
| `surveys`, `surveys/results`                                                                               | SurveyManager / SurveyResultsPage                                                                                      | nav→`surveys`               |
| `graduate-attributes`                                                                                      | GraduateAttributeManager                                                                                               | **no nav**                  |
| `competency-frameworks`                                                                                    | CompetencyFrameworkManager                                                                                             | **no nav**                  |
| `historical-evidence`                                                                                      | HistoricalEvidenceDashboard                                                                                            | **no nav**                  |
| `outcome-chain`                                                                                            | OutcomeChainView (shared)                                                                                              | **no nav**                  |
| `badges/spotlight`                                                                                         | BadgeSpotlightManager                                                                                                  | ✅                          |
| `marketplace`, `marketplace/sales`, `marketplace/analytics`, `marketplace/quests`, `marketplace/economist` | MarketplaceManagementPage / SaleEventManager / MarketplaceAnalyticsPage / KnowledgeQuestManager / XPEconomistDashboard | nav→`marketplace` only      |
| `settings/profile`                                                                                         | **shared/ProfilePage**                                                                                                 | via ProfileDropdown         |
| `settings/institution`                                                                                     | InstitutionSettingsPage                                                                                                | via ProfileDropdown         |

### Coordinator (`/coordinator/*`, role=coordinator, ✅, lazy) — `AppRouter.tsx:548-590`

| Route                               | Component                                 | In nav?                      |
| ----------------------------------- | ----------------------------------------- | ---------------------------- |
| `dashboard`                         | CoordinatorDashboard                      | ✅                           |
| `plos`, `plos/new`, `plos/:id/edit` | PLOListPage / PLOForm                     | nav→`plos`                   |
| `matrix`                            | CurriculumMatrixPage                      | ✅                           |
| `cqi`                               | CQIManager                                | ✅                           |
| `course-file`                       | CourseFileGenerator                       | ✅                           |
| `sankey`                            | SankeyDiagramView                         | ✅                           |
| `gap-analysis`                      | GapAnalysisView                           | ✅                           |
| `coverage-heatmap`                  | CoverageHeatmapView                       | ✅                           |
| `trends`                            | SemesterTrendView                         | ✅ **(PLACEHOLDER, see §4)** |
| `cohort-comparison`                 | CohortComparisonView                      | ✅ **(PLACEHOLDER, see §4)** |
| `outcome-chain`                     | OutcomeChainView (shared)                 | ✅                           |
| `timetable`                         | TimetableManager (admin component reused) | ✅                           |
| `settings/profile`                  | shared/ProfilePage                        | via ProfileDropdown          |

### Teacher (`/teacher/*`, role=teacher, ✅, lazy) — `AppRouter.tsx:600-~690`

| Route                                                                                                                                                                                         | Component                                                                                 | In nav?                            |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------- |
| `dashboard`                                                                                                                                                                                   | TeacherDashboard                                                                          | ✅                                 |
| `clos`, `clos/new`, `clos/:id/edit`, `clos/:id`                                                                                                                                               | CLOListPage / CLOForm / CLODetailPage                                                     | nav→`clos`                         |
| `clos/:cloId/sub-clos`, `outcomes/sub-clos`                                                                                                                                                   | SubCLOManager                                                                             | no nav                             |
| `rubrics`, `rubrics/new`, `rubrics/:id/edit`                                                                                                                                                  | RubricListPage / RubricBuilder                                                            | nav→`rubrics`                      |
| `assignments`, `assignments/new`, `assignments/:id/edit`                                                                                                                                      | AssignmentListPage / AssignmentForm                                                       | nav→`assignments`                  |
| `grading`, `grading/:submissionId`                                                                                                                                                            | GradingQueuePage / GradingInterface                                                       | nav→`grading`                      |
| `gradebook`                                                                                                                                                                                   | GradebookView                                                                             | ✅                                 |
| `baseline`, `baseline/:courseId`, `baseline/:courseId/config`, `baseline/:courseId/questions/new`                                                                                             | BaselineCoursesListPage / BaselineResultsPage / BaselineConfigPage / BaselineQuestionForm | nav→`baseline`                     |
| `courses/:courseId/generate-questions` / `review-queue` / `question-bank` / `question-analytics` / `quiz-clo-correlation/:quizId` / `quizzes/new` / `quizzes/:id/edit` / `explanation-review` | quiz-generation + quiz-analytics + QuizForm + ExplanationReviewPage                       | no nav (course-context deep links) |
| `announcements`                                                                                                                                                                               | AnnouncementEditor                                                                        | ✅                                 |
| `modules`                                                                                                                                                                                     | ModuleManager                                                                             | ✅                                 |
| `courses/:courseId/discussions`, `.../discussions/:threadId`                                                                                                                                  | DiscussionModeration / ThreadDetail                                                       | no nav                             |
| `attendance`, `attendance/report`                                                                                                                                                             | AttendanceMarker / AttendanceReport                                                       | no nav                             |
| `teams`, `teams/manage`, `teams/new`, `teams/:id/edit`                                                                                                                                        | TeamManagementPage / TeamManager / TeamFormPage                                           | nav→`teams`                        |
| `challenges`, `challenges/new`, `challenges/:id/edit`                                                                                                                                         | TeacherChallengeListPage / ChallengeFormPage                                              | nav→`challenges`                   |
| `team-health`                                                                                                                                                                                 | TeamHealthReportPage                                                                      | ✅                                 |
| `tutor-analytics`                                                                                                                                                                             | TutorAnalyticsPage                                                                        | ✅                                 |
| `tutor-handoffs`                                                                                                                                                                              | TeacherHandoffPage                                                                        | ✅                                 |
| `content-review`                                                                                                                                                                              | ContentReviewPage                                                                         | no nav                             |
| `calendar`                                                                                                                                                                                    | CalendarView (shared)                                                                     | ✅                                 |
| `timetable`                                                                                                                                                                                   | TimetableView (shared)                                                                    | ✅                                 |
| `settings/profile`                                                                                                                                                                            | shared/ProfilePage                                                                        | via ProfileDropdown                |

### Student (`/student/*`, role=student, ✅, lazy) — `AppRouter.tsx:~700-815` + `749-818`

| Route                                                                     | Component                                              | In nav?                                 |
| ------------------------------------------------------------------------- | ------------------------------------------------------ | --------------------------------------- |
| `dashboard`                                                               | StudentDashboard                                       | ✅                                      |
| `courses`, `courses/:courseId`, `courses/:courseId/materials/:materialId` | StudentCoursesPage / CourseDetail                      | nav→`courses`                           |
| `assignments`, `assignments/:id`                                          | AssignmentListPage / AssignmentDetailPage              | nav→`assignments`                       |
| `planner`, `planner/starter-week`                                         | WeeklyPlannerPage / StarterWeekPlanPage                | nav→`planner`                           |
| `today`                                                                   | TodayViewPage                                          | ✅                                      |
| `progress`                                                                | StudentProgressPage                                    | ✅                                      |
| `leaderboard`                                                             | LeaderboardPage                                        | ✅                                      |
| `challenges`                                                              | ChallengeListView                                      | ✅                                      |
| `challenges/list`                                                         | ChallengeListPage                                      | **dead route (see §5)**                 |
| `challenges/:id`                                                          | ChallengeDetailPage                                    | from list                               |
| `team`, `teams/:teamId`, `teams/new`                                      | StudentTeamPage / TeamProfilePage / CreateTeamPage     | nav→`team`                              |
| `habits`, `habits/analytics`                                              | HabitHeatmapPage / HabitAnalyticsPage                  | nav→`habits`                            |
| `marketplace`, `marketplace/my-items`, `marketplace/history`              | MarketplacePage / MyItemsPage / TransactionHistoryPage | nav→`marketplace`                       |
| `content`                                                                 | StudentContentPage                                     | nav→`content` (de-emphasized)           |
| `journal`                                                                 | StudentJournalPage                                     | ✅                                      |
| `tutor`, `tutor/:conversationId`                                          | TutorPage                                              | nav→`tutor`                             |
| `calendar`                                                                | CalendarView (shared)                                  | ✅                                      |
| `timetable`                                                               | TimetableView (shared)                                 | ✅                                      |
| `portfolio`                                                               | StudentPortfolio                                       | ✅                                      |
| `surveys`                                                                 | SurveyResponsePage                                     | conditional nav (hidden when 0 surveys) |
| `onboarding`, `onboarding/complete-profile`                               | OnboardingWizard / CompleteProfilePage                 | no nav (flow)                           |
| `quizzes/:quizId/adaptive`, `quizzes/:quizId/review/:attemptId`           | AdaptiveQuizSession / PostQuizReview                   | no nav (deep link)                      |
| `courses/:courseId/recovery/:cloId`                                       | MasteryRecoveryPage                                    | no nav                                  |
| `courses/:courseId/discussions`, `.../discussions/:threadId`              | DiscussionForum / ThreadDetail                         | no nav                                  |
| `announcements/:announcementId`                                           | AnnouncementDetail                                     | no nav                                  |
| `settings/profile`                                                        | **student/ProfileSettingsPage**                        | via ProfileDropdown                     |
| `settings/reassessment`                                                   | ReassessmentPage                                       | no nav                                  |
| `xp-history`                                                              | XPHistory                                              | no nav                                  |
| `notification-preferences`                                                | NotificationPreferences (shared)                       | no nav                                  |
| `sessions`                                                                | SessionManagement (shared)                             | no nav                                  |
| `/student/focus/:sessionId`                                               | FocusModePage (outside layout)                         | no nav                                  |

### Parent (`/parent/*`, role=parent, ✅, lazy) — `AppRouter.tsx:838-840 region`

| Route                           | Component            | In nav?                   |
| ------------------------------- | -------------------- | ------------------------- |
| `dashboard`                     | ParentDashboard      | ✅                        |
| `children`                      | ParentChildrenPage   | ✅                        |
| `progress`                      | ParentProgressPage   | ✅                        |
| `attendance`                    | ParentAttendancePage | ✅                        |
| `planner`, `planner/:studentId` | ParentPlannerView    | nav→`planner` (studyPlan) |
| `settings/profile`              | shared/ProfilePage   | via ProfileDropdown       |

---

## 3. Per-role nav ↔ route reconciliation

`navItems.ts` is the single source of truth, rendered by `Sidebar.tsx` for every role
(flat list for admin/coordinator/teacher/parent; grouped sections for student —
`Sidebar.tsx:60-78`). `Sidebar` picks `navItems[role]` keyed on `profile.role`
(`Sidebar.tsx:50`, default fallback `student`).

**Every nav item resolves to a real, guarded route — no dead nav links found.** Verified
each `to` against the route table:

- **Admin** (`navItems.ts:80-97`): dashboard, users, departments, programs, courses,
  semesters, outcomes, timetable, calendar, fees, reports, audit-log, bonus-events,
  badges/spotlight, marketplace, surveys → all exist (✅).
- **Coordinator** (`navItems.ts:99-145`): dashboard, plos, matrix, sankey, gap-analysis,
  coverage-heatmap, trends, cohort-comparison, cqi, outcome-chain, course-file, timetable → all exist (✅).
- **Teacher** (`navItems.ts:147-195`): dashboard, clos, rubrics, assignments, grading,
  gradebook, announcements, modules, calendar, timetable, challenges, teams, team-health,
  tutor-analytics, tutor-handoffs, baseline → all exist (✅).
- **Student** (`navItems.ts:197-310`): dashboard, courses, assignments, planner, today,
  progress, leaderboard, challenges, team, habits, marketplace, content, journal, tutor,
  calendar, timetable, portfolio, surveys → all exist (✅). `surveys` is conditionally
  hidden when the student has 0 assigned surveys (`Sidebar.tsx:55-68`).
- **Parent** (`navItems.ts:312-318`): dashboard, children, progress, attendance,
  planner → all exist (✅).

Settings/profile/institution are intentionally **not** in the sidebar; they are reached
through `ProfileDropdown` (`ProfileDropdown.tsx:105-130`) with a per-role route map, plus
admin-only Institution Settings (`ProfileDropdown.tsx:133-141`).

---

## 4. Per-role page inventory with status

Classification rule: **WORKING** = renders from a TanStack Query hook / Supabase data;
**PLACEHOLDER** = self-described "Placeholder", renders only an empty-state with no data hook;
**STUB** = real but reuses another role's data source / partial wiring noted in code.

### Admin (selected — routed pages)

| Page                                                                              | Route                                    | Primary hook(s)                           | Status                                                                                                            |
| --------------------------------------------------------------------------------- | ---------------------------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| AdminDashboard                                                                    | `/admin/dashboard`                       | KPI / institution hooks                   | WORKING                                                                                                           |
| UserListPage / UserForm                                                           | `/admin/users*`                          | user hooks                                | WORKING                                                                                                           |
| BulkImportPage, InviteUsersPage, ParentInvitePage                                 | `/admin/users/*`                         | import/invite hooks                       | WORKING                                                                                                           |
| ProgramListPage / ProgramForm                                                     | `/admin/programs*`                       | program hooks                             | WORKING                                                                                                           |
| ILOListPage / ILOForm                                                             | `/admin/outcomes*`                       | outcome hooks                             | WORKING                                                                                                           |
| CourseListPage / CourseForm / CourseEnrollmentPage                                | `/admin/courses*`                        | course/enrollment hooks                   | WORKING (orphan nav)                                                                                              |
| AuditLogPage                                                                      | `/admin/audit-log`                       | audit hook                                | WORKING                                                                                                           |
| BonusXPEventManager                                                               | `/admin/bonus-events`                    | bonus xp hooks                            | WORKING                                                                                                           |
| SemesterManager, DepartmentManager                                                | `/admin/semesters`, `/admin/departments` | hooks                                     | WORKING                                                                                                           |
| ReportGeneratorPage                                                               | `/admin/reports`                         | report hooks; semester via programs query | STUB (semester is a documented stub — `ReportGeneratorPage.tsx:23` "Semester stub (uses programs query for now)") |
| AcademicCalendarManager, TimetableManager, FeeManager, DataImportPage             | resp.                                    | hooks                                     | WORKING                                                                                                           |
| SurveyManager, SurveyResultsPage                                                  | `/admin/surveys*`                        | survey hooks                              | WORKING                                                                                                           |
| GraduateAttributeManager, CompetencyFrameworkManager, HistoricalEvidenceDashboard | resp.                                    | hooks                                     | WORKING (orphan nav)                                                                                              |
| BadgeSpotlightManager                                                             | `/admin/badges/spotlight`                | badge hooks                               | WORKING                                                                                                           |
| Marketplace\* (5 pages)                                                           | `/admin/marketplace*`                    | marketplace hooks                         | WORKING                                                                                                           |
| InstitutionSettings                                                               | `/admin/settings/institution`            | settings hooks                            | WORKING                                                                                                           |
| **AdminProfilePage**                                                              | —                                        | useAuth only                              | **ORPHAN FILE** (not routed; `/admin/settings/profile` uses shared ProfilePage)                                   |
| **WellnessXpSettingsPage**                                                        | —                                        | useWellnessXpConfig                       | **ORPHAN FILE** (not imported/routed anywhere)                                                                    |

### Coordinator

| Page                       | Route                            | Primary hook(s)      | Status                                                                                                                                                                                  |
| -------------------------- | -------------------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CoordinatorDashboard       | `/coordinator/dashboard`         | dashboard hooks      | WORKING                                                                                                                                                                                 |
| PLOListPage / PLOForm      | `/coordinator/plos*`             | PLO hooks            | WORKING                                                                                                                                                                                 |
| CurriculumMatrixPage       | `/coordinator/matrix`            | matrix hooks         | WORKING                                                                                                                                                                                 |
| CQIManager                 | `/coordinator/cqi`               | CQI hooks            | WORKING                                                                                                                                                                                 |
| CourseFileGenerator        | `/coordinator/course-file`       | course-file hooks    | WORKING                                                                                                                                                                                 |
| SankeyDiagramView          | `/coordinator/sankey`            | useVisualizationData | WORKING                                                                                                                                                                                 |
| GapAnalysisView            | `/coordinator/gap-analysis`      | gap hooks            | WORKING                                                                                                                                                                                 |
| CoverageHeatmapView        | `/coordinator/coverage-heatmap`  | coverage hooks       | WORKING                                                                                                                                                                                 |
| **SemesterTrendView**      | `/coordinator/trends`            | **none**             | **PLACEHOLDER** — `SemesterTrendView.tsx:8` "Placeholder — requires mv_semester_attainment"; renders static empty-state badge "Requires semester_attainment_snapshots table" (`:34-36`) |
| **CohortComparisonView**   | `/coordinator/cohort-comparison` | **none**             | **PLACEHOLDER** — `CohortComparisonView.tsx:8` "Placeholder — requires cohort data aggregation"; static empty state (`:32-34`)                                                          |
| OutcomeChainView (shared)  | `/coordinator/outcome-chain`     | outcome hooks        | WORKING                                                                                                                                                                                 |
| TimetableManager (reused)  | `/coordinator/timetable`         | timetable hooks      | WORKING                                                                                                                                                                                 |
| **CoordinatorProfilePage** | —                                | useAuth only         | **ORPHAN FILE**                                                                                                                                                                         |

### Teacher

| Page                                                                        | Route                                                         | Primary hook(s)   | Status                                                    |
| --------------------------------------------------------------------------- | ------------------------------------------------------------- | ----------------- | --------------------------------------------------------- |
| TeacherDashboard                                                            | `/teacher/dashboard`                                          | dashboard hooks   | WORKING                                                   |
| CLOListPage / CLOForm / CLODetailPage                                       | `/teacher/clos*`                                              | CLO hooks         | WORKING                                                   |
| SubCLOManager                                                               | `/teacher/clos/:cloId/sub-clos`, `/teacher/outcomes/sub-clos` | subclo hooks      | WORKING (2 routes, same component)                        |
| RubricListPage / RubricBuilder                                              | `/teacher/rubrics*`                                           | rubric hooks      | WORKING                                                   |
| AssignmentListPage / AssignmentForm                                         | `/teacher/assignments*`                                       | assignment hooks  | WORKING                                                   |
| GradingQueuePage / GradingInterface                                         | `/teacher/grading*`                                           | grading hooks     | WORKING                                                   |
| GradebookView (+ GradeCategoryManager)                                      | `/teacher/gradebook`                                          | gradebook hooks   | WORKING                                                   |
| Baseline\* (4 pages)                                                        | `/teacher/baseline*`                                          | baseline hooks    | WORKING                                                   |
| quiz-generation (4) + quiz-analytics (2) + QuizForm + ExplanationReviewPage | `/teacher/courses/:courseId/*`                                | quiz hooks        | WORKING                                                   |
| AnnouncementEditor, ModuleManager                                           | resp.                                                         | hooks             | WORKING                                                   |
| DiscussionModeration                                                        | `/teacher/courses/:courseId/discussions`                      | discussion hooks  | WORKING                                                   |
| AttendanceMarker / AttendanceReport                                         | `/teacher/attendance*`                                        | attendance hooks  | WORKING                                                   |
| TeamManagementPage / TeamManager / TeamFormPage                             | `/teacher/teams*`                                             | team hooks        | WORKING                                                   |
| TeacherChallengeListPage / ChallengeFormPage                                | `/teacher/challenges*`                                        | challenge hooks   | WORKING                                                   |
| TeamHealthReportPage                                                        | `/teacher/team-health`                                        | team-health hooks | WORKING                                                   |
| TutorAnalyticsPage / TeacherHandoffPage                                     | resp.                                                         | tutor hooks       | WORKING                                                   |
| ContentReviewPage                                                           | `/teacher/content-review`                                     | content hooks     | WORKING                                                   |
| **QuizBuilder** (`teacher/quizzes/QuizBuilder.tsx`)                         | —                                                             | useParams + hooks | **ORPHAN FILE** (not imported by router or any component) |
| **TeacherProfilePage**                                                      | —                                                             | useAuth only      | **ORPHAN FILE**                                           |
| GradingStats (`teacher/dashboard/`)                                         | —                                                             | —                 | sub-component (not a page)                                |

### Student (selected)

| Page                                                                                                                 | Route                       | Primary hook(s)                          | Status                                                                                                              |
| -------------------------------------------------------------------------------------------------------------------- | --------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| StudentDashboard                                                                                                     | `/student/dashboard`        | many gamification/course hooks           | WORKING                                                                                                             |
| StudentCoursesPage / CourseDetail                                                                                    | `/student/courses*`         | course hooks                             | WORKING                                                                                                             |
| AssignmentListPage / AssignmentDetailPage                                                                            | `/student/assignments*`     | assignment hooks                         | WORKING                                                                                                             |
| WeeklyPlannerPage / StarterWeekPlanPage / TodayViewPage / FocusModePage                                              | planner routes              | planner hooks                            | WORKING                                                                                                             |
| StudentProgressPage (+ CLOProgress, LearningPath)                                                                    | `/student/progress`         | progress hooks                           | WORKING                                                                                                             |
| LeaderboardPage (+ TeamLeaderboard)                                                                                  | `/student/leaderboard`      | useLeagueLeaderboard, useTeamLeaderboard | WORKING — **scoping gap, see §6**                                                                                   |
| ChallengeListView                                                                                                    | `/student/challenges`       | useStudentChallenges + realtime          | WORKING                                                                                                             |
| ChallengeListPage                                                                                                    | `/student/challenges/list`  | useStudentChallenges + realtime          | WORKING — **dead route (§5)**                                                                                       |
| ChallengeDetailPage                                                                                                  | `/student/challenges/:id`   | challenge hooks                          | WORKING                                                                                                             |
| StudentTeamPage / TeamProfilePage / CreateTeamPage                                                                   | team routes                 | team hooks                               | WORKING                                                                                                             |
| HabitHeatmapPage / HabitAnalyticsPage                                                                                | habits routes               | habit hooks                              | WORKING                                                                                                             |
| MarketplacePage / MyItemsPage / TransactionHistoryPage                                                               | marketplace routes          | marketplace hooks                        | WORKING                                                                                                             |
| StudentContentPage (+ ContentForm)                                                                                   | `/student/content`          | useStudentContent                        | WORKING                                                                                                             |
| StudentJournalPage                                                                                                   | `/student/journal`          | journal hooks                            | WORKING                                                                                                             |
| TutorPage (+ ChatPanel, ConversationSidebar, PersonaSelector, TutorStatePanel)                                       | `/student/tutor*`           | tutor hooks                              | WORKING                                                                                                             |
| StudentPortfolio                                                                                                     | `/student/portfolio`        | portfolio hooks                          | WORKING                                                                                                             |
| SurveyResponsePage                                                                                                   | `/student/surveys`          | survey hooks                             | WORKING                                                                                                             |
| OnboardingWizard (+ 9 step files)                                                                                    | `/student/onboarding*`      | onboarding hooks                         | WORKING                                                                                                             |
| AdaptiveQuizSession / PostQuizReview                                                                                 | quiz routes                 | quiz hooks                               | WORKING                                                                                                             |
| MasteryRecoveryPage                                                                                                  | recovery route              | recovery hooks                           | WORKING                                                                                                             |
| ProfileSettingsPage                                                                                                  | `/student/settings/profile` | profile hooks                            | WORKING                                                                                                             |
| ReassessmentPage, XPHistory                                                                                          | resp.                       | hooks                                    | WORKING                                                                                                             |
| **JournalEditor**, **JournalListPage** (`student/journal/`)                                                          | —                           | journal hooks                            | **ORPHAN FILES** — only referenced by their own unit tests; `/student/journal` routes to StudentJournalPage instead |
| **QuizAttemptPage** (`student/quizzes/`)                                                                             | —                           | useParams + hooks                        | **ORPHAN FILE** (not routed; routing uses AdaptiveQuizSession)                                                      |
| CourseCard, ItemCard, KnowledgeQuestsTab, PurchaseConfirmDialog, TeamLeaderboard, tutor sub-panels, onboarding steps | —                           | —                                        | sub-components (not standalone pages)                                                                               |

### Parent

| Page                  | Route                                           | Primary hook(s)                          | Status                   |
| --------------------- | ----------------------------------------------- | ---------------------------------------- | ------------------------ |
| ParentDashboard       | `/parent/dashboard`                             | parent dashboard hooks                   | WORKING                  |
| ParentChildrenPage    | `/parent/children`                              | `useLinkedChildren(user.id)`             | WORKING — scoped (§6 OK) |
| ParentProgressPage    | `/parent/progress`                              | `useLinkedChildren` + `useChildProgress` | WORKING — scoped (§6 OK) |
| ParentAttendancePage  | `/parent/attendance`                            | attendance hooks                         | WORKING                  |
| ParentPlannerView     | `/parent/planner`, `/parent/planner/:studentId` | planner hooks                            | WORKING                  |
| **ParentProfilePage** | —                                               | useAuth only                             | **ORPHAN FILE**          |

### Shared (6 files)

| Page                    | Used by routes                                                                         | Status  |
| ----------------------- | -------------------------------------------------------------------------------------- | ------- |
| ProfilePage             | `/admin/settings/profile`, `/coordinator/settings/profile`, `/parent/settings/profile` | WORKING |
| CalendarView            | teacher/student `calendar`                                                             | WORKING |
| TimetableView           | teacher/student `timetable`                                                            | WORKING |
| OutcomeChainView        | admin/coordinator `outcome-chain`                                                      | WORKING |
| NotificationPreferences | `/student/notification-preferences`                                                    | WORKING |
| SessionManagement       | `/student/sessions`                                                                    | WORKING |

---

## 5. Orphan pages and dead nav links

### Dead nav links

**None.** Every entry in `navItems.ts` maps to a guarded, existing route.

### Dead routes (route exists, unreachable from nav AND not linked by another page)

- `/student/challenges/list` → `ChallengeListPage` (`AppRouter.tsx:798`). The student nav
  `challenges` item points to `/student/challenges` → `ChallengeListView`
  (`navItems.ts` student `challenges`). `ChallengeListPage` is a second, newer, navigable
  list (it links to `/student/challenges/:id`), but no nav item or in-app link targets
  `/challenges/list`. **Two parallel challenge-list implementations exist; the routed-but-unlinked
  one is effectively dead.** [HIGH]

### Orphan page files (component on disk, never imported by router or any component — excluding test-only imports)

Confirmed via import search:

| File                                                        | Note                                                                                                                                                                         |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/pages/admin/settings/AdminProfilePage.tsx`             | superseded by shared ProfilePage at `/admin/settings/profile`                                                                                                                |
| `src/pages/coordinator/settings/CoordinatorProfilePage.tsx` | route uses shared ProfilePage                                                                                                                                                |
| `src/pages/teacher/settings/TeacherProfilePage.tsx`         | **no `/teacher/settings/profile` uses it** — route maps to shared ProfilePage; ProfileDropdown sends teacher to `/teacher/settings/profile` which renders shared ProfilePage |
| `src/pages/parent/settings/ParentProfilePage.tsx`           | route uses shared ProfilePage                                                                                                                                                |
| `src/pages/admin/settings/WellnessXpSettingsPage.tsx`       | not imported anywhere (real hooks, no route)                                                                                                                                 |
| `src/pages/teacher/quizzes/QuizBuilder.tsx`                 | not imported (router uses QuizForm)                                                                                                                                          |
| `src/pages/student/quizzes/QuizAttemptPage.tsx`             | not imported (router uses AdaptiveQuizSession)                                                                                                                               |
| `src/pages/student/journal/JournalEditor.tsx`               | imported only by `journalEditor.test.tsx`                                                                                                                                    |
| `src/pages/student/journal/JournalListPage.tsx`             | imported only by `journalListPage.test.tsx`                                                                                                                                  |

> These are dead code, not user-facing breakage. They inflate bundle/source surface and
> create confusion (two profile-page patterns, two journal patterns, two challenge lists).

---

## 6. Cross-role / scoping spot-check (client-side only; deep RLS audited separately)

**OK (explicit client-side scoping):**

- `useLinkedChildren` scopes to `parent_id = parentId AND verified = true`
  (`src/hooks/useParentDashboard.ts:29-33`). Parent pages pass `user.id`
  (`ParentChildrenPage.tsx:20`, `ParentProgressPage.tsx:94`).
- `ParentProgressPage.useChildProgress` filters `student_id = studentId` and `course_id IN (...)`
  (`ParentProgressPage.tsx:54-67`) — bound to a linked child id.

**Flag (client-side scoping gap — relies on RLS to constrain institution):**

- `useLeagueLeaderboard` (`src/hooks/useLeagueLeaderboard.ts:43-46`) queries
  `student_gamification` with **no institution filter** when `courseId` is absent — it
  orders all rows by `xp_total` and slices top 50 (`:127`). It then fetches `profiles`
  names by id (`:90-95`) and opt-outs (`:101-106`), again with no institution clause.
  The institution scoping for the _thresholds_ is correct (`fetchLeagueThresholds`,
  `:246-258`) but the _member list_ itself is not institution-scoped client-side.
  - **Impact:** if RLS on `student_gamification` / `profiles` does not constrain to the
    caller's institution, a student could see cross-institution names/XP in the global
    league view. This is a defense-in-depth gap; correctness depends entirely on RLS.
    **[MEDIUM]** — RLS effectiveness is **[UNVERIFIED]** here (separate RLS audit).
  - Note: the opt-out handling (`:99-106`, replaces name with "Anonymous") satisfies the
    leaderboard anonymity invariant.

---

## 7. Login / role-redirect verification

Flow: `LoginPage.handleLogin` → `signIn` → on success navigates to `result.redirectTo`
(`LoginPage.tsx:99-118`). `AuthProvider.signIn` computes
`redirectTo = ROLE_DASHBOARD_MAP[profile.role]` (`AuthProvider.tsx:241-243`), with the map:

```
admin → /admin, coordinator → /coordinator, teacher → /teacher,
student → /student, parent → /parent   (AuthProvider.tsx:30-36)
```

Each `/{role}` index route then `<Navigate>`s to `/{role}/dashboard`
(e.g. `AppRouter.tsx:462` admin index, coordinator/teacher/student/parent equivalents).
So every role lands on its dashboard. ✅

- Null role → `redirectTo = "/login"` (`AuthProvider.tsx:243`) and `RouteGuard` would also
  bounce to `/login` (`RouteGuard.tsx:36`). ✅
- Demo + signup paths reuse the same `redirectTo` (`LoginPage.tsx:160-175`, `:140-146`).
- **Mismatch flag:** `RouteGuard.ROLE_DASHBOARD_MAP` uses `/admin/dashboard` (full path,
  `RouteGuard.tsx:6-12`) while `AuthProvider.ROLE_DASHBOARD_MAP` uses `/admin` (index,
  `AuthProvider.tsx:30-36`) and `GlobalHeader.dashboardRouteByRole` uses `/admin`
  (`GlobalHeader.tsx:10-16`). All three resolve to the same dashboard (index redirects),
  but the same map is **duplicated in 3 places** with two different conventions. **[LOW]** —
  drift risk if a role path changes.

---

## 8. Findings (ranked)

### Blocker

- **None.** All role trees are guarded; all nav links resolve; login routes every role correctly.

### High

- **H1 — Duplicate challenge-list implementations; one route is dead.**
  `/student/challenges` → `ChallengeListView`; `/student/challenges/list` → `ChallengeListPage`
  (`AppRouter.tsx:797-798`). The nav only targets the former; the latter is unreachable in-app.
  Two divergent UIs (different tabs: View has Active/Completed; Page adds Upcoming) for the
  same data. Pick one, delete the other, or wire the nav to the intended page.
- **H2 — Orphan page files (9) shipped in source.** `QuizBuilder`, `QuizAttemptPage`,
  `JournalEditor`, `JournalListPage`, `WellnessXpSettingsPage`, and four role-specific
  `*ProfilePage` files are never routed/imported (some only by tests). Risk: maintainers
  edit the wrong file (e.g. fix profile in `TeacherProfilePage` while the live page is
  shared `ProfilePage`). Decide: route them or delete them. (Evidence: import searches in §5.)

### Medium

- **M1 — Coordinator analytics pages are placeholders but fully navigable.**
  `SemesterTrendView` (`/coordinator/trends`) and `CohortComparisonView`
  (`/coordinator/cohort-comparison`) are in the sidebar (`navItems.ts` coordinator
  `trends`, `cohort-comparison`) yet render only static empty states with no data hook
  (`SemesterTrendView.tsx:8,34-36`; `CohortComparisonView.tsx:8,32-34`). Users can click a
  nav item and reach a dead-end "Requires …" card. Either hide the nav items until the
  backing views/tables exist, or implement the hooks.
- **M2 — Leaderboard member list not institution-scoped client-side.**
  `useLeagueLeaderboard` selects all `student_gamification` rows with no institution filter
  (`useLeagueLeaderboard.ts:43-46,127`). Correctness depends entirely on RLS. Add an explicit
  `institution_id` constraint (via RPC or a join on `profiles.institution_id`) as
  defense-in-depth. RLS coverage **[UNVERIFIED]** in this audit.

### Low

- **L1 — `ROLE_DASHBOARD_MAP` duplicated 3× with two conventions.**
  `RouteGuard.tsx:6-12` (`/admin/dashboard`) vs `AuthProvider.tsx:30-36` (`/admin`) vs
  `GlobalHeader.tsx:10-16` (`/admin`). Functionally equivalent today; extract one shared
  constant to prevent drift.
- **L2 — `ReportGeneratorPage` semester selector is a documented stub.**
  Uses the programs query as a stand-in for semesters (`ReportGeneratorPage.tsx:23`).
  Low user impact but flagged as incomplete wiring.
- **L3 — Admin "courses" and several admin tools have no sidebar entry.**
  `/admin/courses*`, `/admin/onboarding/pending`, `/admin/import`, `/admin/graduate-attributes`,
  `/admin/competency-frameworks`, `/admin/historical-evidence`, `/admin/outcome-chain` exist
  and are guarded but absent from `adminNavItems` (`navItems.ts:80-97`). If these are meant to
  be reachable only via deep links/other pages, fine; otherwise they are discoverability gaps.
  **[UNVERIFIED]** whether intentional.

---

## 9. Summary

- Routing/guards are sound: all five role subtrees are wrapped exactly once by `RouteGuard`
  with the correct single role; public routes are intentionally open; catch-all → `/login`.
- No misrouted/wrong-role routes and no dead nav links were found.
- Login redirect sends each role to its dashboard correctly via `ROLE_DASHBOARD_MAP`
  (with that map duplicated in 3 files — L1).
- Two real defects worth fixing pre-deploy: the duplicate/dead student challenge list (H1)
  and 9 orphan page files that risk maintainer confusion (H2).
- Two coordinator nav items lead to placeholder dead-ends (M1).
- One client-side scoping gap in the league leaderboard depends on RLS for institution
  isolation (M2); RLS itself is out of scope here.
