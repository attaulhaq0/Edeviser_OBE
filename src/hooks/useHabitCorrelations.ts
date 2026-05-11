import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { getCorrelationConfidenceLevel } from "@/lib/correlationConfidence";
import type {
  CorrelationInsightWithConfidence,
  CorrelationConfidenceLevel,
  HabitType,
} from "@/types/habits";

interface CorrelationResult {
  insights: CorrelationInsightWithConfidence[];
  insufficientData: boolean;
  daysUntilReady?: number;
  dataPointCount?: number;
}

export const useHabitCorrelations = (studentId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.habitAnalytics.correlations(studentId ?? ""),
    enabled: !!studentId,
    staleTime: 5 * 60 * 1000, // 5 minutes — correlations don't change frequently
    queryFn: async (): Promise<CorrelationResult> => {
      if (!studentId) return { insights: [], insufficientData: true };

      const { data, error } = await supabase.functions.invoke(
        "compute-habit-correlations",
        { body: { student_id: studentId } }
      );

      if (error) throw error;

      const dataPointCount = data?.data_point_count as number | undefined;
      const daysUntilReady = data?.days_until_ready as number | undefined;

      // Map insights to include confidence data
      const rawInsights = (data?.insights ?? []) as Array<{
        id: string;
        habitType: string;
        academicMetric: string;
        description: string;
        strength: number;
        confidenceLevel?: CorrelationConfidenceLevel;
        dataPointCount?: number;
      }>;

      const insights: CorrelationInsightWithConfidence[] = rawInsights.map(
        (insight) => ({
          ...insight,
          habitType: insight.habitType as HabitType,
          confidenceLevel:
            insight.confidenceLevel ??
            getCorrelationConfidenceLevel(dataPointCount ?? 0) ??
            "early_pattern",
          dataPointCount: insight.dataPointCount ?? dataPointCount ?? 0,
        })
      );

      return {
        insights,
        insufficientData: data?.insufficient_data === true,
        daysUntilReady,
        dataPointCount,
      };
    },
  });
};
