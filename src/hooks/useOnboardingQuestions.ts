import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';

// ── Types ────────────────────────────────────────────────────────────

export interface OnboardingQuestion {
  id: string;
  institution_id: string;
  assessment_type: string;
  question_text: string;
  dimension: string | null;
  weight: number | null;
  options: unknown[] | null;
  correct_option: number | null;
  clo_id: string | null;
  course_id: string | null;
  difficulty_level: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ── Shared fetcher ───────────────────────────────────────────────────

const fetchQuestions = async (
  assessmentType: string,
  courseId?: string,
): Promise<OnboardingQuestion[]> => {
  let query = supabase
    .from('onboarding_questions')
    .select('*')
    .eq('assessment_type', assessmentType)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (courseId) {
    query = query.eq('course_id', courseId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as OnboardingQuestion[];
};

// ── usePersonalityQuestions ───────────────────────────────────────────

export const usePersonalityQuestions = () => {
  return useQuery({
    queryKey: queryKeys.onboarding.questions('personality'),
    queryFn: () => fetchQuestions('personality'),
    staleTime: 5 * 60_000,
  });
};

// ── useLearningStyleQuestions ────────────────────────────────────────

export const useLearningStyleQuestions = () => {
  return useQuery({
    queryKey: queryKeys.onboarding.questions('learning_style'),
    queryFn: () => fetchQuestions('learning_style'),
    staleTime: 5 * 60_000,
  });
};

// ── useSelfEfficacyQuestions ─────────────────────────────────────────

export const useSelfEfficacyQuestions = () => {
  return useQuery({
    queryKey: queryKeys.onboarding.questions('self_efficacy'),
    queryFn: () => fetchQuestions('self_efficacy'),
    staleTime: 5 * 60_000,
  });
};

// ── useStudyStrategyQuestions ────────────────────────────────────────

export const useStudyStrategyQuestions = () => {
  return useQuery({
    queryKey: queryKeys.onboarding.questions('study_strategy'),
    queryFn: () => fetchQuestions('study_strategy'),
    staleTime: 5 * 60_000,
  });
};

// ── useBaselineQuestions ─────────────────────────────────────────────

export const useBaselineQuestions = (courseId: string) => {
  return useQuery({
    queryKey: queryKeys.onboarding.questions(`baseline_${courseId}`),
    queryFn: () => fetchQuestions('baseline', courseId),
    enabled: !!courseId,
    staleTime: 5 * 60_000,
  });
};
