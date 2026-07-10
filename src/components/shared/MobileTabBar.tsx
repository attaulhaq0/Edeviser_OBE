// =============================================================================
// MobileTabBar — thumb-reachable bottom navigation for < lg screens
// =============================================================================
//
// Responsive navigation for the redesigned chrome (spec: ui-prototype-migration,
// task 1.2a / design §18, R18.5). On small screens the sidebar is an off-canvas
// drawer (opened via the header hamburger); this fixed bottom bar surfaces the
// role's core destinations for one-thumb reach. It is driven by the SAME
// `navItems[role]` single source of truth, is RTL-safe (logical flow), uses
// ≥44px touch targets, and respects the safe-area inset.
//
// Rendered only when the `newUiChrome` flag is on (from Sidebar) and only below
// `lg` (`lg:hidden`). The `.new-mobile-tabbar` class is a hook for the
// content-padding rule in index.css (so the fixed bar never covers content).
// =============================================================================

import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { useAuth } from "@/hooks/useAuth";
import { navItems } from "@/lib/navItems";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/app";

/** Max destinations to surface in the bottom bar (full nav stays in the drawer). */
const MAX_TABS = 5;

const MobileTabBar = () => {
  const { t } = useTranslation("common");
  const { profile } = useAuth();
  const location = useLocation();

  const role = (profile?.role ?? "student") as UserRole;

  // Core destinations = the first few non-de-emphasized items of the role's nav
  // (same source the sidebar/drawer use). The full list stays in the drawer.
  const items = (navItems[role] ?? [])
    .filter((item) => !item.deEmphasized)
    .slice(0, MAX_TABS);

  // Active detection mirrors Sidebar.isItemActive so the two chromes agree.
  const isActive = (to: string): boolean =>
    location.pathname === to ||
    (to !== `/${role}/dashboard` &&
      to !== `/${role}` &&
      location.pathname.startsWith(to));

  if (items.length === 0) return null;

  return (
    <nav
      className="new-mobile-tabbar fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t border-border bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden dark:bg-background/95"
      aria-label={t("header.primaryNav.label")}
    >
      {items.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.to);
        return (
          <NavLink
            key={item.to}
            to={item.to}
            viewTransition
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-[3.25rem] flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[10px] font-medium transition-colors",
              active
                ? "text-teal-600 dark:text-teal-400"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            )}
          >
            <Icon
              className={cn(
                "h-5 w-5 shrink-0 transition-transform",
                active && "scale-110"
              )}
              aria-hidden="true"
            />
            <span className="max-w-full truncate">{t(item.labelKey)}</span>
          </NavLink>
        );
      })}
    </nav>
  );
};

export default MobileTabBar;
