import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { FlowCheckIn } from '@/types/planner';
import type { FlowCheckInInput } from '@/lib/schemas/planner';

export const useSaveFlowCheckIn = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: FlowCheckInInput) => {
      const { error } = await supabase
        .from('flow_check_ins')
        .insert({
          session_id: input.sessionId,
          student_id: user!.id,
          interval_number: input.intervalNumber,
          response: input.response,
        });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['flowCheckIns', variables.sessionId],
      });
    },
    onError: (err: Error) => toast.error(err.message),
  });
};

export const useSessionFlowCheckIns = (sessionId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['flowCheckIns', sessionId],
    queryFn: async (): Promise<FlowCheckIn[]> => {
      const { data, error } = await supabase
        .from('flow_check_ins')
        .select('*')
        .eq('session_id', sessionId)
        .eq('student_id', user!.id)
        .order('interval_number');
      if (error) throw error;
      return (data ?? []).map((r: Record<string, unknown>) => ({
        id: r.id as string,
        sessionId: r.session_id as string,
        studentId: r.student_id as string,
        intervalNumber: r.interval_number as number,
        response: r.response as 'in_the_zone' | 'stuck' | 'too_easy',
        createdAt: r.created_at as string,
      }));
    },
    enabled: !!user?.id && !!sessionId,
  });
};
