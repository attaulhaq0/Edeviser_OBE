/**
 * Hook to manage AI Tutor hint tokens from the marketplace.
 * Integrates with AI Tutor rate limiting (Task 7.3).
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface HintTokenAllowance {
  baseLimit: number;
  extraTokens: number;
  totalAllowance: number;
  usedToday: number;
  remaining: number;
}

export const useHintTokenAllowance = (studentId: string | undefined) => {
  return useQuery({
    queryKey: ['hintTokens', 'allowance', studentId],
    queryFn: async (): Promise<HintTokenAllowance> => {
      if (!studentId) return { baseLimit: 10, extraTokens: 0, totalAllowance: 10, usedToday: 0, remaining: 10 };

      const todayStart = new Date();
      todayStart.setUTCHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setUTCHours(23, 59, 59, 999);

      // Count active hint token packs purchased today (each gives 5 extra messages)
      const { data: tokens, error: tokenErr } = await supabase
        .from('xp_purchases')
        .select('id, item:marketplace_items!inner(sub_category)')
        .eq('student_id', studentId)
        .eq('status', 'active')
        .eq('marketplace_items.sub_category', 'hint_token')
        .gte('purchased_at', todayStart.toISOString())
        .lte('purchased_at', todayEnd.toISOString());
      if (tokenErr) throw tokenErr;

      const extraTokens = (tokens?.length ?? 0) * 5;
      const baseLimit = 10;
      const totalAllowance = baseLimit + extraTokens;

      // Count AI tutor messages used today (from activity log)
      const { count, error: countErr } = await supabase
        .from('student_activity_log')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', studentId)
        .eq('event_type', 'ai_tutor_message')
        .gte('created_at', todayStart.toISOString())
        .lte('created_at', todayEnd.toISOString());
      if (countErr) throw countErr;

      const usedToday = count ?? 0;
      const remaining = Math.max(0, totalAllowance - usedToday);

      return { baseLimit, extraTokens, totalAllowance, usedToday, remaining };
    },
    enabled: !!studentId,
  });
};

export const useConsumeHintToken = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (studentId: string) => {
      // Log the AI tutor message usage
      const { error } = await supabase
        .from('student_activity_log')
        .insert({
          student_id: studentId,
          event_type: 'ai_tutor_message',
          metadata: { source: 'hint_token' },
        });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hintTokens'] });
    },
  });
};
