import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import type { QuestionBankRow } from '@/hooks/useQuestionBank';

// ─── useReviewQueue — fetch pending_review questions for a course ───────────

export const useReviewQueue = (courseId: string) => {
  return useQuery({
    queryKey: queryKeys.reviewQueue.list({ courseId }),
    queryFn: async (): Promise<QuestionBankRow[]> => {
      const { data, error } = await supabase
        .from('question_bank')
        .select('*')
        .eq('course_id', courseId)
        .eq('status', 'pending_review')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data ?? []) as QuestionBankRow[];
    },
    enabled: !!courseId,
  });
};

// ─── useApproveQuestion — set status to approved ────────────────────────────

export const useApproveQuestion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: string }): Promise<QuestionBankRow> => {
      const { data, error } = await supabase
        .from('question_bank')
        .update({ status: 'approved' })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as QuestionBankRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reviewQueue.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.questionBank.lists() });
    },
  });
};

// ─── useRejectQuestion — set status to rejected ─────────────────────────────

export const useRejectQuestion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: string }): Promise<QuestionBankRow> => {
      const { data, error } = await supabase
        .from('question_bank')
        .update({ status: 'rejected' })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as QuestionBankRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reviewQueue.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.questionBank.lists() });
    },
  });
};

// ─── useBulkApproveQuestions — approve multiple questions at once ────────────

export const useBulkApproveQuestions = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ids }: { ids: string[] }): Promise<QuestionBankRow[]> => {
      const { data, error } = await supabase
        .from('question_bank')
        .update({ status: 'approved' })
        .in('id', ids)
        .select();

      if (error) throw error;
      return (data ?? []) as QuestionBankRow[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reviewQueue.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.questionBank.lists() });
    },
  });
};
