import { useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import {
  User,
  Camera,
  Loader2,
  Sun,
  Moon,
  Monitor,
  Shield,
  FileDown,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { uploadAvatarFile, FileValidationError } from "@/lib/fileUpload";
import EmailPreferencesSection from "@/components/shared/EmailPreferencesSection";
import { useTheme, type ThemePreference } from "@/providers/ThemeProvider";
import ExportDataButton from "@/components/shared/ExportDataButton";
import { useGenerateTranscript } from "@/hooks/useTranscript";
import { useStudentFees } from "@/hooks/useFees";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSemesters } from "@/hooks/useSemesters";

const ProfilePage = () => {
  const { profile, user } = useAuth();
  const { theme, setTheme } = useTheme();
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
    e.target.value = "";

    setIsUploading(true);
    try {
      const publicUrl = await uploadAvatarFile({ file, userId: user.id });

      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);

      if (error) throw new Error(error.message);

      setAvatarUrl(publicUrl);
      toast.success("Avatar updated");
    } catch (err) {
      const message =
        err instanceof FileValidationError
          ? err.message
          : "Failed to upload avatar. Please try again.";
      toast.error(message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Profile Settings</h1>

      {/* Profile Info Card */}
      <Card className="bg-white dark:bg-slate-900 border-0 shadow-md rounded-xl overflow-hidden">
        <div
          className="px-6 py-4 flex items-center gap-2"
          style={{
            background:
              "linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)",
          }}
        >
          <User className="h-5 w-5 text-white" />
          <h2 className="text-lg font-bold tracking-tight text-white">
            Profile
          </h2>
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
                  alt={profile?.full_name ?? "Avatar"}
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
      </Card>

      {/* Theme Preference */}
      <Card className="bg-white dark:bg-slate-900 border-0 shadow-md rounded-xl overflow-hidden">
        <div
          className="px-6 py-4 flex items-center gap-2"
          style={{
            background:
              "linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)",
          }}
        >
          <Sun className="h-5 w-5 text-white" />
          <h2 className="text-lg font-bold tracking-tight text-white">
            Appearance
          </h2>
        </div>
        <div className="p-6">
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Choose how the platform looks to you.
          </p>
          <div
            className="flex gap-2"
            role="radiogroup"
            aria-label="Theme preference"
          >
            {[
              { value: "light" as ThemePreference, label: "Light", icon: Sun },
              { value: "dark" as ThemePreference, label: "Dark", icon: Moon },
              {
                value: "system" as ThemePreference,
                label: "System",
                icon: Monitor,
              },
            ].map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={theme === value}
                onClick={() => setTheme(value)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                  theme === value
                    ? "bg-blue-600 text-white"
                    : "bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 border border-gray-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Email Notification Preferences */}
      <EmailPreferencesSection />

      {/* GDPR Data Export — students only */}
      {profile?.role === "student" && user && (
        <Card className="bg-white dark:bg-slate-900 border-0 shadow-md rounded-xl overflow-hidden">
          <div
            className="px-6 py-4 flex items-center gap-2"
            style={{
              background:
                "linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)",
            }}
          >
            <Shield className="h-5 w-5 text-white" />
            <h2 className="text-lg font-bold tracking-tight text-white">
              Data Export
            </h2>
          </div>
          <div className="p-6">
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Download all your personal data (profile, grades, XP, journals,
              badges, habits) in JSON or CSV format.
            </p>
            <ExportDataButton studentId={user.id} />
          </div>
        </Card>
      )}

      {/* Transcript Download — students only */}
      {profile?.role === "student" && user && (
        <TranscriptSection studentId={user.id} />
      )}

      {/* Fee Status — students only */}
      {profile?.role === "student" && user && (
        <FeeStatusSection studentId={user.id} />
      )}
    </div>
  );
};

// ─── Transcript Download Section ────────────────────────────────────────────

const TranscriptSection = ({ studentId }: { studentId: string }) => {
  const [semesterId, setSemesterId] = useState<string>("");
  const { data: semesters = [] } = useSemesters();
  const generateTranscript = useGenerateTranscript();

  const handleDownload = () => {
    generateTranscript.mutate(
      {
        student_id: studentId,
        semester_id:
          semesterId && semesterId !== "__all__" ? semesterId : undefined,
      },
      {
        onSuccess: (result) => {
          if (result.download_url) {
            window.open(result.download_url, "_blank");
            toast.success("Transcript generated");
          }
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  return (
    <Card className="bg-white dark:bg-slate-900 border-0 shadow-md rounded-xl overflow-hidden">
      <div
        className="px-6 py-4 flex items-center gap-2"
        style={{
          background:
            "linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)",
        }}
      >
        <FileDown className="h-5 w-5 text-white" />
        <h2 className="text-lg font-bold tracking-tight text-white">
          Transcript
        </h2>
      </div>
      <div className="p-6">
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          Generate and download your academic transcript as a PDF.
        </p>
        <div className="flex items-end gap-3">
          <div className="flex-1 max-w-xs">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">
              Semester (optional)
            </span>
            <Select value={semesterId} onValueChange={setSemesterId}>
              <SelectTrigger className="bg-white dark:bg-slate-800">
                <SelectValue placeholder="All semesters (cumulative)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All semesters</SelectItem>
                {semesters.map((s: { id: string; name: string }) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={handleDownload}
            disabled={generateTranscript.isPending}
            className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95"
          >
            {generateTranscript.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="h-4 w-4" />
            )}
            Download Transcript
          </Button>
        </div>
      </div>
    </Card>
  );
};

// ─── Fee Status Section ─────────────────────────────────────────────────────

const FeeStatusSection = ({ studentId }: { studentId: string }) => {
  const { data: fees = [], isLoading } = useStudentFees(studentId);

  const paid = fees.filter((f) => f.status === "paid");
  const outstanding = fees.filter(
    (f) => f.status === "pending" || f.status === "overdue"
  );

  if (isLoading) return null;
  if (fees.length === 0) return null;

  return (
    <Card className="bg-white dark:bg-slate-900 border-0 shadow-md rounded-xl overflow-hidden">
      <div
        className="px-6 py-4 flex items-center gap-2"
        style={{
          background:
            "linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)",
        }}
      >
        <DollarSign className="h-5 w-5 text-white" />
        <h2 className="text-lg font-bold tracking-tight text-white">
          Fee Status
        </h2>
      </div>
      <div className="p-6 space-y-3">
        {outstanding.length > 0 && (
          <div>
            <p className="text-xs font-bold tracking-widest uppercase text-red-500 mb-2">
              Outstanding
            </p>
            {outstanding.map((f) => (
              <div
                key={f.id}
                className="flex items-center justify-between p-3 rounded-lg border border-red-100 bg-red-50 dark:bg-red-950/20 mb-1"
              >
                <span className="text-sm font-medium">${f.amount_paid}</span>
                <Badge
                  variant="outline"
                  className={
                    f.status === "overdue"
                      ? "text-red-600 border-red-300"
                      : "text-yellow-600 border-yellow-300"
                  }
                >
                  {f.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
        {paid.length > 0 && (
          <div>
            <p className="text-xs font-bold tracking-widest uppercase text-green-600 mb-2">
              Paid
            </p>
            {paid.map((f) => (
              <div
                key={f.id}
                className="flex items-center justify-between p-3 rounded-lg border border-green-100 bg-green-50 dark:bg-green-950/20 mb-1"
              >
                <span className="text-sm font-medium">${f.amount_paid}</span>
                <Badge
                  variant="outline"
                  className="text-green-600 border-green-300"
                >
                  paid
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};

export default ProfilePage;
