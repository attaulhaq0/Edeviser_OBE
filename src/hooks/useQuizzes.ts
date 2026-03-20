import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import type { CreateQuizFormData } from '@/lib/schemas/quiz';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Quiz {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  clo_ids: string[];
  time_limit_minutes: number | null;
  max_attempts: number;
  is_published: boolean;
  due_date: string;
  is_adaptive: boolean;
  adaptation_config: Record<string, unknown> | null;
  practice_mode_enabled: boolean;
  created_at: string;
}

// ─── useQuiz — fetch a single quiz by ID ────────────────────────────────────

export const useQuiz = (quizId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.quizzes.detail(quizId ?? ''),
    queryFn: async (): Promise<Quiz | null> => {
      const { data, error } = await supabase
        .from('quizzes')
        .select('*')
        .eq('id', quizId!)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      // Cast through unknown since practice_mode_enabled isn't in generated types yet
      const row = data as unknown as Record<string, unknown>;
      return {
        id: row.id as string,
        course_id: row.course_id as string,
        title: row.title as string,
        description: row.description as string | null,
        clo_ids: (row.clo_ids ?? []) as string[],
        time_limit_minutes: row.time_limit_minutes as number | null,
        max_attempts: row.max_attempts as number,
        is_published: row.is_published as boolean,
        due_date: row.due_date as string,
        is_adaptive: row.is_adaptive as boolean,
        adaptation_config: row.adaptation_config as Record<string, unknown> | null,
        practice_mode_enabled: (row.practice_mode_enabled ?? false) as boolean,
        created_at: row.created_at as string,
      };
    },
    enabled: !!quizId,
  });
};


// ─── useCreateQuiz — insert a new quiz ──────────────────────────────────────

export const useCreateQuiz = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateQuizFormData) => {
      // practice_mode_enabled isn't in generated types yet (task 16.11),
      // so we build the payload and cast through unknown for the insert.
      const payload = {
        course_id: input.course_id,
        title: input.title,
        description: input.description ?? null,
        clo_ids: input.clo_ids,
        time_limit_minutes: input.time_limit_minutes,
        max_attempts: input.max_attempts,
        is_published: input.is_published,
        due_date: input.due_date,
        is_adaptive: input.is_adaptive ?? false,
        adaptation_config: input.is_adaptive ? (input.adaptation_config ?? {}) : {},
        practice_mode_enabled: input.practice_mode_enabled ?? false,
      };

      const { data, error } = await (supabase
        .from('quizzes') as unknown as { insert: (v: unknown) => { select: () => { single: () => Promise<{ data: unknown; error: unknown }> } } })
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quizzes.lists() });
    },
  });
};

// ─── useUpdateQuiz — update an existing quiz ────────────────────────────────

export const useUpdateQuiz = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<CreateQuizFormData> & { id: string }) => {
      const updatePayload: Record<string, unknown> = {};
      if (input.title !== undefined) updatePayload.title = input.title;
      if (input.description !== undefined) updatePayload.description = input.description;
      if (input.clo_ids !== undefined) updatePayload.clo_ids = input.clo_ids;
      if (input.time_limit_minutes !== undefined) updatePayload.time_limit_minutes = input.time_limit_minutes;
      if (input.max_attempts !== undefined) updatePayload.max_attempts = input.max_attempts;
      if (input.is_published !== undefined) updatePayload.is_published = input.is_published;
      if (input.due_date !== undefined) updatePayload.due_date = input.due_date;
      if (input.is_adaptive !== undefined) {
        updatePayload.is_adaptive = input.is_adaptive;
        updatePayload.adaptation_config = input.is_adaptive
          ? (input.adaptation_config ?? {})
          : {};
      }
      if (input.practice_mode_enabled !== undefined) {
        updatePayload.practice_mode_enabled = input.practice_mode_enabled;
      }

      const { data, error } = await supabase
        .from('quizzes')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quizzes.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.quizzes.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.practiceMode.config(variables.id) });
    },
  });
};
