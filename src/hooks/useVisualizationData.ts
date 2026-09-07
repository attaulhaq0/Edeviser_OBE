// =============================================================================
// useVisualizationData — coordinator analytics hooks (task 7.6)
// =============================================================================
// 7.6: all three views are fed by ONE program-scoped RPC
// (`get_coordinator_analytics_v1`, invoker-rights — the caller's RLS scopes
// every row). The deterministic classification lives in the shared libs
// (gapAnalysis / coverageHeatmap / sankeyTransform) — unchanged; the client no
// longer reads whole tables. The three hooks share one queryKey so TanStack
// dedupes the payload to a single request per program.
// =============================================================================

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import {
  transformToSankey,
  type SankeyNode,
  type SankeyLink,
} from "@/lib/sankeyTransform";
import { analyzeGaps, type GapResult } from "@/lib/gapAnalysis";
import { buildHeatmapMatrix, type HeatmapMatrix } from "@/lib/coverageHeatmap";

interface CoordinatorAnalyticsPayload {
  outcomes: Array<{
    id: string;
    title: string;
    type: "ILO" | "PLO" | "CLO";
    mapped_children_count: number;
    evidence_count: number;
  }>;
  mappings: Array<{
    source_outcome_id: string;
    target_outcome_id: string;
    weight: number;
  }>;
  courses: Array<{ id: string; name: string }>;
  clos: Array<{ id: string; title: string; course_id: string }>;
  evidence: Array<{
    clo_id: string;
    course_id: string;
    score_percent: number;
  }>;
  attainment: Array<{
    outcome_id: string;
    attainment_percent: number;
  }>;
}

const sharedAnalyticsKey = (programId: string | undefined) => [
  "coordinator-analytics",
  programId,
];

/** One scoped RPC per program — shared by gap analysis, heatmap and sankey. */
const useCoordinatorAnalyticsPayload = (programId: string | undefined) => {
  return useQuery({
    queryKey: sharedAnalyticsKey(programId),
    queryFn: async (): Promise<CoordinatorAnalyticsPayload> => {
      if (!programId) {
        return {
          outcomes: [],
          mappings: [],
          courses: [],
          clos: [],
          evidence: [],
          attainment: [],
        };
      }
      const { data, error } = await supabase.rpc(
        "get_coordinator_analytics_v1",
        { p_program_id: programId }
      );
      if (error) throw error;
      return (data ?? {}) as unknown as CoordinatorAnalyticsPayload;
    },
    enabled: !!programId,
    staleTime: 5 * 60_000,
  });
};

export const useSankeyData = (
  programId?: string,
  _courseId?: string,
  _semesterId?: string
) => {
  const {
    data: payload,
    isLoading,
    isError,
    refetch,
  } = useCoordinatorAnalyticsPayload(programId);
  const query = useQuery({
    queryKey: queryKeys.sankeyData.list({ programId }),
    queryFn: async (): Promise<{
      nodes: SankeyNode[];
      links: SankeyLink[];
    }> => {
      return transformToSankey(
        (payload?.outcomes ?? []).map((o) => ({
          id: o.id,
          type: o.type,
          title: o.title,
        })),
        (payload?.mappings ?? []).map((m) => ({
          parent_id: m.source_outcome_id,
          child_id: m.target_outcome_id,
          weight: Number(m.weight ?? 0),
        })),
        (payload?.attainment ?? []).map((a) => ({
          outcome_id: a.outcome_id,
          score_percent: Number(a.attainment_percent ?? 0),
        }))
      );
    },
    enabled: !!programId && !!payload,
    staleTime: 5 * 60_000,
  });
  return {
    data: query.data,
    isLoading: isLoading || query.isLoading,
    isError: isError || query.isError,
    refetch,
  };
};

export const useGapAnalysis = (programId?: string, _semesterId?: string) => {
  const {
    data: payload,
    isLoading,
    isError,
    refetch,
  } = useCoordinatorAnalyticsPayload(programId);
  const query = useQuery({
    queryKey: queryKeys.gapAnalysisData.list({ programId }),
    queryFn: async (): Promise<GapResult[]> => {
      return analyzeGaps(
        (payload?.outcomes ?? []).map((o) => ({
          id: o.id,
          title: o.title,
          type: o.type,
          mapped_children_count: o.mapped_children_count,
          evidence_count: o.evidence_count,
          has_assessments: o.evidence_count > 0,
        }))
      );
    },
    enabled: !!programId && !!payload,
    staleTime: 5 * 60_000,
  });
  return {
    data: query.data,
    isLoading: isLoading || query.isLoading,
    isError: isError || query.isError,
    refetch,
  };
};

export const useCoverageHeatmap = (
  programId?: string,
  _semesterId?: string
) => {
  const {
    data: payload,
    isLoading,
    isError,
    refetch,
  } = useCoordinatorAnalyticsPayload(programId);
  const query = useQuery({
    queryKey: queryKeys.coverageHeatmapData.list({ programId }),
    queryFn: async (): Promise<HeatmapMatrix> => {
      // Scoped evidence rows keep the exact buildHeatmapMatrix math
      // (per-cell count + running average) — identical output to the old
      // whole-table read, restricted to the program's CLOs.
      return buildHeatmapMatrix(
        (payload?.clos ?? []).map((c) => ({ id: c.id, title: c.title })),
        (payload?.courses ?? []).map((c) => ({ id: c.id, name: c.name })),
        (payload?.evidence ?? []).map((e) => ({
          clo_id: e.clo_id,
          course_id: e.course_id,
          score_percent: Number(e.score_percent ?? 0),
        }))
      );
    },
    enabled: !!programId && !!payload,
    staleTime: 5 * 60_000,
  });
  return {
    data: query.data,
    isLoading: isLoading || query.isLoading,
    isError: isError || query.isError,
    refetch,
  };
};
