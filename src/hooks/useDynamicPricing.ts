/**
 * Hooks for dynamic pricing display and admin toggle. Task 20.12
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { toast } from 'sonner';

export interface DynamicPriceInfo {
  item_id: string;
  base_price: number;
  dynamic_price: number | null;
  demand_level: 'low' | 'normal' | 'high';
}

export const useDynamicPrices = () => {
  return useQuery({
    queryKey: queryKeys.economist.dynamicPricing(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketplace_items')
        .select('id, xp_price, dynamic_price_override')
        .eq('is_active', true);
      if (error) throw error;
      return (data ?? []).map((item) => ({
        item_id: item.id,
        base_price: item.xp_price,
        dynamic_price: item.dynamic_price_override,
        demand_level: 'normal' as const,
      })) as DynamicPriceInfo[];
    },
  });
};

export const useToggleDynamicPricing = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ itemId, enabled }: { itemId: string; enabled: boolean }) => {
      const { error } = await supabase
        .from('marketplace_items')
        .update({ dynamic_price_override: enabled ? null : -1 }) // -1 = disabled sentinel
        .eq('id', itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.economist.dynamicPricing() });
      qc.invalidateQueries({ queryKey: queryKeys.marketplace.items() });
      toast.success('Dynamic pricing updated');
    },
  });
};
