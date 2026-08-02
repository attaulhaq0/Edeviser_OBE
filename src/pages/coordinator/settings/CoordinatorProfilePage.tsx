import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { User } from "lucide-react";
import AvatarUpload from "@/components/shared/AvatarUpload";
import {
  AdminCardHeader,
  adminCardClass,
  adminPageClass,
} from "@/design-system";

/**
 * Coordinator profile page with avatar upload.
 * Design: ADR-04, ADR-15
 * Requirements: 2.18
 */
const CoordinatorProfilePage = () => {
  const { profile } = useAuth();
  const { t } = useTranslation("common");

  return (
    <div className={adminPageClass}>
      <div>
        <h1 className="text-xl font-black tracking-tight text-slate-900">
          {t("coordinatorProfile.title", "Profile Settings")}
        </h1>
        <p className="mt-0.5 text-xs text-slate-500">
          {t(
            "coordinatorProfile.subtitle",
            "Update your avatar and profile details."
          )}
        </p>
      </div>

      {/* Profile Info Card */}
      <div className={`${adminCardClass} overflow-hidden p-0`}>
        <AdminCardHeader
          icon={User}
          title={t("coordinatorProfile.info", "Profile Information")}
        />
        <div className="p-6">
          <div className="flex items-center gap-4">
            {profile?.avatar_url ? (
              <img
                src={`${profile.avatar_url}?width=64&height=64&resize=cover`}
                alt={profile.full_name}
                loading="lazy"
                decoding="async"
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              <div className="h-16 w-16 rounded-full bg-blue-50 flex items-center justify-center">
                <User className="h-8 w-8 text-blue-600" />
              </div>
            )}
            <div>
              <p className="text-lg font-bold">
                {profile?.full_name ?? "User"}
              </p>
              <p className="text-sm text-slate-500">{profile?.email ?? ""}</p>
              <p className="text-xs text-slate-400 capitalize">
                {profile?.role ?? ""}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Avatar Upload */}
      {profile?.id && (
        <AvatarUpload userId={profile.id} currentUrl={profile?.avatar_url} />
      )}
    </div>
  );
};

export default CoordinatorProfilePage;
