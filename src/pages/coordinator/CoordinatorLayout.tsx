import { Outlet, useLocation } from "react-router-dom";
import RoleAppShell from "@/app/RoleAppShell";
import CoordinatorDashboardRail from "@/features/coordinator/dashboard/CoordinatorDashboardRail";

const CoordinatorLayout = () => {
  const { pathname } = useLocation();
  const showProgramRail =
    pathname === "/coordinator" || pathname === "/coordinator/dashboard";

  return (
    <RoleAppShell
      userRole="coordinator"
      rail={showProgramRail ? <CoordinatorDashboardRail /> : undefined}
    >
      <Outlet />
    </RoleAppShell>
  );
};

export default CoordinatorLayout;
