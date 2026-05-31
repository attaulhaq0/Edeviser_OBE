// =============================================================================
// useStreakFreeze — TanStack Query hooks for streak freeze inventory & purchase
// Migrated to route through the marketplace Purchase_Processor
// =============================================================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { toast } from "sonner";

export const useStreakFreezeInventory = (studentId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.studentGamification.list({
      scope: "streak_freeze",
      studentId,
    }),
    queryFn: async () => {
      if (!studentId) return { freezes: 0, xpTotal: 0 };
      const { data, error } = await supabase
        .from("student_gamification")
        .select("streak_freezes_available, xp_total")
        .eq("student_id", studentId)
        .maybeSingle();
      if (error) throw error;
      return {
        freezes: data?.streak_freezes_available ?? 0,
        xpTotal: data?.xp_total ?? 0,
      };
    },
    enabled: !!studentId,
  });
};

export const usePurchaseStreakFreeze = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (studentId: string) => {
      // Find the streak_shield marketplace item for this student's institution
      const { data: items, error: itemError } = await supabase
        .from("marketplace_items")
        .select("id")
        .eq("sub_category", "streak_shield")
        .eq("is_active", true)
        .limit(1);

      if (itemError) throw itemError;

      const streakShieldItem = items?.[0];

      if (streakShieldItem) {
        // Route through the marketplace Purchase_Processor Edge Function
        const { data, error } = await supabase.functions.invoke(
          "process-purchase",
          {
            body: {
              item_id: streakShieldItem.id,
              student_id: studentId,
            },
          }
        );

        if (error) throw error;

        const result = data as Record<string, unknown>;
        if (result.success === false) {
          const errorCode = result.error_code as string;
          const errorMessages: Record<string, string> = {
            INSUFFICIENT_BALANCE: "Not enough XP to purchase streak freeze",
            MAX_INVENTORY: "Maximum streak freezes reached (3)",
            ITEM_INACTIVE: "Streak freeze is currently unavailable",
          };
          throw new Error(errorMessages[errorCode] ?? "Purchase failed");
        }

        return data;
      }

      // Fallback: direct purchase if marketplace item not found (backward compatibility)
      const { data, error } = await supabase.functions.invoke("award-xp", {
        body: {
          student_id: studentId,
          xp_amount: -200,
          source: "streak_freeze_purchase",
          note: "Streak Freeze purchased",
        },
      });
      if (error) throw error;

      const { data: current, error: fetchErr } = await supabase
        .from("student_gamification")
        .select("streak_freezes_available")
        .eq("student_id", studentId)
        .maybeSingle();
      if (fetchErr) throw fetchErr;

      const currentFreezes = current?.streak_freezes_available ?? 0;
      if (currentFreezes >= 3)
        throw new Error("Maximum streak freezes reached");

      const { error: updateErr } = await supabase
        .from("student_gamification")
        .update({ streak_freezes_available: currentFreezes + 1 })
        .eq("student_id", studentId);
      if (updateErr) throw updateErr;

      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.studentGamification.all });
      qc.invalidateQueries({ queryKey: queryKeys.studentDashboard.lists() });
      qc.invalidateQueries({ queryKey: queryKeys.marketplace.all });
      toast.success("Streak Freeze purchased!");
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Purchase failed"),
  });
};
