import { Outlet } from "react-router-dom";
import RoleAppShell from "@/app/RoleAppShell";
import ParentDashboardRail from "@/features/parent/dashboard/ParentDashboardRail";

const ParentLayout = () => {
  return (
    <RoleAppShell userRole="parent" rail={<ParentDashboardRail />}>
      <Outlet />
    </RoleAppShell>
  );
};

export default ParentLayout;
