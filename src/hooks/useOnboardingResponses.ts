import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import type { SaveResponsesInput } from '@/lib/onboardingSchemas';

// ── Types ────────────────────────────────────────────────────────────

export interface OnboardingResponse {
  id: string;
  student_id: string;
  question_id: string;
  assessment_version: number;
  selected_option: number;
  score_contribution: number | null;
  created_at: string;
}

// ── useSaveResponses — batch upsert responses ────────────────────────

export const useSaveResponses = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SaveResponsesInput): Promise<OnboardingResponse[]> => {
      const rows = input.responses.map((r) => ({
        student_id: input.student_id,
        question_id: r.question_id,
        assessment_version: input.assessment_version,
        selected_option: r.selected_option,
      }));

      const { data, error } = await supabase
        .from('onboarding_responses')
        .upsert(rows, { onConflict: 'student_id,question_id,assessment_version' })
        .select();

      if (error) throw error;
      return (data ?? []) as OnboardingResponse[];
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.onboarding.responses(
          variables.student_id,
          variables.assessment_version,
        ),
      });
    },
  });
};
