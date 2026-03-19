import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import type { CorrelationInsight } from '@/types/habits';

interface CorrelationResult {
  insights: CorrelationInsight[];
  insufficientData: boolean;
}

export const useHabitCorrelations = (studentId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.habitAnalytics.correlations(studentId ?? ''),
    enabled: !!studentId,
    staleTime: 5 * 60 * 1000, // 5 minutes — correlations don't change frequently
    queryFn: async (): Promise<CorrelationResult> => {
      if (!studentId) return { insights: [], insufficientData: true };

      const { data, error } = await supabase.functions.invoke(
        'compute-habit-correlations',
        { body: { student_id: studentId } },
      );

      if (error) throw error;

      return {
        insights: (data?.insights ?? []) as CorrelationInsight[],
        insufficientData: data?.insufficient_data === true,
      };
    },
  });
};
