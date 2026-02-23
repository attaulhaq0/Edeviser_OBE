// =============================================================================
// useAwardXP — TanStack Query mutation hook for awarding XP
// =============================================================================

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { awardXP, type AwardXPParams, type AwardXPResult } from '@/lib/xpClient';
import { queryKeys } from '@/lib/queryKeys';

export const useAwardXP = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: AwardXPParams): Promise<AwardXPResult | null> => {
      return awardXP(params);
    },
    onSuccess: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: queryKeys.studentGamification.lists() });
        queryClient.invalidateQueries({ queryKey: queryKeys.xpTransactions.lists() });
        queryClient.invalidateQueries({ queryKey: queryKeys.leaderboard.lists() });
      }
    },
  });
};

// Re-export for convenience
export { awardXP } from '@/lib/xpClient';
export { XP_SCHEDULE, LATE_SUBMISSION_XP, LATE_QUIZ_XP } from '@/lib/xpSchedule';
