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
    // Raised from 10s: the student dashboard now hydrates this exact key from the
    // aggregate RPC (see useStudentDashboardAggregate), and purchase/award mutations
    // invalidate it on change — so a short staleTime only caused a needless
    // get_xp_balance refetch on every navigation (the persistent sidebar badge
    // remounts constantly). 60s keeps the badge fresh without the per-mount storm.
    staleTime: 60_000,
  });
};
