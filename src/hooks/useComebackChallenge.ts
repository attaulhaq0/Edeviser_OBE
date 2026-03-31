// Task 143.4: Comeback Challenge TanStack Query hooks

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';

export interface ComebackChallengeData {
  is_active: boolean;
  days_completed: number;
  streak_to_restore: number;
  start_date: string | null;
}

export const useComebackChallenge = (studentId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.comebackChallenge.detail(studentId ?? ''),
    queryFn: async (): Promise<ComebackChallengeData> => {
      const { data, error } = await supabase
        .from('student_gamification')
        .select(
          'comeback_challenge_active, comeback_challenge_days_completed, comeback_challenge_streak_to_restore, comeback_challenge_start_date',
        )
        .eq('student_id', studentId!)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        return { is_active: false, days_completed: 0, streak_to_restore: 0, start_date: null };
      }

      const row = data as unknown as Record<string, unknown>;
      return {
        is_active: row.comeback_challenge_active === true,
        days_completed: typeof row.comeback_challenge_days_completed === 'number'
          ? row.comeback_challenge_days_completed : 0,
        streak_to_restore: typeof row.comeback_challenge_streak_to_restore === 'number'
          ? row.comeback_challenge_streak_to_restore : 0,
        start_date: typeof row.comeback_challenge_start_date === 'string'
          ? row.comeback_challenge_start_date : null,
      };
    },
    enabled: !!studentId,
  });
};

export const useStartComebackChallenge = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (studentId: string) => {
      const { error } = await supabase
        .from('student_gamification')
        .update({
          comeback_challenge_active: true,
          comeback_challenge_start_date: new Date().toISOString(),
          comeback_challenge_days_completed: 0,
        } as never)
        .eq('student_id', studentId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.comebackChallenge.all }),
  });
};

export const useCancelComebackChallenge = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (studentId: string) => {
      const { error } = await supabase
        .from('student_gamification')
        .update({
          comeback_challenge_active: false,
          comeback_challenge_days_completed: 0,
          comeback_challenge_streak_to_restore: 0,
        } as never)
        .eq('student_id', studentId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.comebackChallenge.all }),
  });
};
