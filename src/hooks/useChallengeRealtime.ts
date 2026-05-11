// =============================================================================
// useChallengeRealtime — Supabase Realtime subscription on challenge_progress
// Task 3.10: with polling fallback
// =============================================================================

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { useRealtime } from "@/hooks/useRealtime";

// ─── useChallengeRealtime ────────────────────────────────────────────────────

/**
 * Subscribes to real-time changes on the `challenge_progress` table.
 * Optionally scoped to a specific challenge via filter.
 * Falls back to 30s polling when the realtime connection is unavailable.
 */
export const useChallengeRealtime = (challengeId?: string) => {
  const queryClient = useQueryClient();

  const invalidateChallengeQueries = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.challengeProgress.lists(),
    });
    queryClient.invalidateQueries({
      queryKey: queryKeys.challengeLeaderboard.lists(),
    });
    if (challengeId) {
      queryClient.invalidateQueries({
        queryKey: queryKeys.challengeProgress.detail(challengeId),
      });
    }
  }, [queryClient, challengeId]);

  const { isLive, retryCount } = useRealtime({
    table: "challenge_progress",
    event: "*",
    filter: challengeId ? `challenge_id=eq.${challengeId}` : undefined,
    onPayload: invalidateChallengeQueries,
    pollingFn: invalidateChallengeQueries,
    pollingInterval: 30_000,
  });

  return { isLive, retryCount };
};
