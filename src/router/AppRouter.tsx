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
const CoordinatorDashboard = lazy(() => import('@/pages/coordinator/CoordinatorDashboard'));
const TeacherDashboard = lazy(() => import('@/pages/teacher/TeacherDashboard'));
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
        <Route path="users/:id/edit" element={<UserForm />} />
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
