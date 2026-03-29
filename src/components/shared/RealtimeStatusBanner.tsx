// =============================================================================
// RealtimeStatusBanner — Delegates to ReconnectBanner for "Live updates paused"
// Shown when Supabase Realtime connection fails and system falls back to polling.
// Validates: Requirements 32, 53.5, 66.4
// =============================================================================

import ReconnectBanner from '@/components/shared/ReconnectBanner';

interface RealtimeStatusBannerProps {
  /** Whether the realtime connection is live */
  isLive: boolean;
  /** Number of reconnection attempts */
  retryCount?: number;
}

const RealtimeStatusBanner = ({ isLive, retryCount = 0 }: RealtimeStatusBannerProps) => (
  <ReconnectBanner isDisconnected={!isLive} retryCount={retryCount} />
);

export default RealtimeStatusBanner;
