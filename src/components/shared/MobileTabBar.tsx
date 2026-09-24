// =============================================================================
// MobileTabBar — thumb-reachable bottom navigation below 640px
// =============================================================================
//
// Responsive navigation for the redesigned chrome (spec: ui-prototype-migration,
// task 1.2a / design §18, R18.5). On small screens the sidebar is an off-canvas
// drawer (opened via the header hamburger); this fixed bottom bar surfaces the
// role's core destinations for one-thumb reach. It is driven by the SAME
// `navItems[role]` single source of truth, is RTL-safe (logical flow), uses
// ≥44px touch targets, and respects the safe-area inset.
//
// RoleAppShell is the only owner. CSS hides the bar at 640px and above, where
// Sidebar supplies navigation. The shell alone reserves content clearance using
// shared height/raised-affordance/safe-area variables; no body-wide padding rule.
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
      className="new-mobile-tabbar fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t-0 bg-card pb-[var(--app-mobile-nav-safe-area,env(safe-area-inset-bottom))] min-[640px]:hidden"
      aria-label={t("header.mobileNavLabel")}
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
              "flex min-h-[var(--app-mobile-nav-h,3.25rem)] min-w-11 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[10px] font-bold transition-colors",
              isFab &&
                "-mt-[var(--app-mobile-nav-overhang,1.25rem)] min-h-14 max-w-14 rounded-full border-[4px] border-card bg-[image:var(--brand-gradient)] px-2 text-white shadow-[0_8px_20px_var(--primary-200)] hover:text-white",
              !isFab &&
                (active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground")
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
