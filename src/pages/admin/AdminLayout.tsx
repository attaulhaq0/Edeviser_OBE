import { Outlet, useLocation } from "react-router-dom";
import RoleAppShell from "@/app/RoleAppShell";
import AdminDashboardRail from "@/features/admin/dashboard/AdminDashboardRail";

const AdminLayout = () => {
  const { pathname } = useLocation();
  const showInstitutionRail =
    pathname === "/admin" ||
    pathname === "/admin/dashboard" ||
    pathname === "/admin/analytics" ||
    pathname === "/admin/accreditation-reports";

  return (
    <RoleAppShell
      userRole="admin"
      rail={showInstitutionRail ? <AdminDashboardRail /> : undefined}
    >
      <Outlet />
    </RoleAppShell>
  );
};

export default AdminLayout;
