import { Outlet, useLocation } from "react-router-dom";
import RoleAppShell from "@/app/RoleAppShell";
import ParentDashboardRail from "@/features/parent/dashboard/ParentDashboardRail";

const ParentLayout = () => {
  const location = useLocation();
  const path = location.pathname;

  // Route-specific right rail scoping matching Step 9:
  // Dashboard, Growth, and Support routes display ParentDashboardRail.
  // Fees, Profile, Communications routes omit the global rail (data-norail).
  const showDashboardRail =
    path.includes("/parent/dashboard") ||
    path.includes("/parent/progress") ||
    path.includes("/parent/support");

  return (
    <RoleAppShell
      userRole="parent"
      rail={showDashboardRail ? <ParentDashboardRail /> : undefined}
    >
      <Outlet />
    </RoleAppShell>
  );
};

export default ParentLayout;
