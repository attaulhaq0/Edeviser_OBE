import { KeyRound, Monitor, Moon, Sun } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useTheme, type ThemePreference } from "@/providers/ThemeProvider";
import { Button } from "@/components/ui/button";
import AvatarUpload from "@/components/shared/AvatarUpload";
import {
  ProfileSectionCard,
  ProfileSettingRow,
} from "@/components/shared/RoleProfileSurface";

interface RoleProfileAccountPanelsProps {
  appearanceTitle?: string;
  includeAvatar?: boolean;
}

const RoleProfileAccountPanels = ({
  appearanceTitle,
  includeAvatar = true,
}: RoleProfileAccountPanelsProps) => {
  const { t } = useTranslation("common");
  const { profile } = useAuth();
  const { theme, setTheme } = useTheme();

  return (
    <>
      <ProfileSectionCard
        emoji="🎨"
        title={appearanceTitle ?? t("roleProfile.appearance")}
      >
        <div
          className="grid grid-cols-3 gap-2 p-4"
          role="radiogroup"
          aria-label={appearanceTitle ?? t("roleProfile.appearance")}
        >
          {(
            [
              ["light", t("theme.light"), Sun],
              ["dark", t("theme.dark"), Moon],
              ["system", t("theme.system"), Monitor],
            ] as const
          ).map(([value, label, Icon]) => (
            <Button
              key={value}
              type="button"
              role="radio"
              aria-checked={theme === value}
              variant={theme === value ? "default" : "outline"}
              className="h-auto flex-col gap-1.5 rounded-xl py-3"
              onClick={() => setTheme(value as ThemePreference)}
            >
              <Icon className="size-4" aria-hidden="true" />
              <span className="text-xs">{label}</span>
            </Button>
          ))}
        </div>
      </ProfileSectionCard>

      <ProfileSectionCard emoji="🔒" title={t("roleProfile.security")}>
        <ProfileSettingRow
          title={t("roleProfile.changePassword")}
          description={t("roleProfile.securityDescription")}
          trailing={
            <Button asChild variant="outline" size="sm">
              <Link to="/update-password">
                <KeyRound className="size-4" aria-hidden="true" />
                {t("roleProfile.changePassword")}
              </Link>
            </Button>
          }
        />
        <ProfileSettingRow
          title={t("roleProfile.notifications")}
          trailing={
            <Button asChild variant="outline" size="sm">
              <Link to={`/${profile?.role ?? "student"}/notifications`}>
                {t("roleProfile.open")}
              </Link>
            </Button>
          }
        />
      </ProfileSectionCard>

      {includeAvatar && profile?.id ? (
        <div id="profile-photo">
          <AvatarUpload userId={profile.id} currentUrl={profile.avatar_url} />
        </div>
      ) : null}
    </>
  );
};

export default RoleProfileAccountPanels;
