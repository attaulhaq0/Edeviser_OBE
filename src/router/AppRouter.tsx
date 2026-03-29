import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import RouteGuard from '@/router/RouteGuard';

// ---------------------------------------------------------------------------
// Public pages (no auth required)
// ---------------------------------------------------------------------------
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const ResetPasswordPage = lazy(() => import('@/pages/ResetPasswordPage'));
const UpdatePasswordPage = lazy(() => import('@/pages/UpdatePasswordPage'));

// ---------------------------------------------------------------------------
// Role layouts (lazy-loaded for code splitting)
// ---------------------------------------------------------------------------
const AdminLayout = lazy(() => import('@/pages/admin/AdminLayout'));
const CoordinatorLayout = lazy(() => import('@/pages/coordinator/CoordinatorLayout'));
const TeacherLayout = lazy(() => import('@/pages/teacher/TeacherLayout'));
const StudentLayout = lazy(() => import('@/pages/student/StudentLayout'));
const ParentLayout = lazy(() => import('@/pages/parent/ParentLayout'));

// ---------------------------------------------------------------------------
// Admin pages (lazy-loaded)
// ---------------------------------------------------------------------------
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'));
const UserListPage = lazy(() => import('@/pages/admin/users/UserListPage'));
const UserForm = lazy(() => import('@/pages/admin/users/UserForm'));
const BulkImportPage = lazy(() => import('@/pages/admin/users/BulkImportPage'));
const ProgramListPage = lazy(() => import('@/pages/admin/programs/ProgramListPage'));
const ProgramForm = lazy(() => import('@/pages/admin/programs/ProgramForm'));
const ILOListPage = lazy(() => import('@/pages/admin/outcomes/ILOListPage'));
const ILOForm = lazy(() => import('@/pages/admin/outcomes/ILOForm'));
const AuditLogPage = lazy(() => import('@/pages/admin/AuditLogPage'));
const BonusXPEventManager = lazy(() => import('@/pages/admin/BonusXPEventManager'));
const CourseListPage = lazy(() => import('@/pages/admin/courses/CourseListPage'));
const CourseForm = lazy(() => import('@/pages/admin/courses/CourseForm'));
const CourseEnrollmentPage = lazy(() => import('@/pages/admin/courses/CourseEnrollmentPage'));
const SemesterManager = lazy(() => import('@/pages/admin/semesters/SemesterManager'));
const DepartmentManager = lazy(() => import('@/pages/admin/departments/DepartmentManager'));
const PendingOnboardingPage = lazy(() => import('@/pages/admin/onboarding/PendingOnboardingPage'));
const ReportGeneratorPage = lazy(() => import('@/pages/admin/reports/ReportGeneratorPage'));
const CoordinatorDashboard = lazy(() => import('@/pages/coordinator/CoordinatorDashboard'));
const PLOListPage = lazy(() => import('@/pages/coordinator/plos/PLOListPage'));
const PLOForm = lazy(() => import('@/pages/coordinator/plos/PLOForm'));
const CurriculumMatrixPage = lazy(() => import('@/pages/coordinator/CurriculumMatrixPage'));
const TeacherDashboard = lazy(() => import('@/pages/teacher/TeacherDashboard'));
const CLOListPage = lazy(() => import('@/pages/teacher/clos/CLOListPage'));
const CLOForm = lazy(() => import('@/pages/teacher/clos/CLOForm'));
const RubricListPage = lazy(() => import('@/pages/teacher/rubrics/RubricListPage'));
const RubricBuilder = lazy(() => import('@/pages/teacher/rubrics/RubricBuilder'));
const AssignmentListPage = lazy(() => import('@/pages/teacher/assignments/AssignmentListPage'));
const AssignmentForm = lazy(() => import('@/pages/teacher/assignments/AssignmentForm'));
const GradingQueuePage = lazy(() => import('@/pages/teacher/grading/GradingQueuePage'));
const GradingInterface = lazy(() => import('@/pages/teacher/grading/GradingInterface'));
const BaselineConfigPage = lazy(() => import('@/pages/teacher/baseline/BaselineConfigPage'));
const BaselineQuestionForm = lazy(() => import('@/pages/teacher/baseline/BaselineQuestionForm'));
const BaselineResultsPage = lazy(() => import('@/pages/teacher/baseline/BaselineResultsPage'));
const StudentDashboard = lazy(() => import('@/pages/student/StudentDashboard'));
const StudentAssignmentListPage = lazy(() => import('@/pages/student/assignments/AssignmentListPage'));
const StudentAssignmentDetailPage = lazy(() => import('@/pages/student/assignments/AssignmentDetailPage'));
const LeaderboardPage = lazy(() => import('@/pages/student/leaderboard/LeaderboardPage'));
const CompleteProfilePage = lazy(() => import('@/pages/student/onboarding/CompleteProfilePage'));
const ReassessmentPage = lazy(() => import('@/pages/student/settings/ReassessmentPage'));
const ProfileSettingsPage = lazy(() => import('@/pages/student/settings/ProfileSettingsPage'));
const StarterWeekPlanPage = lazy(() => import('@/pages/student/planner/StarterWeekPlanPage'));
const HabitHeatmapPage = lazy(() => import('@/pages/student/habits/HabitHeatmapPage'));
const HabitAnalyticsPage = lazy(() => import('@/pages/student/habits/HabitAnalyticsPage'));
const XPHistory = lazy(() => import('@/pages/student/progress/XPHistory'));
const StudentPortfolio = lazy(() => import('@/pages/student/portfolio/StudentPortfolio'));
const ParentDashboard = lazy(() => import('@/pages/parent/ParentDashboard'));

// ---------------------------------------------------------------------------
// Public portfolio (unauthenticated)
// ---------------------------------------------------------------------------
const PublicPortfolio = lazy(() => import('@/pages/public/PublicPortfolio'));

// ---------------------------------------------------------------------------
// Adaptive Quiz Generation pages (lazy-loaded)
// ---------------------------------------------------------------------------
const GenerateQuestionsPage = lazy(() => import('@/pages/teacher/quiz-generation/GenerateQuestionsPage'));
const ReviewQueuePage = lazy(() => import('@/pages/teacher/quiz-generation/ReviewQueuePage'));
const QuestionBankPage = lazy(() => import('@/pages/teacher/quiz-generation/QuestionBankPage'));
const QuestionAnalyticsDashboard = lazy(() => import('@/pages/teacher/quiz-analytics/QuestionAnalyticsDashboard'));
const QuizCLOCorrelationPage = lazy(() => import('@/pages/teacher/quiz-analytics/QuizCLOCorrelationPage'));
const QuizForm = lazy(() => import('@/pages/teacher/quizzes/QuizForm'));
const AdaptiveQuizSession = lazy(() => import('@/pages/student/quiz/AdaptiveQuizSession'));
const PostQuizReview = lazy(() => import('@/pages/student/quiz/PostQuizReview'));
const MasteryRecoveryPage = lazy(() => import('@/pages/student/recovery/MasteryRecoveryPage'));
const ExplanationReviewPage = lazy(() => import('@/pages/teacher/quiz-generation/ExplanationReviewPage'));

// Announcements & Modules
const AnnouncementEditor = lazy(() => import('@/pages/teacher/announcements/AnnouncementEditor'));
const ModuleManager = lazy(() => import('@/pages/teacher/courses/ModuleManager'));

// CQI pages
const CQIManager = lazy(() => import('@/pages/coordinator/cqi/CQIManager'));

// Course File
const CourseFileGenerator = lazy(() => import('@/pages/coordinator/course-file/CourseFileGenerator'));

// Survey pages
const SurveyManager = lazy(() => import('@/pages/admin/surveys/SurveyManager'));
const SurveyResultsPage = lazy(() => import('@/pages/admin/surveys/SurveyResultsPage'));
const SurveyResponsePage = lazy(() => import('@/pages/student/surveys/SurveyResponsePage'));

// Student Announcement & Material Detail
const StudentAnnouncementDetail = lazy(() => import('@/pages/student/announcements/AnnouncementDetail'));
const StudentCourseDetail = lazy(() => import('@/pages/student/courses/CourseDetail'));

// Institution Settings
const InstitutionSettingsPage = lazy(() => import('@/pages/admin/settings/InstitutionSettings'));

// Shared pages
const ProfilePage = lazy(() => import('@/pages/shared/ProfilePage'));

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
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/update-password" element={<UpdatePasswordPage />} />
      <Route path="/portfolio/:student_id" element={<PublicPortfolio />} />

      {/* Admin routes */}
      <Route
        path="/admin/*"
        element={
          <RouteGuard allowedRoles={['admin']}>
            <AdminLayout />
          </RouteGuard>
        }
      >
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="users" element={<UserListPage />} />
        <Route path="users/new" element={<UserForm />} />
        <Route path="users/import" element={<BulkImportPage />} />
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
        <Route path="courses/:courseId/enrollment" element={<CourseEnrollmentPage />} />
        <Route path="semesters" element={<SemesterManager />} />
        <Route path="departments" element={<DepartmentManager />} />
        <Route path="onboarding/pending" element={<PendingOnboardingPage />} />
        <Route path="reports" element={<ReportGeneratorPage />} />
        <Route path="surveys" element={<SurveyManager />} />
        <Route path="surveys/results" element={<SurveyResultsPage />} />
        <Route path="settings/profile" element={<ProfilePage />} />
        <Route path="settings/institution" element={<InstitutionSettingsPage />} />
      </Route>

      {/* Coordinator routes */}
      <Route
        path="/coordinator/*"
        element={
          <RouteGuard allowedRoles={['coordinator']}>
            <CoordinatorLayout />
          </RouteGuard>
        }
      >
        <Route index element={<Navigate to="/coordinator/dashboard" replace />} />
        <Route path="dashboard" element={<CoordinatorDashboard />} />
        <Route path="plos" element={<PLOListPage />} />
        <Route path="plos/new" element={<PLOForm />} />
        <Route path="plos/:id/edit" element={<PLOForm />} />
        <Route path="matrix" element={<CurriculumMatrixPage />} />
        <Route path="cqi" element={<CQIManager />} />
        <Route path="course-file" element={<CourseFileGenerator />} />
        <Route path="settings/profile" element={<ProfilePage />} />
      </Route>

      {/* Teacher routes */}
      <Route
        path="/teacher/*"
        element={
          <RouteGuard allowedRoles={['teacher']}>
            <TeacherLayout />
          </RouteGuard>
        }
      >
        <Route index element={<Navigate to="/teacher/dashboard" replace />} />
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
        <Route path="grading/:submissionId" element={<GradingInterface />} />
        <Route path="baseline/:courseId" element={<BaselineResultsPage />} />
        <Route path="baseline/:courseId/config" element={<BaselineConfigPage />} />
        <Route path="baseline/:courseId/questions/new" element={<BaselineQuestionForm />} />
        <Route path="courses/:courseId/generate-questions" element={<GenerateQuestionsPage />} />
        <Route path="courses/:courseId/review-queue" element={<ReviewQueuePage />} />
        <Route path="courses/:courseId/question-bank" element={<QuestionBankPage />} />
        <Route path="courses/:courseId/question-analytics" element={<QuestionAnalyticsDashboard />} />
        <Route path="courses/:courseId/quiz-clo-correlation/:quizId" element={<QuizCLOCorrelationPage />} />
        <Route path="courses/:courseId/quizzes/new" element={<QuizForm />} />
        <Route path="courses/:courseId/quizzes/:id/edit" element={<QuizForm />} />
        <Route path="courses/:courseId/explanation-review" element={<ExplanationReviewPage />} />
        <Route path="announcements" element={<AnnouncementEditor />} />
        <Route path="modules" element={<ModuleManager />} />
        <Route path="settings/profile" element={<ProfilePage />} />
      </Route>

      {/* Student routes */}
      <Route
        path="/student/*"
        element={
          <RouteGuard allowedRoles={['student']}>
            <StudentLayout />
          </RouteGuard>
        }
      >
        <Route index element={<Navigate to="/student/dashboard" replace />} />
        <Route path="dashboard" element={<StudentDashboard />} />
        <Route path="assignments" element={<StudentAssignmentListPage />} />
        <Route path="assignments/:id" element={<StudentAssignmentDetailPage />} />
        <Route path="leaderboard" element={<LeaderboardPage />} />
        <Route path="onboarding/complete-profile" element={<CompleteProfilePage />} />
        <Route path="habits" element={<HabitHeatmapPage />} />
        <Route path="habits/analytics" element={<HabitAnalyticsPage />} />
        <Route path="planner/starter-week" element={<StarterWeekPlanPage />} />
        <Route path="settings/reassessment" element={<ReassessmentPage />} />
        <Route path="quizzes/:quizId/adaptive" element={<AdaptiveQuizSession />} />
        <Route path="quizzes/:quizId/review/:attemptId" element={<PostQuizReview />} />
        <Route path="courses/:courseId/recovery/:cloId" element={<MasteryRecoveryPage />} />
        <Route path="settings/profile" element={<ProfileSettingsPage />} />
        <Route path="xp-history" element={<XPHistory />} />
        <Route path="portfolio" element={<StudentPortfolio />} />
        <Route path="surveys" element={<SurveyResponsePage />} />
        <Route path="announcements/:announcementId" element={<StudentAnnouncementDetail />} />
        <Route path="courses/:courseId" element={<StudentCourseDetail />} />
        <Route path="courses/:courseId/materials/:materialId" element={<StudentCourseDetail />} />
      </Route>

      {/* Parent routes */}
      <Route
        path="/parent/*"
        element={
          <RouteGuard allowedRoles={['parent']}>
            <ParentLayout />
          </RouteGuard>
        }
      >
        <Route index element={<Navigate to="/parent/dashboard" replace />} />
        <Route path="dashboard" element={<ParentDashboard />} />
      </Route>

      {/* Root redirect */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  </Suspense>
  </main>
);

export default AppRouter;
