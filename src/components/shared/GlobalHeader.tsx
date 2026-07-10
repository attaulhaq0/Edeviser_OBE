import { Link } from "react-router-dom";
import { Menu } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";
import NotificationBell from "@/components/shared/NotificationBell";
import ProfileDropdown from "@/components/shared/ProfileDropdown";
import DevFlagToggle from "@/components/shared/DevFlagToggle";
import { useSidebar } from "@/components/shared/SidebarContext";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
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
  // P1 chrome redesign is gated by this flag (reversible; old chrome is the
  // flag-off default). Only the container's surface treatment changes — the
  // structure, links, and sub-components are shared to guarantee parity.
  const newChrome = useFeatureFlag("newUiChrome");

  const role = profile?.role ?? "student";
  const dashboardRoute = dashboardRouteByRole[role as UserRole] ?? "/student";

  return (
    <>
      <header className="sticky top-0 z-[100] h-14 w-full">
        <div
          role="banner"
          data-tour="top-bar"
          className={cn(
            "flex h-full w-full items-center gap-4 border-b border-border px-4 lg:px-6",
            newChrome
              ? "bg-white/80 shadow-sm backdrop-blur-md dark:bg-background/80"
              : "bg-white dark:bg-background"
          )}
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

      {/* DEV-only live flag switch (never shipped to production). */}
      {import.meta.env.DEV && <DevFlagToggle />}
    </>
  );
};

export default GlobalHeader;
