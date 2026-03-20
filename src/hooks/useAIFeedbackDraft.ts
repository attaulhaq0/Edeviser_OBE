// =============================================================================
// useAIFeedbackDraft — TanStack Query hooks for AI feedback draft generation
// Validates: Requirements 48.4, 48.6
// =============================================================================

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface GenerateDraftInput {
  submission_id: string;
  rubric_id: string;
  rubric_selections: Array<{ criterion_id: string; level_index: number }>;
  student_id: string;
  clo_id: string;
}

export interface CriterionDraft {
  criterion_id: string;
  criterion_title: string;
  draft_comment: string;
}

export interface GenerateDraftResponse {
  criterion_drafts: CriterionDraft[];
  overall_draft: string;
}

export interface LogDraftActionInput {
  student_id: string;
  suggestion_type: 'feedback_draft';
  suggestion_text: string;
  suggestion_data: Record<string, string | undefined>;
  feedback: 'thumbs_up' | 'thumbs_down' | null;
  validated_outcome: 'accepted' | 'edited' | 'rejected' | null;
}

// ─── useGenerateFeedbackDraft ────────────────────────────────────────────────

export const useGenerateFeedbackDraft = () => {
  return useMutation({
    mutationFn: async (input: GenerateDraftInput): Promise<GenerateDraftResponse> => {
      const { data, error } = await supabase.functions.invoke('ai-feedback-draft', {
        body: input,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return {
        criterion_drafts: data.criterion_drafts ?? [],
        overall_draft: data.overall_draft ?? '',
      };
    },
  });
};

// ─── useLogDraftAction ───────────────────────────────────────────────────────

export const useLogDraftAction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: LogDraftActionInput): Promise<void> => {
      const { error } = await supabase
        .from('ai_feedback')
        .insert(input);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.aiFeedback.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.feedbackDrafts.lists() });
    },
  });
};
