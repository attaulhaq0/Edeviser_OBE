import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { MAX_MICRO_DISMISSALS } from '@/lib/onboardingConstants';

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

// ── useCompleteMicroAssessment — mark as completed ───────────────────

export const useCompleteMicroAssessment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id: string;
      studentId: string;
    }): Promise<MicroAssessment> => {
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
      return data as MicroAssessment;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.onboarding.microAssessments(variables.studentId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.onboarding.profileCompleteness(variables.studentId),
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
