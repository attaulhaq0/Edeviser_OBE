// =============================================================================
// EvidenceUploader — Drag-and-drop file upload area, max 3 files, 5MB limit,
// accepted types (jpg, png, pdf, doc, docx), file preview thumbnails,
// remove button per file
// =============================================================================

import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Upload,
  X,
  FileText,
  Image as ImageIcon,
  AlertCircle,
} from "lucide-react";

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_FILES = 3;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ACCEPTED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const ACCEPTED_EXTENSIONS = ".jpg,.jpeg,.png,.pdf,.doc,.docx";

// ─── Types ───────────────────────────────────────────────────────────────────

interface EvidenceUploaderProps {
  /** Currently selected files */
  files: File[];
  /** Called when files change (add or remove) */
  onChange: (files: File[]) => void;
  /** Maximum number of files allowed */
  maxFiles?: number;
  /** Whether the uploader is disabled */
  disabled?: boolean;
  className?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isAcceptedType(file: File): boolean {
  return ACCEPTED_MIME_TYPES.includes(file.type);
}

function isWithinSizeLimit(file: File): boolean {
  return file.size <= MAX_FILE_SIZE_BYTES;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}

// ─── File Preview Thumbnail ──────────────────────────────────────────────────

interface FileThumbnailProps {
  file: File;
  onRemove: () => void;
  disabled?: boolean;
}

const FileThumbnail = ({ file, onRemove, disabled }: FileThumbnailProps) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Generate preview URL for images
  if (isImageFile(file) && !previewUrl) {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  }

  return (
    <div className="group relative flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
      {/* Thumbnail */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt={file.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <FileText className="h-5 w-5 text-gray-400" />
        )}
      </div>

      {/* File Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-700">
          {file.name}
        </p>
        <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
      </div>

      {/* Remove Button */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-8 shrink-0 p-0 text-gray-400 hover:text-red-500"
        onClick={onRemove}
        disabled={disabled}
        aria-label={`Remove ${file.name}`}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};

// ─── Component ───────────────────────────────────────────────────────────────

const EvidenceUploader = ({
  files,
  onChange,
  maxFiles = MAX_FILES,
  disabled = false,
  className,
}: EvidenceUploaderProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canAddMore = files.length < maxFiles;

  const validateAndAddFiles = useCallback(
    (newFiles: FileList | File[]) => {
      setError(null);
      const fileArray = Array.from(newFiles);
      const validFiles: File[] = [];

      for (const file of fileArray) {
        if (files.length + validFiles.length >= maxFiles) {
          setError(`Maximum ${maxFiles} files allowed`);
          break;
        }
        if (!isAcceptedType(file)) {
          setError(
            `${file.name}: unsupported file type. Accepted: JPG, PNG, PDF, DOC, DOCX`
          );
          continue;
        }
        if (!isWithinSizeLimit(file)) {
          setError(`${file.name}: file exceeds 5MB limit`);
          continue;
        }
        validFiles.push(file);
      }

      if (validFiles.length > 0) {
        onChange([...files, ...validFiles]);
      }
    },
    [files, maxFiles, onChange]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled && canAddMore) {
        setIsDragOver(true);
      }
    },
    [disabled, canAddMore]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      if (disabled || !canAddMore) return;

      const droppedFiles = e.dataTransfer.files;
      if (droppedFiles.length > 0) {
        validateAndAddFiles(droppedFiles);
      }
    },
    [disabled, canAddMore, validateAndAddFiles]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = e.target.files;
      if (selectedFiles && selectedFiles.length > 0) {
        validateAndAddFiles(selectedFiles);
      }
      // Reset input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [validateAndAddFiles]
  );

  const handleBrowseClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleRemoveFile = useCallback(
    (index: number) => {
      setError(null);
      onChange(files.filter((_, i) => i !== index));
    },
    [files, onChange]
  );

  return (
    <div className={cn("space-y-3", className)}>
      {/* Drop Zone */}
      {/* Hidden file input — placed outside drop zone to avoid click propagation */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS}
        multiple
        className="hidden"
        onChange={handleFileInputChange}
        disabled={disabled}
        aria-hidden="true"
      />

      {canAddMore && (
        <div
          className={cn(
            "relative flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 transition-colors",
            isDragOver
              ? "border-blue-400 bg-blue-50"
              : "border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100",
            disabled && "cursor-not-allowed opacity-50"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={disabled ? undefined : handleBrowseClick}
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-label="Upload evidence files"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleBrowseClick();
            }
          }}
        >
          <div className="flex flex-col items-center gap-2 text-center">
            {isDragOver ? (
              <ImageIcon className="h-8 w-8 text-blue-500" />
            ) : (
              <Upload className="h-8 w-8 text-gray-400" />
            )}
            <div>
              <p className="text-sm font-medium text-gray-600">
                {isDragOver
                  ? "Drop files here"
                  : "Drag & drop files or click to browse"}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                JPG, PNG, PDF, DOC, DOCX — max 5MB each — up to {maxFiles} files
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div
          className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600"
          role="alert"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => (
            <FileThumbnail
              key={`${file.name}-${file.size}-${index}`}
              file={file}
              onRemove={() => handleRemoveFile(index)}
              disabled={disabled}
            />
          ))}
          <p className="text-xs text-gray-400">
            {files.length} of {maxFiles} files selected
          </p>
        </div>
      )}
    </div>
  );
};

export default EvidenceUploader;
export type { EvidenceUploaderProps };
export { MAX_FILES, MAX_FILE_SIZE_BYTES, ACCEPTED_MIME_TYPES };
