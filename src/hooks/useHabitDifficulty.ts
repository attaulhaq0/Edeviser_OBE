// Task 145.7: Habit Difficulty Level TanStack Query hook

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';

export interface HabitDifficultyData {
  level: number;
  habit_level_streak: number;
}

export const useHabitDifficultyLevel = (studentId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.studentHabitLevel.detail(studentId ?? ''),
    queryFn: async (): Promise<HabitDifficultyData> => {
      const { data, error } = await supabase
        .from('student_gamification')
        .select('habit_difficulty_level, habit_level_streak')
        .eq('student_id', studentId!)
        .maybeSingle();

      if (error) throw error;
      if (!data) return { level: 1, habit_level_streak: 0 };

      const row = data as unknown as Record<string, unknown>;
      return {
        level: typeof row.habit_difficulty_level === 'number' ? row.habit_difficulty_level : 1,
        habit_level_streak: typeof row.habit_level_streak === 'number' ? row.habit_level_streak : 0,
      };
    },
    enabled: !!studentId,
  });
};
