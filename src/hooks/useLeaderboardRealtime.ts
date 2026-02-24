// =============================================================================
// useLeaderboardRealtime — Subscribe to student_gamification changes and
// invalidate leaderboard queries so the UI stays fresh between materialized
// view refreshes.
// Validates: Requirements 25.4
// =============================================================================

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';

/**
 * Subscribes to Supabase Realtime `UPDATE` events on the
 * `student_gamification` table. When XP changes, all leaderboard
 * queries are invalidated so TanStack Query refetches automatically.
 *
 * Call once at the top of LeaderboardPage — the subscription is
 * cleaned up on unmount.
 */
export const useLeaderboardRealtime = (): void => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('leaderboard-realtime')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'student_gamification' },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.leaderboard.lists() });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
};
