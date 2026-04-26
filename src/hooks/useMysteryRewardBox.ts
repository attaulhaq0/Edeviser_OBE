/**
 * Hook for mystery reward box state and reveal. Task 20.5
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';

export interface MysteryBoxRevealResult {
  type: 'xp_multiplier' | 'cosmetic' | 'boost';
  description: string;
  xp_multiplier?: number;
  cosmetic_item_id?: string;
  boost_duration_minutes?: number;
}

export const useResolveMysteryReward = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ studentId }: { studentId: string }): Promise<MysteryBoxRevealResult> => {
      const { data, error } = await supabase.functions.invoke('resolve-mystery-reward', {
        body: { student_id: studentId },
      });
      if (error) throw error;
      return data as MysteryBoxRevealResult;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.marketplace.balance('') });
      qc.invalidateQueries({ queryKey: queryKeys.marketplace.inventory('') });
      qc.invalidateQueries({ queryKey: queryKeys.mysteryBox.all });
    },
  });
};
