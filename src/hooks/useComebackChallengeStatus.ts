import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import type { ComebackChallengeStatus } from '@/types/habits';

/**
 * Fetches the active Comeback Challenge status for a student from
 * the student_gamification table. Returns default inactive status
 * when no data is found or the query fails.
 */
export const useComebackChallengeStatus = (studentId: string | undefined) => {
  return useQuery({
    queryKey: [...queryKeys.studentGamification.all, 'comebackChallenge', studentId ?? ''],
    enabled: !!studentId,
    queryFn: async (): Promise<ComebackChallengeStatus> => {
      if (!studentId) {
        return { active: false, currentDay: 0, totalDays: 3, startDate: null };
      }

      try {
        const { data, error } = await supabase
          .from('student_gamification')
          .select('comeback_challenge_active, comeback_challenge_day, comeback_challenge_start_date' as never)
          .eq('student_id', studentId)
          .maybeSingle();

        if (error) throw error;

        if (!data) {
          return { active: false, currentDay: 0, totalDays: 3, startDate: null };
        }

        const row = data as unknown as Record<string, unknown>;
        return {
          active: row.comeback_challenge_active === true,
          currentDay: typeof row.comeback_challenge_day === 'number' ? row.comeback_challenge_day : 0,
          totalDays: 3,
          startDate: typeof row.comeback_challenge_start_date === 'string'
            ? row.comeback_challenge_start_date
            : null,
        };
      } catch {
        // Table columns may not exist yet — return inactive
        return { active: false, currentDay: 0, totalDays: 3, startDate: null };
      }
    },
  });
};
