import { useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { toast } from 'sonner';
import { useWellnessPreferences } from '@/hooks/useWellnessPreferences';
import { WELLNESS_UNITS, computeWellnessProgress } from '@/lib/wellnessTips';
import type { WellnessHabitType, WellnessTarget, WellnessHabitLog } from '@/types/habits';

/**
 * Returns wellness targets for all enabled habits.
 */
export const useWellnessGoals = (studentId: string | undefined) => {
  const { data: preferences, isLoading } = useWellnessPreferences(studentId);

  const targets = useMemo((): WellnessTarget[] => {
    if (!preferences) return [];
    const habitTargets = preferences.habitTargets ?? {};
    return preferences.enabledHabits
      .filter((ht) => habitTargets[ht])
      .map((ht) => ({
        habitType: ht,
        targetValue: habitTargets[ht]!.value,
        unit: habitTargets[ht]!.unit ?? WELLNESS_UNITS[ht],
      }));
  }, [preferences]);

  return { data: targets, isLoading };
};

/**
 * Computes daily progress for each enabled habit with a target.
 */
export const useDailyProgress = (
  studentId: string | undefined,
  todayLogs: WellnessHabitLog[],
) => {
  const { data: preferences } = useWellnessPreferences(studentId);

  return useMemo((): Record<WellnessHabitType, { progress: number; logged: number; target: number; unit: string }> => {
    const result = {} as Record<WellnessHabitType, { progress: number; logged: number; target: number; unit: string }>;
    if (!preferences) return result;

    const habitTargets = preferences.habitTargets ?? {};

    for (const ht of preferences.enabledHabits) {
      const targetInfo = habitTargets[ht];
      if (!targetInfo) continue;

      const log = todayLogs.find((l) => l.wellnessType === ht);
      const loggedValue = log?.value ?? 0;
      const targetValue = targetInfo.value;
      const unit = targetInfo.unit ?? WELLNESS_UNITS[ht];

      result[ht] = {
        progress: computeWellnessProgress(loggedValue, targetValue),
        logged: loggedValue,
        target: targetValue,
        unit,
      };
    }

    return result;
  }, [preferences, todayLogs]);
};

/**
 * Mutation to set or update a wellness target for a specific habit.
 */
export const useUpdateWellnessGoal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      studentId,
      habitType,
      targetValue,
      unit,
    }: {
      studentId: string;
      habitType: WellnessHabitType;
      targetValue: number;
      unit: string;
    }) => {
      const { data: current, error: fetchError } = await supabase
        .from('student_wellness_preferences')
        .select('habit_targets')
        .eq('student_id', studentId)
        .maybeSingle();

      if (fetchError) {
        console.error('Failed to fetch habit targets:', fetchError.message);
        throw fetchError;
      }

      const existing = (current?.habit_targets ?? {}) as Record<string, { value: number; unit: string }>;
      const updated = {
        ...existing,
        [habitType]: { value: targetValue, unit },
      };

      // Remove target if value is 0
      if (targetValue <= 0) {
        delete updated[habitType];
      }

      const { error } = await supabase
        .from('student_wellness_preferences')
        .upsert(
          {
            student_id: studentId,
            habit_targets: updated,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'student_id' },
        );

      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.wellness.preferences(variables.studentId),
      });
      toast.success('Goal updated');
    },
    onError: (error: Error) => {
      toast.error('Failed to update goal');
      console.error('Update goal error:', error);
    },
  });
};
