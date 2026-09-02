import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AnalyticsFilters {
  quality_flag?: string;
  clo_id?: string;
  bloom_level?: number;
}

export interface QuestionAnalyticsRow {
  id: string;
  question_id: string;
  total_attempts: number;
  correct_count: number;
  success_rate: number;
  avg_response_time_seconds: number;
  discrimination_index: number;
  calibrated_difficulty: number | null;
  quality_flag: string | null;
  last_calculated_at: string;
  // E2.C: merged from question_usage_stats_v1 (times the question was served
  // in adaptive sessions) — populated by the dashboard, not by this query.
  times_served?: number;
  question_bank: {
    id: string;
    course_id: string;
    clo_id: string;
    bloom_level: number;
    question_type: string;
    question_text: string;
    difficulty_rating: number;
    status: string;
  };
}

// ─── useQuestionUsageStats — per-question served counts (E2.C view) ─────────

export interface QuestionUsageStatsRow {
  question_id: string;
  times_served: number;
}

export const useQuestionUsageStats = (courseId: string) => {
  return useQuery({
    queryKey: queryKeys.questionAnalytics.list({
      scope: "usage-stats",
      courseId,
    }),
    queryFn: async (): Promise<QuestionUsageStatsRow[]> => {
      const { data, error } = await supabase
        .from("question_usage_stats_v1")
        .select("question_id, times_served")
        .eq("course_id", courseId);

      if (error) throw error;
      return (data ?? []) as QuestionUsageStatsRow[];
    },
    enabled: !!courseId,
  });
};

// ─── useQuestionAnalytics — list analytics with joined question data ────────

export const useQuestionAnalytics = (
  courseId: string,
  filters: AnalyticsFilters = {}
) => {
  return useQuery({
    queryKey: queryKeys.questionAnalytics.list({ courseId, ...filters }),
    queryFn: async (): Promise<QuestionAnalyticsRow[]> => {
      let query = supabase
        .from("question_analytics")
        .select(
          "*, question_bank!inner(id, course_id, clo_id, bloom_level, question_type, question_text, difficulty_rating, status)"
        )
        .eq("question_bank.course_id", courseId)
        .order("total_attempts", { ascending: false });

      if (filters.quality_flag) {
        query = query.eq("quality_flag", filters.quality_flag);
      }
      if (filters.clo_id) {
        query = query.eq("question_bank.clo_id", filters.clo_id);
      }
      if (filters.bloom_level !== undefined) {
        query = query.eq("question_bank.bloom_level", filters.bloom_level);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data ?? []) as QuestionAnalyticsRow[];
    },
    enabled: !!courseId,
  });
};

// ─── useQuestionDetail — single question analytics with joined data ─────────

export const useQuestionDetail = (questionId: string) => {
  return useQuery({
    queryKey: queryKeys.questionAnalytics.detail(questionId),
    queryFn: async (): Promise<QuestionAnalyticsRow | null> => {
      const { data, error } = await supabase
        .from("question_analytics")
        .select(
          "*, question_bank!inner(id, course_id, clo_id, bloom_level, question_type, question_text, difficulty_rating, status)"
        )
        .eq("question_id", questionId)
        .maybeSingle();

      if (error) throw error;
      return data as QuestionAnalyticsRow | null;
    },
    enabled: !!questionId,
  });
};
