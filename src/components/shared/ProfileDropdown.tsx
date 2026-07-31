import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { useGuidedTour } from "@/hooks/useGuidedTour";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronDown,
  LogOut,
  User,
  RotateCcw,
  Sun,
  Moon,
  Monitor,
  Building2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { getDisplayFirstName } from "@/lib/displayName";
import { useCourses } from "@/hooks/useCourses";
import { useLevel } from "@/hooks/useLevel";
import { useLinkedChildren } from "@/hooks/useParentDashboard";

const profileSubtitleByRole: Record<string, string> = {
  admin: "header.profileSubtitle.admin",
  coordinator: "header.profileSubtitle.coordinator",
  teacher: "header.profileSubtitle.teacher",
  student: "header.profileSubtitle.student",
  parent: "header.profileSubtitle.parent",
};

/**
 * Profile dropdown menu with avatar, name, and actions.
 * Includes: My Profile, Take the tour, Theme selector, Sign out
 *
 * Design: ADR-02, §8.3
 * Requirements: 2.12, 2.13, 2.15, 2.18
 *
 * @example
 * <ProfileDropdown />
 */
const ProfileDropdown = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation("common");
  const { themeMode, setThemeMode } = useTheme();
  const { start: startTour } = useGuidedTour(profile?.role ?? "student");
  const isStudent = profile?.role === "student";
  const isTeacher = profile?.role === "teacher";
  const isParent = profile?.role === "parent";
  const level = useLevel(isStudent ? user?.id : undefined);
  const teacherCourses = useCourses(
    { page: 1, pageSize: 1, teacherId: isTeacher ? user?.id : undefined },
    { enabled: isTeacher }
  );
  const linkedChildren = useLinkedChildren(isParent ? user?.id : undefined, {
    enabled: isParent,
  });

  if (!user || !profile) {
    return null;
  }

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/login");
      toast.success(t("auth.signedOut"));
    } catch (err) {
      console.error("[ProfileDropdown] Sign out failed:", err);
      toast.error(err instanceof Error ? err.message : t("common.error"));
    }
  };

  // Get user initials for avatar fallback
  const initials =
    profile.full_name
      ?.split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase() ?? "U";

  // Get avatar URL with CDN transformation for 64px display
  const avatarUrl = profile.avatar_url
    ? `${profile.avatar_url}?width=64&height=64&resize=cover`
    : undefined;

  const profileSubtitle = (() => {
    if (profile.role === "student") {
      return t("header.profileSubtitle.studentLevel", {
        level: level.data?.level ?? 1,
        xp: (level.data?.xpTotal ?? 0).toLocaleString(),
      });
    }

    if (profile.role === "teacher") {
      return t("header.profileSubtitle.teacherDetail", {
        department: profile.department ?? t("header.profileSubtitle.teacher"),
        count: teacherCourses.data?.count ?? 0,
      });
    }

    if (profile.role === "parent") {
      const firstChild = linkedChildren.data?.[0];
      return firstChild
        ? t("header.profileSubtitle.guardianOf", {
            name: getDisplayFirstName(firstChild.student_name),
          })
        : t("header.profileSubtitle.parent");
    }

    return t(
      profileSubtitleByRole[profile.role] ?? "header.profileSubtitle.student"
    );
  })();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="hdr-profile flex cursor-pointer items-center gap-2.5 rounded-xl p-1.5 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800/80"
          data-tour="profile"
        >
          <Avatar className="h-9 w-9 border border-slate-200 shadow-2xs dark:border-slate-700">
            <AvatarImage src={avatarUrl} alt={profile.full_name ?? "User"} />
            <AvatarFallback className="bg-gradient-to-br from-teal-500 to-blue-600 font-extrabold text-xs text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="hidden min-[640px]:flex flex-col text-start leading-tight">
            <span className="text-xs font-extrabold text-slate-900 dark:text-white">
              {profile.full_name}
            </span>
            <span className="text-[11px] font-bold text-teal-600 dark:text-teal-400">
              {profileSubtitle}
            </span>
            {isStudent && level.data ? (
              <div
                className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-700/80"
                title={`${
                  level.data.progressPercent
                }% (${level.data.xpTotal.toLocaleString()} / ${level.data.xpForNextLevel.toLocaleString()} XP)`}
                aria-label={`Level progress ${level.data.progressPercent}%`}
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all duration-500"
                  style={{ width: `${level.data.progressPercent}%` }}
                />
              </div>
            ) : null}
          </span>
          <ChevronDown className="ms-0.5 h-3.5 w-3.5 text-slate-400" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col gap-1">
          <p className="text-sm font-semibold">{profile.full_name ?? "User"}</p>
          <p className="text-xs text-gray-500">{user.email}</p>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {/* The dropdown and role navigation share the prototype profile destination. */}
        <DropdownMenuItem
          onClick={() => {
            const routeMap: Record<string, string> = {
              admin: "/admin/settings/profile",
              coordinator: "/coordinator/settings/profile",
              teacher: "/teacher/settings/profile",
              student: "/student/profile",
              parent: "/parent/profile",
            };
            navigate(routeMap[profile.role] ?? "/student/profile");
          }}
          className="cursor-pointer"
          data-tour="settings"
        >
          <User className="h-4 w-4 me-2" />
          <span>{t("myProfile")}</span>
        </DropdownMenuItem>

        {/* Institution Settings — admin only */}
        {profile.role === "admin" && (
          <DropdownMenuItem
            onClick={() => navigate("/admin/settings/institution")}
            className="cursor-pointer"
          >
            <Building2 className="h-4 w-4 me-2" />
            <span>{t("institutionSettings")}</span>
          </DropdownMenuItem>
        )}

        {/* Take the tour */}
        <DropdownMenuItem onClick={startTour} className="cursor-pointer">
          <RotateCcw className="h-4 w-4 me-2" />
          <span>{t("tour.takeTour")}</span>
        </DropdownMenuItem>

        {/* Theme selector */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger
            className="cursor-pointer"
            aria-label={t("theme.label")}
          >
            <Sun className="h-4 w-4 me-2" />
            <span>{t("theme.label")}</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem
              onClick={() => setThemeMode("light")}
              className={`cursor-pointer ${
                themeMode === "light" ? "bg-blue-50" : ""
              }`}
            >
              <Sun className="h-4 w-4 me-2" />
              <span>{t("theme.light")}</span>
              {themeMode === "light" && (
                <span className="ms-auto text-xs">✓</span>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setThemeMode("dark")}
              className={`cursor-pointer ${
                themeMode === "dark" ? "bg-blue-50" : ""
              }`}
            >
              <Moon className="h-4 w-4 me-2" />
              <span>{t("theme.dark")}</span>
              {themeMode === "dark" && (
                <span className="ms-auto text-xs">✓</span>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setThemeMode("system")}
              className={`cursor-pointer ${
                themeMode === "system" ? "bg-blue-50" : ""
              }`}
            >
              <Monitor className="h-4 w-4 me-2" />
              <span>{t("theme.system")}</span>
              {themeMode === "system" && (
                <span className="ms-auto text-xs">✓</span>
              )}
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator />

        {/* Sign out */}
        <DropdownMenuItem
          onClick={handleSignOut}
          className="cursor-pointer text-red-600"
        >
          <LogOut className="h-4 w-4 me-2" />
          <span>{t("auth.signOut")}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ProfileDropdown;
