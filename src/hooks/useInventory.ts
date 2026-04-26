import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';

export interface InventoryItem {
  id: string;
  item_id: string;
  xp_cost: number;
  status: 'active' | 'consumed' | 'expired' | 'refunded';
  purchased_at: string;
  consumed_at: string | null;
  metadata: Record<string, unknown>;
  marketplace_items: {
    name: string;
    description: string;
    category: string;
    sub_category: string;
    icon_identifier: string;
    metadata: Record<string, unknown>;
  };
}

export const useInventory = (studentId: string) => {
  return useQuery({
    queryKey: queryKeys.marketplace.inventory(studentId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('xp_purchases')
        .select('*, marketplace_items(name, description, category, sub_category, icon_identifier, metadata)')
        .eq('student_id', studentId)
        .order('purchased_at', { ascending: false });

      if (error) throw error;
      return (data ?? []) as unknown as InventoryItem[];
    },
    enabled: !!studentId,
  });
};
