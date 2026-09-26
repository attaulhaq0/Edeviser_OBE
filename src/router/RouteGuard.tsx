import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import RouteLoadingState from "@/components/shared/RouteLoadingState";
import type { UserRole } from "@/types/app";

const ROLE_DASHBOARD_MAP: Record<UserRole, string> = {
  admin: "/admin/dashboard",
  coordinator: "/coordinator/dashboard",
  teacher: "/teacher/dashboard",
  student: "/student/dashboard",
  parent: "/parent/dashboard",
};

interface RouteGuardProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}

const RouteGuard = ({ allowedRoles, children }: RouteGuardProps) => {
  const { user, role, isLoading } = useAuth();
  const { t } = useTranslation("common");

  if (isLoading) {
    return (
      <div className="flex min-h-dvh min-w-0 items-center justify-center bg-background p-6">
        <RouteLoadingState message={t("routeState.checkingAccess")} />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!role || !allowedRoles.includes(role)) {
    const redirectPath = role ? ROLE_DASHBOARD_MAP[role] : "/login";
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
};

export default RouteGuard;
