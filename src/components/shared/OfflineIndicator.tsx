import { WifiOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface OfflineIndicatorProps {
  queueSize?: number;
}

/**
 * Subtle offline indicator shown in Focus Mode when network is lost.
 * Displays a small badge with a wifi-off icon and optional pending action count.
 */
const OfflineIndicator = ({ queueSize = 0 }: OfflineIndicatorProps) => {
  return (
    <div
      className="flex items-center gap-2 animate-fade-in-up"
      role="status"
      aria-live="polite"
      aria-label={`You are offline${queueSize > 0 ? `. ${queueSize} pending actions will sync when reconnected.` : ''}`}
    >
      <Badge
        variant="outline"
        className="border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-700 gap-1.5 py-1 px-3"
      >
        <WifiOff className="h-3 w-3" />
        <span className="text-xs font-medium">Offline</span>
        {queueSize > 0 && (
          <span className="text-xs text-amber-500">
            · {queueSize} pending
          </span>
        )}
      </Badge>
    </div>
  );
};

export default OfflineIndicator;
