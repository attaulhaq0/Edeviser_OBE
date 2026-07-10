# Coverage Matrix — UI Prototype Migration

> **Companion to** `requirements.md` (R16 full coverage, R9 parity gate) and `design.md`
> (§2 prototype→production mapping, §15 coverage model & page archetypes).
> **Purpose:** prove _no screen is left behind_. Every production route is listed once and
> classified so there is zero ambiguity about which screens match the prototype exactly and
> which are re-skinned from the design system.

## How to read this matrix

Ground truth = `src/router/AppRouter.tsx` (every `<Route>`), `src/router/RouteGuard.tsx`
(role guards), `src/lib/navItems.ts` (per-role nav). This matrix enumerates **every** route
that renders a screen. `index` routes that only `Navigate` to a dashboard, and the root `/`

- catch-all `*` redirects, are listed under "System routes" (no UI to migrate).

### Reference class

| Class   | Meaning                                                                                                                                              | Gate                                                                            |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| **P**   | **Prototype-referenced (1:1).** A prototype page mocks this exact screen.                                                                            | Match the mock — **visual parity** (R16.2) + functional parity.                 |
| **P\*** | **Prototype-referenced (pattern).** A prototype page establishes the visual language for this screen type, but this exact screen was not mocked 1:1. | Apply the referenced page's language via the archetype; functional parity.      |
| **D**   | **Design-system-derived.** No prototype reference. Composed from P0 primitives + the matching archetype.                                             | **Functional parity** (R16.3); consistency with the archetype; no legacy style. |

Both **P** and **D** pass the **same** downstream gates (R16.5): en+ar (LTR/RTL), light+dark,
a11y (axe/keyboard), performance ≥ baseline, regression row green, behind a feature flag.

### Archetype (see design.md §15)

`Dashboard` · `List` (index/browse) · `Table` (management CRUD) · `Form` (create/edit) ·
`Detail` (entity) · `Wizard` (stepper) · `Focus` (full-screen, no chrome) · `Analytics`
(filters + charts/report) · `Settings` (sectioned cards + toggles) · `State-templates`
(shimmer/empty/error — cross-cutting, applies to every row).

### Reuse data (existing hooks) — honesty rule

The "Reuse data" column names the **existing** data domain each screen already consumes.
Per **R16.6**, the exact hook is confirmed by reading the production page _first_, at build
time; this column is domain-level guidance, not a contract. **No new backend** (R1): screens
keep their current hooks/mutations (audit + invalidation already handled). Hook names drawn
from `design.md §2` where already established there.

### Prototype design-reference inventory

40 page mocks exist in `prototype/`. **Demo-only, never migrated:** `index.html`,
`start.html`, `roles.html` (navigation aids for the clickable demo). **Never ship into
`src/`:** `shared.css`, `shared.js`, CDN Tailwind, emoji nav (R15.2).

---

## System routes (no screen — redirects only)

| Route             | Behavior                                     | Migration action                                                                                                                                 |
| ----------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/`               | `Navigate → /login`                          | Keep verbatim.                                                                                                                                   |
| `*` (catch-all)   | `Navigate → /login`                          | Keep, unless the reviewed **404 decision** (R3.4) adds a `NotFoundPage`; if added, unauth `*`→`/login` stays, authed-unknown shows 404 in-shell. |
| `/{role}` (index) | `Navigate → /{role}/dashboard` (all 5 roles) | Keep verbatim (no UI).                                                                                                                           |

---

## 0. Public / unauthenticated routes

| Route                    | Component            | Class   | Archetype       | Reuse data (existing)     | Notes / preservation                                                                                                                                       |
| ------------------------ | -------------------- | ------- | --------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/login`                 | `LoginPage`          | **P**   | Form (auth)     | `useAuth().signIn`        | `auth.html`. **Preserve auth background exactly** (R6.1): dark gradient + doodle overlay + logo + `bg-white/95` card. Login logic via `useAuth` only (R5). |
| `/signup`                | `SignUpPage`         | **P**   | Form (auth)     | `useAuth().signUp`        | `auth.html`. Self-signup forced `role=student` (server trigger) — no role picker the backend ignores (R5.4).                                               |
| `/reset-password`        | `ResetPasswordPage`  | **P**   | Form (auth)     | `useAuth().resetPassword` | `auth.html` family. Same auth background.                                                                                                                  |
| `/update-password`       | `UpdatePasswordPage` | **P**   | Form (auth)     | `useAuth()`               | `auth.html` family. Same auth background.                                                                                                                  |
| `/accept-invite/:token`  | `AcceptInvitePage`   | **P\*** | Form (auth)     | invite-acceptance hook    | Auth-styled via `auth.html`; token flow not mocked 1:1.                                                                                                    |
| `/portfolio/:student_id` | `PublicPortfolio`    | **D**   | Detail (public) | portfolio hooks           | Unauthenticated public view; no chrome. `profile.html` informs card styling only.                                                                          |
| `/terms`                 | `TermsPage`          | **D**   | Static (prose)  | —                         | Legal prose; design-system typography + shell-less container.                                                                                              |
| `/privacy`               | `PrivacyPage`        | **D**   | Static (prose)  | —                         | Legal prose.                                                                                                                                               |

---

## 1. Admin (`/admin/*`, guard `admin`, `AdminLayout`)

| Route                          | Component                     | Class   | Archetype           | Reuse data (existing)                       | Notes                                                                                                   |
| ------------------------------ | ----------------------------- | ------- | ------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `dashboard`                    | `AdminDashboard`              | **P**   | Dashboard           | `useAdminDashboardAggregate`                | `admin-dashboard.html`.                                                                                 |
| `users`                        | `UserListPage`                | **P**   | Table               | `useUsers`, `useInviteUsers`                | `admin-users.html`.                                                                                     |
| `users/new`                    | `UserForm`                    | **D**   | Form                | users mutations                             | `auth.html` form styling ref.                                                                           |
| `users/:id/edit`               | `UserForm`                    | **D**   | Form                | users mutations                             |                                                                                                         |
| `users/import`                 | `BulkImportPage`              | **D**   | Wizard              | bulk-import hooks                           | Stepper + validation preview.                                                                           |
| `users/invite`                 | `InviteUsersPage`             | **D**   | Form                | invite hooks                                |                                                                                                         |
| `users/invite-parent`          | `ParentInvitePage`            | **D**   | Form                | parent-invite hooks                         |                                                                                                         |
| `programs`                     | `ProgramListPage`             | **D**   | List/Table          | programs hooks                              |                                                                                                         |
| `programs/new`                 | `ProgramForm`                 | **D**   | Form                | programs mutations                          |                                                                                                         |
| `programs/:id/edit`            | `ProgramForm`                 | **D**   | Form                | programs mutations                          |                                                                                                         |
| `outcomes`                     | `ILOListPage`                 | **P\*** | List                | ILO hooks                                   | Pattern: `coordinator-outcomes.html` (outcome-list language).                                           |
| `outcomes/new`                 | `ILOForm`                     | **D**   | Form                | ILO mutations                               |                                                                                                         |
| `outcomes/:id/edit`            | `ILOForm`                     | **D**   | Form                | ILO mutations                               |                                                                                                         |
| `audit-log`                    | `AuditLogPage`                | **P\*** | Table/Analytics     | `useAuditLogs`                              | Pattern: `admin-governance.html` (AI action audit-log styling). Read-only.                              |
| `bonus-events`                 | `BonusXPEventManager`         | **D**   | Table               | bonus-event hooks                           | Gamification economy admin.                                                                             |
| `courses`                      | `CourseListPage`              | **D**   | List/Table          | courses hooks                               |                                                                                                         |
| `courses/new`                  | `CourseForm`                  | **D**   | Form                | courses mutations                           |                                                                                                         |
| `courses/:id/edit`             | `CourseForm`                  | **D**   | Form                | courses mutations                           |                                                                                                         |
| `courses/:courseId/enrollment` | `CourseEnrollmentPage`        | **D**   | Table               | enrollment hooks                            | Roster management.                                                                                      |
| `semesters`                    | `SemesterManager`             | **D**   | Table               | semester hooks                              |                                                                                                         |
| `departments`                  | `DepartmentManager`           | **D**   | Table               | department hooks                            |                                                                                                         |
| `onboarding/pending`           | `PendingOnboardingPage`       | **D**   | List/Table          | onboarding-queue hooks                      |                                                                                                         |
| `reports`                      | `ReportGeneratorPage`         | **P**   | Analytics           | `useAdminDashboard`, `useVisualizationData` | `admin-analytics.html`.                                                                                 |
| `calendar`                     | `AcademicCalendarManager`     | **P\*** | Table/Calendar      | academic-calendar hooks                     | Pattern: `calendar.html` (admin management variant).                                                    |
| `timetable`                    | `TimetableManager`            | **D**   | Table/Grid          | timetable hooks                             | Shared with coordinator.                                                                                |
| `fees`                         | `FeeManager`                  | **D**   | Table               | fees hooks                                  |                                                                                                         |
| `import`                       | `DataImportPage`              | **D**   | Wizard              | data-import hooks                           |                                                                                                         |
| `surveys`                      | `SurveyManager`               | **D**   | Table               | survey hooks                                |                                                                                                         |
| `surveys/results`              | `SurveyResultsPage`           | **D**   | Analytics           | survey-results hooks                        |                                                                                                         |
| `graduate-attributes`          | `GraduateAttributeManager`    | **D**   | Table               | GA hooks                                    |                                                                                                         |
| `competency-frameworks`        | `CompetencyFrameworkManager`  | **D**   | Table               | competency hooks                            |                                                                                                         |
| `historical-evidence`          | `HistoricalEvidenceDashboard` | **D**   | Analytics           | historical-evidence hooks                   |                                                                                                         |
| `outcome-chain`                | `OutcomeChainView`            | **D**   | Analytics           | `useOutcomeChain`                           | Shared with coordinator (same component).                                                               |
| `badges/spotlight`             | `BadgeSpotlightManager`       | **D**   | Table               | badge hooks                                 |                                                                                                         |
| `marketplace`                  | `MarketplaceManagementPage`   | **D**   | Table               | marketplace-admin hooks                     | `marketplace.html` informs item-card styling only (student-facing).                                     |
| `marketplace/sales`            | `SaleEventManager`            | **D**   | Table               | sale-event hooks                            |                                                                                                         |
| `marketplace/analytics`        | `MarketplaceAnalyticsPage`    | **P\*** | Analytics           | `useMarketplaceAnalytics`                   | Pattern: `admin-analytics.html`.                                                                        |
| `marketplace/quests`           | `KnowledgeQuestManager`       | **D**   | Table               | quest hooks                                 |                                                                                                         |
| `marketplace/economist`        | `XPEconomistDashboard`        | **D**   | Analytics/Dashboard | XP-economy hooks                            |                                                                                                         |
| `settings/profile`             | `ProfilePage`                 | **P**   | Settings            | profile hooks                               | `admin-profile.html` / `profile.html`. Shared `ProfilePage`.                                            |
| `settings/institution`         | `InstitutionSettingsPage`     | **P\*** | Settings            | `useInstitutionSettings`                    | Pattern: `settings.html`. AI-governance framing = existing settings/audit only, no new backend (R17.4). |

---

## 2. Coordinator (`/coordinator/*`, guard `coordinator`, `CoordinatorLayout`)

| Route               | Component              | Class   | Archetype       | Reuse data (existing)                     | Notes                                                    |
| ------------------- | ---------------------- | ------- | --------------- | ----------------------------------------- | -------------------------------------------------------- |
| `dashboard`         | `CoordinatorDashboard` | **P**   | Dashboard       | `useCoordinatorDashboardAggregate`        | `coordinator-dashboard.html`.                            |
| `plos`              | `PLOListPage`          | **P**   | List            | `usePLOs`                                 | `coordinator-outcomes.html`.                             |
| `plos/new`          | `PLOForm`              | **D**   | Form            | PLO mutations                             |                                                          |
| `plos/:id/edit`     | `PLOForm`              | **D**   | Form            | PLO mutations                             |                                                          |
| `matrix`            | `CurriculumMatrixPage` | **P**   | Analytics       | `useCurriculumMatrix`                     | `coordinator-curriculum.html`.                           |
| `cqi`               | `CQIManager`           | **P\*** | Table/Analytics | `useCQIPlans`                             | Pattern: `coordinator-accreditation.html`.               |
| `course-file`       | `CourseFileGenerator`  | **P\*** | Wizard/Report   | `useCourseFile`, `useAccreditationReport` | Pattern: `coordinator-accreditation.html`.               |
| `sankey`            | `SankeyDiagramView`    | **D**   | Analytics       | visualization hooks                       | Outcome-flow sankey.                                     |
| `gap-analysis`      | `GapAnalysisView`      | **P\*** | Analytics       | gap-analysis hooks                        | Pattern: `coordinator-curriculum.html` (curriculum-gap). |
| `coverage-heatmap`  | `CoverageHeatmapView`  | **P\*** | Analytics       | `useAdminPLOHeatmap`                      | Pattern: `coordinator-curriculum.html`.                  |
| `trends`            | `SemesterTrendView`    | **D**   | Analytics       | trend hooks                               |                                                          |
| `cohort-comparison` | `CohortComparisonView` | **D**   | Analytics       | cohort hooks                              |                                                          |
| `outcome-chain`     | `OutcomeChainView`     | **D**   | Analytics       | `useOutcomeChain`                         | Shared with admin.                                       |
| `timetable`         | `TimetableManager`     | **D**   | Table/Grid      | timetable hooks                           | Shared with admin.                                       |
| `settings/profile`  | `ProfilePage`          | **P**   | Settings        | profile hooks                             | `coordinator-profile.html`.                              |

---

## 3. Teacher (`/teacher/*`, guard `teacher`, `TeacherLayout`)

| Route                                            | Component                    | Class   | Archetype     | Reuse data (existing)                                                        | Notes                                                                            |
| ------------------------------------------------ | ---------------------------- | ------- | ------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `dashboard`                                      | `TeacherDashboard`           | **P**   | Dashboard     | `useTeacherDashboardAggregate`, `useAtRiskPredictions`, `useAIFeedbackDraft` | `teacher-dashboard.html`.                                                        |
| `clos`                                           | `CLOListPage`                | **P\*** | List          | CLO hooks                                                                    | Pattern: `coordinator-outcomes.html`.                                            |
| `clos/new`                                       | `CLOForm`                    | **D**   | Form          | CLO mutations                                                                |                                                                                  |
| `clos/:id/edit`                                  | `CLOForm`                    | **D**   | Form          | CLO mutations                                                                |                                                                                  |
| `clos/:id`                                       | `CLODetailPage`              | **D**   | Detail        | CLO hooks                                                                    |                                                                                  |
| `clos/:cloId/sub-clos`                           | `SubCLOManager`              | **D**   | Table         | sub-CLO hooks                                                                |                                                                                  |
| `outcomes/sub-clos`                              | `SubCLOManager`              | **D**   | Table         | sub-CLO hooks                                                                | Same component, alt path.                                                        |
| `rubrics`                                        | `RubricListPage`             | **D**   | List          | rubric hooks                                                                 |                                                                                  |
| `rubrics/new`                                    | `RubricBuilder`              | **D**   | Wizard/Form   | rubric mutations                                                             | Criteria builder.                                                                |
| `rubrics/:id/edit`                               | `RubricBuilder`              | **D**   | Wizard/Form   | rubric mutations                                                             |                                                                                  |
| `assignments`                                    | `AssignmentListPage`         | **D**   | List          | assignment hooks                                                             | `assignment.html` is the _student_ detail; teacher list is derived.              |
| `assignments/new`                                | `AssignmentForm`             | **D**   | Form          | assignment mutations                                                         |                                                                                  |
| `assignments/:id/edit`                           | `AssignmentForm`             | **D**   | Form          | assignment mutations                                                         |                                                                                  |
| `grading`                                        | `GradingQueuePage`           | **P**   | List/Table    | `useGrades`, `useGradebook`                                                  | `teacher-grading.html`.                                                          |
| `grading/:submissionId`                          | `GradingInterface`           | **P**   | Detail        | `useGrades`, `useAIFeedbackDraft`                                            | `teacher-grading.html`. AI feedback draft = existing hook (R17).                 |
| `gradebook`                                      | `GradebookView`              | **P\*** | Table         | `useGradebook`                                                               | Pattern: `teacher-students.html` / `teacher-grading.html`.                       |
| `baseline`                                       | `BaselineCoursesListPage`    | **D**   | List          | baseline hooks                                                               |                                                                                  |
| `baseline/:courseId`                             | `BaselineResultsPage`        | **D**   | Analytics     | baseline-results hooks                                                       |                                                                                  |
| `baseline/:courseId/config`                      | `BaselineConfigPage`         | **D**   | Form/Settings | baseline-config hooks                                                        |                                                                                  |
| `baseline/:courseId/questions/new`               | `BaselineQuestionForm`       | **D**   | Form          | baseline mutations                                                           |                                                                                  |
| `courses/:courseId/generate-questions`           | `GenerateQuestionsPage`      | **P**   | Wizard        | `useGenerateQuestions`                                                       | `teacher-curriculum.html` (AI Curriculum Studio). Draft→teacher-approve (R17.3). |
| `courses/:courseId/review-queue`                 | `ReviewQueuePage`            | **P\*** | List/Table    | review-queue hooks                                                           | Pattern: `teacher-curriculum.html`. Human-in-the-loop approve.                   |
| `courses/:courseId/question-bank`                | `QuestionBankPage`           | **P\*** | Table         | question-bank hooks                                                          | Pattern: `teacher-curriculum.html`.                                              |
| `courses/:courseId/question-analytics`           | `QuestionAnalyticsDashboard` | **D**   | Analytics     | question-analytics hooks                                                     |                                                                                  |
| `courses/:courseId/quiz-clo-correlation/:quizId` | `QuizCLOCorrelationPage`     | **D**   | Analytics     | correlation hooks                                                            |                                                                                  |
| `courses/:courseId/quizzes/new`                  | `QuizForm`                   | **D**   | Form          | quiz mutations                                                               |                                                                                  |
| `courses/:courseId/quizzes/:id/edit`             | `QuizForm`                   | **D**   | Form          | quiz mutations                                                               |                                                                                  |
| `courses/:courseId/explanation-review`           | `ExplanationReviewPage`      | **P\*** | List/Table    | explanation-review hooks                                                     | Pattern: `teacher-curriculum.html`.                                              |
| `announcements`                                  | `AnnouncementEditor`         | **D**   | Form/Editor   | announcement mutations                                                       |                                                                                  |
| `modules`                                        | `ModuleManager`              | **P\*** | Table/Builder | `useCourseModules`                                                           | Pattern: `teacher-curriculum.html`.                                              |
| `courses/:courseId/discussions`                  | `DiscussionModeration`       | **D**   | Table/List    | discussion hooks                                                             |                                                                                  |
| `courses/:courseId/discussions/:threadId`        | `ThreadDetail`               | **D**   | Detail        | thread hooks                                                                 | Shared thread view.                                                              |
| `attendance`                                     | `AttendanceMarker`           | **D**   | Table         | attendance hooks                                                             |                                                                                  |
| `attendance/report`                              | `AttendanceReport`           | **D**   | Analytics     | attendance-report hooks                                                      |                                                                                  |
| `teams`                                          | `TeamManagementPage`         | **D**   | List/Table    | team hooks                                                                   | `team.html` (student) informs team-card styling.                                 |
| `teams/manage`                                   | `TeamManager`                | **D**   | Table         | team hooks                                                                   |                                                                                  |
| `teams/new`                                      | `TeamFormPage`               | **D**   | Form          | team mutations                                                               |                                                                                  |
| `teams/:id/edit`                                 | `TeamFormPage`               | **D**   | Form          | team mutations                                                               |                                                                                  |
| `team-health`                                    | `TeamHealthReportPage`       | **D**   | Analytics     | team-health hooks                                                            |                                                                                  |
| `challenges`                                     | `TeacherChallengeListPage`   | **D**   | List          | challenge hooks                                                              |                                                                                  |
| `challenges/new`                                 | `ChallengeFormPage`          | **D**   | Form          | challenge mutations                                                          |                                                                                  |
| `challenges/:id/edit`                            | `ChallengeFormPage`          | **D**   | Form          | challenge mutations                                                          |                                                                                  |
| `tutor-analytics`                                | `TutorAnalyticsPage`         | **D**   | Analytics     | tutor-analytics hooks                                                        |                                                                                  |
| `tutor-handoffs`                                 | `TeacherHandoffPage`         | **D**   | List/Table    | handoff hooks                                                                |                                                                                  |
| `content-review`                                 | `ContentReviewPage`          | **P\*** | List/Table    | content-review hooks                                                         | Pattern: `teacher-curriculum.html`.                                              |
| `calendar`                                       | `CalendarView`               | **P**   | Calendar      | calendar hooks                                                               | `calendar.html` (shared component).                                              |
| `timetable`                                      | `TimetableView`              | **D**   | Grid          | timetable hooks                                                              | Shared component.                                                                |
| `settings/profile`                               | `ProfilePage`                | **P**   | Settings      | profile hooks                                                                | `teacher-profile.html`.                                                          |

---

## 4. Student (`/student/*`, guard `student`, `StudentLayout` — onboarding gate)

> **Layout preservation (R5.3):** `StudentLayout` short-circuits to `OnboardingWizard`
> (isDay1) while `profile.onboarding_completed === false`. The redesigned layout MUST
> reproduce this gate before the shell renders.

| Route                                     | Component                       | Class   | Archetype           | Reuse data (existing)                                | Notes                                                                       |
| ----------------------------------------- | ------------------------------- | ------- | ------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------- |
| `dashboard`                               | `StudentDashboard`              | **P**   | Dashboard           | `useStudentDashboardAggregate`, `useStreak`, `useXP` | `dashboard.html` (Today/gap→action).                                        |
| `today`                                   | `TodayViewPage`                 | **P**   | Dashboard/List      | `useReviewQueue`, `useLearningPath`                  | `dashboard.html` + `review.html` (today plan).                              |
| `courses`                                 | `StudentCoursesListPage`        | **P**   | List                | courses hooks                                        | `learn.html` / `course.html`.                                               |
| `courses/:courseId`                       | `StudentCourseDetail`           | **P**   | Detail              | `useLearningPath`, `useCLOProgress`                  | `course.html` / `path.html`.                                                |
| `courses/:courseId/materials/:materialId` | `StudentCourseDetail`           | **P**   | Detail              | course-material hooks                                | `course.html`. Same component, material-focused.                            |
| `assignments`                             | `StudentAssignmentListPage`     | **P\*** | List                | assignment hooks                                     | Pattern: `learn.html` / `assignment.html`.                                  |
| `assignments/:id`                         | `StudentAssignmentDetailPage`   | **P**   | Detail              | assignment hooks                                     | `assignment.html`.                                                          |
| `leaderboard`                             | `LeaderboardPage`               | **P**   | List                | `useLeaderboard`, `useLeagueLeaderboard`             | `leaderboard.html`. Respect anonymous opt-out.                              |
| `onboarding`                              | `OnboardingWizardPage`          | **P**   | Wizard              | `useOnboarding`                                      | `learning-profile.html`.                                                    |
| `onboarding/complete-profile`             | `CompleteProfilePage`           | **P\*** | Wizard/Form         | onboarding hooks                                     | Pattern: `learning-profile.html`.                                           |
| `tutor`                                   | `TutorPage`                     | **P**   | Focus/Chat          | `useTutorConversations/Messages/Autonomy`            | `tutor.html`. Surface L1/L2/L3 autonomy + personas (existing hooks, R17.1). |
| `tutor/:conversationId`                   | `TutorPage`                     | **P**   | Focus/Chat          | tutor hooks                                          | `tutor.html`.                                                               |
| `progress`                                | `StudentProgressPage`           | **P**   | Analytics           | `useStudentProgress`, `useOutcomeChain`              | `progress.html`.                                                            |
| `journal`                                 | `StudentJournalPage`            | **P**   | Detail/Editor       | `useJournal`, `useReflectionTemplates`               | `journal.html`.                                                             |
| `marketplace`                             | `StudentMarketplacePage`        | **P**   | List                | `useMarketplace`, `useInventory`                     | `marketplace.html`.                                                         |
| `marketplace/my-items`                    | `StudentMyItemsPage`            | **P\*** | List                | `useInventory`                                       | Pattern: `marketplace.html`.                                                |
| `marketplace/history`                     | `StudentTransactionHistoryPage` | **D**   | Table/List          | transaction hooks                                    |                                                                             |
| `team`                                    | `StudentTeamPage`               | **P**   | Detail/Dashboard    | `useTeams`, `useTeamHealth`                          | `team.html`.                                                                |
| `teams/:teamId`                           | `TeamProfilePage`               | **P\*** | Detail              | team hooks                                           | Pattern: `team.html`.                                                       |
| `teams/new`                               | `CreateTeamPage`                | **D**   | Form                | team mutations                                       |                                                                             |
| `quizzes/:quizId/adaptive`                | `AdaptiveQuizSession`           | **P**   | Focus               | `useAdaptiveQuiz`, `useMicroAssessments`             | `lesson.html` (learn loop). Full-screen.                                    |
| `quizzes/:quizId/review/:attemptId`       | `PostQuizReview`                | **P**   | Focus               | quiz-review hooks                                    | `review.html`.                                                              |
| `courses/:courseId/recovery/:cloId`       | `MasteryRecoveryPage`           | **P\*** | Focus               | recovery hooks                                       | Pattern: `review.html` / `lesson.html`.                                     |
| `habits`                                  | `HabitHeatmapPage`              | **P\*** | Analytics/Dashboard | habit hooks                                          | Pattern: `dashboard.html` habit strip / `progress.html`.                    |
| `habits/analytics`                        | `HabitAnalyticsPage`            | **D**   | Analytics           | habit-analytics hooks                                |                                                                             |
| `planner`                                 | `WeeklyPlannerPage`             | **P\*** | Analytics/Planner   | planner hooks                                        | Pattern: `path.html` / `calendar.html`.                                     |
| `planner/starter-week`                    | `StarterWeekPlanPage`           | **D**   | Wizard              | planner hooks                                        |                                                                             |
| `xp-history`                              | `XPHistory`                     | **P\*** | Analytics/List      | `useXP`                                              | Pattern: `progress.html`.                                                   |
| `portfolio`                               | `StudentPortfolio`              | **P\*** | Detail              | portfolio hooks                                      | Pattern: `profile.html` (portfolio concept).                                |
| `challenges`                              | `ChallengeListView`             | **D**   | List                | challenge hooks                                      |                                                                             |
| `challenges/list`                         | `ChallengeListPage`             | **D**   | List                | challenge hooks                                      |                                                                             |
| `challenges/:id`                          | `ChallengeDetailPage`           | **D**   | Detail              | challenge hooks                                      |                                                                             |
| `content`                                 | `StudentContentPage`            | **D**   | List/Table          | content hooks                                        | De-emphasized "My Content" nav item.                                        |
| `surveys`                                 | `SurveyResponsePage`            | **D**   | Form/Wizard         | survey-response hooks                                | Conditional nav (count > 0).                                                |
| `announcements/:announcementId`           | `StudentAnnouncementDetail`     | **D**   | Detail              | announcement hooks                                   |                                                                             |
| `courses/:courseId/discussions`           | `DiscussionForum`               | **D**   | List/Table          | discussion hooks                                     |                                                                             |
| `courses/:courseId/discussions/:threadId` | `ThreadDetail`                  | **D**   | Detail              | thread hooks                                         | Shared thread view.                                                         |
| `calendar`                                | `CalendarView`                  | **P**   | Calendar            | calendar hooks                                       | `calendar.html` (shared component).                                         |
| `timetable`                               | `TimetableView`                 | **D**   | Grid                | timetable hooks                                      | Shared component.                                                           |
| `settings/profile`                        | `ProfileSettingsPage`           | **P**   | Settings            | `useStudentProfile`, `useAccessibilityPreferences`   | `profile.html` / `settings.html`.                                           |
| `settings/reassessment`                   | `ReassessmentPage`              | **D**   | Wizard/Form         | reassessment hooks                                   |                                                                             |
| `notification-preferences`                | `NotificationPreferences`       | **P\*** | Settings            | `useNotificationPreferences`                         | Pattern: `settings.html`. Shared component.                                 |
| `sessions`                                | `SessionManagement`             | **P\*** | Settings/Table      | session hooks                                        | Pattern: `settings.html`. Shared component.                                 |

### Student focus mode (outside `StudentLayout`)

| Route                       | Component       | Class | Archetype | Reuse data          | Notes                                                                                                          |
| --------------------------- | --------------- | ----- | --------- | ------------------- | -------------------------------------------------------------------------------------------------------------- |
| `/student/focus/:sessionId` | `FocusModePage` | **P** | Focus     | focus-session hooks | `lesson.html`. **Preserve: renders OUTSIDE the student shell** (R3.3). Migrate as standalone full-screen page. |

---

## 5. Parent (`/parent/*`, guard `parent`, `ParentLayout`)

> Framing: growth/wellbeing, **no raw grades** — use existing parent hooks only.

| Route                | Component              | Class   | Archetype         | Reuse data (existing)                               | Notes                                                      |
| -------------------- | ---------------------- | ------- | ----------------- | --------------------------------------------------- | ---------------------------------------------------------- |
| `dashboard`          | `ParentDashboard`      | **P**   | Dashboard         | `useParentDashboardAggregate`                       | `parent-dashboard.html`.                                   |
| `children`           | `ParentChildrenPage`   | **P\*** | List              | parent-children hooks                               | Pattern: `parent-dashboard.html` / `parent-progress.html`. |
| `progress`           | `ParentProgressPage`   | **P**   | Analytics         | `useParentDashboard`, `useStudentProgress` (linked) | `parent-progress.html`.                                    |
| `attendance`         | `ParentAttendancePage` | **D**   | Analytics         | parent-attendance hooks                             |                                                            |
| `planner`            | `ParentPlannerView`    | **P\*** | Analytics/Planner | `usePlannerTasks`                                   | Pattern: `parent-support.html`.                            |
| `planner/:studentId` | `ParentPlannerView`    | **P\*** | Analytics/Planner | planner hooks                                       | Same component, per-child.                                 |
| `profile`            | `ParentProfilePage`    | **P**   | Settings          | profile hooks                                       | `parent-profile.html`.                                     |
| `settings/profile`   | `ParentProfilePage`    | **P**   | Settings          | profile hooks                                       | Same component, alt path.                                  |

---

## 6. Shared components reused across roles

Restyle **once**, benefit everywhere (do not fork per role):

| Component                 | Used by                     | Class                     | Notes                      |
| ------------------------- | --------------------------- | ------------------------- | -------------------------- |
| `CalendarView`            | teacher, student            | **P** (`calendar.html`)   | Same component both roles. |
| `TimetableView`           | teacher, student            | **D**                     | Grid archetype.            |
| `TimetableManager`        | admin, coordinator          | **D**                     | Management grid.           |
| `OutcomeChainView`        | admin, coordinator          | **D**                     | Analytics/visualization.   |
| `ProfilePage`             | admin, coordinator, teacher | **P** (`*-profile.html`)  | Shared settings page.      |
| `NotificationPreferences` | student (+ any linker)      | **P\*** (`settings.html`) | Settings archetype.        |
| `SessionManagement`       | student                     | **P\*** (`settings.html`) | Settings/Table.            |
| `ThreadDetail`            | teacher, student            | **D**                     | Shared discussion thread.  |
| `SubCLOManager`           | teacher (2 paths)           | **D**                     | Management table.          |

Cross-cutting **State-templates** (shimmer / `EmptyState` ~40 variants / error) apply to
**every** row above (R9.2) — loading uses `animate-shimmer`/`DataTable` skeleton, empty uses
shared `EmptyState`, never full-page spinners.

---

## 7. Summary

| Scope             | Screen routes         | P      | P\*    | D      |
| ----------------- | --------------------- | ------ | ------ | ------ |
| Public            | 8                     | 4      | 1      | 3      |
| Admin             | 41                    | 4      | 5      | 32     |
| Coordinator       | 15                    | 4      | 4      | 7      |
| Teacher           | 48                    | 5      | 7      | 36     |
| Student (+ focus) | 44                    | 19     | 11     | 14     |
| Parent            | 8                     | 4      | 3      | 1      |
| **Total**         | **164 screen routes** | **40** | **31** | **93** |

> Counts are derived from the tables above and exclude the 5 `index` redirects and the `/`
>
> - `*` redirects (no UI). They are the classification at spec time; the P3 build confirms
>   each row (R16.6) and the P-final cleanup verifies none were missed. **71 of 164 screens
>   (~43%) carry a direct prototype reference (P or P\*); 93 (~57%) are design-system-derived**
>   — which is exactly why the archetype library (§15) is authored in P0 _before_ module
>   migration.

### Reading the split honestly

- The **student** experience is the most prototype-covered (flagship flows were mocked), so
  it will look closest to the prototype 1:1.
- **Admin** is mostly **derived** (CRUD tables, forms, management screens the prototype never
  drew). These will be _consistent with_ the prototype's design language via the Table/Form/
  Analytics archetypes — not literal copies of a mock, because no mock exists.
- Every **D** row still lands on the new design system (R16.1). "Derived" never means "left on
  the old UI."

---

## 8. Gate & guardrail reminders (per row)

Before any row's flag flips on (design.md §14 Definition of Done):

1. **Visual** — P/P\* match the referenced mock; D matches its archetype.
2. **Functional parity** — same data, actions, mutations, permissions, empty/loading/error.
3. **i18n** — en (LTR) + ar (RTL), logical CSS props, keys in both locale files.
4. **Theme** — light + dark.
5. **a11y** — axe/keyboard/focus/≥44px/`prefers-reduced-motion`.
6. **Perf** — route bundle + TTI ≥ baseline; still lazy; no CDN Tailwind.
7. **Behind a feature flag**; old component stays until parity signed off (R13.2).

### Route-structure invariants (never change while migrating)

- No `to`/path renames (bookmarks) — label changes are i18n-only.
- Guards + `allowedRoles` unchanged (R4); RLS is the real boundary.
- `/student/focus/:sessionId` stays **outside** `StudentLayout`.
- `StudentLayout` onboarding gate preserved.
- 404 behavior (`*`→`/login`) is an explicit reviewed decision (R3.4).
- No backend/hook/queryKeys/edge/RLS edits (R1); new _aggregate_ hooks only, following the
  standard pattern, reusing `queryKeys`.
