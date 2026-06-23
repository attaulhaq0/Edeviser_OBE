// =============================================================================
// useXPBalance — TanStack Query hook for student XP balance (spendable XP)
// =============================================================================

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { DASHBOARD_STALE_TIME_MS } from "@/lib/queryConfig";

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
    // The student dashboard aggregate now hydrates this EXACT key with
    // `availableXP` (see useStudentDashboardAggregate). On warm navigation the
    // cache hit from the aggregate means this queryFn never fires. On cold boot
    // the aggregate and this hook race; whichever wins populates the cache for
    // the other. 2-minute staleTime matches the dashboard cadence and prevents
    // the persistent sidebar badge from re-fetching on every page mount.
    staleTime: DASHBOARD_STALE_TIME_MS,
  });
};
