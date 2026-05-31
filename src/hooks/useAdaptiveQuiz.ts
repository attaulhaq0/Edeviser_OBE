import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface StartAdaptiveQuizInput {
  quiz_id: string;
}

export interface SelectQuestionInput {
  quiz_id: string;
  quiz_attempt_id: string;
  previous_question_id?: string;
  previous_answer_correct?: boolean;
  previous_response_time_ms?: number;
}

export interface SelectQuestionResponse {
  question: {
    id: string;
    question_text: string;
    question_type: string;
    options: { key: string; text: string }[] | null;
    bloom_level: number;
    clo_id: string;
    /**
     * The question's correct answer, when the backend exposes it for
     * client-side correctness derivation (see `deriveCorrectness`). The
     * adaptive selection function may strip this for graded security; when it
     * is absent, correctness derivation has no evidence and resolves to
     * "incorrect" rather than a hardcoded "correct" (R2.6).
     */
    correct_answer?: string | null;
  };
  question_number: number;
  total_questions: number;
  current_target_difficulty: number;
  session_complete: boolean;
}

export interface SubmitQuizAttemptInput {
  quiz_attempt_id: string;
  answers: Record<string, string>;
  score: number;
  mode?: "graded" | "practice";
}

// ─── useStartAdaptiveQuiz — create a new adaptive quiz attempt ──────────────

export const useStartAdaptiveQuiz = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: StartAdaptiveQuizInput) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("quiz_attempts")
        .insert({
          quiz_id: input.quiz_id,
          student_id: user.id,
          question_sequence: [],
          difficulty_trajectory: [],
          per_question_times: [],
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.quizAttempts.lists(),
      });
    },
  });
};

// ─── useSelectNextQuestion — call Edge Function for adaptive selection ───────

export const useSelectNextQuestion = () => {
  return useMutation({
    mutationFn: async (
      input: SelectQuestionInput
    ): Promise<SelectQuestionResponse> => {
      const { data, error } = await supabase.functions.invoke(
        "select-adaptive-question",
        {
          body: input,
        }
      );

      if (error) throw error;
      return data as SelectQuestionResponse;
    },
  });
};

// ─── useSubmitQuizAttempt — finalize the adaptive quiz attempt ───────────────

export const useSubmitQuizAttempt = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SubmitQuizAttemptInput) => {
      const { quiz_attempt_id, answers, score } = input;

      // quiz_attempts has no `mode` column in the live schema; ignored if passed
      const { data, error } = await supabase
        .from("quiz_attempts")
        .update({ answers, score })
        .eq("id", quiz_attempt_id)
        .select()
        .single();

      if (error) throw error;

      // Trigger post-quiz analytics recalculation (fire-and-forget)
      supabase.functions
        .invoke("update-question-analytics", {
          body: { quiz_attempt_id },
        })
        .catch((err) => {
          console.error("Failed to update question analytics:", err);
        });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.quizAttempts.lists(),
      });
    },
  });
};
