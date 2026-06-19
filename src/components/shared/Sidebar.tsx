import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSurveyAssignmentsCount } from "@/hooks/useSurveyAssignmentsCount";
import { navItems, type NavItem } from "@/lib/navItems";
import { NAV_GROUPS, NAV_GROUP_META, type NavGroup } from "@/lib/navGroups";
import { useIntentPrefetch } from "@/hooks/useIntentPrefetch";
import { prefetchRoute } from "@/lib/routePrefetch";
import { useSidebar } from "./SidebarContext";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/app";

interface NavSection {
  group: NavGroup;
  labelKey: string;
  items: NavItem[];
}

/** Route of the conditional Surveys item, hidden when the student has none. */
const SURVEYS_ROUTE = "/student/surveys";

/**
 * Order items within a section so de-emphasized items (R23.3) sink to the
 * bottom of their group while everything keeps its original relative order.
 * Uses a stable partition (not a comparator-based sort) to guarantee stability
 * across engines.
 */
const sinkDeEmphasized = (items: NavItem[]): NavItem[] => [
  ...items.filter((item) => !item.deEmphasized),
  ...items.filter((item) => item.deEmphasized),
];

/**
 * Partition role nav items into ordered, labeled sections (R20.3). Only items
 * carrying a `group` are sectioned; the canonical order comes from
 * {@link NAV_GROUPS}. Within a section, de-emphasized items sink to the bottom
 * (R23.3). Empty sections are dropped so no header renders without items
 * (R23.4 — no gap/placeholder).
 */
const buildSections = (items: NavItem[]): NavSection[] =>
  NAV_GROUPS.map((group) => ({
    group,
    labelKey: NAV_GROUP_META[group].labelKey,
    items: sinkDeEmphasized(items.filter((item) => item.group === group)),
  })).filter((section) => section.items.length > 0);

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

  // Render grouped sections when every item declares a group (student nav);
  // otherwise fall back to a flat list (admin/coordinator/teacher/parent).
  const isGrouped = items.length > 0 && items.every((item) => item.group);
  const sections = isGrouped ? buildSections(items) : [];

  const isItemActive = (to: string): boolean =>
    location.pathname === to ||
    (to !== `/${role}/dashboard` &&
      to !== `/${role}` &&
      location.pathname.startsWith(to));

  const renderItem = (item: NavItem) => {
    const Icon = item.icon;
    const isActive = isItemActive(item.to);

    return (
      <NavLink
        key={item.to}
        to={item.to}
        onClick={close}
        viewTransition
        {...getIntentHandlers(item.to, () => prefetchRoute(item.to))}
        className={cn(
          "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
          isActive
            ? "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400"
            : // R23.3: de-emphasize (subdued color) items that retain student
            // value but are secondary to core learning items.
            item.deEmphasized
            ? "text-gray-400 hover:bg-slate-50 dark:text-gray-500 dark:hover:bg-slate-800"
            : "text-gray-600 hover:bg-slate-50 dark:text-gray-400 dark:hover:bg-slate-800"
        )}
      >
        {isActive && <span className="sr-only">(current page)</span>}
        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="truncate">{t(item.labelKey)}</span>
      </NavLink>
    );
  };

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-[98] bg-black/30 lg:hidden"
          onClick={close}
          aria-label="Close navigation"
        />
      )}

      {/* Sidebar */}
      <aside
        data-tour="primary-nav"
        className={cn(
          "fixed top-14 start-0 z-[99] flex h-[calc(100vh-3.5rem)] w-52 flex-col border-e border-border bg-white dark:bg-background transition-transform duration-200 ease-in-out",
          mobileOpen
            ? "translate-x-0"
            : "max-lg:-translate-x-full max-lg:rtl:translate-x-full lg:translate-x-0"
        )}
      >
        {/* Mobile close button */}
        <div className="flex items-center justify-end p-2 lg:hidden">
          <button
            onClick={close}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-slate-100"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav items */}
        <nav
          role="navigation"
          aria-label={t("header.primaryNav.label")}
          className="flex-1 overflow-y-auto px-3 py-2"
        >
          {isGrouped ? (
            sections.map((section) => (
              <div
                key={section.group}
                role="group"
                aria-labelledby={`nav-group-${section.group}`}
                className="space-y-0.5 pb-2"
              >
                <p
                  id={`nav-group-${section.group}`}
                  className="px-3 pt-2 pb-1 text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400"
                >
                  {t(section.labelKey)}
                </p>
                {section.items.map(renderItem)}
              </div>
            ))
          ) : (
            <div className="space-y-0.5">{items.map(renderItem)}</div>
          )}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
