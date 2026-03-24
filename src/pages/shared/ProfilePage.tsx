import { useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { User, Camera, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { uploadAvatarFile, FileValidationError } from '@/lib/fileUpload';
import EmailPreferencesSection from '@/components/shared/EmailPreferencesSection';

const ProfilePage = () => {
  const { profile, user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const displayAvatarUrl = avatarUrl ?? profile?.avatar_url ?? null;

  const handleAvatarClick = () => {
    if (!isUploading) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Reset input so the same file can be re-selected
    e.target.value = '';

    setIsUploading(true);
    try {
      const publicUrl = await uploadAvatarFile({ file, userId: user.id });

      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (error) throw new Error(error.message);

      setAvatarUrl(publicUrl);
      toast.success('Avatar updated');
    } catch (err) {
      const message = err instanceof FileValidationError
        ? err.message
        : 'Failed to upload avatar. Please try again.';
      toast.error(message);
    } finally {
      setIsUploading(false);
    }
  };

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
            <button
              type="button"
              onClick={handleAvatarClick}
              disabled={isUploading}
              className="relative group cursor-pointer rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed"
              aria-label="Upload avatar"
            >
              {displayAvatarUrl ? (
                <img
                  src={displayAvatarUrl}
                  alt={profile?.full_name ?? 'Avatar'}
                  className="h-16 w-16 rounded-full object-cover"
                />
              ) : (
                <div className="h-16 w-16 rounded-full bg-blue-50 flex items-center justify-center">
                  <User className="h-8 w-8 text-blue-600" />
                </div>
              )}
              {/* Overlay */}
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                {isUploading ? (
                  <Loader2 className="h-5 w-5 text-white animate-spin" />
                ) : (
                  <Camera className="h-5 w-5 text-white" />
                )}
              </div>
              {/* Always-visible spinner when uploading */}
              {isUploading && (
                <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                  <Loader2 className="h-5 w-5 text-white animate-spin" />
                </div>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleFileChange}
              className="hidden"
              aria-hidden="true"
            />
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

export default ProfilePage;
