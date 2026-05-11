// =============================================================================
// useXPBalance — TanStack Query hook for student XP balance (spendable XP)
// =============================================================================

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface XPBalanceData {
  balance: number;
}

// ─── useXPBalance — fetch spendable XP via get_xp_balance RPC ────────────────

export const useXPBalance = (studentId: string) => {
  return useQuery({
    queryKey: queryKeys.marketplace.balance(studentId),
    queryFn: async (): Promise<XPBalanceData> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc("get_xp_balance", {
        p_student_id: studentId,
      });

      if (error) throw error;

      // get_xp_balance returns GREATEST(0, earned - spent)
      const balance = typeof data === "number" ? data : 0;
      return { balance };
    },
    enabled: !!studentId,
    staleTime: 10_000,
  });
};
