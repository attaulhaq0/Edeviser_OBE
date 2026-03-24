import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import type { GenerateQuestionsInput } from '@/lib/quizGenerationSchemas';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface GeneratedQuestion {
  question_text: string;
  question_type: string;
  bloom_level: number;
  clo_id: string;
  options: { key: string; text: string; is_correct: boolean }[] | null;
  correct_answer: { value: string | string[]; explanation: string };
  difficulty_rating: number;
  source_chunks: string[];
}

export interface GenerateQuestionsResponse {
  generation_id: string;
  questions: GeneratedQuestion[];
  warnings: string[];
  chunks_used: number;
}

// ─── useGenerateQuestions — AI question generation via Edge Function ─────────

export const useGenerateQuestions = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: GenerateQuestionsInput): Promise<GenerateQuestionsResponse> => {
      const { data, error } = await supabase.functions.invoke('generate-quiz-questions', {
        body: input,
      });

      if (error) throw error;
      return data as GenerateQuestionsResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.questionBank.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.reviewQueue.lists() });
    },
  });
};
