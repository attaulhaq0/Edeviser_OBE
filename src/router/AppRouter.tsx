import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import RouteGuard from "@/router/RouteGuard";
import ErrorBoundary from "@/components/shared/ErrorBoundary";

// ---------------------------------------------------------------------------
// Public pages (no auth required)
// ---------------------------------------------------------------------------
const LoginPage = lazy(() => import("@/pages/LoginPage"));
const ResetPasswordPage = lazy(() => import("@/pages/ResetPasswordPage"));
const UpdatePasswordPage = lazy(() => import("@/pages/UpdatePasswordPage"));
const SignUpPage = lazy(() => import("@/pages/auth/SignUpPage"));
const AcceptInvitePage = lazy(() => import("@/pages/auth/AcceptInvitePage"));

// ---------------------------------------------------------------------------
// Role layouts (lazy-loaded for code splitting)
// ---------------------------------------------------------------------------
const AdminLayout = lazy(() => import("@/pages/admin/AdminLayout"));
const CoordinatorLayout = lazy(
  () => import("@/pages/coordinator/CoordinatorLayout")
);
const TeacherLayout = lazy(() => import("@/pages/teacher/TeacherLayout"));
const StudentLayout = lazy(() => import("@/pages/student/StudentLayout"));
const ParentLayout = lazy(() => import("@/pages/parent/ParentLayout"));

// ---------------------------------------------------------------------------
// Admin pages (lazy-loaded)
// ---------------------------------------------------------------------------
const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard"));
const UserListPage = lazy(() => import("@/pages/admin/users/UserListPage"));
const UserForm = lazy(() => import("@/pages/admin/users/UserForm"));
const BulkImportPage = lazy(() => import("@/pages/admin/users/BulkImportPage"));
const InviteUsersPage = lazy(
  () => import("@/pages/admin/users/InviteUsersPage")
);
const ParentInvitePage = lazy(
  () => import("@/pages/admin/users/ParentInvitePage")
);
const ProgramListPage = lazy(
  () => import("@/pages/admin/programs/ProgramListPage")
);
const ProgramForm = lazy(() => import("@/pages/admin/programs/ProgramForm"));
const ILOListPage = lazy(() => import("@/pages/admin/outcomes/ILOListPage"));
const ILOForm = lazy(() => import("@/pages/admin/outcomes/ILOForm"));
const AuditLogPage = lazy(() => import("@/pages/admin/AuditLogPage"));
const BonusXPEventManager = lazy(
  () => import("@/pages/admin/BonusXPEventManager")
);
const CourseListPage = lazy(
  () => import("@/pages/admin/courses/CourseListPage")
);
const CourseForm = lazy(() => import("@/pages/admin/courses/CourseForm"));
const CourseEnrollmentPage = lazy(
  () => import("@/pages/admin/courses/CourseEnrollmentPage")
);
const SemesterManager = lazy(
  () => import("@/pages/admin/semesters/SemesterManager")
);
const DepartmentManager = lazy(
  () => import("@/pages/admin/departments/DepartmentManager")
);
const PendingOnboardingPage = lazy(
  () => import("@/pages/admin/onboarding/PendingOnboardingPage")
);
const ReportGeneratorPage = lazy(
  () => import("@/pages/admin/reports/ReportGeneratorPage")
);
const CoordinatorDashboard = lazy(
  () => import("@/pages/coordinator/CoordinatorDashboard")
);
const PLOListPage = lazy(() => import("@/pages/coordinator/plos/PLOListPage"));
const PLOForm = lazy(() => import("@/pages/coordinator/plos/PLOForm"));
const CurriculumMatrixPage = lazy(
  () => import("@/pages/coordinator/CurriculumMatrixPage")
);
const TeacherDashboard = lazy(() => import("@/pages/teacher/TeacherDashboard"));
const CLOListPage = lazy(() => import("@/pages/teacher/clos/CLOListPage"));
const CLOForm = lazy(() => import("@/pages/teacher/clos/CLOForm"));
const RubricListPage = lazy(
  () => import("@/pages/teacher/rubrics/RubricListPage")
);
const RubricBuilder = lazy(
  () => import("@/pages/teacher/rubrics/RubricBuilder")
);
const AssignmentListPage = lazy(
  () => import("@/pages/teacher/assignments/AssignmentListPage")
);
const AssignmentForm = lazy(
  () => import("@/pages/teacher/assignments/AssignmentForm")
);
const GradingQueuePage = lazy(
  () => import("@/pages/teacher/grading/GradingQueuePage")
);
const GradingInterface = lazy(
  () => import("@/pages/teacher/grading/GradingInterface")
);
const BaselineConfigPage = lazy(
  () => import("@/pages/teacher/baseline/BaselineConfigPage")
);
const BaselineQuestionForm = lazy(
  () => import("@/pages/teacher/baseline/BaselineQuestionForm")
);
const BaselineResultsPage = lazy(
  () => import("@/pages/teacher/baseline/BaselineResultsPage")
);
const StudentDashboard = lazy(() => import("@/pages/student/StudentDashboard"));
const StudentAssignmentListPage = lazy(
  () => import("@/pages/student/assignments/AssignmentListPage")
);
const StudentAssignmentDetailPage = lazy(
  () => import("@/pages/student/assignments/AssignmentDetailPage")
);
const LeaderboardPage = lazy(
  () => import("@/pages/student/leaderboard/LeaderboardPage")
);
const CompleteProfilePage = lazy(
  () => import("@/pages/student/onboarding/CompleteProfilePage")
);
const ReassessmentPage = lazy(
  () => import("@/pages/student/settings/ReassessmentPage")
);
const ProfileSettingsPage = lazy(
  () => import("@/pages/student/settings/ProfileSettingsPage")
);
const StarterWeekPlanPage = lazy(
  () => import("@/pages/student/planner/StarterWeekPlanPage")
);
const WeeklyPlannerPage = lazy(
  () => import("@/pages/student/planner/WeeklyPlannerPage")
);
const TodayViewPage = lazy(
  () => import("@/pages/student/planner/TodayViewPage")
);
const FocusModePage = lazy(
  () => import("@/pages/student/planner/FocusModePage")
);
const HabitHeatmapPage = lazy(
  () => import("@/pages/student/habits/HabitHeatmapPage")
);
const HabitAnalyticsPage = lazy(
  () => import("@/pages/student/habits/HabitAnalyticsPage")
);
const XPHistory = lazy(() => import("@/pages/student/progress/XPHistory"));
const StudentPortfolio = lazy(
  () => import("@/pages/student/portfolio/StudentPortfolio")
);
const ParentDashboard = lazy(() => import("@/pages/parent/ParentDashboard"));
const ParentPlannerView = lazy(
  () => import("@/pages/parent/planner/ParentPlannerView")
);
const CalendarView = lazy(() => import("@/pages/shared/CalendarView"));
const TimetableView = lazy(() => import("@/pages/shared/TimetableView"));
const AcademicCalendarManager = lazy(
  () => import("@/pages/admin/calendar/AcademicCalendarManager")
);
const TimetableManager = lazy(
  () => import("@/pages/admin/timetable/TimetableManager")
);
const FeeManager = lazy(() => import("@/pages/admin/fees/FeeManager"));
const DataImportPage = lazy(
  () => import("@/pages/admin/import/DataImportPage")
);

// ---------------------------------------------------------------------------
// Public portfolio (unauthenticated)
// ---------------------------------------------------------------------------
const PublicPortfolio = lazy(() => import("@/pages/public/PublicPortfolio"));
const TermsPage = lazy(() => import("@/pages/public/TermsPage"));
const PrivacyPage = lazy(() => import("@/pages/public/PrivacyPage"));
const NotificationPreferences = lazy(
  () => import("@/pages/shared/NotificationPreferences")
);
const SessionManagement = lazy(
  () => import("@/pages/shared/SessionManagement")
);

// ---------------------------------------------------------------------------
// Adaptive Quiz Generation pages (lazy-loaded)
// ---------------------------------------------------------------------------
const GenerateQuestionsPage = lazy(
  () => import("@/pages/teacher/quiz-generation/GenerateQuestionsPage")
);
const ReviewQueuePage = lazy(
  () => import("@/pages/teacher/quiz-generation/ReviewQueuePage")
);
const QuestionBankPage = lazy(
  () => import("@/pages/teacher/quiz-generation/QuestionBankPage")
);
const QuestionAnalyticsDashboard = lazy(
  () => import("@/pages/teacher/quiz-analytics/QuestionAnalyticsDashboard")
);
const QuizCLOCorrelationPage = lazy(
  () => import("@/pages/teacher/quiz-analytics/QuizCLOCorrelationPage")
);
const QuizForm = lazy(() => import("@/pages/teacher/quizzes/QuizForm"));
const AdaptiveQuizSession = lazy(
  () => import("@/pages/student/quiz/AdaptiveQuizSession")
);
const PostQuizReview = lazy(
  () => import("@/pages/student/quiz/PostQuizReview")
);
const MasteryRecoveryPage = lazy(
  () => import("@/pages/student/recovery/MasteryRecoveryPage")
);

// AI Tutor
const TutorPage = lazy(() => import("@/pages/student/tutor/TutorPage"));
const TutorAnalyticsPage = lazy(
  () => import("@/pages/teacher/tutor-analytics/TutorAnalyticsPage")
);
const TeacherHandoffPage = lazy(
  () => import("@/pages/teacher/tutor-analytics/TeacherHandoffPage")
);
const ExplanationReviewPage = lazy(
  () => import("@/pages/teacher/quiz-generation/ExplanationReviewPage")
);

// Gradebook
const GradebookView = lazy(
  () => import("@/pages/teacher/gradebook/GradebookView")
);

// Attendance
const AttendanceMarker = lazy(
  () => import("@/pages/teacher/attendance/AttendanceMarker")
);
const AttendanceReport = lazy(
  () => import("@/pages/teacher/attendance/AttendanceReport")
);

// Announcements & Modules
const AnnouncementEditor = lazy(
  () => import("@/pages/teacher/announcements/AnnouncementEditor")
);
const ModuleManager = lazy(
  () => import("@/pages/teacher/courses/ModuleManager")
);

// Discussion Forum
const DiscussionForum = lazy(
  () => import("@/pages/student/discussions/DiscussionForum")
);
const ThreadDetail = lazy(
  () => import("@/pages/student/discussions/ThreadDetail")
);
const DiscussionModeration = lazy(
  () => import("@/pages/teacher/discussions/DiscussionModeration")
);

// CQI pages
const CQIManager = lazy(() => import("@/pages/coordinator/cqi/CQIManager"));

// Course File
const CourseFileGenerator = lazy(
  () => import("@/pages/coordinator/course-file/CourseFileGenerator")
);

// OBE Visualizations (tasks 112-125)
const GraduateAttributeManager = lazy(
  () => import("@/pages/admin/graduate-attributes/GraduateAttributeManager")
);
const CompetencyFrameworkManager = lazy(
  () => import("@/pages/admin/competency-frameworks/CompetencyFrameworkManager")
);
const HistoricalEvidenceDashboard = lazy(
  () => import("@/pages/admin/historical-evidence/HistoricalEvidenceDashboard")
);
const SankeyDiagramView = lazy(
  () => import("@/pages/coordinator/sankey/SankeyDiagramView")
);
const GapAnalysisView = lazy(
  () => import("@/pages/coordinator/gap-analysis/GapAnalysisView")
);
const CoverageHeatmapView = lazy(
  () => import("@/pages/coordinator/coverage-heatmap/CoverageHeatmapView")
);
const SemesterTrendView = lazy(
  () => import("@/pages/coordinator/trends/SemesterTrendView")
);
const CohortComparisonView = lazy(
  () => import("@/pages/coordinator/cohort-comparison/CohortComparisonView")
);

// Team Management (task 129)
const TeamManager = lazy(() => import("@/pages/teacher/teams/TeamManager"));

// Team Challenges — Phase 5 pages
const TeamProfilePage = lazy(
  () => import("@/pages/student/teams/TeamProfilePage")
);
const CreateTeamPage = lazy(
  () => import("@/pages/student/teams/CreateTeamPage")
);
const TeamManagementPage = lazy(
  () => import("@/pages/teacher/teams/TeamManagementPage")
);
const TeamFormPage = lazy(() => import("@/pages/teacher/teams/TeamFormPage"));

// Challenge Management (tasks 134-135)
const ChallengeManager = lazy(
  () => import("@/pages/teacher/challenges/ChallengeManager")
);
const ChallengeListView = lazy(
  () => import("@/pages/student/challenges/ChallengeListView")
);

// Team Challenges — Phase 6 pages
const ChallengeListPage = lazy(
  () => import("@/pages/student/challenges/ChallengeListPage")
);
const ChallengeDetailPage = lazy(
  () => import("@/pages/student/challenges/ChallengeDetailPage")
);
const TeacherChallengeListPage = lazy(
  () => import("@/pages/teacher/challenges/TeacherChallengeListPage")
);
const ChallengeFormPage = lazy(
  () => import("@/pages/teacher/challenges/ChallengeFormPage")
);

// Team Health Report (Phase 13)
const TeamHealthReportPage = lazy(
  () => import("@/pages/teacher/teams/TeamHealthReportPage")
);

// Student Team Page (task 141)
const StudentTeamPage = lazy(
  () => import("@/pages/student/team/StudentTeamPage")
);

// Badge Spotlight Manager (task 151)
const BadgeSpotlightManager = lazy(
  () => import("@/pages/admin/badges/BadgeSpotlightManager")
);

// Gap Analysis — Creative Expression & Unpredictability (Task 21)
const StudentContentPage = lazy(
  () => import("@/pages/student/content/StudentContentPage")
);
const KnowledgeQuestManager = lazy(
  () => import("@/pages/admin/marketplace/KnowledgeQuestManager")
);
const ContentReviewPage = lazy(
  () => import("@/pages/teacher/content/ContentReviewPage")
);

// Gap Analysis — XP Economy Health (Task 22)
const XPEconomistDashboard = lazy(
  () => import("@/pages/admin/marketplace/XPEconomistDashboard")
);

// Admin Marketplace Management
const MarketplaceManagementPage = lazy(
  () => import("@/pages/admin/marketplace/MarketplaceManagementPage")
);
const SaleEventManager = lazy(
  () => import("@/pages/admin/marketplace/SaleEventManager")
);
const MarketplaceAnalyticsPage = lazy(
  () => import("@/pages/admin/marketplace/MarketplaceAnalyticsPage")
);

// Student Marketplace
const StudentMarketplacePage = lazy(
  () => import("@/pages/student/marketplace/MarketplacePage")
);
const StudentMyItemsPage = lazy(
  () => import("@/pages/student/marketplace/MyItemsPage")
);
const StudentTransactionHistoryPage = lazy(
  () => import("@/pages/student/marketplace/TransactionHistoryPage")
);

// Sub-CLO Manager (task 110)
const SubCLOManager = lazy(
  () => import("@/pages/teacher/outcomes/SubCLOManager")
);

// Survey pages
const SurveyManager = lazy(() => import("@/pages/admin/surveys/SurveyManager"));
const SurveyResultsPage = lazy(
  () => import("@/pages/admin/surveys/SurveyResultsPage")
);
const SurveyResponsePage = lazy(
  () => import("@/pages/student/surveys/SurveyResponsePage")
);

// Student Announcement & Material Detail
const StudentAnnouncementDetail = lazy(
  () => import("@/pages/student/announcements/AnnouncementDetail")
);
const StudentCourseDetail = lazy(
  () => import("@/pages/student/courses/CourseDetail")
);

// Institution Settings
const InstitutionSettingsPage = lazy(
  () => import("@/pages/admin/settings/InstitutionSettings")
);

// Shared pages
const ProfilePage = lazy(() => import("@/pages/shared/ProfilePage"));

// ---------------------------------------------------------------------------
// Page-level error fallback
// ---------------------------------------------------------------------------
const PageErrorFallback = () => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
    <div className="rounded-full bg-red-50 p-4 mb-4">
      <svg
        className="h-8 w-8 text-red-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
    </div>
    <h2 className="text-lg font-bold text-gray-900 mb-2">
      Page failed to load
    </h2>
    <p className="text-sm text-gray-500 mb-4">
      Something went wrong loading this page.
    </p>
    <button
      type="button"
      onClick={() => window.location.reload()}
      className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
    >
      Reload page
    </button>
  </div>
);

// ---------------------------------------------------------------------------
// Shared loading fallback
// ---------------------------------------------------------------------------
const LoadingFallback = () => (
  <div className="p-6 space-y-4">
    <div className="h-8 w-48 rounded-lg animate-shimmer" />
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-24 rounded-xl animate-shimmer" />
      ))}
    </div>
    <div className="h-64 rounded-xl animate-shimmer" />
  </div>
);

// ---------------------------------------------------------------------------
// AppRouter
// ---------------------------------------------------------------------------
const AppRouter = () => (
  <main id="main-content" tabIndex={-1}>
    <ErrorBoundary fallback={<PageErrorFallback />}>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/accept-invite/:token" element={<AcceptInvitePage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/update-password" element={<UpdatePasswordPage />} />
          <Route path="/portfolio/:student_id" element={<PublicPortfolio />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />

          {/* Admin routes */}
          <Route
            path="/admin/*"
            element={
              <RouteGuard allowedRoles={["admin"]}>
                <AdminLayout />
              </RouteGuard>
            }
          >
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="users" element={<UserListPage />} />
            <Route path="users/new" element={<UserForm />} />
            <Route path="users/import" element={<BulkImportPage />} />
            <Route path="users/invite" element={<InviteUsersPage />} />
            <Route path="users/invite-parent" element={<ParentInvitePage />} />
            <Route path="users/:id/edit" element={<UserForm />} />
            <Route path="programs" element={<ProgramListPage />} />
            <Route path="programs/new" element={<ProgramForm />} />
            <Route path="programs/:id/edit" element={<ProgramForm />} />
            <Route path="outcomes" element={<ILOListPage />} />
            <Route path="outcomes/new" element={<ILOForm />} />
            <Route path="outcomes/:id/edit" element={<ILOForm />} />
            <Route path="audit-log" element={<AuditLogPage />} />
            <Route path="bonus-events" element={<BonusXPEventManager />} />
            <Route path="courses" element={<CourseListPage />} />
            <Route path="courses/new" element={<CourseForm />} />
            <Route path="courses/:id/edit" element={<CourseForm />} />
            <Route
              path="courses/:courseId/enrollment"
              element={<CourseEnrollmentPage />}
            />
            <Route path="semesters" element={<SemesterManager />} />
            <Route path="departments" element={<DepartmentManager />} />
            <Route
              path="onboarding/pending"
              element={<PendingOnboardingPage />}
            />
            <Route path="reports" element={<ReportGeneratorPage />} />
            <Route path="calendar" element={<AcademicCalendarManager />} />
            <Route path="timetable" element={<TimetableManager />} />
            <Route path="fees" element={<FeeManager />} />
            <Route path="import" element={<DataImportPage />} />
            <Route path="surveys" element={<SurveyManager />} />
            <Route path="surveys/results" element={<SurveyResultsPage />} />
            <Route
              path="graduate-attributes"
              element={<GraduateAttributeManager />}
            />
            <Route
              path="competency-frameworks"
              element={<CompetencyFrameworkManager />}
            />
            <Route
              path="historical-evidence"
              element={<HistoricalEvidenceDashboard />}
            />
            <Route
              path="badges/spotlight"
              element={<BadgeSpotlightManager />}
            />
            <Route path="marketplace" element={<MarketplaceManagementPage />} />
            <Route path="marketplace/sales" element={<SaleEventManager />} />
            <Route
              path="marketplace/analytics"
              element={<MarketplaceAnalyticsPage />}
            />
            <Route
              path="marketplace/quests"
              element={<KnowledgeQuestManager />}
            />
            <Route
              path="marketplace/economist"
              element={<XPEconomistDashboard />}
            />
            <Route path="settings/profile" element={<ProfilePage />} />
            <Route
              path="settings/institution"
              element={<InstitutionSettingsPage />}
            />
          </Route>

          {/* Coordinator routes */}
          <Route
            path="/coordinator/*"
            element={
              <RouteGuard allowedRoles={["coordinator"]}>
                <CoordinatorLayout />
              </RouteGuard>
            }
          >
            <Route
              index
              element={<Navigate to="/coordinator/dashboard" replace />}
            />
            <Route path="dashboard" element={<CoordinatorDashboard />} />
            <Route path="plos" element={<PLOListPage />} />
            <Route path="plos/new" element={<PLOForm />} />
            <Route path="plos/:id/edit" element={<PLOForm />} />
            <Route path="matrix" element={<CurriculumMatrixPage />} />
            <Route path="cqi" element={<CQIManager />} />
            <Route path="course-file" element={<CourseFileGenerator />} />
            <Route path="sankey" element={<SankeyDiagramView />} />
            <Route path="gap-analysis" element={<GapAnalysisView />} />
            <Route path="coverage-heatmap" element={<CoverageHeatmapView />} />
            <Route path="trends" element={<SemesterTrendView />} />
            <Route
              path="cohort-comparison"
              element={<CohortComparisonView />}
            />
            <Route path="timetable" element={<TimetableManager />} />
            <Route path="settings/profile" element={<ProfilePage />} />
          </Route>

          {/* Teacher routes */}
          <Route
            path="/teacher/*"
            element={
              <RouteGuard allowedRoles={["teacher"]}>
                <TeacherLayout />
              </RouteGuard>
            }
          >
            <Route
              index
              element={<Navigate to="/teacher/dashboard" replace />}
            />
            <Route path="dashboard" element={<TeacherDashboard />} />
            <Route path="clos" element={<CLOListPage />} />
            <Route path="clos/new" element={<CLOForm />} />
            <Route path="clos/:id/edit" element={<CLOForm />} />
            <Route path="rubrics" element={<RubricListPage />} />
            <Route path="rubrics/new" element={<RubricBuilder />} />
            <Route path="rubrics/:id/edit" element={<RubricBuilder />} />
            <Route path="assignments" element={<AssignmentListPage />} />
            <Route path="assignments/new" element={<AssignmentForm />} />
            <Route path="assignments/:id/edit" element={<AssignmentForm />} />
            <Route path="grading" element={<GradingQueuePage />} />
            <Route
              path="grading/:submissionId"
              element={<GradingInterface />}
            />
            <Route
              path="baseline/:courseId"
              element={<BaselineResultsPage />}
            />
            <Route
              path="baseline/:courseId/config"
              element={<BaselineConfigPage />}
            />
            <Route
              path="baseline/:courseId/questions/new"
              element={<BaselineQuestionForm />}
            />
            <Route
              path="courses/:courseId/generate-questions"
              element={<GenerateQuestionsPage />}
            />
            <Route
              path="courses/:courseId/review-queue"
              element={<ReviewQueuePage />}
            />
            <Route
              path="courses/:courseId/question-bank"
              element={<QuestionBankPage />}
            />
            <Route
              path="courses/:courseId/question-analytics"
              element={<QuestionAnalyticsDashboard />}
            />
            <Route
              path="courses/:courseId/quiz-clo-correlation/:quizId"
              element={<QuizCLOCorrelationPage />}
            />
            <Route
              path="courses/:courseId/quizzes/new"
              element={<QuizForm />}
            />
            <Route
              path="courses/:courseId/quizzes/:id/edit"
              element={<QuizForm />}
            />
            <Route
              path="courses/:courseId/explanation-review"
              element={<ExplanationReviewPage />}
            />
            <Route path="announcements" element={<AnnouncementEditor />} />
            <Route path="modules" element={<ModuleManager />} />
            <Route
              path="courses/:courseId/discussions"
              element={<DiscussionModeration />}
            />
            <Route
              path="courses/:courseId/discussions/:threadId"
              element={<ThreadDetail />}
            />
            <Route path="attendance" element={<AttendanceMarker />} />
            <Route path="attendance/report" element={<AttendanceReport />} />
            <Route path="gradebook" element={<GradebookView />} />
            <Route path="teams" element={<TeamManagementPage />} />
            <Route path="teams/manage" element={<TeamManager />} />
            <Route path="teams/new" element={<TeamFormPage />} />
            <Route path="teams/:id/edit" element={<TeamFormPage />} />
            <Route path="challenges" element={<TeacherChallengeListPage />} />
            <Route path="challenges/manage" element={<ChallengeManager />} />
            <Route path="challenges/new" element={<ChallengeFormPage />} />
            <Route path="challenges/:id/edit" element={<ChallengeFormPage />} />
            <Route path="team-health" element={<TeamHealthReportPage />} />
            <Route path="clos/:cloId/sub-clos" element={<SubCLOManager />} />
            <Route path="outcomes/sub-clos" element={<SubCLOManager />} />
            <Route path="tutor-analytics" element={<TutorAnalyticsPage />} />
            <Route path="content-review" element={<ContentReviewPage />} />
            <Route path="tutor-handoffs" element={<TeacherHandoffPage />} />
            <Route path="calendar" element={<CalendarView />} />
            <Route path="timetable" element={<TimetableView />} />
            <Route path="settings/profile" element={<ProfilePage />} />
          </Route>

          {/* Student routes */}
          <Route
            path="/student/*"
            element={
              <RouteGuard allowedRoles={["student"]}>
                <StudentLayout />
              </RouteGuard>
            }
          >
            <Route
              index
              element={<Navigate to="/student/dashboard" replace />}
            />
            <Route path="dashboard" element={<StudentDashboard />} />
            <Route path="assignments" element={<StudentAssignmentListPage />} />
            <Route
              path="assignments/:id"
              element={<StudentAssignmentDetailPage />}
            />
            <Route path="leaderboard" element={<LeaderboardPage />} />
            <Route
              path="onboarding/complete-profile"
              element={<CompleteProfilePage />}
            />
            <Route path="habits" element={<HabitHeatmapPage />} />
            <Route path="habits/analytics" element={<HabitAnalyticsPage />} />
            <Route path="planner" element={<WeeklyPlannerPage />} />
            <Route
              path="planner/starter-week"
              element={<StarterWeekPlanPage />}
            />
            <Route path="today" element={<TodayViewPage />} />
            <Route
              path="settings/reassessment"
              element={<ReassessmentPage />}
            />
            <Route
              path="quizzes/:quizId/adaptive"
              element={<AdaptiveQuizSession />}
            />
            <Route
              path="quizzes/:quizId/review/:attemptId"
              element={<PostQuizReview />}
            />
            <Route
              path="courses/:courseId/recovery/:cloId"
              element={<MasteryRecoveryPage />}
            />
            <Route path="settings/profile" element={<ProfileSettingsPage />} />
            <Route path="xp-history" element={<XPHistory />} />
            <Route path="portfolio" element={<StudentPortfolio />} />
            <Route path="calendar" element={<CalendarView />} />
            <Route path="timetable" element={<TimetableView />} />
            <Route
              path="notification-preferences"
              element={<NotificationPreferences />}
            />
            <Route path="sessions" element={<SessionManagement />} />
            <Route path="surveys" element={<SurveyResponsePage />} />
            <Route
              path="announcements/:announcementId"
              element={<StudentAnnouncementDetail />}
            />
            <Route path="courses/:courseId" element={<StudentCourseDetail />} />
            <Route
              path="courses/:courseId/materials/:materialId"
              element={<StudentCourseDetail />}
            />
            <Route
              path="courses/:courseId/discussions"
              element={<DiscussionForum />}
            />
            <Route
              path="courses/:courseId/discussions/:threadId"
              element={<ThreadDetail />}
            />
            <Route path="challenges" element={<ChallengeListView />} />
            <Route path="challenges/list" element={<ChallengeListPage />} />
            <Route path="challenges/:id" element={<ChallengeDetailPage />} />
            <Route path="tutor" element={<TutorPage />} />
            <Route path="tutor/:conversationId" element={<TutorPage />} />
            <Route path="team" element={<StudentTeamPage />} />
            <Route path="teams/:teamId" element={<TeamProfilePage />} />
            <Route path="teams/new" element={<CreateTeamPage />} />
            <Route path="marketplace" element={<StudentMarketplacePage />} />
            <Route
              path="marketplace/my-items"
              element={<StudentMyItemsPage />}
            />
            <Route
              path="marketplace/history"
              element={<StudentTransactionHistoryPage />}
            />
            <Route path="content" element={<StudentContentPage />} />
          </Route>

          {/* Student focus mode (full-screen, outside StudentLayout) */}
          <Route
            path="/student/focus/:sessionId"
            element={
              <RouteGuard allowedRoles={["student"]}>
                <FocusModePage />
              </RouteGuard>
            }
          />

          {/* Parent routes */}
          <Route
            path="/parent/*"
            element={
              <RouteGuard allowedRoles={["parent"]}>
                <ParentLayout />
              </RouteGuard>
            }
          >
            <Route
              index
              element={<Navigate to="/parent/dashboard" replace />}
            />
            <Route path="dashboard" element={<ParentDashboard />} />
            <Route path="planner" element={<ParentPlannerView />} />
            <Route path="planner/:studentId" element={<ParentPlannerView />} />
            <Route path="settings/profile" element={<ProfilePage />} />
          </Route>

          {/* Root redirect */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  </main>
);

export default AppRouter;
