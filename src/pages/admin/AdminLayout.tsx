import { Outlet } from "react-router-dom";
import RoleAppShell from "@/app/RoleAppShell";
import AdminDashboardRail from "@/features/admin/dashboard/AdminDashboardRail";

const AdminLayout = () => {
  return (
    <RoleAppShell userRole="admin" rail={<AdminDashboardRail />}>
      <Outlet />
    </RoleAppShell>
  );
};

export default AdminLayout;
