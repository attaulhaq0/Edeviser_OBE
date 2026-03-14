import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { MAX_MICRO_DISMISSALS, ONBOARDING_XP } from '@/lib/onboardingConstants';
import { awardXP } from '@/lib/xpClient';
import type { XPSource } from '@/types/app';

// ── Types ────────────────────────────────────────────────────────────

export interface MicroAssessment {
  id: string;
  student_id: string;
  scheduled_day: number;
  assessment_type: string;
  question_ids: string[];
  status: 'pending' | 'completed' | 'skipped' | 'dismissed';
  dismissal_count: number;
  scheduled_at: string;
  completed_at: string | null;
  created_at: string;
}

// ── useMicroAssessmentSchedule — full schedule ───────────────────────

export const useMicroAssessmentSchedule = (studentId: string) => {
  return useQuery({
    queryKey: queryKeys.onboarding.microAssessments(studentId),
    queryFn: async (): Promise<MicroAssessment[]> => {
      const { data, error } = await supabase
        .from('micro_assessment_schedule')
        .select('*')
        .eq('student_id', studentId)
        .order('scheduled_day', { ascending: true });

      if (error) throw error;
      return (data ?? []) as MicroAssessment[];
    },
    enabled: !!studentId,
  });
};

// ── useTodayMicroAssessment — today's pending micro ──────────────────

export const useTodayMicroAssessment = (studentId: string) => {
  return useQuery({
    queryKey: [...queryKeys.onboarding.microAssessments(studentId), 'today'],
    queryFn: async (): Promise<MicroAssessment | null> => {
      const today = new Date().toISOString().split('T')[0] ?? '';

      const { data, error } = await supabase
        .from('micro_assessment_schedule')
        .select('*')
        .eq('student_id', studentId)
        .eq('scheduled_at', today)
        .eq('status', 'pending')
        .maybeSingle();

      if (error) throw error;
      return data as MicroAssessment | null;
    },
    enabled: !!studentId,
  });
};

// ── useCompleteMicroAssessment — mark as completed + recalculate profile completeness + award XP ───

export const useCompleteMicroAssessment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id: string;
      studentId: string;
    }): Promise<MicroAssessment> => {
      // 14.6: Mark micro-assessment as completed
      const { data, error } = await supabase
        .from('micro_assessment_schedule')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', params.id)
        .select()
        .single();

      if (error) throw error;

      // 14.6: Recalculate profile_completeness based on total completed responses
      const { data: responseCounts } = await supabase
        .from('onboarding_responses')
        .select('question_id, onboarding_questions!inner(assessment_type)')
        .eq('student_id', params.studentId);

      if (responseCounts) {
        const typeCounts: Record<string, number> = {};
        for (const r of responseCounts) {
          const type = (r.onboarding_questions as { assessment_type: string })?.assessment_type;
          if (type) typeCounts[type] = (typeCounts[type] ?? 0) + 1;
        }

        const { data: baselineData } = await supabase
          .from('baseline_attainment')
          .select('id')
          .eq('student_id', params.studentId)
          .limit(1);

        const personalityItems = typeCounts['personality'] ?? 0;
        const selfEfficacyItems = typeCounts['self_efficacy'] ?? 0;
        const studyStrategyItems = typeCounts['study_strategy'] ?? 0;
        const learningStyleItems = typeCounts['learning_style'] ?? 0;
        const baselineCourses = (baselineData?.length ?? 0) > 0 ? 1 : 0;

        const weights = {
          personality: Math.min(personalityItems / 25, 1),
          self_efficacy: Math.min(selfEfficacyItems / 6, 1),
          study_strategies: Math.min(studyStrategyItems / 8, 1),
          learning_style: Math.min(learningStyleItems / 16, 1),
          baseline: baselineCourses > 0 ? 1 : 0,
        };

        const total = Object.values(weights).reduce((sum, w) => sum + w, 0);
        const newCompleteness = Math.round((total / 5) * 100);

        // UPSERT student_profiles with new completeness
        await supabase
          .from('student_profiles')
          .update({ profile_completeness: newCompleteness })
          .eq('student_id', params.studentId);

        // 14.7: Award "Profile Complete" bonus XP when reaching 100%
        if (newCompleteness >= 100) {
          // Check if bonus was already awarded
          const { data: existingBonus } = await supabase
            .from('xp_transactions')
            .select('id')
            .eq('student_id', params.studentId)
            .eq('source', 'profile_complete')
            .limit(1);

          if (!existingBonus || existingBonus.length === 0) {
            await awardXP({
              studentId: params.studentId,
              xpAmount: ONBOARDING_XP.profile_complete,
              source: 'profile_complete' as XPSource,
              referenceId: `profile_complete:${params.studentId}`,
              note: 'Profile completeness reached 100%',
            });
          }
        }
      }

      // Award micro-assessment XP
      await awardXP({
        studentId: params.studentId,
        xpAmount: ONBOARDING_XP.micro_assessment,
        source: 'micro_assessment' as XPSource,
        referenceId: `micro:${params.id}`,
        note: 'Micro-assessment completed',
      });

      return data as MicroAssessment;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.onboarding.microAssessments(variables.studentId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.onboarding.profileCompleteness(variables.studentId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.onboarding.studentProfile(variables.studentId),
      });
    },
  });
};

// ── useDismissMicroAssessment — dismiss with limit tracking ──────────

export const useDismissMicroAssessment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id: string;
      studentId: string;
      currentDismissals: number;
    }): Promise<MicroAssessment> => {
      const newCount = params.currentDismissals + 1;
      const newStatus = newCount >= MAX_MICRO_DISMISSALS ? 'skipped' : 'dismissed';

      const { data, error } = await supabase
        .from('micro_assessment_schedule')
        .update({
          dismissal_count: newCount,
          status: newStatus,
        })
        .eq('id', params.id)
        .select()
        .single();

      if (error) throw error;
      return data as MicroAssessment;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.onboarding.microAssessments(variables.studentId),
      });
    },
  });
};
