import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { toast } from 'sonner';
import type { WellnessHabitLog, WellnessHabitType } from '@/types/habits';

export const useWellnessHabitLogs = (
  studentId: string | undefined,
  date: string,
) => {
  return useQuery({
    queryKey: queryKeys.wellness.logs(studentId ?? '', date),
    enabled: !!studentId && !!date,
    queryFn: async (): Promise<WellnessHabitLog[]> => {
      if (!studentId) return [];

      const { data, error } = await supabase
        .from('wellness_habit_logs')
        .select('id, student_id, date, wellness_type, value, completed_at')
        .eq('student_id', studentId)
        .eq('date', date);

      if (error) throw error;

      return (data ?? []).map((row) => ({
        id: row.id as string,
        studentId: row.student_id as string,
        date: row.date as string,
        wellnessType: row.wellness_type as WellnessHabitType,
        value: row.value != null ? Number(row.value) : null,
        completedAt: row.completed_at as string,
      }));
    },
  });
};

interface LogWellnessHabitInput {
  studentId: string;
  wellnessType: WellnessHabitType;
  value?: number | null;
  date: string;
}

export const useLogWellnessHabit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: LogWellnessHabitInput) => {
      // 1. Insert wellness habit log
      const { data: log, error: insertError } = await supabase
        .from('wellness_habit_logs')
        .insert({
          student_id: input.studentId,
          date: input.date,
          wellness_type: input.wellnessType,
          value: input.value ?? null,
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // 2. Invoke award-xp Edge Function with source 'wellness_habit'
      let xpAwarded = 0;
      try {
        const { data: xpResult } = await supabase.functions.invoke('award-xp', {
          body: {
            student_id: input.studentId,
            xp_amount: 0, // Edge Function looks up wellness_xp_amount from institution_settings
            source: 'wellness_habit',
            reference_id: log.id,
          },
        });
        xpAwarded = xpResult?.xp_awarded ?? 0;
      } catch {
        // XP award is fire-and-forget — don't block the flow
        console.error('[useLogWellnessHabit] award-xp invocation failed');
      }

      // 3. Invoke check-badges Edge Function with trigger 'habit_log'
      try {
        await supabase.functions.invoke('check-badges', {
          body: {
            student_id: input.studentId,
            trigger: 'habit_log',
          },
        });
      } catch {
        console.error('[useLogWellnessHabit] check-badges invocation failed');
      }

      return { log, xpAwarded };
    },
    onSuccess: ({ xpAwarded }, variables) => {
      // 4. Invalidate heatmap + wellness queries
      queryClient.invalidateQueries({ queryKey: queryKeys.heatmap.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.wellness.logs(variables.studentId, variables.date) });
      queryClient.invalidateQueries({ queryKey: queryKeys.studentGamification.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.badges.lists() });

      // 5. Show XP toast on success
      if (xpAwarded > 0) {
        toast.success(`+${xpAwarded} XP earned!`);
      } else {
        toast.success('Wellness habit logged');
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};
