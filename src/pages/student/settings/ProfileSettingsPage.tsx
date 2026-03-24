import { Card } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { User } from 'lucide-react';
import EmailPreferencesSection from '@/components/shared/EmailPreferencesSection';

const ProfileSettingsPage = () => {
  const { profile } = useAuth();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Profile Settings</h1>

      {/* Profile Info Card */}
      <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
        <div
          className="px-6 py-4 flex items-center gap-2"
          style={{ background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)' }}
        >
          <User className="h-5 w-5 text-white" />
          <h2 className="text-lg font-bold tracking-tight text-white">Profile</h2>
        </div>
        <div className="p-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-blue-50 flex items-center justify-center">
              <User className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <p className="text-lg font-bold">{profile?.full_name ?? 'User'}</p>
              <p className="text-sm text-slate-500">{profile?.email ?? ''}</p>
              <p className="text-xs text-slate-400 capitalize">{profile?.role ?? ''}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Email Notification Preferences */}
      <EmailPreferencesSection />
    </div>
  );
};

export default ProfileSettingsPage;
