// =============================================================================
// useEquippedItems — TanStack Query hooks for cosmetic equip/unequip
// =============================================================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────────────

export type CosmeticSlot = "profile_theme" | "avatar_frame" | "display_title";

export interface EquippedItem {
  id: string;
  student_id: string;
  purchase_id: string;
  slot: CosmeticSlot;
  equipped_at: string;
  /** Joined item data */
  item_name: string;
  item_sub_category: string;
  icon_identifier: string;
  metadata: Record<string, unknown>;
}

// ─── useEquippedItems — fetch currently equipped cosmetics ───────────────────

export const useEquippedItems = (studentId: string) => {
  return useQuery({
    queryKey: queryKeys.marketplace.equipped(studentId),
    queryFn: async (): Promise<EquippedItem[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("student_equipped_items")
        .select(
          `
          id,
          student_id,
          purchase_id,
          slot,
          equipped_at,
          xp_purchases:purchase_id (
            marketplace_items:item_id (
              name,
              sub_category,
              icon_identifier,
              metadata
            )
          )
        `
        )
        .eq("student_id", studentId);

      if (error) throw error;

      return ((data ?? []) as Array<Record<string, unknown>>).map((row) => {
        const purchase = row.xp_purchases as Record<string, unknown> | null;
        const item =
          (purchase?.marketplace_items as Record<string, unknown>) ?? {};
        return {
          id: row.id as string,
          student_id: row.student_id as string,
          purchase_id: row.purchase_id as string,
          slot: row.slot as CosmeticSlot,
          equipped_at: row.equipped_at as string,
          item_name: (item.name as string) ?? "Unknown",
          item_sub_category: (item.sub_category as string) ?? "",
          icon_identifier: (item.icon_identifier as string) ?? "sparkles",
          metadata: (item.metadata ?? {}) as Record<string, unknown>,
        };
      });
    },
    enabled: !!studentId,
    staleTime: 30_000,
  });
};

// ─── useEquipItem — upsert into student_equipped_items ───────────────────────

export const useEquipItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: {
      studentId: string;
      purchaseId: string;
      slot: CosmeticSlot;
    }): Promise<void> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("student_equipped_items")
        .upsert(
          {
            student_id: variables.studentId,
            purchase_id: variables.purchaseId,
            slot: variables.slot,
            equipped_at: new Date().toISOString(),
          },
          { onConflict: "student_id,slot" }
        );

      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.marketplace.equipped(variables.studentId),
      });
      toast.success("Item equipped!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to equip item");
    },
  });
};

// ─── useUnequipItem — delete from student_equipped_items ─────────────────────

export const useUnequipItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: {
      studentId: string;
      slot: CosmeticSlot;
    }): Promise<void> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("student_equipped_items")
        .delete()
        .eq("student_id", variables.studentId)
        .eq("slot", variables.slot);

      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.marketplace.equipped(variables.studentId),
      });
      toast.success("Item unequipped");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to unequip item");
    },
  });
};
