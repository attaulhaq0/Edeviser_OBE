import { useRef, useState } from "react";
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
  const { uploadAvatar, deleteAvatar, isPending } = useAvatarUpload();
  const inputRef = useRef<HTMLInputElement>(null);

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
          <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50 p-3">
            <div className="flex items-center gap-3">
              <img
                src={currentUrl}
                alt="Current avatar"
                loading="lazy"
                decoding="async"
                className="h-14 w-14 rounded-xl object-cover border border-slate-200"
              />
              <div>
                <p className="text-xs font-bold text-slate-800">
                  {t("avatar.current", "Current photo")}
                </p>
                <p className="text-[11px] text-slate-500">
                  {t("avatar.uploaded", "Uploaded avatar active")}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={async () => {
                try {
                  await deleteAvatar();
                } catch {
                  // toast handled inside hook
                }
              }}
              className="text-xs font-bold text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              <X className="h-3.5 w-3.5 me-1" />
              {t("avatar.remove", "Remove")}
            </Button>
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
            className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors"
          >
            <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-700">
              {t("avatar.dragDrop")}
            </p>
            <p className="text-xs text-gray-500 mt-1">{t("avatar.formats")}</p>
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  handleFileSelect(e.target.files[0]);
                }
                // Reset so re-selecting the same file still fires onChange.
                e.target.value = "";
              }}
              className="hidden"
              id="avatar-input"
              aria-hidden="true"
              tabIndex={-1}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-4 cursor-pointer"
              onClick={() => inputRef.current?.click()}
            >
              {t("avatar.selectFile")}
            </Button>
          </div>
        )}

        {/* Action buttons */}
        {preview && (
          <div className="flex gap-3">
            <Button
              onClick={handleUpload}
              disabled={isPending}
              variant="tactile"
              className="flex-1"
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
