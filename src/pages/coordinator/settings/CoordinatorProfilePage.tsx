import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { User } from "lucide-react";
import AvatarUpload from "@/components/shared/AvatarUpload";
import { PCard, SectionHeader } from "@/design-system";

/**
 * Coordinator profile page with avatar upload.
 * Design: ADR-04, ADR-15
 * Requirements: 2.18
 */
const CoordinatorProfilePage = () => {
  const { profile } = useAuth();
  const { t } = useTranslation("common");

  return (
    <div className="space-y-6">
      <SectionHeader
        icon={User}
        title={t("coordinatorProfile.title", "Profile Settings")}
        description={t(
          "coordinatorProfile.subtitle",
          "Update your avatar and profile details."
        )}
      />

      {/* Profile Info Card */}
      <PCard className="overflow-hidden gap-0 py-0">
        <div
          className="flex items-center gap-2 px-6 py-4"
          style={{
            background: "var(--brand-gradient)",
          }}
        >
          <User className="h-5 w-5 text-white" />
          <h2 className="text-lg font-bold tracking-tight text-white">
            {t("coordinatorProfile.info", "Profile Information")}
          </h2>
        </div>
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
      </PCard>

      {/* Avatar Upload */}
      {profile?.id && (
        <AvatarUpload userId={profile.id} currentUrl={profile?.avatar_url} />
      )}
    </div>
  );
};

export default CoordinatorProfilePage;
