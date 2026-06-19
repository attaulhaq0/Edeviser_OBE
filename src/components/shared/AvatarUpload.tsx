import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAvatarUpload } from "@/hooks/useAvatarUpload";
import { Upload, X } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export interface AvatarUploadProps {
  userId: string;
  currentUrl?: string | null;
}

/**
 * Avatar upload component with dropzone and preview.
 * Validates type/size, resizes, uploads to Supabase Storage, updates profile.
 *
 * Design: ADR-04
 * Requirements: 2.18
 *
 * @example
 * <AvatarUpload userId={user.id} currentUrl={profile.avatar_url} />
 */
const AvatarUpload = ({ currentUrl }: AvatarUploadProps) => {
  const { t } = useTranslation("common");
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { uploadAvatar, isPending } = useAvatarUpload();

  const handleFileSelect = async (file: File) => {
    // Validate file type
    const validTypes = ["image/png", "image/jpeg", "image/webp"];
    if (!validTypes.includes(file.type)) {
      toast.error(t("avatar.invalidType"));
      return;
    }

    // Validate file size (2 MB max)
    if (file.size > 2 * 1024 * 1024) {
      toast.error(t("avatar.fileTooLarge"));
      return;
    }

    setSelectedFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    const file = files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error(t("avatar.selectFile"));
      return;
    }

    try {
      await uploadAvatar({ file: selectedFile });
      toast.success(t("avatar.uploadSuccess"));
      setPreview(null);
      setSelectedFile(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    }
  };

  const handleCancel = () => {
    setPreview(null);
    setSelectedFile(null);
  };

  return (
    <Card className="bg-white border-0 shadow-md rounded-xl p-6">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-bold tracking-tight">
            {t("avatar.title")}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {t("avatar.description")}
          </p>
        </div>

        {/* Current avatar display */}
        {currentUrl && !preview && (
          <div className="flex items-center gap-4">
            <img
              src={`${currentUrl}?width=128&height=128&resize=cover`}
              alt="Current avatar"
              loading="lazy"
              decoding="async"
              className="h-24 w-24 rounded-lg object-cover"
            />
            <div>
              <p className="text-sm text-gray-600">{t("avatar.current")}</p>
            </div>
          </div>
        )}

        {/* Preview */}
        {preview && (
          <div className="flex items-center gap-4">
            <img
              src={preview}
              alt="Preview"
              className="h-24 w-24 rounded-lg object-cover"
            />
            <div>
              <p className="text-sm text-gray-600">{t("avatar.preview")}</p>
              <p className="text-xs text-gray-500 mt-1">{selectedFile?.name}</p>
            </div>
          </div>
        )}

        {/* Dropzone */}
        {!preview && (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
          >
            <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-700">
              {t("avatar.dragDrop")}
            </p>
            <p className="text-xs text-gray-500 mt-1">{t("avatar.formats")}</p>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  handleFileSelect(e.target.files[0]);
                }
              }}
              className="hidden"
              id="avatar-input"
            />
            <label htmlFor="avatar-input" className="block mt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="cursor-pointer"
              >
                {t("avatar.selectFile")}
              </Button>
            </label>
          </div>
        )}

        {/* Action buttons */}
        {preview && (
          <div className="flex gap-3">
            <Button
              onClick={handleUpload}
              disabled={isPending}
              className="flex-1 bg-gradient-to-r from-teal-500 to-blue-600 text-white active:scale-95"
            >
              {isPending ? t("common.uploading") : t("avatar.upload")}
            </Button>
            <Button
              onClick={handleCancel}
              variant="outline"
              disabled={isPending}
              className="flex-1"
            >
              <X className="h-4 w-4 me-1" />
              {t("common.cancel")}
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};

export default AvatarUpload;
