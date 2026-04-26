/**
 * Hooks for bonus question trigger and answer submission. Task 20.4
 */
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface BonusQuestionResult {
  triggered: boolean;
  question?: {
    id: string;
    question_text: string;
    options: { key: string; text: string }[];
    correct_answer: string;
    clo_id: string;
  };
}

export interface BonusAnswerResult {
  correct: boolean;
  xp_awarded: number;
}

export const useTriggerBonusQuestion = () => {
  return useMutation({
    mutationFn: async ({ studentId }: { studentId: string }): Promise<BonusQuestionResult> => {
      const { data, error } = await supabase.functions.invoke('check-bonus-question', {
        body: { student_id: studentId },
      });
      if (error) throw error;
      return data as BonusQuestionResult;
    },
  });
};

export const useSubmitBonusAnswer = () => {
  return useMutation({
    mutationFn: async ({ questionId, answer, studentId }: { questionId: string; answer: string; studentId: string }): Promise<BonusAnswerResult> => {
      const { data, error } = await supabase.functions.invoke('check-bonus-question', {
        body: { student_id: studentId, question_id: questionId, answer },
      });
      if (error) throw error;
      return data as BonusAnswerResult;
    },
  });
};
