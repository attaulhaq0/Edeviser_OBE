// Feature: qa-partner-review-remediation — Req 15.3 (announcement attachments)
// Teacher-facing attachment manager: client-validated upload + signed-URL list
// for a single announcement. Uses Shadcn components and Sonner toasts.
import { useRef, useState } from "react";
import {
  useAnnouncementAttachments,
  useUploadAnnouncementAttachment,
  getAnnouncementAttachmentUrl,
  type AnnouncementAttachment,
} from "@/hooks/useAnnouncements";
import {
  validateAnnouncementAttachmentFile,
  FileValidationError,
} from "@/lib/fileUpload";
import { ANNOUNCEMENT_ATTACHMENT_ACCEPTED_LABEL } from "@/lib/schemas/announcementAttachment";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Paperclip, Upload, Download } from "lucide-react";
import { toast } from "sonner";

interface AnnouncementAttachmentManagerProps {
  announcementId: string;
}

const formatSize = (bytes: number | null): string => {
  if (!bytes) return "";
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

export const AnnouncementAttachmentManager = ({
  announcementId,
}: AnnouncementAttachmentManagerProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const { data: attachments, isLoading } =
    useAnnouncementAttachments(announcementId);
  const uploadMutation = useUploadAnnouncementAttachment();

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reset the input so selecting the same file again re-triggers onChange.
    event.target.value = "";
    if (!file) return;

    // CLIENT-SIDE validation before any upload (engineering-guardrails.md).
    try {
      validateAnnouncementAttachmentFile(file);
    } catch (err) {
      const message =
        err instanceof FileValidationError
          ? err.message
          : "That file could not be attached.";
      toast.error(message);
      return;
    }

    uploadMutation.mutate(
      { announcementId, file },
      {
        onSuccess: () => toast.success(`Attached "${file.name}"`),
        onError: (err) =>
          toast.error(
            err instanceof Error ? err.message : "Attachment upload failed"
          ),
      }
    );
  };

  const handleDownload = async (attachment: AnnouncementAttachment) => {
    setDownloadingId(attachment.id);
    try {
      const url = await getAnnouncementAttachmentUrl(attachment.storage_path);
      if (url) window.open(url, "_blank", "noopener,noreferrer");
      else toast.error("Could not generate a download link. Try again.");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="mt-3 border-t border-slate-100 pt-3">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
          <Paperclip className="h-3.5 w-3.5" /> Attachments
        </Label>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.png,.jpg,.jpeg"
          className="hidden"
          onChange={handleFileSelected}
          aria-hidden="true"
          tabIndex={-1}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7"
          disabled={uploadMutation.isPending}
          onClick={() => inputRef.current?.click()}
        >
          {uploadMutation.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Upload className="h-3.5 w-3.5" />
          )}
          Attach file
        </Button>
      </div>

      <p className="text-[11px] text-gray-400 mt-1">
        Up to 10MB · {ANNOUNCEMENT_ATTACHMENT_ACCEPTED_LABEL}
      </p>

      {isLoading ? (
        <p className="text-xs text-gray-400 mt-2">Loading attachments…</p>
      ) : (attachments ?? []).length === 0 ? (
        <p className="text-xs text-gray-400 mt-2">No attachments yet.</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {(attachments ?? []).map((a) => (
            <li
              key={a.id}
              className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2"
            >
              <Paperclip className="h-3.5 w-3.5 text-gray-400 shrink-0" />
              <span className="text-xs font-medium text-gray-700 truncate flex-1">
                {a.file_name}
              </span>
              {a.size_bytes ? (
                <span className="text-[11px] text-gray-400 shrink-0">
                  {formatSize(a.size_bytes)}
                </span>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 shrink-0"
                disabled={downloadingId === a.id}
                onClick={() => handleDownload(a)}
                aria-label={`Download ${a.file_name}`}
              >
                {downloadingId === a.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5 text-blue-600" />
                )}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AnnouncementAttachmentManager;
