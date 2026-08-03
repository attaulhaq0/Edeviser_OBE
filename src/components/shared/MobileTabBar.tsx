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
import { getMobileTabItems } from "@/lib/navPresentation";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/app";

const MobileTabBar = () => {
  const { t } = useTranslation("common");
  const { profile } = useAuth();
  const location = useLocation();

  const role = (profile?.role ?? "student") as UserRole;

  const items = getMobileTabItems(role);

  // Active detection mirrors Sidebar.isItemActive so the two chromes agree.
  const isActive = (to: string): boolean =>
    location.pathname === to ||
    (to !== `/${role}/dashboard` &&
      to !== `/${role}` &&
      location.pathname.startsWith(to));

  if (items.length === 0) return null;

  return (
    <nav
      className="new-mobile-tabbar fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t border-[#e6ebf1] bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-1px_2px_rgba(15,23,42,0.05)] min-[640px]:hidden"
      aria-label={t("header.primaryNav.label")}
    >
      {items.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.to);
        const isFab = item.raised;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            viewTransition
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-[3.25rem] flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[10px] font-bold transition-colors",
              isFab &&
                "-mt-5 min-h-14 max-w-14 rounded-full border-[4px] border-white bg-[image:var(--brand-gradient)] px-2 text-white shadow-[0_8px_20px_rgba(3,130,189,0.32)] hover:text-white",
              !isFab &&
                (active
                  ? "text-[#075985]"
                  : "text-gray-500 hover:text-gray-700")
            )}
          >
            <Icon
              className={cn(
                "h-5 w-5 shrink-0 transition-transform",
                active && "scale-110",
                isFab && "h-5 w-5"
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
