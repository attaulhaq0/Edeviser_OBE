import { supabase } from '@/lib/supabase';

// ─── Constants ──────────────────────────────────────────────────────────────

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx', 'txt', 'png', 'jpg', 'jpeg', 'zip'];
const BUCKET_NAME = 'submissions';

// ─── Validation ─────────────────────────────────────────────────────────────

export class FileValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FileValidationError';
  }
}

function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
}

export function validateFile(file: File): void {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new FileValidationError(
      `File size exceeds the 10MB limit. Your file is ${(file.size / (1024 * 1024)).toFixed(1)}MB.`,
    );
  }

  const ext = getFileExtension(file.name);
  if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
    throw new FileValidationError(
      `File type ".${ext || '(none)'}" is not allowed. Accepted types: ${ALLOWED_EXTENSIONS.join(', ')}.`,
    );
  }
}

// ─── Upload ─────────────────────────────────────────────────────────────────

export interface UploadFileParams {
  file: File;
  assignmentId: string;
  studentId: string;
  institutionId: string;
}

export async function uploadSubmissionFile(params: UploadFileParams): Promise<string> {
  const { file, assignmentId, studentId, institutionId } = params;

  validateFile(file);

  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${institutionId}/${assignmentId}/${studentId}/${timestamp}_${safeName}`;

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(path, file);

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(path);

  return urlData.publicUrl;
}
