// Feature: qa-partner-review-remediation — Req 15.3 (announcement attachments)
// Client-side file validation for announcement attachments. Mirrors the avatar
// upload schema pattern and is consumed by validateAnnouncementAttachmentFile
// in src/lib/fileUpload.ts so the same allow-list is enforced before any upload.
import { z } from "zod";

/** Documents are capped at 10MB, consistent with submission uploads. */
export const ANNOUNCEMENT_ATTACHMENT_MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

/** Allowed MIME types — common documents and images teachers attach. */
export const ANNOUNCEMENT_ATTACHMENT_ALLOWED_TYPES: readonly string[] = [
  "application/pdf",
  "application/msword", // .doc
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/vnd.ms-powerpoint", // .ppt
  "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
  "application/vnd.ms-excel", // .xls
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "text/plain",
  "image/png",
  "image/jpeg",
];

/** Human-readable list of accepted formats for error/help copy. */
export const ANNOUNCEMENT_ATTACHMENT_ACCEPTED_LABEL =
  "PDF, Word, PowerPoint, Excel, TXT, PNG, or JPG";

export const announcementAttachmentSchema = z.object({
  file: z
    .instanceof(File)
    .refine(
      (file) => ANNOUNCEMENT_ATTACHMENT_ALLOWED_TYPES.includes(file.type),
      {
        message: `Unsupported file type. Accepted formats: ${ANNOUNCEMENT_ATTACHMENT_ACCEPTED_LABEL}.`,
      }
    )
    .refine((file) => file.size <= ANNOUNCEMENT_ATTACHMENT_MAX_SIZE_BYTES, {
      message: `File exceeds the 10MB limit.`,
    }),
});

export type AnnouncementAttachmentInput = z.infer<
  typeof announcementAttachmentSchema
>;
