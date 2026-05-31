// =============================================================================
// useTutorAttachmentUpload — upload AI Tutor chat attachments (Requirement 4.5)
// =============================================================================
//
// Uploads an image (JPG/PNG <= 5MB) or document (PDF/DOCX <= 10MB) to the
// private `tutor-attachments` Storage bucket under the authenticated user's
// own folder (`<auth.uid()>/<uuid>-<filename>`) and returns a short-lived
// signed URL for the `chat-with-tutor` edge function to read.
//
// The mutation THROWS on any failure (not authenticated, validation, upload,
// or signing) so the calling send (ChatPanel, task 12.1) can await the upload
// and abort the message send rather than passing an empty/undefined reference.

import { useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { uploadTutorAttachmentFile } from "@/lib/fileUpload";

/**
 * Return type for {@link useTutorAttachmentUpload}.
 */
interface UseTutorAttachmentUploadReturn {
  /**
   * Upload a single attachment and resolve to its signed URL.
   * Rejects (throws) on failure so the caller can abort the send.
   */
  uploadAttachment: (file: File) => Promise<string>;
  /** Whether an upload is currently in progress. */
  isPending: boolean;
  /** The error from the most recent failed upload, if any. */
  error: Error | null;
}

/**
 * Hook for uploading AI Tutor chat attachments.
 *
 * Unlike most mutation hooks in this codebase, this hook intentionally does
 * NOT surface its own toast on error: the caller (ChatPanel) owns the
 * user-facing error and the decision to abort the send. The hook simply
 * propagates the thrown error via `uploadAttachment`'s rejected promise.
 *
 * Usage:
 * ```tsx
 * const { uploadAttachment, isPending } = useTutorAttachmentUpload();
 *
 * try {
 *   const url = await uploadAttachment(file);
 *   // pass `url` to chat-with-tutor
 * } catch (err) {
 *   toast.error(err instanceof Error ? err.message : "Upload failed");
 *   return; // abort the send
 * }
 * ```
 */
export const useTutorAttachmentUpload = (): UseTutorAttachmentUploadReturn => {
  const { user } = useAuth();

  const mutation = useMutation<string, Error, File>({
    mutationFn: async (file: File): Promise<string> => {
      if (!user) {
        throw new Error("You must be signed in to attach files.");
      }
      return uploadTutorAttachmentFile({ file, userId: user.id });
    },
  });

  const uploadAttachment = useCallback(
    (file: File) => mutation.mutateAsync(file),
    [mutation]
  );

  return {
    uploadAttachment,
    isPending: mutation.isPending,
    error: mutation.error,
  };
};
