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
import { cn } from "@/lib/utils";
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
    <header className="sticky top-0 z-[100] h-[var(--app-header-h)] w-full">
      <div
        data-tour="top-bar"
        className={cn(
          "relative flex h-full w-full items-center justify-between gap-4 border-b border-border px-4",
          "bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)] dark:bg-background",
          "min-[640px]:pl-[calc(var(--app-sidebar-w)+var(--app-gutter))] min-[640px]:pr-[var(--app-gutter)]"
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
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
            className="flex-shrink-0 min-[640px]:hidden"
            aria-label="Edeviser — go to dashboard"
          >
            <img
              src="/edeviser-logo-final.png"
              className="h-8 w-auto"
              alt="Edeviser"
            />
          </Link>
        </div>

        <div className="absolute left-1/2 -translate-x-1/2">
          <SearchCommand showTrigger />
        </div>

        <div className="ms-auto flex min-w-0 items-center gap-2">
          {role === "student" ? <StudentHeaderStats /> : null}
          <RoleHeaderStats />
          <div className="hidden min-[1280px]:block">
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
