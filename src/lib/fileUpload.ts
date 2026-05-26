import { supabase } from "@/lib/supabase";

// ─── Constants ──────────────────────────────────────────────────────────────

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXTENSIONS = [
  "pdf",
  "doc",
  "docx",
  "txt",
  "png",
  "jpg",
  "jpeg",
  "zip",
];
const BUCKET_NAME = "submissions";

const AVATAR_MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2MB
const AVATAR_ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];
const AVATAR_BUCKET = "avatars";

// ─── Validation ─────────────────────────────────────────────────────────────

export class FileValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FileValidationError";
  }
}

function getFileExtension(filename: string): string {
  const parts = filename.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "";
}

/**
 * Sanitize a storage path to prevent path traversal attacks.
 * Rejects paths containing `..` sequences that could escape the intended directory.
 */
function assertNoPathTraversal(path: string): void {
  if (path.includes("..")) {
    throw new FileValidationError(
      "Invalid file path: path traversal sequences are not allowed."
    );
  }
}

export function validateFile(file: File): void {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new FileValidationError(
      `File size exceeds the 10MB limit. Your file is ${(
        file.size /
        (1024 * 1024)
      ).toFixed(1)}MB.`
    );
  }

  const ext = getFileExtension(file.name);
  if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
    throw new FileValidationError(
      `File type ".${
        ext || "(none)"
      }" is not allowed. Accepted types: ${ALLOWED_EXTENSIONS.join(", ")}.`
    );
  }

  // Reject filenames with path traversal sequences
  assertNoPathTraversal(file.name);
}

// ─── Upload ─────────────────────────────────────────────────────────────────

export interface UploadFileParams {
  file: File;
  assignmentId: string;
  studentId: string;
  institutionId: string;
}

export async function uploadSubmissionFile(
  params: UploadFileParams
): Promise<string> {
  const { file, assignmentId, studentId, institutionId } = params;

  validateFile(file);

  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${institutionId}/${assignmentId}/${studentId}/${timestamp}_${safeName}`;

  // Guard against path traversal in the constructed storage path
  assertNoPathTraversal(path);

  const { error } = await supabase.storage.from(BUCKET_NAME).upload(path, file);

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  // Return the storage path. The `submissions` bucket is private, so
  // consumers must call getSignedUrl("submissions", path) at READ time.
  // See src/lib/storageUrl.ts.
  return path;
}

// ─── Avatar Upload ──────────────────────────────────────────────────────────

export function validateAvatarFile(file: File): void {
  if (file.size > AVATAR_MAX_SIZE_BYTES) {
    throw new FileValidationError(
      `File size exceeds the 2MB limit. Your file is ${(
        file.size /
        (1024 * 1024)
      ).toFixed(1)}MB.`
    );
  }

  if (!AVATAR_ALLOWED_TYPES.includes(file.type)) {
    throw new FileValidationError(
      "Only image files are allowed (JPG, PNG, GIF, WebP)."
    );
  }
}

export interface UploadAvatarParams {
  file: File;
  userId: string;
}

export async function uploadAvatarFile(
  params: UploadAvatarParams
): Promise<string> {
  const { file, userId } = params;

  validateAvatarFile(file);

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${userId}/avatar_${Date.now()}.${ext}`;

  // Guard against path traversal in the constructed storage path
  assertNoPathTraversal(path);

  const { error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, file, { upsert: true });

  if (error) {
    throw new Error(`Avatar upload failed: ${error.message}`);
  }

  const { data: urlData } = supabase.storage
    .from(AVATAR_BUCKET)
    .getPublicUrl(path);

  return urlData.publicUrl;
}
