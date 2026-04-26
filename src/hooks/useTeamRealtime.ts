// =============================================================================
// useTeamRealtime — Task 3.9
// Supabase Realtime subscription on teams table, scoped by institution,
// with polling fallback
// =============================================================================

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useRealtime } from '@/hooks/useRealtime';
import { queryKeys } from '@/lib/queryKeys';

interface UseTeamRealtimeOptions {
  courseId?: string;
  enabled?: boolean;
}

export const useTeamRealtime = ({ courseId: _courseId, enabled = true }: UseTeamRealtimeOptions = {}) => {
  const { institutionId } = useAuth();
  const queryClient = useQueryClient();

  const invalidateTeamQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.teams.lists() });
    queryClient.invalidateQueries({ queryKey: queryKeys.teamLeaderboard.lists() });
    queryClient.invalidateQueries({ queryKey: queryKeys.teamBadges.lists() });
  }, [queryClient]);

  const { isLive, retryCount } = useRealtime({
    table: 'teams',
    event: '*',
    filter: institutionId ? `institution_id=eq.${institutionId}` : undefined,
    onPayload: invalidateTeamQueries,
    pollingFn: invalidateTeamQueries,
    pollingInterval: 30_000,
  });

  return { isLive: enabled ? isLive : false, retryCount };
};
