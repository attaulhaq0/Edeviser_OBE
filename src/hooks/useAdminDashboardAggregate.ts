import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { DASHBOARD_STALE_TIME_MS } from "@/lib/queryConfig";
import type { AdminKPIData } from "@/hooks/useAdminDashboard";

/**
 * Admin dashboard aggregate (spec: dashboard-and-ux-performance, Phase 8
 * Task 35).
 *
 * Collapses `useAdminKPIs`' 5 PARALLEL round-trips into ONE call to the
 * `get_admin_dashboard` RPC, then HYDRATES the exact cache that hook reads so it
 * resolves as a cache hit instead of firing its own request fan-out.
 *
 * The RPC is `SECURITY INVOKER`: every read is RLS-scoped to the caller's
 * institution, so this adds no new data visibility (an admin only ever receives
 * their own institution's KPIs). On RPC failure the section hook falls back to
 * its own fetch (fully reversible).
 *
 * The RPC returns the `AdminKPIData` shape directly (the KPI block is the only
 * always-on fan-out section on this dashboard; the deferred audit/onboarding/AI
 * panels and the institution-scoped PLO heatmap keep their own hooks).
 */
export const useAdminDashboardAggregate = (
  institutionId: string | null | undefined
) => {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: queryKeys.adminDashboard.list({ aggregate: true, institutionId }),
    enabled: !!institutionId,
    staleTime: DASHBOARD_STALE_TIME_MS,
    queryFn: async (): Promise<AdminKPIData> => {
      // `get_admin_dashboard` is added by migration 20260821000013 and is not in
      // the generated Database types until regenerated post-merge, so cast the
      // rpc call (same pattern as useCoordinatorDashboardAggregate / get_xp_balance).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc(
        "get_admin_dashboard",
        {}
      );
      if (error) throw error;
      if (!data) {
        throw new Error("get_admin_dashboard returned no data");
      }

      const payload = data as AdminKPIData;

      // Hydrate the EXACT cache `useAdminKPIs` reads so it becomes a hit.
      queryClient.setQueryData(queryKeys.adminDashboard.list({}), payload);

      return payload;
    },
  });
};
