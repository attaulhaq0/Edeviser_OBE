import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { DASHBOARD_STALE_TIME_MS } from "@/lib/queryConfig";
import type {
  CoordinatorKPIData,
  CoordinatorWorkspaceData,
} from "@/hooks/useCoordinatorDashboard";

/**
 * Coordinator dashboard aggregate (spec: dashboard-and-ux-performance, Phase 8
 * Task 34).
 *
 * Collapses `useCoordinatorKPIs`' ~6 SEQUENTIAL round-trips into ONE call to the
 * canonical `get_coordinator_workspace` RPC, then HYDRATES the exact cache that hook reads
 * so it resolves as a cache hit instead of firing its own request chain.
 *
 * The RPC is `SECURITY INVOKER`: every read is RLS-scoped to the caller's
 * institution, so this adds no new data visibility (a coordinator only ever
 * receives their own institution's KPIs). On RPC failure the section hook falls
 * back to its own fetch (fully reversible).
 *
 * The RPC returns the `CoordinatorKPIData` shape directly (the KPI block is the
 * only always-on fan-out section on this dashboard; programs/courses lists and
 * the program/course-selected panels keep their own hooks).
 */
export const useCoordinatorDashboardAggregate = (
  institutionId: string | null | undefined
) => {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: queryKeys.coordinatorDashboard.list({
      aggregate: true,
      institutionId,
    }),
    enabled: !!institutionId,
    staleTime: DASHBOARD_STALE_TIME_MS,
    queryFn: async (): Promise<
      CoordinatorKPIData & CoordinatorWorkspaceData
    > => {
      // `get_coordinator_workspace` is a canonical JSON contract and is not in
      // generated Database types until regenerated, so cast
      // the rpc call (same pattern as useXPBalance / get_xp_balance).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc(
        "get_coordinator_workspace",
        {}
      );
      if (error) throw error;
      if (!data) {
        throw new Error("get_coordinator_dashboard returned no data");
      }

      const workspace = data as CoordinatorWorkspaceData;
      const measured = workspace.ploAttainment
        .map((row) => row.attainment)
        .filter((value): value is number => value !== null);
      const payload: CoordinatorKPIData & CoordinatorWorkspaceData = {
        ...workspace,
        totalPLOs: workspace.ploCount,
        totalCourses: workspace.courseCount,
        cloCoveragePercent: workspace.coverage.coveragePercent,
        avgAttainmentPercent:
          measured.length > 0
            ? Math.round(
                measured.reduce((sum, value) => sum + value, 0) /
                  measured.length
              )
            : 0,
        atRiskStudents: workspace.belowTargetCount,
        teacherCompliancePercent: workspace.teacherCompliance.percent,
      };

      // Hydrate the EXACT cache `useCoordinatorKPIs` reads so it becomes a hit.
      queryClient.setQueryData(
        queryKeys.coordinatorDashboard.list({}),
        payload
      );
      if (institutionId) {
        queryClient.setQueryData(
          queryKeys.coordinatorDashboard.list({ institutionId }),
          payload
        );
      }

      return payload;
    },
  });
};
