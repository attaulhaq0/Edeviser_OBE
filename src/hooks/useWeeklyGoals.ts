import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { WeeklyGoal } from '@/types/planner';
import type { CreateWeeklyGoalInput } from '@/lib/schemas/planner';

export const useWeeklyGoals = (weekStartDate: string) => {
  const { user } = useAuth();
  const studentId = user?.id ?? '';

  return useQuery({
    queryKey: queryKeys.weeklyGoals.list({ studentId, weekStartDate } as Record<string, unknown>),
    queryFn: async (): Promise<WeeklyGoal[]> => {
      const { data, error } = await supabase
        .from('weekly_goals')
        .select('*')
        .eq('student_id', studentId)
        .eq('week_start_date', weekStartDate);
      if (error) throw error;
      return (data ?? []).map((g: Record<string, unknown>) => ({
        id: g.id as string,
        studentId: g.student_id as string,
        weekStartDate: g.week_start_date as string,
        goalType: g.goal_type as 'study_hours' | 'sessions_completed' | 'tasks_completed',
        targetValue: Number(g.target_value),
      }));
    },
    enabled: !!studentId && !!weekStartDate,
  });
};

export const useSaveWeeklyGoals = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (goals: CreateWeeklyGoalInput[]) => {
      // Upsert goals (max 3)
      const upsertData = goals.slice(0, 3).map((g) => ({
        student_id: user!.id,
        week_start_date: g.weekStartDate,
        goal_type: g.goalType,
        target_value: g.targetValue,
      }));

      const { error } = await supabase
        .from('weekly_goals')
        .upsert(upsertData, { onConflict: 'student_id,week_start_date,goal_type' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.weeklyGoals.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.weeklyPlanner.all });
      toast.success('Weekly goals saved');
    },
    onError: (err: Error) => toast.error(err.message),
  });
};
