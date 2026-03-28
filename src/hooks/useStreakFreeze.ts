// =============================================================================
// useStreakFreeze — TanStack Query hooks for streak freeze inventory & purchase
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { toast } from 'sonner';

export const useStreakFreezeInventory = (studentId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.studentGamification.list({ scope: 'streak_freeze', studentId }),
    queryFn: async () => {
      if (!studentId) return { freezes: 0, xpTotal: 0 };
      const { data, error } = await supabase
        .from('student_gamification')
        .select('streak_freezes_available, xp_total')
        .eq('student_id', studentId)
        .maybeSingle();
      if (error) throw error;
      return { freezes: data?.streak_freezes_available ?? 0, xpTotal: data?.xp_total ?? 0 };
    },
    enabled: !!studentId,
  });
};

export const usePurchaseStreakFreeze = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (studentId: string) => {
      // Step 1: Deduct 200 XP via award-xp Edge Function
      const { data, error } = await supabase.functions.invoke('award-xp', {
        body: {
          student_id: studentId,
          xp_amount: -200,
          source: 'streak_freeze_purchase',
          note: 'Streak Freeze purchased',
        },
      });
      if (error) throw error;

      // Step 2: Increment streak_freezes_available
      const { data: current, error: fetchErr } = await supabase
        .from('student_gamification')
        .select('streak_freezes_available')
        .eq('student_id', studentId)
        .maybeSingle();
      if (fetchErr) throw fetchErr;

      const currentFreezes = current?.streak_freezes_available ?? 0;
      if (currentFreezes >= 2) throw new Error('Maximum streak freezes reached');

      const { error: updateErr } = await supabase
        .from('student_gamification')
        .update({ streak_freezes_available: currentFreezes + 1 })
        .eq('student_id', studentId);
      if (updateErr) throw updateErr;

      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.studentGamification.all });
      qc.invalidateQueries({ queryKey: queryKeys.studentDashboard.lists() });
      toast.success('Streak Freeze purchased!');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Purchase failed'),
  });
};
