import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';

export interface StreakData {
  streak_count: number;
  last_login_date: string | null;
  streak_freezes_available: number;
}

export const useStreak = () => {
  return useQuery({
    queryKey: queryKeys.studentGamification.list({ scope: 'streak' }),
    queryFn: async (): Promise<StreakData | null> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as unknown as { from: (table: string) => any })
        .from('student_gamification')
        .select('streak_count, last_login_date, streak_freezes_available')
        .eq('student_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data as StreakData | null;
    },
  });
};
