import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { navItems } from "@/lib/navItems";
import { useSidebar } from "./SidebarContext";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/app";

const Sidebar = () => {
  const { t } = useTranslation("common");
  const { profile } = useAuth();
  const { mobileOpen, close } = useSidebar();
  const location = useLocation();

  const role = (profile?.role ?? "student") as UserRole;
  const items = navItems[role] ?? [];

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
          className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5"
        >
          {items.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.to ||
              (item.to !== `/${role}/dashboard` &&
                item.to !== `/${role}` &&
                location.pathname.startsWith(item.to));

            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={close}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
                  isActive
                    ? "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400"
                    : "text-gray-600 hover:bg-slate-50 dark:text-gray-400 dark:hover:bg-slate-800"
                )}
              >
                {isActive && <span className="sr-only">(current page)</span>}
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{t(item.labelKey)}</span>
              </NavLink>
            );
          })}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
