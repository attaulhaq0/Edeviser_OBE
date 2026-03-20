// =============================================================================
// ReconnectBanner — "Live updates paused" banner for realtime reconnection
// =============================================================================

import { WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReconnectBannerProps {
  isDisconnected: boolean;
  retryCount: number;
  className?: string;
}

const ReconnectBanner = ({ isDisconnected, retryCount, className }: ReconnectBannerProps) => {
  if (!isDisconnected) return null;

  return (
    <div
      role="status"
      className={cn(
        'flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700',
        className,
      )}
    >
      <WifiOff className="h-4 w-4 shrink-0" />
      <span>
        Live updates paused — Reconnecting
        <span className="animate-pulse">...</span>
      </span>
      {retryCount > 0 && (
        <span className="text-xs text-amber-500 ml-auto">(attempt {retryCount})</span>
      )}
    </div>
  );
};

export default ReconnectBanner;
export type { ReconnectBannerProps };
