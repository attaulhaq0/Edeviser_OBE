import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
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
const StudentDashboard = lazy(() => import('@/pages/student/StudentDashboard'));
const ParentDashboard = lazy(() => import('@/pages/parent/ParentDashboard'));

// ---------------------------------------------------------------------------
// Shared loading fallback
// ---------------------------------------------------------------------------
const LoadingFallback = () => (
  <div className="flex min-h-screen items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
  </div>
);

// ---------------------------------------------------------------------------
// AppRouter
// ---------------------------------------------------------------------------
const AppRouter = () => (
  <Suspense fallback={<LoadingFallback />}>
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/update-password" element={<UpdatePasswordPage />} />

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
);

export default AppRouter;
