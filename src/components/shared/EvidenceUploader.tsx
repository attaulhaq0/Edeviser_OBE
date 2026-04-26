import { useCallback, useRef, useState } from 'react';
import { Upload, X, FileText, Image } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_MAX_FILES = 3;
const DEFAULT_MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const ACCEPTED_MIME_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    '.docx',
};

const ACCEPTED_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.pdf',
  '.doc',
  '.docx',
]);

const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png']);

const ACCEPT_STRING = '.jpg,.jpeg,.png,.pdf,.doc,.docx';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface EvidenceUploaderProps {
  files: File[];
  onChange: (files: File[]) => void;
  maxFiles?: number;
  maxSizeBytes?: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format bytes into a human-readable string. */
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/** Check whether a file has an accepted extension or MIME type. */
const isAcceptedType = (file: File): boolean => {
  if (ACCEPTED_MIME_TYPES[file.type]) return true;
  const ext = file.name.toLowerCase().match(/\.[^.]+$/)?.[0];
  return ext ? ACCEPTED_EXTENSIONS.has(ext) : false;
};

/** Determine whether a file is an image (for thumbnail preview). */
const isImageFile = (file: File): boolean => {
  if (IMAGE_MIME_TYPES.has(file.type)) return true;
  const ext = file.name.toLowerCase().match(/\.[^.]+$/)?.[0];
  return ext === '.jpg' || ext === '.jpeg' || ext === '.png';
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const FileThumbnail = ({ file }: { file: File }) => {
  const [src, setSrc] = useState<string | null>(null);

  // Create object URL lazily on first render
  if (isImageFile(file) && src === null) {
    const url = URL.createObjectURL(file);
    setSrc(url);
  }

  if (src) {
    return (
      <img
        src={src}
        alt={file.name}
        className="h-10 w-10 rounded object-cover flex-shrink-0"
        onLoad={() => {
          // Revoke after the browser has loaded the image
          // We keep the src in state so React doesn't re-create it
        }}
      />
    );
  }

  return (
    <div className="h-10 w-10 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
      <FileText className="h-5 w-5 text-gray-400" />
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const EvidenceUploader = ({
  files,
  onChange,
  maxFiles = DEFAULT_MAX_FILES,
  maxSizeBytes = DEFAULT_MAX_SIZE_BYTES,
}: EvidenceUploaderProps) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Validation & addition ───────────────────────────────────────────────
  const addFiles = useCallback(
    (incoming: File[]) => {
      const remaining = maxFiles - files.length;

      if (remaining <= 0) {
        toast.error(`Maximum ${maxFiles} files allowed`);
        return;
      }

      const accepted: File[] = [];

      for (const file of incoming) {
        if (accepted.length >= remaining) {
          toast.error(`Maximum ${maxFiles} files allowed`);
          break;
        }

        if (!isAcceptedType(file)) {
          toast.error(
            `"${file.name}" is not a supported file type. Accepted: jpg, png, pdf, doc, docx`,
          );
          continue;
        }

        if (file.size > maxSizeBytes) {
          toast.error(
            `"${file.name}" exceeds the ${formatFileSize(maxSizeBytes)} size limit`,
          );
          continue;
        }

        accepted.push(file);
      }

      if (accepted.length > 0) {
        onChange([...files, ...accepted]);
      }
    },
    [files, maxFiles, maxSizeBytes, onChange],
  );

  // ── Remove handler ──────────────────────────────────────────────────────
  const removeFile = useCallback(
    (index: number) => {
      onChange(files.filter((_, i) => i !== index));
    },
    [files, onChange],
  );

  // ── Drag handlers ──────────────────────────────────────────────────────
  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(true);
    },
    [],
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
    },
    [],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      const droppedFiles = Array.from(e.dataTransfer.files);
      addFiles(droppedFiles);
    },
    [addFiles],
  );

  // ── Click-to-browse handler ─────────────────────────────────────────────
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = Array.from(e.target.files ?? []);
      addFiles(selected);
      // Reset so the same file can be re-selected
      e.target.value = '';
    },
    [addFiles],
  );

  const isFull = files.length >= maxFiles;

  return (
    <div className="space-y-3" data-testid="evidence-uploader">
      {/* Drop zone */}
      {!isFull && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Upload evidence files"
          className={cn(
            'rounded-lg border-2 border-dashed p-6 text-center transition-colors cursor-pointer',
            'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            isDragOver
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50',
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
        >
          <div className="flex flex-col items-center gap-2">
            {isDragOver ? (
              <Image className="h-8 w-8 text-blue-500" />
            ) : (
              <Upload className="h-8 w-8 text-gray-400" />
            )}
            <p className="text-sm font-medium text-gray-600">
              {isDragOver
                ? 'Drop files here'
                : 'Drag & drop files here, or click to browse'}
            </p>
            <p className="text-xs text-gray-400">
              jpg, png, pdf, doc, docx · max {formatFileSize(maxSizeBytes)} each
              · {files.length}/{maxFiles} files
            </p>
          </div>

          <input
            ref={inputRef}
            type="file"
            className="hidden"
            multiple
            accept={ACCEPT_STRING}
            onChange={handleInputChange}
            data-testid="evidence-file-input"
          />
        </div>
      )}

      {/* File list */}
      {files.length > 0 && (
        <ul className="space-y-2" aria-label="Uploaded files">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${file.size}-${index}`}
              className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3"
            >
              <FileThumbnail file={file} />

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 truncate">
                  {file.name}
                </p>
                <p className="text-xs text-gray-400">
                  {formatFileSize(file.size)}
                </p>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remove ${file.name}`}
                className="min-h-[44px] min-w-[44px] flex-shrink-0 text-gray-400 hover:text-red-500 hover:bg-red-50"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(index);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {/* Full indicator */}
      {isFull && (
        <p className="text-xs text-gray-400 text-center">
          Maximum {maxFiles} files reached. Remove a file to add another.
        </p>
      )}
    </div>
  );
};

export default EvidenceUploader;
