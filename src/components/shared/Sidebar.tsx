import { Link, NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSurveyAssignmentsCount } from "@/hooks/useSurveyAssignmentsCount";
import { navItems } from "@/lib/navItems";
import {
  getMoreNavItems,
  getPrimaryNavItems,
  type PresentedNavItem,
} from "@/lib/navPresentation";
import { useIntentPrefetch } from "@/hooks/useIntentPrefetch";
import { prefetchRoute } from "@/lib/routePrefetch";
import { useSidebar } from "./SidebarContext";
import MobileTabBar from "./MobileTabBar";
import StudentSidebarExtras from "./StudentSidebarExtras";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/app";

/** Route of the conditional Surveys item, hidden when the student has none. */
const SURVEYS_ROUTE = "/student/surveys";

const activeNavStyleByRole: Record<
  UserRole,
  { background: string; color: string }
> = {
  student: { background: "#e6f7ff", color: "#075985" },
  teacher: { background: "#eff6ff", color: "#2563eb" },
  coordinator: { background: "#eff6ff", color: "#2563eb" },
  admin: { background: "#eff6ff", color: "#2563eb" },
  parent: { background: "#eff6ff", color: "#2563eb" },
};

const Sidebar = () => {
  const { t } = useTranslation("common");
  const { profile } = useAuth();
  const { mobileOpen, close } = useSidebar();
  const location = useLocation();
  // Prefetch-on-intent (Req 9): warm a route's chunk on hover/focus (desktop
  // only, once per target, failures swallowed) so navigation feels instant.
  const getIntentHandlers = useIntentPrefetch();

  const role = (profile?.role ?? "student") as UserRole;

  // R23.1/2/2a: the Surveys item is shown only when the student has at least one
  // assigned (active) survey. The query is scoped to students; for other roles
  // it stays disabled and the item is filtered out below regardless. When the
  // last survey is unassigned, an existing survey mutation invalidates this
  // query's key prefix, so the count refetches and the item hides immediately.
  const { data: surveyCount } = useSurveyAssignmentsCount({
    enabled: role === "student",
  });
  const showSurveys = (surveyCount ?? 0) > 0;

  // Filter conditionally-hidden items before sectioning so no gap or placeholder
  // is left where a hidden item would have been (R23.4).
  const items = (navItems[role] ?? []).filter(
    (item) => item.to !== SURVEYS_ROUTE || showSurveys
  );
  const visiblePaths = new Set(items.map((item) => item.to));
  const primaryItems = getPrimaryNavItems(role).filter((item) =>
    visiblePaths.has(item.to)
  );
  const moreItems = getMoreNavItems(role).filter((item) =>
    visiblePaths.has(item.to)
  );

  const isItemActive = (to: string): boolean =>
    location.pathname === to ||
    (to !== `/${role}/dashboard` &&
      to !== `/${role}` &&
      location.pathname.startsWith(to));

  // The prototype companion item route per role: the one primary item that keeps
  // a colorful circular icon even when inactive (Tutor for student, Studio for
  // teacher, etc.).
  const companionRoute: Record<UserRole, string> = {
    student: "/student/tutor",
    teacher: "/teacher/modules",
    parent: "/parent/support",
    coordinator: "/coordinator/matrix",
    admin: "/admin/governance",
  };
  const isCompanion = (to: string) => companionRoute[role] === to;

  const renderItem = (item: PresentedNavItem, section: "primary" | "more") => {
    const isActive = section === "primary" && isItemActive(item.to);
    const itemIsCompanion = section === "primary" && isCompanion(item.to);

    // --- Primary section styling ---
    // Active: full-width rounded light-blue pill, blue text
    // Companion (inactive): transparent bg, faded label (icon stays colorful)
    // Normal inactive: transparent bg, muted icon + faded label
    const itemClassName = cn(
      "flex items-center transition-all duration-150",
      section === "primary"
        ? "rounded-[13px] px-[16px] gap-[12px] min-h-[47px]"
        : "rounded-[10px] px-[18px] gap-3 py-[8px]",
      isActive
        ? "font-bold"
        : section === "primary"
        ? "font-semibold text-[#64748b] opacity-[0.72] hover:opacity-100 hover:bg-slate-50 dark:text-gray-300 dark:hover:bg-slate-800"
        : item.deEmphasized
        ? "font-medium text-gray-400 opacity-60 hover:bg-slate-100 hover:opacity-100 dark:text-gray-500"
        : "font-medium text-[#64748b] opacity-[0.82] hover:opacity-100 hover:bg-slate-50 dark:text-gray-300 dark:hover:bg-slate-800"
    );

    const IconComponent = item.icon;

    const content = (
      <>
        {isActive ? <span className="sr-only">(current page)</span> : null}

        {/* Icon rendering: 3 distinct treatments */}
        {itemIsCompanion ? (
          /* Companion: colorful circular icon badge (always visible) */
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-teal-500 via-cyan-500 to-blue-500 text-white shadow-xs">
            <span className="text-xs">{item.emoji}</span>
          </div>
        ) : section === "more" && item.emoji ? (
          /* MORE section: small colorful emoji */
          <span
            className="flex size-5 shrink-0 items-center justify-center bg-transparent text-[16px] leading-none"
            aria-hidden="true"
          >
            {item.emoji}
          </span>
        ) : IconComponent ? (
          /* Primary section: Lucide outline icon */
          <IconComponent
            className={cn(
              "h-[22px] w-[22px] shrink-0 transition-colors",
              isActive ? "stroke-[2.2]" : "text-[#94a3b8] stroke-[1.6]"
            )}
            aria-hidden="true"
          />
        ) : item.emoji ? (
          /* Fallback: emoji */
          <span
            className="flex size-[22px] shrink-0 items-center justify-center bg-transparent text-[20px] leading-none"
            aria-hidden="true"
          >
            {item.emoji}
          </span>
        ) : null}

        <span
          className={cn(
            "truncate",
            section === "primary" ? "text-[14px]" : "text-[13px]"
          )}
        >
          {t(item.labelKey)}
        </span>
      </>
    );

    const sharedProps = getIntentHandlers(item.to, () =>
      prefetchRoute(item.to)
    );

    return section === "primary" ? (
      <NavLink
        key={`${section}:${item.to}:${item.labelKey}`}
        to={item.to}
        onClick={close}
        viewTransition
        {...sharedProps}
        style={isActive ? activeNavStyleByRole[role] : undefined}
        className={itemClassName}
      >
        {content}
      </NavLink>
    ) : (
      <Link
        key={`${section}:${item.to}:${item.labelKey}`}
        to={item.to}
        onClick={close}
        viewTransition
        {...sharedProps}
        className={itemClassName}
      >
        {content}
      </Link>
    );
  };

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <Button
          type="button"
          variant="ghost"
          className="fixed inset-0 z-[98] h-auto w-auto rounded-none bg-black/30 p-0 hover:bg-black/30 min-[640px]:hidden"
          onClick={close}
          aria-label="Close navigation"
        />
      )}

      {/* Sidebar */}
      <aside
        data-tour="primary-nav"
        className={cn(
          "fixed start-0 top-0 z-[99] flex h-screen w-[var(--app-sidebar-w)] overflow-y-auto overflow-x-hidden border-e border-[#e2e8f0] transition-transform duration-200 ease-in-out dark:border-border dark:bg-background",
          role === "student"
            ? "bg-[linear-gradient(180deg,#ffffff_0%,#f5fdff_100%)]"
            : "bg-white",
          "min-[640px]:z-[110] min-[640px]:col-start-1 min-[640px]:row-start-1 min-[640px]:translate-x-0",
          mobileOpen
            ? "translate-x-0"
            : "max-[639px]:-translate-x-full max-[639px]:rtl:translate-x-full"
        )}
      >
        <div className="relative flex h-full min-h-0 flex-1 flex-col px-[14px] pb-[20px] pt-4 min-[640px]:pt-[74px]">
          <span className="hidden min-[640px]:block absolute start-[22px] top-[22px] text-[18px] font-black tracking-[-0.01em] text-slate-900 dark:text-foreground">
            Edeviser
          </span>

          {/* Mobile close button */}
          <div className="flex items-center justify-end p-2 min-[640px]:hidden">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={close}
              className="rounded-lg text-gray-500 hover:bg-slate-100"
              aria-label="Close navigation"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col">
            {/* Nav items */}
            <nav role="navigation" aria-label={t("header.primaryNav.label")}>
              <div className="space-y-1">
                {primaryItems.map((item) => renderItem(item, "primary"))}
              </div>
            </nav>

            {moreItems.length > 0 ? (
              <div className="sidebar-extra mt-[10px] flex min-h-0 flex-1 flex-col">
                <div
                  className="side-sep mx-3 mb-2 mt-3 h-px bg-[#eef2f6]"
                  aria-hidden="true"
                />
                <p className="side-label px-[18px] pb-[6px] pt-[4px] text-[10px] font-[800] uppercase tracking-[0.12em] leading-[14px] text-[#94a3b8]">
                  {t("nav.more")}
                </p>
                <div className="space-y-[2px]">
                  {moreItems.map((item) => renderItem(item, "more"))}
                </div>
                {role === "student" ? <StudentSidebarExtras /> : null}
              </div>
            ) : null}
          </div>
        </div>
      </aside>

      {/* Responsive nav (design §18 / R18.5): a thumb-reachable bottom tab bar
          on < lg, driven by the same navItems[role]. The bar itself is
          lg:hidden so it never shows alongside the desktop sidebar. */}
      <MobileTabBar />
    </>
  );
};

export default Sidebar;
