// Feature: qa-partner-review-remediation — Req 15.3 (announcement attachments)
// Read-only attachment list with signed-URL download. Used on the student
// announcement detail view; the private bucket is accessed via signed URLs.
import { useState } from "react";
import {
  useAnnouncementAttachments,
  getAnnouncementAttachmentUrl,
  type AnnouncementAttachment,
} from "@/hooks/useAnnouncements";
import { Button } from "@/components/ui/button";
import { Loader2, Paperclip, Download } from "lucide-react";
import { toast } from "sonner";

interface AnnouncementAttachmentListProps {
  announcementId: string;
}

const formatSize = (bytes: number | null): string => {
  if (!bytes) return "";
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

export const AnnouncementAttachmentList = ({
  announcementId,
}: AnnouncementAttachmentListProps) => {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const { data: attachments, isLoading } =
    useAnnouncementAttachments(announcementId);

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

  // Nothing to show while loading or when there are no attachments.
  if (isLoading || (attachments ?? []).length === 0) return null;

  return (
    <div className="mt-6 pt-4 border-t border-slate-100">
      <p className="text-xs font-semibold text-gray-600 flex items-center gap-1.5 mb-2">
        <Paperclip className="h-3.5 w-3.5" /> Attachments
      </p>
      <ul className="space-y-1.5">
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
              className="h-7 gap-1.5 shrink-0"
              disabled={downloadingId === a.id}
              onClick={() => handleDownload(a)}
              aria-label={`Download ${a.file_name}`}
            >
              {downloadingId === a.id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5 text-blue-600" />
              )}
              Download
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AnnouncementAttachmentList;
