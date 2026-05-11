// =============================================================================
// useAISuggestions — TanStack Query hooks for AI module suggestions
// Validates: Requirements 46.5, 46.6
// =============================================================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SuggestionData {
  weak_clo_id: string;
  weak_clo_title: string;
  weak_clo_attainment: number;
  prerequisite_clo_id: string | null;
  prerequisite_clo_title: string | null;
  social_proof_text: string | null;
}

export interface AISuggestion {
  id: string;
  student_id: string;
  suggestion_type: string;
  suggestion_text: string;
  suggestion_data: SuggestionData;
  feedback: "thumbs_up" | "thumbs_down" | null;
  validated_outcome: string | null;
  created_at: string;
}

export interface SubmitFeedbackInput {
  feedbackId: string;
  feedback: "thumbs_up" | "thumbs_down";
}

// ─── useAISuggestions ────────────────────────────────────────────────────────

export const useAISuggestions = (studentId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.aiSuggestions.list({ studentId }),
    queryFn: async (): Promise<AISuggestion[]> => {
      if (!studentId) return [];

      const { data, error } = await supabase
        .from("ai_feedback")
        .select(
          "id, student_id, suggestion_type, suggestion_text, suggestion_data, feedback, validated_outcome, created_at"
        )
        .eq("student_id", studentId)
        .eq("suggestion_type", "module_suggestion")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as unknown as AISuggestion[];
    },
    enabled: !!studentId,
  });
};

// ─── useSubmitAIFeedback ─────────────────────────────────────────────────────

export const useSubmitAIFeedback = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      feedbackId,
      feedback,
    }: SubmitFeedbackInput): Promise<void> => {
      const { error } = await supabase
        .from("ai_feedback")
        .update({ feedback })
        .eq("id", feedbackId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.aiSuggestions.all });
    },
  });
};
