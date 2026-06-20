import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { DASHBOARD_STALE_TIME_MS } from "@/lib/queryConfig";
import type {
  TeacherKPIData,
  BloomsDistributionRow,
} from "@/hooks/useTeacherDashboard";

/**
 * Shape of the single `jsonb` payload returned by the `get_teacher_dashboard`
 * Postgres RPC (see
 * `supabase/migrations/20260821000011_create_get_teacher_dashboard_rpc.sql`).
 *
 * It is the union of the always-on section-hook results this aggregate hydrates:
 *   - `kpis`               → exactly what `useTeacherKPIs` produces (`TeacherKPIData`)
 *   - `bloomsDistribution` → exactly what `useTeacherBloomsDistribution` produces
 */
export interface TeacherDashboardAggregate {
  kpis: TeacherKPIData;
  bloomsDistribution: BloomsDistributionRow[];
}

/**
 * Teacher dashboard aggregate (spec: dashboard-and-ux-performance, Phase 8 Task 33).
 *
 * Collapses the teacher dashboard's always-on fan-out (`useTeacherKPIs`' ~7
 * round-trips + `useTeacherBloomsDistribution`' ~2) into ONE round-trip by calling
 * the `get_teacher_dashboard` RPC, then HYDRATES the exact caches those section
 * hooks read so they resolve as cache hits instead of firing their own requests.
 *
 * Backward-compatible + reversible: the section hooks keep their own `queryFn`,
 * so on a cache miss / RPC failure they fetch exactly as before — no behavior
 * change, no new data visibility (the RPC is SECURITY DEFINER with a fail-closed
 * `auth.uid()` guard, so a teacher only ever receives their own teaching data).
 *
 * The course-SELECTED charts (CLO attainment, heatmap), the at-risk student LIST,
 * and the grading queue are intentionally NOT part of this aggregate (see the
 * migration header) and keep their own hooks.
 */
export const useTeacherDashboardAggregate = (teacherId: string | undefined) => {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: queryKeys.teacherDashboard.list({
      type: "aggregate",
      teacherId,
    }),
    enabled: !!teacherId,
    staleTime: DASHBOARD_STALE_TIME_MS,
    queryFn: async (): Promise<TeacherDashboardAggregate> => {
      if (!teacherId) {
        throw new Error("useTeacherDashboardAggregate: teacherId is required");
      }
      // `get_teacher_dashboard` is added by migration 20260821000011 and is not
      // yet in the generated Database types until they are regenerated post-merge,
      // so cast the rpc call (same pattern as useXPBalance / get_xp_balance).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc(
        "get_teacher_dashboard",
        { p_teacher_id: teacherId }
      );
      if (error) throw error;
      if (!data) {
        throw new Error("get_teacher_dashboard returned no data");
      }

      const payload = data as TeacherDashboardAggregate;

      // Hydrate the EXACT caches the section hooks read so they become cache hits.
      // Keys mirror `useTeacherKPIs` / `useTeacherBloomsDistribution` verbatim.
      queryClient.setQueryData(
        queryKeys.teacherDashboard.list({ type: "kpis", teacherId }),
        payload.kpis
      );
      queryClient.setQueryData(
        queryKeys.teacherDashboard.list({
          type: "bloomsDistribution",
          teacherId,
        }),
        payload.bloomsDistribution
      );

      return payload;
    },
  });
};
