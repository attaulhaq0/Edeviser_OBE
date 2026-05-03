// =============================================================================
// useDynamicPricing — Dynamic price display, admin toggle mutation
// Task 20.12
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { toast } from 'sonner';

export interface DynamicPriceEntry {
  itemId: string;
  itemName: string;
  basePrice: number;
  dynamicPrice: number | null;
  demandLevel: 'low' | 'normal' | 'high';
}

export const useDynamicPrices = (institutionId?: string) => {
  return useQuery({
    queryKey: queryKeys.dynamicPricing.list({ institutionId }),
    queryFn: async (): Promise<DynamicPriceEntry[]> => {
      const { data, error } = await supabase
        .from('marketplace_items')
        .select('id, name, xp_price, dynamic_price_override')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;

      return (data ?? []).map((item) => ({
        itemId: item.id,
        itemName: item.name,
        basePrice: item.xp_price,
        dynamicPrice: (item as Record<string, unknown>).dynamic_price_override as number | null,
        demandLevel: 'normal' as const,
      }));
    },
    enabled: !!institutionId,
  });
};

export const useToggleDynamicPricing = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      institutionId,
      enabled,
    }: {
      institutionId: string;
      enabled: boolean;
    }) => {
      const { error } = await supabase
        .from('institution_settings')
        .update({ dynamic_pricing_enabled: enabled } as never)
        .eq('institution_id', institutionId);
      if (error) throw error;
    },
    onSuccess: (_, { enabled }) => {
      qc.invalidateQueries({ queryKey: queryKeys.dynamicPricing.all });
      qc.invalidateQueries({ queryKey: queryKeys.institutionSettings.all });
      toast.success(`Dynamic pricing ${enabled ? 'enabled' : 'disabled'}`);
    },
    onError: (err) => toast.error((err as Error).message),
  });
};
