import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import type { OnboardingStepId } from '@/lib/onboardingConstants';

// ── Types ────────────────────────────────────────────────────────────

export interface OnboardingProgress {
  id: string;
  student_id: string;
  current_step: OnboardingStepId;
  personality_completed: boolean;
  learning_style_completed: boolean;
  self_efficacy_completed: boolean;
  study_strategy_completed: boolean;
  baseline_completed: boolean;
  baseline_course_ids: string[];
  skipped_sections: string[];
  assessment_version: number;
  day1_completed: boolean;
  micro_assessment_day: number;
  micro_assessment_dismissals: number;
  profile_completeness: number;
  created_at: string;
  updated_at: string;
}

export interface UpdateProgressInput {
  current_step?: OnboardingStepId;
  personality_completed?: boolean;
  learning_style_completed?: boolean;
  self_efficacy_completed?: boolean;
  study_strategy_completed?: boolean;
  baseline_completed?: boolean;
  baseline_course_ids?: string[];
  skipped_sections?: string[];
  day1_completed?: boolean;
  micro_assessment_day?: number;
  micro_assessment_dismissals?: number;
  profile_completeness?: number;
}

// ── useOnboardingProgress — fetch current progress ───────────────────

export const useOnboardingProgress = (studentId: string) => {
  return useQuery({
    queryKey: queryKeys.onboarding.progress(studentId),
    queryFn: async (): Promise<OnboardingProgress | null> => {
      const { data, error } = await supabase
        .from('onboarding_progress')
        .select('*')
        .eq('student_id', studentId)
        .maybeSingle();

      if (error) throw error;
      return data as OnboardingProgress | null;
    },
    enabled: !!studentId,
  });
};

// ── useUpdateProgress — upsert progress record ──────────────────────

export const useUpdateProgress = (studentId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateProgressInput): Promise<OnboardingProgress> => {
      const { data, error } = await supabase
        .from('onboarding_progress')
        .upsert(
          { student_id: studentId, ...input, updated_at: new Date().toISOString() },
          { onConflict: 'student_id' },
        )
        .select()
        .single();

      if (error) throw error;
      return data as OnboardingProgress;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.onboarding.progress(studentId),
      });
    },
  });
};
