import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { DASHBOARD_STALE_TIME_MS } from "@/lib/queryConfig";
import type { ParentKPIData, LinkedChild } from "@/hooks/useParentDashboard";

export interface ParentDashboardAggregate {
  kpis: ParentKPIData;
  children: LinkedChild[];
}

/**
 * Parent dashboard aggregate (spec: dashboard-and-ux-performance, Phase 8
 * Task 36).
 *
 * Collapses the two always-on parent hooks — `useParentKPIs` and
 * `useLinkedChildren` (each of which resolves verified children then fans out to
 * student_courses / outcome_attainment / student_gamification / assignments) —
 * into ONE call to the `get_parent_dashboard` RPC, then HYDRATES the exact caches
 * both hooks read so they resolve as cache hits.
 *
 * The RPC is `SECURITY INVOKER` and resolves children from `auth.uid()`: every
 * read is RLS-scoped to the caller's verified-linked children, so this adds no
 * new data visibility. On RPC failure each section hook falls back to its own
 * fetch (fully reversible).
 *
 * `parentId` is used only for the query key + enabled gate (it is the caller's
 * own id); the RPC itself takes no argument and derives the parent from the
 * session via `auth.uid()`.
 */
export const useParentDashboardAggregate = (parentId: string | undefined) => {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: queryKeys.parentDashboard.list({ aggregate: true, parentId }),
    enabled: !!parentId,
    staleTime: DASHBOARD_STALE_TIME_MS,
    queryFn: async (): Promise<ParentDashboardAggregate> => {
      // `get_parent_dashboard` is added by migration 20260821000014 and is not in
      // the generated Database types until regenerated post-merge, so cast the
      // rpc call (same pattern as the other dashboard aggregates / get_xp_balance).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc(
        "get_parent_dashboard",
        {}
      );
      if (error) throw error;
      if (!data) {
        throw new Error("get_parent_dashboard returned no data");
      }

      const payload = data as ParentDashboardAggregate;

      // Hydrate the EXACT caches the two section hooks read so they become hits.
      queryClient.setQueryData(
        queryKeys.parentDashboard.detail(parentId ?? ""),
        payload.kpis
      );
      queryClient.setQueryData(
        queryKeys.parentStudentLinks.list({ parentId }),
        payload.children
      );

      return payload;
    },
  });
};
