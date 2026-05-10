import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Search,
  Settings,
  ChevronDown,
  Bell,
  User as UserIcon,
  LogOut,
  BookOpen,
  ClipboardList,
  Megaphone,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useGlobalSearch, type SearchResult } from "@/hooks/useGlobalSearch";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Role → settings + profile route map. Each role has its own settings screen
// and profile page; the dashboard header routes the dropdown actions to the
// correct per-role route so the shared component works for every layout.
// ---------------------------------------------------------------------------
const ROLE_ROUTES: Record<
  string,
  { settings: string; profile: string; dashboard: string }
> = {
  admin: {
    settings: "/admin/settings/institution",
    profile: "/admin/settings/profile",
    dashboard: "/admin/dashboard",
  },
  coordinator: {
    settings: "/coordinator/settings/profile",
    profile: "/coordinator/settings/profile",
    dashboard: "/coordinator/dashboard",
  },
  teacher: {
    settings: "/teacher/settings/profile",
    profile: "/teacher/settings/profile",
    dashboard: "/teacher/dashboard",
  },
  student: {
    settings: "/student/settings/profile",
    profile: "/student/settings/profile",
    dashboard: "/student/dashboard",
  },
  parent: {
    settings: "/parent/dashboard",
    profile: "/parent/dashboard",
    dashboard: "/parent/dashboard",
  },
};

const DEFAULT_ROUTES = {
  settings: "/student/settings/profile",
  profile: "/student/settings/profile",
  dashboard: "/student/dashboard",
} as const;

// ---------------------------------------------------------------------------
// Role-aware URL rewriter for search results. The `useGlobalSearch` hook
// returns generic URLs like `/courses/{id}`; each role has its own routes
// for the same resource — this function maps the generic URL to the
// role-scoped one.
// ---------------------------------------------------------------------------
const buildResultUrl = (result: SearchResult, role: string): string => {
  const rolePrefix = role === "parent" ? "student" : role; // parents view student-scoped routes
  switch (result.type) {
    case "course":
      if (role === "admin") return `/admin/courses/${result.id}/enrollment`;
      if (role === "coordinator")
        return `/coordinator/matrix?courseId=${result.id}`;
      return `/${rolePrefix}/courses/${result.id}`;
    case "assignment":
      if (role === "teacher") return `/teacher/assignments/${result.id}/edit`;
      return `/${rolePrefix}/assignments/${result.id}`;
    case "announcement":
      if (role === "teacher") return `/teacher/announcements`;
      return `/${rolePrefix}/announcements/${result.id}`;
    default:
      return result.url;
  }
};

const getResultIcon = (type: SearchResult["type"]) => {
  switch (type) {
    case "course":
      return <BookOpen className="h-4 w-4 text-blue-600" />;
    case "assignment":
      return <ClipboardList className="h-4 w-4 text-emerald-600" />;
    case "announcement":
      return <Megaphone className="h-4 w-4 text-amber-600" />;
  }
};

// ---------------------------------------------------------------------------
// useDebounced — tiny local debounce for the search input (200ms)
// ---------------------------------------------------------------------------
function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(handle);
  }, [value, delayMs]);
  return debounced;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface DashboardHeaderProps {
  /**
   * When true, hide the logo in the header (useful when the role layout
   * already renders the logo in the sidebar).
   */
  hideLogo?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export const DashboardHeader = ({ hideLogo = false }: DashboardHeaderProps) => {
  const { t } = useTranslation(["common", "auth"]);
  const { profile, role: authRole, signOut } = useAuth();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Debounce query so we don't thrash Supabase while typing
  const debouncedQuery = useDebounced(searchQuery.trim(), 200);

  const { data: searchResults = [], isLoading: searchLoading } =
    useGlobalSearch(debouncedQuery, authRole);

  // -------------------------------------------------------------------
  // Close dropdowns when clicking outside
  // -------------------------------------------------------------------
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setShowProfileDropdown(false);
      }
      if (
        settingsRef.current &&
        !settingsRef.current.contains(event.target as Node)
      ) {
        setShowSettingsDropdown(false);
      }
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // -------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------
  const handleSignOut = useCallback(async () => {
    setShowProfileDropdown(false);
    await signOut();
    navigate("/login", { replace: true });
  }, [signOut, navigate]);

  const handleSelectResult = useCallback(
    (result: SearchResult) => {
      if (!authRole) return;
      const href = buildResultUrl(result, authRole);
      setSearchQuery("");
      setSearchFocused(false);
      navigate(href);
    },
    [authRole, navigate]
  );

  // -------------------------------------------------------------------
  // Derived
  // -------------------------------------------------------------------
  const role = authRole ?? "student";
  const routes = ROLE_ROUTES[role] ?? DEFAULT_ROUTES;

  const firstName = profile?.full_name?.split(" ")[0] ?? t("common:user");
  const initials = (profile?.full_name ?? "?")
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join("");

  const hasQuery = debouncedQuery.length >= 2;
  const showSearchResults = useMemo(
    () => searchFocused && hasQuery,
    [searchFocused, hasQuery]
  );

  // -------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------
  return (
    <nav
      className="shadow-sm border-b border-gray-200 sticky top-0 z-[100] bg-white"
      data-testid="navigation-header"
    >
      {/* Logo positioned absolutely at the start. In RTL we swap to end. */}
      {!hideLogo && (
        <Link
          to={routes.dashboard}
          className="absolute start-6 top-1/2 -translate-y-1/2 z-10 flex items-center"
          aria-label="Edeviser"
        >
          <img
            src="/edeviser-logo-final.png"
            alt="Edeviser"
            className="h-16 w-auto object-contain"
          />
        </Link>
      )}

      <div className="max-w-7xl mx-auto px-0 relative">
        <div className="flex justify-end items-center py-2 px-6 gap-2">
          {/* Search */}
          <div
            className="relative hidden md:block"
            ref={searchContainerRef}
            data-testid="global-search-container"
          >
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              placeholder={t("common:searchPlaceholder", "Search...")}
              className="bg-gray-100 border border-gray-300 rounded-full ps-4 pe-9 py-2 text-sm text-gray-700 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-80"
              aria-label={t("common:search", "Search")}
            />
            {searchLoading && hasQuery ? (
              <Loader2 className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-500" />
            ) : (
              <Search
                className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500"
                aria-hidden="true"
              />
            )}

            {/* Search results dropdown */}
            {showSearchResults && (
              <div
                id="global-search-results"
                role="listbox"
                className="absolute end-0 start-0 mt-2 max-h-96 overflow-y-auto bg-white rounded-xl shadow-lg border border-gray-200 z-50"
              >
                {searchLoading ? (
                  <div className="p-6 flex items-center justify-center text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin me-2" />
                    {t("common:searchLoading", "Searching…")}
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="p-6 text-center text-sm text-gray-500">
                    {t("common:searchEmpty", {
                      defaultValue: "No results for “{{q}}”",
                      q: debouncedQuery,
                    })}
                  </div>
                ) : (
                  <ul className="py-1">
                    {searchResults.map((result) => (
                      <li key={`${result.type}-${result.id}`}>
                        <button
                          type="button"
                          role="option"
                          aria-selected="false"
                          onClick={() => handleSelectResult(result)}
                          className="w-full flex items-start gap-3 px-4 py-2 text-start hover:bg-gray-50 transition-colors"
                        >
                          <span
                            aria-hidden="true"
                            className="mt-0.5 h-8 w-8 rounded-lg bg-gray-50 flex items-center justify-center shrink-0"
                          >
                            {getResultIcon(result.type)}
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="block text-sm font-medium text-gray-900 truncate">
                              {result.title}
                            </span>
                            {result.description && (
                              <span className="block text-xs text-gray-500 truncate">
                                {result.description}
                              </span>
                            )}
                            <span className="mt-1 inline-block text-[10px] font-bold uppercase tracking-wider text-gray-400">
                              {t(
                                `common:searchType.${result.type}`,
                                result.type
                              )}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Language switcher */}
          <LanguageSwitcher />

          {/* Notification bell */}
          <button
            type="button"
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
            aria-label={t("common:notifications", "Notifications")}
          >
            <Bell className="h-5 w-5" />
          </button>

          {/* Settings dropdown */}
          <div className="relative" ref={settingsRef}>
            <button
              type="button"
              onClick={() => setShowSettingsDropdown((v) => !v)}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
              aria-label={t("common:settings", "Settings")}
              aria-haspopup="menu"
              aria-expanded={showSettingsDropdown}
            >
              <Settings className="h-5 w-5" />
            </button>

            {showSettingsDropdown && (
              <div
                role="menu"
                className="absolute end-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50"
              >
                <div className="px-4 py-2 border-b border-gray-100">
                  <div className="text-sm font-medium text-gray-900">
                    {t("common:settings", "Settings")}
                  </div>
                </div>
                <Link
                  to={routes.profile}
                  role="menuitem"
                  onClick={() => setShowSettingsDropdown(false)}
                  className="block w-full text-start px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  {t("common:profileSettings", "Profile Settings")}
                </Link>
                {role === "admin" && (
                  <Link
                    to="/admin/settings/institution"
                    role="menuitem"
                    onClick={() => setShowSettingsDropdown(false)}
                    className="block w-full text-start px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    {t("common:institutionSettings", "Institution Settings")}
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Profile dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              type="button"
              onClick={() => setShowProfileDropdown((v) => !v)}
              className="flex items-center gap-3 hover:bg-gray-50 rounded-lg p-2 transition-colors"
              aria-label={t("common:profileMenu", "Profile menu")}
              aria-haspopup="menu"
              aria-expanded={showProfileDropdown}
            >
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name ?? ""}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-gray-200 hover:ring-blue-400 transition-all"
                />
              ) : (
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold ring-2 ring-gray-200 hover:ring-blue-400 transition-all",
                    "bg-gradient-to-br from-teal-500 to-blue-600"
                  )}
                  aria-hidden="true"
                >
                  {initials}
                </div>
              )}
              <div className="text-start hidden sm:block">
                <div className="text-sm font-semibold text-gray-900">
                  {profile?.full_name ?? firstName}
                </div>
                <div className="text-xs text-gray-600 capitalize">
                  {t(`auth:roles.${role}`, role)}
                </div>
              </div>
              <ChevronDown className="h-4 w-4 text-gray-500" />
            </button>

            {showProfileDropdown && (
              <div
                role="menu"
                className="absolute end-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50"
              >
                <div className="px-4 py-2 border-b border-gray-100">
                  <div className="text-sm font-medium text-gray-900">
                    {profile?.full_name ?? firstName}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {profile?.email}
                  </div>
                </div>
                <Link
                  to={routes.profile}
                  role="menuitem"
                  onClick={() => setShowProfileDropdown(false)}
                  className="flex items-center gap-2 w-full text-start px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <UserIcon className="h-4 w-4" />
                  {t("common:myProfile", "My Profile")}
                </Link>
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleSignOut}
                  className="flex items-center gap-2 w-full text-start px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  {t("auth:logout.button", "Sign Out")}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default DashboardHeader;
