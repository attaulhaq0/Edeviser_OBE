import { Link } from "react-router-dom";
import { Menu } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";
import NotificationBell from "@/components/shared/NotificationBell";
import ProfileDropdown from "@/components/shared/ProfileDropdown";
import { useSidebar } from "@/components/shared/SidebarContext";
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
    <header className="sticky top-0 z-[100] h-14 w-full">
      <div
        role="banner"
        data-tour="top-bar"
        className="flex h-full w-full items-center gap-4 border-b border-border bg-white px-4 dark:bg-background lg:px-6"
      >
        {/* Mobile hamburger */}
        <button
          onClick={toggle}
          className="rounded-lg p-1.5 text-gray-600 hover:bg-slate-100 lg:hidden"
          aria-label="Toggle navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Brand logo */}
        <Link
          to={dashboardRoute}
          className="flex-shrink-0"
          aria-label="Edeviser — go to dashboard"
        >
          <img
            src="/edeviser-logo-final.png"
            className="h-8 w-auto"
            alt="Edeviser"
          />
        </Link>

        <div className="flex-1" />

        <LanguageSwitcher />
        <NotificationBell />
        <ProfileDropdown />
      </div>
    </header>
  );
};

export default GlobalHeader;
