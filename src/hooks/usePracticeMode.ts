import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PracticeModeConfig {
  practice_mode_enabled: boolean;
}

export interface TogglePracticeModeInput {
  quiz_id: string;
  practice_mode_enabled: boolean;
}

export interface PracticeAttempt {
  id: string;
  quiz_id: string;
  student_id: string;
  mode: string;
  score: number | null;
  question_sequence: unknown[];
  difficulty_trajectory: unknown[];
  per_question_times: unknown[];
  created_at: string;
}

// ─── usePracticeModeConfig — fetch practice_mode_enabled for a quiz ─────────
// Note: practice_mode_enabled column added via migration (task 16.1).
// Types will be regenerated in task 16.11; until then we cast through unknown.

export const usePracticeModeConfig = (quizId: string) => {
  return useQuery({
    queryKey: queryKeys.practiceMode.config(quizId),
    queryFn: async (): Promise<PracticeModeConfig | null> => {
      const { data, error } = await supabase
        .from('quizzes')
        .select('*')
        .eq('id', quizId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      const row = data as unknown as Record<string, unknown>;
      return {
        practice_mode_enabled: row.practice_mode_enabled as boolean,
      };
    },
    enabled: !!quizId,
  });
};

// ─── useTogglePracticeMode — update practice_mode_enabled on a quiz ─────────

export const useTogglePracticeMode = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: TogglePracticeModeInput) => {
      const updatePayload = {
        practice_mode_enabled: input.practice_mode_enabled,
      } as unknown as Record<string, unknown>;

      const { data, error } = await supabase
        .from('quizzes')
        .update(updatePayload)
        .eq('id', input.quiz_id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.practiceMode.config(variables.quiz_id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.quizzes.all,
      });
    },
  });
};

// ─── usePracticeAttempts — fetch practice-mode attempts for a quiz+student ──
// Note: mode column added via migration (task 16.1).

export const usePracticeAttempts = (quizId: string, studentId: string) => {
  return useQuery({
    queryKey: queryKeys.practiceMode.attempts(quizId, studentId),
    queryFn: async (): Promise<PracticeAttempt[]> => {
      const { data, error } = await supabase
        .from('quiz_attempts')
        .select('*')
        .eq('quiz_id', quizId)
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const rows = (data ?? []) as unknown as Record<string, unknown>[];
      return rows
        .filter((r) => r.mode === 'practice')
        .map((r) => ({
          id: r.id as string,
          quiz_id: r.quiz_id as string,
          student_id: r.student_id as string,
          mode: r.mode as string,
          score: r.score as number | null,
          question_sequence: (r.question_sequence ?? []) as unknown[],
          difficulty_trajectory: (r.difficulty_trajectory ?? []) as unknown[],
          per_question_times: (r.per_question_times ?? []) as unknown[],
          created_at: r.created_at as string,
        }));
    },
    enabled: !!quizId && !!studentId,
  });
};
