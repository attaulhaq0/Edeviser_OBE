import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import type { Database } from "@/types/database";

// ─── Types ──────────────────────────────────────────────────────────────────

type VerifiedExplanationRow =
  Database["public"]["Tables"]["verified_explanations"]["Row"];
type VerifiedExplanationInsert =
  Database["public"]["Tables"]["verified_explanations"]["Insert"];

export interface ApproveExplanationInput {
  institution_id: string;
  question_id: string;
  explanation_text: string;
  verified_by: string;
}

export interface EditExplanationInput {
  institution_id: string;
  question_id: string;
  explanation_text: string;
  verified_by: string;
}

export interface ReviewQueueItem {
  id: string;
  course_id: string;
  clo_id: string;
  bloom_level: number;
  question_text: string;
  explanation: string | null;
  explanation_confidence: number | null;
  difficulty_rating: number;
  question_analytics: {
    success_rate: number | null;
    total_attempts: number;
  } | null;
}

// ─── useExplanationConfidence — fetch confidence score for a question ───────

export const useExplanationConfidence = (questionId: string) => {
  return useQuery({
    queryKey: queryKeys.explanationConfidence.detail(questionId),
    queryFn: async (): Promise<number | null> => {
      const { data, error } = await supabase
        .from("question_bank")
        .select("explanation_confidence")
        .eq("id", questionId)
        .maybeSingle();

      if (error) throw error;
      return data?.explanation_confidence ?? null;
    },
    enabled: !!questionId,
  });
};

// ─── useVerifiedExplanation — fetch active verified explanation for a question ─

export const useVerifiedExplanation = (questionId: string) => {
  return useQuery({
    queryKey: queryKeys.verifiedExplanations.detail(questionId),
    queryFn: async (): Promise<VerifiedExplanationRow | null> => {
      const { data, error } = await supabase
        .from("verified_explanations")
        .select("*")
        .eq("question_id", questionId)
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!questionId,
  });
};

// ─── useApproveExplanation — insert a verified explanation (teacher_approved) ─

export const useApproveExplanation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: ApproveExplanationInput
    ): Promise<VerifiedExplanationRow> => {
      // Deactivate any existing active explanation for this question
      await supabase
        .from("verified_explanations")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("question_id", input.question_id)
        .eq("is_active", true);

      const insertData: VerifiedExplanationInsert = {
        institution_id: input.institution_id,
        question_id: input.question_id,
        explanation_text: input.explanation_text,
        source: "teacher_approved",
        verified_by: input.verified_by,
        is_active: true,
      };

      const { data, error } = await supabase
        .from("verified_explanations")
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.verifiedExplanations.detail(variables.question_id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.explanationReviewQueue.all,
      });
    },
  });
};

// ─── useEditExplanation — insert a verified explanation (teacher_edited) ─────

export const useEditExplanation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: EditExplanationInput
    ): Promise<VerifiedExplanationRow> => {
      // Deactivate any existing active explanation for this question
      await supabase
        .from("verified_explanations")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("question_id", input.question_id)
        .eq("is_active", true);

      const insertData: VerifiedExplanationInsert = {
        institution_id: input.institution_id,
        question_id: input.question_id,
        explanation_text: input.explanation_text,
        source: "teacher_edited",
        verified_by: input.verified_by,
        is_active: true,
      };

      const { data, error } = await supabase
        .from("verified_explanations")
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.verifiedExplanations.detail(variables.question_id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.explanationReviewQueue.all,
      });
    },
  });
};

// ─── useExplanationReviewQueue — frequently-missed questions needing review ──

export const useExplanationReviewQueue = (courseId: string) => {
  return useQuery({
    queryKey: queryKeys.explanationReviewQueue.list(courseId),
    queryFn: async (): Promise<ReviewQueueItem[]> => {
      // Fetch questions with their analytics joined
      const { data, error } = await supabase
        .from("question_bank")
        .select(
          `
          id,
          course_id,
          clo_id,
          bloom_level,
          question_text,
          explanation,
          explanation_confidence,
          difficulty_rating,
          question_analytics (
            success_rate,
            total_attempts
          )
        `
        )
        .eq("course_id", courseId)
        .eq("status", "approved");

      if (error) throw error;

      // Filter to frequently-missed: success_rate < 0.5 AND total_attempts >= 10
      const frequentlyMissed = (data ?? [])
        .filter((q) => {
          const analytics = q.question_analytics as unknown as {
            success_rate: number | null;
            total_attempts: number;
          } | null;
          if (!analytics) return false;
          return (
            analytics.total_attempts >= 10 &&
            analytics.success_rate !== null &&
            analytics.success_rate < 0.5
          );
        })
        .sort((a, b) => {
          const aAttempts =
            (
              a.question_analytics as unknown as {
                total_attempts: number;
              } | null
            )?.total_attempts ?? 0;
          const bAttempts =
            (
              b.question_analytics as unknown as {
                total_attempts: number;
              } | null
            )?.total_attempts ?? 0;
          return bAttempts - aAttempts; // desc
        })
        .map((q) => ({
          id: q.id,
          course_id: q.course_id,
          clo_id: q.clo_id,
          bloom_level: q.bloom_level,
          question_text: q.question_text,
          explanation: q.explanation,
          explanation_confidence: q.explanation_confidence,
          difficulty_rating: q.difficulty_rating,
          question_analytics: q.question_analytics as unknown as {
            success_rate: number | null;
            total_attempts: number;
          } | null,
        }));

      return frequentlyMissed;
    },
    enabled: !!courseId,
  });
};
