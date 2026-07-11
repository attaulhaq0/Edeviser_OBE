// =============================================================================
// useCoordinatorAttainmentTrends — per-outcome attainment history (trends)
// =============================================================================
//
// Reads outcome_attainment_snapshots (migration 20260823000003) for the caller's
// institution and returns a per-outcome time series (one point per semester).
// The Outcome Attainment screen uses this to show a "vs last term" delta once
// ≥2 terms have been captured. This hook is ADDITIVE and fails soft: if the
// snapshot table does not exist yet (pre-migration) or the read fails, it
// returns an empty map so the screen simply omits the trend. No writes.
// =============================================================================

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";

export interface AttainmentTrendPoint {
  semesterId: string;
  semesterName: string;
  startDate: string;
  attainment: number;
}

/** outcome_id → chronological series of per-semester attainment. */
export type AttainmentTrendMap = Record<string, AttainmentTrendPoint[]>;

interface SnapshotRow {
  outcome_id: string;
  semester_id: string;
  mean_attainment_percent: number;
}

export const useCoordinatorAttainmentTrends = (
  institutionId?: string | null
) => {
  return useQuery({
    queryKey: queryKeys.semesterTrends.list({
      view: "coordinatorTrends",
      institutionId: institutionId ?? null,
    }),
    enabled: !!institutionId,
    retry: false,
    queryFn: async (): Promise<AttainmentTrendMap> => {
      // The snapshots table may not exist in the generated types yet
      // (migration 20260823000003). Query it loosely + `.returns<T>()`, and
      // degrade to {} on any error (pre-migration / read failure).
      const snapRes = await supabase
        .from("outcome_attainment_snapshots" as never)
        .select("outcome_id, semester_id, mean_attainment_percent")
        .eq("institution_id" as never, (institutionId ?? "") as never)
        .returns<SnapshotRow[]>();
      if (snapRes.error || !snapRes.data || snapRes.data.length === 0)
        return {};
      const snaps = snapRes.data;

      // Resolve semester names/dates (typed table).
      const semIds = Array.from(new Set(snaps.map((s) => s.semester_id)));
      const { data: sems } = await supabase
        .from("semesters")
        .select("id, name, start_date")
        .in("id", semIds);
      const semById = new Map(
        (sems ?? []).map((s) => [
          s.id as string,
          { name: s.name as string, start_date: s.start_date as string },
        ])
      );

      const map: AttainmentTrendMap = {};
      for (const s of snaps) {
        const sem = semById.get(s.semester_id);
        if (!sem) continue;
        const list = map[s.outcome_id] ?? [];
        list.push({
          semesterId: s.semester_id,
          semesterName: sem.name,
          startDate: sem.start_date,
          attainment: Math.round(s.mean_attainment_percent),
        });
        map[s.outcome_id] = list;
      }
      for (const series of Object.values(map)) {
        series.sort((a, b) => a.startDate.localeCompare(b.startDate));
      }
      return map;
    },
  });
};
