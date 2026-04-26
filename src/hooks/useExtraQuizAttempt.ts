/**
 * Hook to check and consume extra quiz attempt tokens from the marketplace.
 * Integrates with the quiz submission flow (Task 7.1).
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';

export const useExtraQuizAttemptToken = (studentId: string | undefined, quizId: string | undefined) => {
  return useQuery({
    queryKey: ['extraQuizAttempt', studentId, quizId],
    queryFn: async () => {
      if (!studentId) return { hasToken: false, tokenCount: 0 };
      const { data, error } = await supabase
        .from('xp_purchases')
        .select('id, item:marketplace_items!inner(sub_category)')
        .eq('student_id', studentId)
        .eq('status', 'active')
        .eq('marketplace_items.sub_category', 'extra_quiz_attempt');
      if (error) throw error;
      return { hasToken: (data?.length ?? 0) > 0, tokenCount: data?.length ?? 0 };
    },
    enabled: !!studentId && !!quizId,
  });
};

export const useConsumeExtraAttempt = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ purchaseId, quizId }: { purchaseId: string; quizId: string }) => {
      const { error } = await supabase
        .from('xp_purchases')
        .update({
          status: 'consumed',
          consumed_at: new Date().toISOString(),
          metadata: { consumed_for_quiz: quizId },
        })
        .eq('id', purchaseId)
        .eq('status', 'active');
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.marketplace.inventory('') });
      qc.invalidateQueries({ queryKey: queryKeys.quizAttempts.lists() });
    },
  });
};
