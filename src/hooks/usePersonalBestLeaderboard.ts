// =============================================================================
// usePersonalBestLeaderboard — TanStack Query hook for Personal Best data
// Task 147.3 | Requirements: 129.1
// =============================================================================

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { computeWeeklyXP, getISOWeekStart, type WeeklyXP } from '@/lib/personalBestLeaderboard';

/**
 * Fetches the student's xp_transactions for the last 8 ISO weeks
 * and computes weekly XP totals with personal best identification.
 */
export const usePersonalBestLeaderboard = (studentId: string) => {
  return useQuery({
    queryKey: queryKeys.personalBest.list({ studentId }),
    queryFn: async (): Promise<WeeklyXP[]> => {
      // Calculate the start of 8 weeks ago (Monday)
      const now = new Date();
      const currentWeekStart = getISOWeekStart(now);
      const eightWeeksAgo = new Date(currentWeekStart);
      eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 7 * 7); // 7 more weeks back

      const { data, error } = await supabase
        .from('xp_transactions')
        .select('xp_amount, created_at')
        .eq('student_id', studentId)
        .gte('created_at', eightWeeksAgo.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      return computeWeeklyXP(data ?? [], now);
    },
    enabled: !!studentId,
    staleTime: 60_000,
  });
};
