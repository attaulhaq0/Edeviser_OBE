import { Outlet } from "react-router-dom";
import RoleAppShell from "@/app/RoleAppShell";
import CoordinatorDashboardRail from "@/features/coordinator/dashboard/CoordinatorDashboardRail";

const CoordinatorLayout = () => {
  return (
    <RoleAppShell userRole="coordinator" rail={<CoordinatorDashboardRail />}>
      <Outlet />
    </RoleAppShell>
  );
};

export default CoordinatorLayout;
