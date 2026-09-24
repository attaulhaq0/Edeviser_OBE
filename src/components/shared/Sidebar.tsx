import { useEffect, useRef, useSyncExternalStore } from "react";
import { Dialog } from "radix-ui";
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
import { useSidebar } from "@/components/shared/SidebarContext";
import StudentSidebarExtras from "@/components/shared/StudentSidebarExtras";
import { Button } from "@/components/ui/button";
import RoleBrandLink from "@/components/shared/RoleBrandLink";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/app";

/** Route of the conditional Surveys item, hidden when the student has none. */
const SURVEYS_ROUTE = "/student/surveys";

// Semantic navigation colors follow the theme (and future scoped overrides),
// not a permanently light palette ramp copied into every role.
const activeNavStyle = {
  background: "var(--sidebar-accent)",
  color: "var(--sidebar-accent-foreground)",
};

const desktopQuery = "(min-width: 640px)";
const getDesktopSnapshot = () => window.matchMedia(desktopQuery).matches;
const subscribeToDesktop = (notify: () => void) => {
  const media = window.matchMedia(desktopQuery);
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
};

const Sidebar = () => {
  const { t } = useTranslation("common");
  const { profile } = useAuth();
  const { mobileOpen, close } = useSidebar();
  const location = useLocation();
  const isDesktop = useSyncExternalStore(subscribeToDesktop, getDesktopSnapshot, () => true);
  const opener = useRef<HTMLElement | null>(null);
  const routeKey = useRef(location.key);
  const focusContentOnClose = useRef(false);

  // Close for browser history/programmatic navigation as well as link clicks.
  // Crossing the desktop breakpoint must not leave a hidden modal trapping focus.
  useEffect(() => {
    if (routeKey.current !== location.key) {
      focusContentOnClose.current = true;
      close();
    }
    if (isDesktop) close();
    routeKey.current = location.key;
  }, [close, isDesktop, location.key]);

  const closeForNavigation = () => {
    focusContentOnClose.current = true;
    close();
  };
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
    const group = section === "primary" ? "primary" : "secondary";
    const variant = itemIsCompanion ? "companion" : "standard";

    // --- Primary section styling ---
    // Active: full-width rounded light-blue pill, dark blue text
    // Inactive primary: transparent bg, lighter muted label (#94a3b8)
    // Secondary (below MORE): transparent bg, stronger slate-blue label (#64748b)
    const itemClassName = cn(
      "sidebar-item flex items-center transition-colors duration-150",
      section === "primary"
        ? "min-h-[47px] gap-[12px] rounded-[13px] px-[16px] min-[1024px]:min-h-[42px]"
        : "min-h-11 gap-3 rounded-[10px] px-[18px] py-[8px] min-[1024px]:py-[6px]",
      isActive ? "font-semibold" : "hover:bg-muted/50 dark:hover:bg-slate-800"
    );

    const IconComponent = item.icon;

    const content = (
      <>
        {/* Icon rendering: 3 distinct treatments */}
        {itemIsCompanion ? (
          /* Companion: prominent colorful circular icon badge (always visible) */
          <div className="sidebar-icon-wrapper flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-full bg-[var(--brand-gradient)] text-white shadow-xs">
            <span className="sidebar-icon text-[16px] leading-none">
              {item.emoji}
            </span>
          </div>
        ) : section === "more" && item.emoji ? (
          /* MORE section: small colorful emoji */
          <span
            className="sidebar-icon flex size-5 shrink-0 items-center justify-center bg-transparent text-[16px] leading-none"
            aria-hidden="true"
          >
            {item.emoji}
          </span>
        ) : IconComponent ? (
          /* Primary section: Lucide outline icon (20px standard) */
          <IconComponent
            className={cn(
              "sidebar-icon h-5 w-5 shrink-0 transition-colors",
              isActive ? "stroke-[2.2]" : "stroke-[1.6]"
            )}
            aria-hidden="true"
          />
        ) : item.emoji ? (
          /* Fallback: emoji */
          <span
            className="sidebar-icon flex size-5 shrink-0 items-center justify-center bg-transparent text-[18px] leading-none"
            aria-hidden="true"
          >
            {item.emoji}
          </span>
        ) : null}

        <span className="sidebar-nav-label truncate">
          {(() => {
            const raw = t(item.labelKey);
            if (typeof raw === "string" && raw.startsWith("nav.")) {
              return raw
                .replace("nav.", "")
                .replace(/([A-Z])/g, " $1")
                .replace(/^./, (s) => s.toUpperCase());
            }
            return raw;
          })()}
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
        onClick={closeForNavigation}
        viewTransition
        data-group={group}
        data-variant={variant}
        data-active={isActive ? "true" : "false"}
        {...sharedProps}
        style={isActive ? activeNavStyle : undefined}
        className={itemClassName}
      >
        {content}
      </NavLink>
    ) : (
      <Link
        key={`${section}:${item.to}:${item.labelKey}`}
        to={item.to}
        onClick={closeForNavigation}
        viewTransition
        data-group={group}
        data-variant={variant}
        data-active="false"
        {...sharedProps}
        className={itemClassName}
      >
        {content}
      </Link>
    );
  };

  const surfaceClass = role === "student"
    ? "bg-[linear-gradient(180deg,#ffffff_0%,#f5fdff_100%)]"
    : "bg-white";
  const content = (
        <div className="relative flex h-full min-h-0 flex-1 flex-col px-3.5 pb-5 pt-4 min-[640px]:pt-18.5 min-[1024px]:px-3 min-[1024px]:pb-4 min-[1024px]:pt-16">
          {isDesktop ? <RoleBrandLink userRole={role} className="absolute start-4 top-1" /> : null}

          {/* Mobile close button */}
          <div className="flex items-center justify-end p-2 min-[640px]:hidden">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={close}
              className="min-h-11 min-w-11 rounded-lg text-muted-foreground hover:bg-muted"
              aria-label={t("header.closeNavigation")}
            >
              <X className="h-5 w-5" aria-hidden="true" />
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
              <div className="sidebar-extra mt-2.5 flex min-h-0 flex-1 flex-col">
                <div
                  className="side-sep mx-3 mb-2 mt-3 h-px bg-transparent"
                  aria-hidden="true"
                />
                <p className="side-label px-4.5 pb-1.5 pt-1 text-[10px] font-extrabold uppercase tracking-[0.12em] leading-3.5 text-muted-foreground">
                  {t("nav.more")}
                </p>
                <div className="space-y-0.5">
                  {moreItems.map((item) => renderItem(item, "more"))}
                </div>
                {role === "student" ? <StudentSidebarExtras /> : null}
              </div>
            ) : null}
          </div>
        </div>
  );

  if (isDesktop) {
    return (
      <aside
        data-tour="primary-nav"
        className={cn(
          "app-sidebar fixed start-0 top-0 z-[110] flex h-screen w-(--app-sidebar-w) overflow-y-auto overflow-x-hidden border-e-0 col-start-1 row-start-1 dark:bg-background dark:bg-none",
          surfaceClass
        )}
      >
        {content}
      </aside>
    );
  }

  // Compose existing Radix modal primitives instead of a translated-but-focusable
  // offscreen aside. Closed content is unmounted; open content owns focus/scroll.
  return (
    <Dialog.Root open={mobileOpen} onOpenChange={(open) => { if (!open) close(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[120] bg-black/40 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-150" />
        <Dialog.Content
          id="mobile-navigation"
          data-tour="primary-nav"
          data-role={role}
          aria-describedby={undefined}
          aria-modal="true"
          className={cn(
            "app-sidebar fixed inset-y-0 start-0 z-[130] flex h-dvh max-h-dvh w-(--app-sidebar-w) max-w-[calc(100vw-2rem)] overflow-y-auto overflow-x-hidden overscroll-contain shadow-xl outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring dark:bg-background dark:bg-none motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-150",
            surfaceClass
          )}
          onOpenAutoFocus={() => {
            opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
            focusContentOnClose.current = false;
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            const trigger = opener.current;
            if (!focusContentOnClose.current && trigger?.isConnected && trigger.getClientRects().length > 0) {
              trigger.focus();
            } else {
              document.getElementById("main-content")?.focus();
            }
          }}
        >
          <Dialog.Title className="sr-only">{t("header.primaryNav.label")}</Dialog.Title>
          {content}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default Sidebar;
