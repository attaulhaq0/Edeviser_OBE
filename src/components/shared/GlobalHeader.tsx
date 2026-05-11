import { Link, NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { navItems } from "@/lib/navItems";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";
import NotificationBell from "@/components/shared/NotificationBell";
import ProfileDropdown from "@/components/shared/ProfileDropdown";
import type { UserRole } from "@/types/app";

/**
 * Full-width two-row global header (ADR-18).
 *
 * Row 1 (banner): brand logo | flex-1 spacer | LanguageSwitcher | NotificationBell | ProfileDropdown
 * Row 2 (primary nav): role-aware nav links from navItems[role]
 *
 * - sticky top-0 z-[100]
 * - NO max-w-* wrapper — spans full viewport width (clause 2.27)
 * - data-tour="top-bar" on Row 1, data-tour="primary-nav" on Row 2 nav
 *
 * Design: ADR-18
 * Requirements: 2.27, 2.28, 2.29, 2.30
 */

const dashboardRouteByRole: Record<UserRole, string> = {
  admin: "/admin",
  coordinator: "/coordinator",
  teacher: "/teacher",
  student: "/student",
  parent: "/parent",
};

const GlobalHeader = () => {
  const { t } = useTranslation("common");
  const { profile } = useAuth();

  const role = profile?.role ?? "student";
  const dashboardRoute = dashboardRouteByRole[role as UserRole] ?? "/student";
  const items = navItems[role as UserRole] ?? [];

  return (
    <header className="sticky top-0 z-[100] w-full">
      {/* ── Row 1: Brand + identity cluster ─────────────────────────────── */}
      <div
        role="banner"
        data-tour="top-bar"
        className="w-full px-6 py-3 flex items-center gap-4 border-b border-border bg-white dark:bg-background"
      >
        {/* Brand logo — links to role dashboard */}
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

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right cluster */}
        <LanguageSwitcher />
        <NotificationBell />
        <ProfileDropdown />
      </div>

      {/* ── Row 2: Primary navigation ────────────────────────────────────── */}
      <div className="w-full px-6 border-b border-border bg-white dark:bg-background overflow-x-auto">
        <nav
          role="navigation"
          aria-label={t("header.primaryNav.label")}
          data-tour="primary-nav"
          className="flex items-center gap-1 py-2"
        >
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  [
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
                    isActive
                      ? "bg-blue-50 text-blue-600"
                      : "text-gray-600 hover:bg-slate-50",
                  ].join(" ")
                }
              >
                {({ isActive }) => (
                  <>
                    {/* Screen-reader hint for active page */}
                    {isActive && (
                      <span className="sr-only">(current page)</span>
                    )}
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {t(item.labelKey)}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>
    </header>
  );
};

export default GlobalHeader;
