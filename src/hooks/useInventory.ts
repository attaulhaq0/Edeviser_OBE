// =============================================================================
// useInventory — TanStack Query hook for student owned items
// =============================================================================

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface InventoryItem {
  purchase_id: string;
  item_id: string;
  item_name: string;
  item_description: string;
  item_category: string;
  item_sub_category: string;
  icon_identifier: string;
  metadata: Record<string, unknown>;
  xp_cost: number;
  status: "active" | "consumed" | "expired" | "refunded";
  purchased_at: string;
  consumed_at: string | null;
}

// ─── useInventory — fetch student's purchased items with item details ────────

export const useInventory = (studentId: string) => {
  return useQuery({
    queryKey: queryKeys.marketplace.inventory(studentId),
    queryFn: async (): Promise<InventoryItem[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("xp_purchases")
        .select(
          `
          id,
          item_id,
          xp_cost,
          status,
          purchased_at,
          consumed_at,
          marketplace_items:item_id (
            name,
            description,
            category,
            sub_category,
            icon_identifier,
            metadata
          )
        `
        )
        .eq("student_id", studentId)
        .neq("status", "refunded")
        .order("purchased_at", { ascending: false });

      if (error) throw error;

      return ((data ?? []) as Array<Record<string, unknown>>).map((row) => {
        const item = row.marketplace_items as Record<string, unknown> | null;
        return {
          purchase_id: row.id as string,
          item_id: row.item_id as string,
          item_name: (item?.name as string) ?? "Unknown Item",
          item_description: (item?.description as string) ?? "",
          item_category: (item?.category as string) ?? "",
          item_sub_category: (item?.sub_category as string) ?? "",
          icon_identifier: (item?.icon_identifier as string) ?? "package",
          metadata: (item?.metadata ?? {}) as Record<string, unknown>,
          xp_cost: row.xp_cost as number,
          status: row.status as "active" | "consumed" | "expired" | "refunded",
          purchased_at: row.purchased_at as string,
          consumed_at: (row.consumed_at as string) ?? null,
        };
      });
    },
    enabled: !!studentId,
    staleTime: 30_000,
  });
};
