// =============================================================================
// RealtimeStatusBanner — "Live updates paused" banner for polling fallback
// Shown when Supabase Realtime connection fails and system falls back to polling.
// Validates: Requirements 32, 53.5
// =============================================================================

import { WifiOff } from 'lucide-react';

interface RealtimeStatusBannerProps {
  /** Whether the realtime connection is live */
  isLive: boolean;
}

const RealtimeStatusBanner = ({ isLive }: RealtimeStatusBannerProps) => {
  if (isLive) return null;

  return (
    <div
      role="status"
      className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700"
    >
      <WifiOff className="h-4 w-4 shrink-0" />
      Live updates paused — polling every 30s
    </div>
  );
};

export default RealtimeStatusBanner;
