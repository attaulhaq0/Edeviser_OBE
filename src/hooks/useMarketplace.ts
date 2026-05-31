// =============================================================================
// useMarketplace — TanStack Query hook for browsing marketplace items
// =============================================================================
//
// Task 7.10: bounded, paginated item fetch with load-more capability.
// Requirements: 34.1, 34.3

import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { hasMore, toRange } from "@/lib/pagination";
import {
  marketplaceItemCategorySchema,
  type MarketplaceItemCategory,
} from "@/lib/marketplaceSchemas";

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

/** One bounded page of marketplace items plus paging metadata. */
export interface MarketplaceItemsPage {
  items: MarketplaceItem[];
  /** 1-based page number this result represents. */
  page: number;
  /** Exact total count of matching items across all pages. */
  total: number;
  /** Whether at least one more item exists beyond this page. */
  hasMore: boolean;
}

/** Default items per page; bounds the marketplace fetch (R34.1). */
export const MARKETPLACE_PAGE_SIZE = 24;

// ─── useMarketplaceItems — browse items with optional category filter ────────

export const useMarketplaceItems = (
  category?: string,
  pageSize: number = MARKETPLACE_PAGE_SIZE
) => {
  return useInfiniteQuery({
    queryKey: queryKeys.marketplace.items(category),
    initialPageParam: 1,
    queryFn: async ({ pageParam }): Promise<MarketplaceItemsPage> => {
      const page = pageParam;
      const { from, to } = toRange(page, pageSize);

      // Validate the optional category filter against the generated enum so the
      // typed query builder accepts it; an unrecognized value is ignored.
      const categoryFilter = marketplaceItemCategorySchema.safeParse(category);

      let query = supabase
        .from("marketplace_items")
        .select(
          "id, institution_id, name, description, category, sub_category, xp_price, level_requirement, stock_type, stock_quantity, icon_identifier, metadata, is_active, created_at, updated_at",
          { count: "exact" }
        )
        .eq("is_active", true);

      if (categoryFilter.success) {
        query = query.eq("category", categoryFilter.data);
      }

      const {
        data: items,
        error,
        count,
      } = await query
        .order("category", { ascending: true })
        .order("xp_price", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to);
      if (error) throw error;

      const total = count ?? 0;

      if (!items || items.length === 0) {
        return {
          items: [],
          page,
          total,
          hasMore: hasMore(page, pageSize, total),
        };
      }

      // Fetch active sale events for the items on this page to compute discounts.
      const pageItemIds = items.map((item) => item.id);
      const now = new Date().toISOString();
      const { data: saleData, error: saleError } = await supabase
        .from("sale_event_items")
        .select(
          "item_id, sale_event_id, sale_events:sale_event_id(discount_percentage, start_date, end_date)"
        )
        .in("item_id", pageItemIds)
        .filter("sale_events.start_date", "lte", now)
        .filter("sale_events.end_date", "gt", now);

      // Build a map of item_id → highest discount
      const discountMap = new Map<string, number>();
      if (!saleError && saleData) {
        for (const row of saleData) {
          // The embedded `sale_events` relation is an object (to-one) or null.
          const saleEvent = Array.isArray(row.sale_events)
            ? row.sale_events[0]
            : row.sale_events;
          if (!saleEvent) continue;
          const discount = saleEvent.discount_percentage ?? 0;
          const current = discountMap.get(row.item_id) ?? 0;
          if (discount > current) {
            discountMap.set(row.item_id, discount);
          }
        }
      }

      const mapped: MarketplaceItem[] = items.map((item) => {
        const discount = discountMap.get(item.id) ?? 0;
        const basePrice = item.xp_price;
        const effectivePrice =
          discount > 0
            ? Math.max(1, basePrice - Math.floor((basePrice * discount) / 100))
            : basePrice;

        return {
          id: item.id,
          institution_id: item.institution_id,
          name: item.name,
          description: item.description,
          category: item.category,
          sub_category: item.sub_category,
          xp_price: basePrice,
          level_requirement: item.level_requirement,
          stock_type: item.stock_type,
          stock_quantity: item.stock_quantity,
          icon_identifier: item.icon_identifier,
          metadata: (item.metadata ?? {}) as Record<string, unknown>,
          is_active: item.is_active,
          created_at: item.created_at,
          updated_at: item.updated_at,
          sale_discount: discount,
          effective_price: effectivePrice,
        };
      });

      return {
        items: mapped,
        page,
        total,
        hasMore: hasMore(page, pageSize, total),
      };
    },
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.page + 1 : undefined,
    staleTime: 30_000,
  });
};
