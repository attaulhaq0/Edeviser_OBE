import { Outlet, NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  GraduationCap,
  TrendingUp,
  CalendarDays,
  BookOpen,
} from "lucide-react";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";

const navItems = [
  { to: "/parent/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/parent/children", icon: GraduationCap, label: "Children" },
  { to: "/parent/progress", icon: TrendingUp, label: "Progress" },
  { to: "/parent/attendance", icon: CalendarDays, label: "Attendance" },
  { to: "/parent/planner", icon: BookOpen, label: "Study Plan" },
];

const ParentLayout = () => (
  <div className="flex h-screen">
    <aside className="w-64 border-e border-slate-200 bg-white p-4 space-y-1">
      <h2 className="text-lg font-bold tracking-tight mb-4 px-3">
        Parent Portal
      </h2>
      {navItems.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              isActive
                ? "bg-blue-50 text-blue-600"
                : "text-gray-600 hover:bg-slate-50"
            )
          }
        >
          <Icon className="h-5 w-5" />
          {label}
        </NavLink>
      ))}
    </aside>
    <main className="flex-1 overflow-auto bg-slate-50">
      <div className="flex items-center justify-end px-6 py-2 border-b border-slate-200 bg-white">
        <LanguageSwitcher />
      </div>
      <div className="p-6">
        <Outlet />
      </div>
    </main>
  </div>
);

export default ParentLayout;
