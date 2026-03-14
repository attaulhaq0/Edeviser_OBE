import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import type { ProcessOnboardingInput } from '@/lib/onboardingSchemas';
import type { BigFiveTraits, VARKProfile, SelfEfficacyProfile, StudyStrategyProfile } from '@/lib/scoreCalculator';

// ── Types ────────────────────────────────────────────────────────────

export interface StudentProfile {
  id: string;
  student_id: string;
  institution_id: string;
  personality_traits: BigFiveTraits | null;
  learning_style: VARKProfile | null;
  self_efficacy: SelfEfficacyProfile | null;
  study_strategies: StudyStrategyProfile | null;
  profile_completeness: number;
  assessment_version: number;
  completed_at: string;
  created_at: string;
}

export interface ProcessOnboardingResult {
  success: boolean;
  profile: {
    personality_traits: BigFiveTraits | null;
    learning_style: VARKProfile | null;
    self_efficacy: SelfEfficacyProfile | null;
    study_strategies: StudyStrategyProfile | null;
    baseline_scores: Array<{ course_id: string; clo_scores: Array<{ clo_id: string; score: number }> }>;
    profile_completeness: number;
  };
  xp_awarded: number;
  badges_earned: string[];
}

// ── useStudentProfile — fetch latest profile ─────────────────────────

export const useStudentProfile = (studentId: string) => {
  return useQuery({
    queryKey: queryKeys.onboarding.studentProfile(studentId),
    queryFn: async (): Promise<StudentProfile | null> => {
      const { data, error } = await supabase
        .from('student_profiles')
        .select('*')
        .eq('student_id', studentId)
        .order('assessment_version', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as StudentProfile | null;
    },
    enabled: !!studentId,
  });
};

// ── useProcessOnboarding — call process-onboarding Edge Function ─────

export const useProcessOnboarding = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ProcessOnboardingInput): Promise<ProcessOnboardingResult> => {
      const { data, error } = await supabase.functions.invoke('process-onboarding', {
        body: input,
      });

      if (error) throw error;
      return data as ProcessOnboardingResult;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.onboarding.studentProfile(variables.student_id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.onboarding.progress(variables.student_id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.onboarding.profileCompleteness(variables.student_id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.onboarding.starterWeekSessions(variables.student_id),
      });
    },
  });
};
