import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';

export interface MarketplaceItem {
  id: string;
  name: string;
  description: string;
  category: 'cosmetic' | 'educational_perk' | 'power_up';
  sub_category: string;
  xp_price: number;
  level_requirement: number;
  stock_type: 'unlimited' | 'limited' | 'one_per_student';
  stock_quantity: number | null;
  icon_identifier: string;
  metadata: Record<string, unknown>;
  is_active: boolean;
  effective_price?: number;
  discount_percentage?: number;
  dynamic_price_override?: number | null;
}

export const useMarketplaceItems = (category?: string) => {
  return useQuery({
    queryKey: queryKeys.marketplace.items(category),
    queryFn: async () => {
      let query = supabase
        .from('marketplace_items')
        .select('*')
        .eq('is_active', true)
        .order('category')
        .order('xp_price', { ascending: true });

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as MarketplaceItem[];
    },
  });
};
