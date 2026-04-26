// =============================================================================
// useChallengeRealtime — Task 3.10
// Supabase Realtime subscription on challenge_progress table,
// with polling fallback
// =============================================================================

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRealtime } from '@/hooks/useRealtime';
import { queryKeys } from '@/lib/queryKeys';

interface UseChallengeRealtimeOptions {
  challengeId?: string;
  enabled?: boolean;
}

export const useChallengeRealtime = ({
  challengeId,
  enabled = true,
}: UseChallengeRealtimeOptions = {}) => {
  const queryClient = useQueryClient();

  const invalidateChallengeQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.challengeProgress.lists() });
    queryClient.invalidateQueries({ queryKey: queryKeys.challengeLeaderboard.lists() });
    if (challengeId) {
      queryClient.invalidateQueries({
        queryKey: queryKeys.challengeProgress.detail(challengeId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.challengeLeaderboard.detail(challengeId),
      });
    }
  }, [queryClient, challengeId]);

  const { isLive, retryCount } = useRealtime({
    table: 'challenge_progress',
    event: '*',
    filter: challengeId ? `challenge_id=eq.${challengeId}` : undefined,
    onPayload: invalidateChallengeQueries,
    pollingFn: invalidateChallengeQueries,
    pollingInterval: 30_000,
  });

  return { isLive: enabled ? isLive : false, retryCount };
};
