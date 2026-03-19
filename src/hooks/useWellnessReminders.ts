import { useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { toast } from 'sonner';
import { useWellnessPreferences } from '@/hooks/useWellnessPreferences';
import type { WellnessHabitType, WellnessReminderConfig } from '@/types/habits';

/**
 * Returns reminder configs for all enabled habits.
 */
export const useWellnessReminders = (studentId: string | undefined) => {
  const { data: preferences, isLoading } = useWellnessPreferences(studentId);

  const reminders = useMemo((): WellnessReminderConfig[] => {
    if (!preferences) return [];
    const times = preferences.reminderTimes ?? {};
    return preferences.enabledHabits.map((habitType) => ({
      habitType,
      reminderTime: times[habitType] ?? null,
      enabled: !!times[habitType],
    }));
  }, [preferences]);

  return { data: reminders, isLoading };
};

/**
 * Mutation to update a reminder time for a specific habit.
 * Pass `null` as reminderTime to disable the reminder.
 */
export const useUpdateWellnessReminder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      studentId,
      habitType,
      reminderTime,
    }: {
      studentId: string;
      habitType: WellnessHabitType;
      reminderTime: string | null;
    }) => {
      // Fetch current reminder_times
      const { data: current, error: fetchError } = await supabase
        .from('student_wellness_preferences')
        .select('reminder_times')
        .eq('student_id', studentId)
        .maybeSingle();

      if (fetchError) {
        console.error('Failed to fetch reminder times:', fetchError.message);
        throw fetchError;
      }

      const existing = (current?.reminder_times ?? {}) as Record<string, string | null>;
      const updated = { ...existing };

      if (reminderTime) {
        updated[habitType] = reminderTime;
      } else {
        delete updated[habitType];
      }

      const { error } = await supabase
        .from('student_wellness_preferences')
        .upsert(
          {
            student_id: studentId,
            reminder_times: updated,
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
      toast.success('Reminder updated');
    },
    onError: (error: Error) => {
      toast.error('Failed to update reminder');
      console.error('Update reminder error:', error);
    },
  });
};
