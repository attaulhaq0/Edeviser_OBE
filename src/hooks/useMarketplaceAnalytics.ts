import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';

export interface MarketplaceAnalytics {
  totalXPSpent: number;
  totalPurchases: number;
  uniqueBuyers: number;
  avgXPPerStudent: number;
  popularItems: Array<{ item_id: string; name: string; count: number }>;
  categoryBreakdown: Array<{ category: string; purchases: number; xp_spent: number }>;
}

export const useMarketplaceAnalytics = () => {
  return useQuery({
    queryKey: queryKeys.marketplace.analytics(),
    queryFn: async () => {
      const { data: purchases, error } = await supabase
        .from('xp_purchases')
        .select('id, student_id, xp_cost, item_id, marketplace_items(name, category)')
        .neq('status', 'refunded');

      if (error) throw error;
      const rows = purchases ?? [];

      const totalXPSpent = rows.reduce((sum, r) => sum + r.xp_cost, 0);
      const totalPurchases = rows.length;
      const uniqueBuyers = new Set(rows.map((r) => r.student_id)).size;
      const avgXPPerStudent = uniqueBuyers > 0 ? Math.round(totalXPSpent / uniqueBuyers) : 0;

      const itemCounts = new Map<string, { name: string; count: number }>();
      const catBreakdown = new Map<string, { purchases: number; xp_spent: number }>();

      for (const r of rows) {
        const item = r.marketplace_items as unknown as { name: string; category: string } | null;
        const itemName = item?.name ?? 'Unknown';
        const cat = item?.category ?? 'unknown';

        const ic = itemCounts.get(r.item_id) ?? { name: itemName, count: 0 };
        ic.count++;
        itemCounts.set(r.item_id, ic);

        const cb = catBreakdown.get(cat) ?? { purchases: 0, xp_spent: 0 };
        cb.purchases++;
        cb.xp_spent += r.xp_cost;
        catBreakdown.set(cat, cb);
      }

      const popularItems = [...itemCounts.entries()]
        .map(([item_id, v]) => ({ item_id, ...v }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      const categoryBreakdown = [...catBreakdown.entries()]
        .map(([category, v]) => ({ category, ...v }));

      return { totalXPSpent, totalPurchases, uniqueBuyers, avgXPPerStudent, popularItems, categoryBreakdown } as MarketplaceAnalytics;
    },
  });
};
