// =============================================================================
// useTeamRealtime — Supabase Realtime subscription on teams table
// Task 3.9: scoped by institution, with polling fallback
// =============================================================================

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { useRealtime } from '@/hooks/useRealtime';

// ─── useTeamRealtime ─────────────────────────────────────────────────────────

/**
 * Subscribes to real-time changes on the `teams` table, scoped by institution.
 * On any change (INSERT, UPDATE, DELETE), invalidates team-related queries.
 * Falls back to 30s polling when the realtime connection is unavailable.
 */
export const useTeamRealtime = (institutionId?: string) => {
  const queryClient = useQueryClient();

  const invalidateTeamQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.teams.lists() });
    queryClient.invalidateQueries({ queryKey: queryKeys.teamLeaderboard.lists() });
    queryClient.invalidateQueries({ queryKey: queryKeys.teamMembers.lists() });
  }, [queryClient]);

  const { isLive, retryCount } = useRealtime({
    table: 'teams',
    event: '*',
    filter: institutionId ? `institution_id=eq.${institutionId}` : undefined,
    onPayload: invalidateTeamQueries,
    pollingFn: invalidateTeamQueries,
    pollingInterval: 30_000,
  });

  return { isLive, retryCount };
};
