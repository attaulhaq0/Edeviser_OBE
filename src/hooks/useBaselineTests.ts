import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';

// ── Types ────────────────────────────────────────────────────────────

export interface BaselineTestConfig {
  id: string;
  course_id: string;
  time_limit_minutes: number;
  is_active: boolean;
  min_questions_per_clo: number;
  created_at: string;
  updated_at: string;
}

export interface BaselineAttainment {
  id: string;
  student_id: string;
  course_id: string;
  clo_id: string;
  score: number;
  question_count: number;
  correct_count: number;
  assessment_version: number;
  created_at: string;
}

export interface CourseBaselineStats {
  clo_id: string;
  avg_score: number;
  student_count: number;
}

// ── useBaselineTestConfig — fetch config for a course ─────────────────

export const useBaselineTestConfig = (courseId: string) => {
  return useQuery({
    queryKey: queryKeys.onboarding.baselineTests(courseId),
    queryFn: async (): Promise<BaselineTestConfig | null> => {
      const { data, error } = await supabase
        .from('baseline_test_config')
        .select('*')
        .eq('course_id', courseId)
        .maybeSingle();

      if (error) throw error;
      return data as BaselineTestConfig | null;
    },
    enabled: !!courseId,
  });
};

// ── useBaselineResults — teacher view of student results ─────────────

export const useBaselineResults = (courseId: string) => {
  return useQuery({
    queryKey: queryKeys.onboarding.baselineResults(courseId),
    queryFn: async (): Promise<BaselineAttainment[]> => {
      const { data, error } = await supabase
        .from('baseline_attainment')
        .select('*')
        .eq('course_id', courseId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data ?? []) as BaselineAttainment[];
    },
    enabled: !!courseId,
  });
};

// ── useCourseBaselineStats — aggregate per-CLO stats ─────────────────

export const useCourseBaselineStats = (courseId: string) => {
  return useQuery({
    queryKey: [...queryKeys.onboarding.baselineResults(courseId), 'stats'],
    queryFn: async (): Promise<CourseBaselineStats[]> => {
      const { data, error } = await supabase
        .from('baseline_attainment')
        .select('clo_id, score')
        .eq('course_id', courseId);

      if (error) throw error;

      const rows = (data ?? []) as Array<{ clo_id: string; score: number }>;
      const cloMap = new Map<string, { total: number; count: number }>();

      for (const row of rows) {
        const entry = cloMap.get(row.clo_id) ?? { total: 0, count: 0 };
        entry.total += row.score;
        entry.count++;
        cloMap.set(row.clo_id, entry);
      }

      return Array.from(cloMap.entries()).map(([clo_id, { total, count }]) => ({
        clo_id,
        avg_score: Math.round(total / count),
        student_count: count,
      }));
    },
    enabled: !!courseId,
  });
};

// ── useUpdateBaselineConfig — upsert baseline test config ────────────

export const useUpdateBaselineConfig = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: Pick<BaselineTestConfig, 'course_id' | 'time_limit_minutes' | 'is_active'>,
    ): Promise<BaselineTestConfig> => {
      const { data, error } = await supabase
        .from('baseline_test_config')
        .upsert(input, { onConflict: 'course_id' })
        .select()
        .single();

      if (error) throw error;
      return data as BaselineTestConfig;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.onboarding.baselineTests(variables.course_id),
      });
    },
  });
};
