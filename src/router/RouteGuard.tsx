import { Navigate } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { Loader2 } from 'lucide-react';
import type { UserRole } from '@/types/app';

const ROLE_DASHBOARD_MAP: Record<UserRole, string> = {
  admin: '/admin/dashboard',
  coordinator: '/coordinator/dashboard',
  teacher: '/teacher/dashboard',
  student: '/student/dashboard',
  parent: '/parent/dashboard',
};

interface RouteGuardProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}

const RouteGuard = ({ allowedRoles, children }: RouteGuardProps) => {
  const { user, role, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!role || !allowedRoles.includes(role)) {
    const redirectPath = role ? ROLE_DASHBOARD_MAP[role] : '/login';
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
};

export default RouteGuard;
