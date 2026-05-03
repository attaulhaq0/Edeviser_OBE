// =============================================================================
// useMarketplaceAnalytics — Admin analytics queries for marketplace
// =============================================================================

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MarketplaceAnalyticsData {
  totalXPSpent: number;
  totalPurchases: number;
  uniqueBuyers: number;
  avgXPPerStudent: number;
  popularItems: Array<{
    item_id: string;
    item_name: string;
    purchase_count: number;
  }>;
  categoryBreakdown: Array<{
    category: string;
    total_purchases: number;
    total_xp_spent: number;
  }>;
}

// ─── useMarketplaceAnalytics — aggregated marketplace metrics ────────────────

export const useMarketplaceAnalytics = () => {
  return useQuery({
    queryKey: queryKeys.marketplace.analytics(),
    queryFn: async (): Promise<MarketplaceAnalyticsData> => {
      // Fetch all purchases with item joins
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: purchases, error } = await (supabase as any)
        .from('xp_purchases')
        .select(`
          id,
          student_id,
          item_id,
          xp_cost,
          marketplace_items:item_id (name, category)
        `)
        .neq('status', 'refunded');

      if (error) throw error;

      const rows = (purchases ?? []) as Array<Record<string, unknown>>;

      // Compute aggregates
      let totalXPSpent = 0;
      const buyerSet = new Set<string>();
      const itemCountMap = new Map<string, { name: string; count: number }>();
      const categoryMap = new Map<string, { purchases: number; xp: number }>();

      for (const row of rows) {
        const xpCost = row.xp_cost as number;
        const studentId = row.student_id as string;
        const itemId = row.item_id as string;
        const item = row.marketplace_items as Record<string, unknown> | null;
        const itemName = (item?.name as string) ?? 'Unknown';
        const category = (item?.category as string) ?? 'unknown';

        totalXPSpent += xpCost;
        buyerSet.add(studentId);

        // Item popularity
        const existing = itemCountMap.get(itemId) ?? { name: itemName, count: 0 };
        existing.count += 1;
        itemCountMap.set(itemId, existing);

        // Category breakdown
        const catEntry = categoryMap.get(category) ?? { purchases: 0, xp: 0 };
        catEntry.purchases += 1;
        catEntry.xp += xpCost;
        categoryMap.set(category, catEntry);
      }

      const totalPurchases = rows.length;
      const uniqueBuyers = buyerSet.size;
      const avgXPPerStudent = uniqueBuyers > 0 ? Math.round(totalXPSpent / uniqueBuyers) : 0;

      // Top 10 popular items
      const popularItems = Array.from(itemCountMap.entries())
        .map(([item_id, { name, count }]) => ({
          item_id,
          item_name: name,
          purchase_count: count,
        }))
        .sort((a, b) => b.purchase_count - a.purchase_count)
        .slice(0, 10);

      // Category breakdown
      const categoryBreakdown = Array.from(categoryMap.entries()).map(
        ([category, { purchases, xp }]) => ({
          category,
          total_purchases: purchases,
          total_xp_spent: xp,
        })
      );

      return {
        totalXPSpent,
        totalPurchases,
        uniqueBuyers,
        avgXPPerStudent,
        popularItems,
        categoryBreakdown,
      };
    },
    staleTime: 60_000,
  });
};
