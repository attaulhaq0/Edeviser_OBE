// =============================================================================
// ErrorState — Error state with retry button
// =============================================================================

import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ErrorStateProps {
  title?: string;
  message: string;
  icon?: React.ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
  children?: React.ReactNode;
  className?: string;
}

const ErrorState = ({
  title = 'Something went wrong',
  message,
  icon,
  onRetry,
  retryLabel = 'Try Again',
  children,
  className,
}: ErrorStateProps) => (
  <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
    <div className="mb-4 rounded-full bg-red-50 p-4">
      {icon ?? <AlertCircle className="h-8 w-8 text-red-500" />}
    </div>
    <h3 className="text-lg font-bold tracking-tight text-gray-900">{title}</h3>
    <p className="mt-1 text-sm text-gray-500 max-w-sm">{message}</p>
    {onRetry && (
      <Button
        onClick={onRetry}
        variant="outline"
        className="mt-4"
      >
        <RefreshCw className="h-4 w-4" />
        {retryLabel}
      </Button>
    )}
    {children && <div className="mt-4">{children}</div>}
  </div>
);

export default ErrorState;
export type { ErrorStateProps };
