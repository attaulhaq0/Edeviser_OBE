import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { CreateStudySessionInput } from '@/lib/schemas/planner';

export const useCreateStudySession = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateStudySessionInput) => {
      const { data, error } = await supabase
        .from('study_sessions')
        .insert({
          student_id: user!.id,
          course_id: input.courseId,
          title: input.title,
          description: input.description ?? null,
          planned_date: input.plannedDate,
          planned_start_time: input.plannedStartTime,
          planned_duration_minutes: input.plannedDurationMinutes,
          timer_mode: input.timerMode,
          status: 'planned',
          clo_ids: input.cloIds ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.studySessions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.weeklyPlanner.all });
      toast.success('Study session created');
    },
    onError: (err: Error) => toast.error(err.message),
  });
};

export const useUpdateStudySession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<Record<string, unknown>>) => {
      const { data, error } = await supabase
        .from('study_sessions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.studySessions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.weeklyPlanner.all });
    },
    onError: (err: Error) => toast.error(err.message),
  });
};

export const useCancelStudySession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase
        .from('study_sessions')
        .update({ status: 'cancelled' })
        .eq('id', sessionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.studySessions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.weeklyPlanner.all });
      toast.success('Session cancelled');
    },
    onError: (err: Error) => toast.error(err.message),
  });
};
