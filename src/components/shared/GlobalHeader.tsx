import { Link } from "react-router-dom";
import { Menu } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";
import NotificationBell from "@/components/shared/NotificationBell";
import ProfileDropdown from "@/components/shared/ProfileDropdown";
import SearchCommand from "@/components/shared/SearchCommand";
import RoleHeaderStats from "@/components/shared/RoleHeaderStats";
import StudentHeaderStats from "@/components/shared/StudentHeaderStats";
import { useSidebar } from "@/components/shared/SidebarContext";
import { Button } from "@/components/ui/button";
import type { UserRole } from "@/types/app";

const dashboardRouteByRole: Record<UserRole, string> = {
  admin: "/admin",
  coordinator: "/coordinator",
  teacher: "/teacher",
  student: "/student",
  parent: "/parent",
};

const GlobalHeader = () => {
  const { profile } = useAuth();
  const { toggle } = useSidebar();

  const role = profile?.role ?? "student";
  const dashboardRoute = dashboardRouteByRole[role as UserRole] ?? "/student";

  return (
    <header className="sticky top-0 z-[100] h-(--app-header-h) w-full border-b border-slate-200/80 bg-white/95 shadow-[0_1px_3px_rgba(15,23,42,0.06)] backdrop-blur-md dark:border-border dark:bg-background/95">
      <div
        data-tour="top-bar"
        className="mx-auto flex h-full w-full items-center justify-between gap-3 px-4"
      >
        {/* Left: Mobile Toggle & Brand Logo */}
        <div className="flex items-center gap-3 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={toggle}
            className="rounded-lg text-gray-600 hover:bg-slate-100 min-[640px]:hidden"
            aria-label="Toggle navigation menu"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <Link
            to={dashboardRoute}
            className="flex items-center gap-2.5 transition-opacity hover:opacity-90"
            aria-label="Edeviser — go to dashboard"
          >
            <img
              src="/edeviser-logo-final.png"
              className="h-8 w-auto object-contain"
              alt="Edeviser"
            />
            <span className="font-black text-xl tracking-tight text-slate-900 dark:text-white">
              Edeviser
            </span>
          </Link>
        </div>

        {/* Center: Search Command */}
        <div className="absolute left-1/2 -translate-x-1/2 hidden min-[1280px]:block w-90">
          <SearchCommand showTrigger />
        </div>

        {/* Right: Role Stats, Bell & Profile */}
        <div className="ms-auto flex min-w-0 items-center gap-2.5">
          {role === "student" ? <StudentHeaderStats /> : null}
          <RoleHeaderStats />
          <div className="hidden min-[1024px]:block">
            <LanguageSwitcher />
          </div>
          <NotificationBell />
          <ProfileDropdown />
        </div>
      </div>
    </header>
  );
};

export default GlobalHeader;
