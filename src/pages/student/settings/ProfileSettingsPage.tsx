import { useAuth } from "@/hooks/useAuth";
import { User } from "lucide-react";
import AvatarUpload from "@/components/shared/AvatarUpload";
import EmailPreferencesSection from "@/components/shared/EmailPreferencesSection";
import { PCard, SectionHeader } from "@/design-system";

const ProfileSettingsPage = () => {
  const { profile } = useAuth();

  return (
    <div className="space-y-6">
      <SectionHeader
        icon={User}
        title="Profile Settings"
        description="Update your avatar and email preferences."
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
            Profile
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
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
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

      {/* Email Notification Preferences */}
      <EmailPreferencesSection />
    </div>
  );
};

export default ProfileSettingsPage;
