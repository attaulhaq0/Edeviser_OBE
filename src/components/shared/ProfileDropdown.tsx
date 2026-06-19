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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
          data-tour="profile"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={avatarUrl} alt={profile.full_name ?? "User"} />
            <AvatarFallback className="bg-blue-100 text-blue-700 text-xs font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="hidden sm:inline text-sm font-medium text-gray-700">
            {getDisplayFirstName(profile.full_name) ?? "User"}
          </span>
          <ChevronDown className="h-4 w-4 text-gray-500" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col gap-1">
          <p className="text-sm font-semibold">{profile.full_name ?? "User"}</p>
          <p className="text-xs text-gray-500">{user.email}</p>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {/* Profile Settings — single entry point for profile (clause 2.28) */}
        <DropdownMenuItem
          onClick={() => {
            const routeMap: Record<string, string> = {
              admin: "/admin/settings/profile",
              coordinator: "/coordinator/settings/profile",
              teacher: "/teacher/settings/profile",
              student: "/student/settings/profile",
              parent: "/parent/settings/profile",
            };
            navigate(routeMap[profile.role] ?? "/student/settings/profile");
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
