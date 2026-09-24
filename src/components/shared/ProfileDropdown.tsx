import { useRef, useState } from "react";
import { useAccessibilityPreferenceControls } from "@/hooks/useAccessibilityPreferences";
import ReadingDisplayDialog from "@/components/shared/ReadingDisplayDialog";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { useGuidedTour } from "@/hooks/useGuidedTour";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator,
  DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User, RotateCcw, Sun, Moon, Monitor, Building2, Type } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { getDisplayFirstName } from "@/lib/displayName";
import { useCourses } from "@/hooks/useCourses";
import { useLevel } from "@/hooks/useLevel";
import { useLinkedChildren } from "@/hooks/useParentDashboard";
import { Button } from "@/design-system/primitives";

const profileSubtitleByRole: Record<string, string> = {
  admin: "header.profileSubtitle.admin", coordinator: "header.profileSubtitle.coordinator",
  teacher: "header.profileSubtitle.teacher", student: "header.profileSubtitle.student", parent: "header.profileSubtitle.parent",
};
const profileRouteByRole: Record<string, string> = {
  admin: "/admin/settings/profile", coordinator: "/coordinator/settings/profile", teacher: "/teacher/settings/profile",
  student: "/student/profile", parent: "/parent/profile",
};

/** One account entry: details are disclosed in the menu, not tiny header gauges. */
const ProfileDropdown = () => {
  const { user, profile: authProfile, signOut } = useAuth();
  // Never join a newly authenticated actor to a previous actor's profile/role.
  const profile = authProfile?.id === user?.id ? authProfile : null;
  const { ownerKey } = useAccessibilityPreferenceControls();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const requestedDialogOwner = useRef<string | null>(null);
  const [menuOwner, setMenuOwner] = useState<string | null>(null);
  const [dialogOwner, setDialogOwner] = useState<string | null>(null);
  const navigate = useNavigate();
  const { t, i18n } = useTranslation("common");
  const { themeMode, setThemeMode } = useTheme();
  const { start: startTour } = useGuidedTour(profile?.role ?? "student");
  const isStudent = profile?.role === "student";
  const isTeacher = profile?.role === "teacher";
  const isParent = profile?.role === "parent";
  const level = useLevel(isStudent ? user?.id : undefined);
  const teacherCourses = useCourses(
    { page: 1, pageSize: 1, teacherId: isTeacher ? user?.id : undefined }, { enabled: isTeacher },
  );
  const linkedChildren = useLinkedChildren(isParent ? user?.id : undefined, { enabled: isParent });
  if (!user || !profile) return null;

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
  const displayName = profile.full_name?.trim() || t("user");
  // A stock portrait is not this person's identity; signed URLs stay intact.
  const avatarUrl = profile.avatar_url || undefined;
  const number = new Intl.NumberFormat(i18n.resolvedLanguage ?? i18n.language);
  const profileSubtitle = (() => {
    if (isStudent) {
      const current = level.isError ? undefined : level.data;
      return current && Number.isFinite(current.level) && current.level >= 1
        && Number.isFinite(current.xpTotal) && current.xpTotal >= 0
        ? t("header.profileSubtitle.studentLevel", { level: number.format(current.level), xp: number.format(current.xpTotal) })
        : t("header.profileSubtitle.student");
    }
    if (isTeacher) {
      const count = teacherCourses.isError ? undefined : teacherCourses.data?.count;
      return typeof count === "number" && Number.isInteger(count) && count >= 0
        ? t("header.profileSubtitle.teacherDetail", {
          department: profile.department?.trim() || t("header.profileSubtitle.teacher"),
          count, formattedCount: number.format(count),
        }) : t("header.profileSubtitle.teacher");
    }
    if (isParent) {
      const firstChild = linkedChildren.isError ? undefined : linkedChildren.data?.[0];
      const name = firstChild?.student_name?.trim();
      return name ? t("header.profileSubtitle.guardianOf", { name: getDisplayFirstName(name) }) : t("header.profileSubtitle.parent");
    }
    return t(profileSubtitleByRole[profile.role] ?? "header.profileSubtitle.student");
  })();

  return <>
  <DropdownMenu key={`menu:${ownerKey}`} dir={i18n.dir()} open={menuOwner === ownerKey} onOpenChange={(open) => setMenuOwner(open ? ownerKey : null)}>
    <DropdownMenuTrigger asChild>
      <Button ref={triggerRef} type="button" variant="ghost" size="icon" className="hdr-profile size-11 min-h-11 min-w-11 rounded-xl"
        aria-label={t("header.accountMenu", { name: displayName })} data-tour="profile">
        <Avatar className="size-8 border border-border">
          <AvatarImage src={avatarUrl} alt="" width={32} height={32} />
          <AvatarFallback className="bg-muted text-foreground"><User className="size-4" aria-hidden="true" /></AvatarFallback>
        </Avatar>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-64 max-w-[calc(100vw-1rem)]"
      onCloseAutoFocus={(event) => {
        // A menu-trigger restore must not steal focus from its newly opened dialog.
        if (requestedDialogOwner.current === ownerKey) event.preventDefault();
      }}>
      <DropdownMenuLabel className="flex min-w-0 flex-col gap-1">
        <bdi translate="no" className="text-sm font-semibold [overflow-wrap:anywhere]">{displayName}</bdi>
        <p className="text-sm font-normal text-muted-foreground [overflow-wrap:anywhere]">{profileSubtitle}</p>
        {user.email && <bdi translate="no" className="text-sm font-normal text-muted-foreground [overflow-wrap:anywhere]">{user.email}</bdi>}
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem asChild data-tour="settings">
        <Link to={profileRouteByRole[profile.role] ?? "/student/profile"}>
          <User className="size-4" aria-hidden="true" /><span>{t("myProfile")}</span>
        </Link>
      </DropdownMenuItem>
      {profile.role === "admin" && <DropdownMenuItem asChild>
        <Link to="/admin/settings/institution"><Building2 className="size-4" aria-hidden="true" /><span>{t("institutionSettings")}</span></Link>
      </DropdownMenuItem>}
      <DropdownMenuItem onSelect={() => {
        requestedDialogOwner.current = ownerKey;
        setDialogOwner(ownerKey);
      }}>
        <Type className="size-4" aria-hidden="true" /><span>{t("accessibility.menuLabel")}</span>
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={startTour}>
        <RotateCcw className="size-4" aria-hidden="true" /><span>{t("tour.takeTour")}</span>
      </DropdownMenuItem>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger aria-label={t("theme.label")}>
          <Sun className="size-4" aria-hidden="true" /><span>{t("theme.label")}</span>
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent>
          <DropdownMenuRadioGroup value={themeMode} onValueChange={(value) => {
            if (value === "light" || value === "dark" || value === "system") setThemeMode(value);
          }}>
            <DropdownMenuRadioItem value="light"><Sun className="size-4" aria-hidden="true" /><span>{t("theme.light")}</span></DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="dark"><Moon className="size-4" aria-hidden="true" /><span>{t("theme.dark")}</span></DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="system"><Monitor className="size-4" aria-hidden="true" /><span>{t("theme.system")}</span></DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuSubContent>
      </DropdownMenuSub>
      <DropdownMenuSeparator />
      <DropdownMenuItem onSelect={() => void handleSignOut()} variant="destructive">
        <LogOut className="size-4" aria-hidden="true" /><span>{t("auth.signOut")}</span>
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
  <ReadingDisplayDialog key={`reading:${ownerKey}`} open={dialogOwner === ownerKey} returnFocusRef={triggerRef}
    onOpenChange={(open) => {
      requestedDialogOwner.current = open ? ownerKey : null;
      setDialogOwner(open ? ownerKey : null);
    }} />
  </>;
};
export default ProfileDropdown;
