import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface QuizCLOCorrelationData {
  attempts: Array<{
    id: string;
    student_id: string;
    score: number | null;
    question_sequence: unknown;
  }>;
  attainments: Array<{
    id: string;
    student_id: string | null;
    outcome_id: string;
    attainment_percent: number;
    scope: string;
  }>;
}

// ─── useQuizCLOCorrelation — fetch quiz attempts + CLO attainment data ──────

export const useQuizCLOCorrelation = (quizId: string) => {
  return useQuery({
    queryKey: queryKeys.quizCLOCorrelation.detail(quizId),
    queryFn: async (): Promise<QuizCLOCorrelationData> => {
      const { data: attempts, error: attemptsError } = await supabase
        .from('quiz_attempts')
        .select('id, student_id, score, question_sequence')
        .eq('quiz_id', quizId);

      if (attemptsError) throw attemptsError;

      const studentIds = [...new Set((attempts ?? []).map((a) => a.student_id))];

      if (studentIds.length === 0) {
        return { attempts: attempts ?? [], attainments: [] };
      }

      const { data: attainments, error: attainmentsError } = await supabase
        .from('outcome_attainment')
        .select('id, student_id, outcome_id, attainment_percent, scope')
        .in('student_id', studentIds)
        .eq('scope', 'student_course');

      if (attainmentsError) throw attainmentsError;

      return {
        attempts: attempts ?? [],
        attainments: attainments ?? [],
      };
    },
    enabled: !!quizId,
  });
};
