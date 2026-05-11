// =============================================================================
// useMarketplace — TanStack Query hook for browsing marketplace items
// =============================================================================

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import type { MarketplaceItemCategory } from "@/lib/marketplaceSchemas";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MarketplaceItem {
  id: string;
  institution_id: string;
  name: string;
  description: string;
  category: MarketplaceItemCategory;
  sub_category: string;
  xp_price: number;
  level_requirement: number;
  stock_type: "unlimited" | "limited" | "one_per_student";
  stock_quantity: number | null;
  icon_identifier: string;
  metadata: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  /** Highest active sale discount percentage (0 if no sale) */
  sale_discount: number;
  /** Effective price after sale discount */
  effective_price: number;
}

// ─── useMarketplaceItems — browse items with optional category filter ────────

export const useMarketplaceItems = (category?: string) => {
  return useQuery({
    queryKey: queryKeys.marketplace.items(category),
    queryFn: async (): Promise<MarketplaceItem[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from("marketplace_items")
        .select(
          "id, institution_id, name, description, category, sub_category, xp_price, level_requirement, stock_type, stock_quantity, icon_identifier, metadata, is_active, created_at, updated_at"
        )
        .eq("is_active", true)
        .order("category", { ascending: true })
        .order("xp_price", { ascending: true });

      if (category) {
        query = query.eq("category", category);
      }

      const { data: items, error } = await query;
      if (error) throw error;

      if (!items || items.length === 0) return [];

      // Fetch active sale events to compute discounts
      const now = new Date().toISOString();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: saleData, error: saleError } = await (supabase as any)
        .from("sale_event_items")
        .select(
          "item_id, sale_event_id, sale_events:sale_event_id(discount_percentage, start_date, end_date)"
        )
        .filter("sale_events.start_date", "lte", now)
        .filter("sale_events.end_date", "gt", now);

      // Build a map of item_id → highest discount
      const discountMap = new Map<string, number>();
      if (!saleError && saleData) {
        for (const row of saleData) {
          const saleEvent = row.sale_events;
          if (!saleEvent) continue;
          const discount = saleEvent.discount_percentage ?? 0;
          const current = discountMap.get(row.item_id) ?? 0;
          if (discount > current) {
            discountMap.set(row.item_id, discount);
          }
        }
      }

      return (items as Array<Record<string, unknown>>).map((item) => {
        const discount = discountMap.get(item.id as string) ?? 0;
        const basePrice = item.xp_price as number;
        const effectivePrice =
          discount > 0
            ? Math.max(1, basePrice - Math.floor((basePrice * discount) / 100))
            : basePrice;

        return {
          id: item.id as string,
          institution_id: item.institution_id as string,
          name: item.name as string,
          description: item.description as string,
          category: item.category as MarketplaceItemCategory,
          sub_category: item.sub_category as string,
          xp_price: basePrice,
          level_requirement: item.level_requirement as number,
          stock_type: item.stock_type as
            | "unlimited"
            | "limited"
            | "one_per_student",
          stock_quantity: item.stock_quantity as number | null,
          icon_identifier: item.icon_identifier as string,
          metadata: (item.metadata ?? {}) as Record<string, unknown>,
          is_active: item.is_active as boolean,
          created_at: item.created_at as string,
          updated_at: item.updated_at as string,
          sale_discount: discount,
          effective_price: effectivePrice,
        };
      });
    },
    staleTime: 30_000,
  });
};
