// =============================================================================
// UploadProgress — File upload progress indicator
// =============================================================================
/* eslint-disable react-refresh/only-export-components */

import { CheckCircle, AlertCircle, X, RefreshCw, File } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface UploadProgressProps {
  progress: number;
  fileName: string;
  fileSize: number;
  status: 'uploading' | 'success' | 'error';
  onRetry?: () => void;
  onCancel?: () => void;
  className?: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const UploadProgress = ({
  progress,
  fileName,
  fileSize,
  status,
  onRetry,
  onCancel,
  className,
}: UploadProgressProps) => {
  const clamped = Math.max(0, Math.min(100, progress));

  return (
    <div className={cn('rounded-xl border border-slate-200 bg-white p-4 space-y-2', className)}>
      <div className="flex items-center gap-3">
        <File className="h-5 w-5 text-gray-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{fileName}</p>
          <p className="text-xs text-gray-400">{formatFileSize(fileSize)}</p>
        </div>
        {status === 'uploading' && onCancel && (
          <Button variant="ghost" size="sm" onClick={onCancel} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        )}
        {status === 'success' && <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />}
        {status === 'error' && (
          <div className="flex items-center gap-1">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
            {onRetry && (
              <Button variant="ghost" size="sm" onClick={onRetry} className="h-8 w-8 p-0">
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>
      {status === 'uploading' && (
        <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-blue-500 transition-all duration-300"
            style={{ width: `${clamped}%` }}
          />
        </div>
      )}
    </div>
  );
};

export default UploadProgress;
export { formatFileSize };
export type { UploadProgressProps };
