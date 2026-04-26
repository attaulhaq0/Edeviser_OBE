import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { CreatePlannerTaskInput } from '@/lib/schemas/planner';

export const useCreatePlannerTask = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreatePlannerTaskInput) => {
      const { data, error } = await supabase
        .from('planner_tasks')
        .insert({
          student_id: user!.id,
          title: input.title,
          description: input.description ?? null,
          due_date: input.dueDate,
          priority: input.priority,
          course_id: input.courseId ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.plannerTasks.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.weeklyPlanner.all });
      toast.success('Task created');
    },
    onError: (err: Error) => toast.error(err.message),
  });
};

export const useUpdatePlannerTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; title?: string; description?: string | null; due_date?: string; priority?: string; course_id?: string | null }) => {
      const { data, error } = await supabase
        .from('planner_tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.plannerTasks.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.weeklyPlanner.all });
    },
    onError: (err: Error) => toast.error(err.message),
  });
};

export const useDeletePlannerTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from('planner_tasks')
        .delete()
        .eq('id', taskId)
        .eq('status', 'pending');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.plannerTasks.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.weeklyPlanner.all });
      toast.success('Task deleted');
    },
    onError: (err: Error) => toast.error(err.message),
  });
};

export const useCompleteTask = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from('planner_tasks')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', taskId);
      if (error) throw error;

      // Award 10 XP for task completion
      await supabase.functions.invoke('award-xp', {
        body: {
          student_id: user!.id,
          xp_amount: 10,
          source: 'planner_task',
          reference_id: `planner_task:${taskId}`,
          note: 'Planner task completed',
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.plannerTasks.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.weeklyPlanner.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.studentGamification.all });
      toast.success('Task completed! +10 XP');
    },
    onError: (err: Error) => toast.error(err.message),
  });
};
