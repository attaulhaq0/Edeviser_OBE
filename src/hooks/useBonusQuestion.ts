// =============================================================================
// useBonusQuestion — Bonus question trigger and answer submission
// Task 20.4
// =============================================================================

import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface BonusQuestionData {
  triggered: boolean;
  question?: {
    text: string;
    type: string;
    clo_id: string | null;
    time_limit_seconds: number;
    xp_reward: number;
  };
}

export interface BonusAnswerResult {
  correct: boolean;
  xp_awarded: number;
  feedback: string;
}

export const useTriggerBonusQuestion = () => {
  return useMutation({
    mutationFn: async ({
      studentId,
      institutionId,
      courseId,
    }: {
      studentId: string;
      institutionId: string;
      courseId?: string;
    }): Promise<BonusQuestionData> => {
      const { data, error } = await supabase.functions.invoke('check-bonus-question', {
        body: {
          student_id: studentId,
          institution_id: institutionId,
          course_id: courseId,
          action: 'trigger',
        },
      });
      if (error) throw error;
      return data as BonusQuestionData;
    },
  });
};

export const useSubmitBonusAnswer = () => {
  return useMutation({
    mutationFn: async ({
      studentId,
      institutionId,
      answer,
      cloId,
    }: {
      studentId: string;
      institutionId: string;
      answer: string;
      cloId?: string | null;
    }): Promise<BonusAnswerResult> => {
      const { data, error } = await supabase.functions.invoke('check-bonus-question', {
        body: {
          student_id: studentId,
          institution_id: institutionId,
          action: 'answer',
          answer,
          clo_id: cloId,
        },
      });
      if (error) throw error;
      return data as BonusAnswerResult;
    },
  });
};
