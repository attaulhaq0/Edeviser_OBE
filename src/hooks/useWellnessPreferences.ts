import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { toast } from 'sonner';
import type { WellnessPreferences, WellnessHabitType } from '@/types/habits';

export const useWellnessPreferences = (studentId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.wellness.preferences(studentId ?? ''),
    enabled: !!studentId,
    queryFn: async (): Promise<WellnessPreferences | null> => {
      if (!studentId) return null;

      const { data, error } = await supabase
        .from('student_wellness_preferences')
        .select('id, student_id, enabled_habits, parent_visibility, habit_targets, reminder_times, dismissed_onboarding_tips')
        .eq('student_id', studentId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return {
        id: data.id as string,
        studentId: data.student_id as string,
        enabledHabits: (data.enabled_habits ?? []) as WellnessHabitType[],
        parentVisibility: data.parent_visibility as boolean,
        habitTargets: (data.habit_targets ?? {}) as Record<string, { value: number; unit: string }>,
        reminderTimes: (data.reminder_times ?? {}) as Record<string, string>,
        dismissedOnboardingTips: (data.dismissed_onboarding_tips ?? []) as string[],
      };
    },
  });
};

interface UpdatePreferencesInput {
  studentId: string;
  enabledHabits: WellnessHabitType[];
  parentVisibility: boolean;
}

export const useUpdateWellnessPreferences = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdatePreferencesInput) => {
      const { data, error } = await supabase
        .from('student_wellness_preferences')
        .upsert(
          {
            student_id: input.studentId,
            enabled_habits: input.enabledHabits,
            parent_visibility: input.parentVisibility,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'student_id' },
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.wellness.preferences(variables.studentId),
      });
      toast.success('Wellness preferences updated');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};
