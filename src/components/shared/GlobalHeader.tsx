import { Menu } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";
import NotificationBell from "@/components/shared/NotificationBell";
import ProfileDropdown from "@/components/shared/ProfileDropdown";
import SearchCommand from "@/components/shared/SearchCommand";
import RoleHeaderStats from "@/components/shared/RoleHeaderStats";
import StudentHeaderStats from "@/components/shared/StudentHeaderStats";
import { useSidebar } from "@/components/shared/SidebarContext";
import { Button } from "@/components/ui/button";
import RoleBrandLink from "@/components/shared/RoleBrandLink";
import type { UserRole } from "@/types/app";

const GlobalHeader = () => {
  const { profile } = useAuth();
  const { toggle, mobileOpen } = useSidebar();
  const { t } = useTranslation("common");

  const role = profile?.role ?? "student";

  return (
    <header className="sticky top-0 z-[100] h-(--app-header-h) w-full border-b-0 bg-card/95 backdrop-blur-md [&_button]:min-h-11 [&_button]:min-w-11">
      <div
        data-tour="top-bar"
        className="mx-auto flex h-full w-full items-center justify-between gap-3 px-4"
      >
        {/* Left: Mobile Toggle & Brand Logo */}
        <div className="flex items-center gap-3 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={toggle}
            className="rounded-lg text-muted-foreground hover:bg-muted min-[640px]:hidden"
            aria-label={t(mobileOpen ? "header.closeNavigation" : "header.openNavigation")}
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation"
            aria-haspopup="dialog"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </Button>

          {/* Desktop branding belongs to the overlaid sidebar; do not leave an
              invisible header link underneath it in the keyboard tab order. */}
          <RoleBrandLink userRole={role as UserRole} className="min-[640px]:hidden" />
        </div>

        {/* Center: Search Command */}
        <div className="absolute inset-x-0 mx-auto hidden min-[1280px]:block w-90">
          <SearchCommand showTrigger />
        </div>

        {/* Right: Role Stats, Bell & Profile */}
        <div className="ms-auto flex min-w-0 items-center gap-2.5">
          {role === "student" ? <StudentHeaderStats /> : null}
          <RoleHeaderStats />
          <div className="hidden min-[1024px]:block">
            <LanguageSwitcher />
          </div>
          <NotificationBell />
          <ProfileDropdown />
        </div>
      </div>
    </header>
  );
};

export default GlobalHeader;
