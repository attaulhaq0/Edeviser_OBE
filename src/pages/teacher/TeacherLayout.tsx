import { Outlet } from "react-router-dom";
import RoleAppShell from "@/app/RoleAppShell";
import TeacherDashboardRail from "@/features/teacher/dashboard/TeacherDashboardRail";

const TeacherLayout = () => {
  return (
    <RoleAppShell userRole="teacher" rail={<TeacherDashboardRail />}>
      <Outlet />
    </RoleAppShell>
  );
};

export default TeacherLayout;
