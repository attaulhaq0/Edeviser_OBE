// Task 117.4: Visualization TanStack Query hooks

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

export const useSankeyData = (
  programId?: string,
  _courseId?: string,
  _semesterId?: string
) => {
  return useQuery({
    queryKey: queryKeys.sankeyData.list({ programId }),
    queryFn: async (): Promise<{
      nodes: SankeyNode[];
      links: SankeyLink[];
    }> => {
      // Parallel reads (was a 3-step serial waterfall). Columns corrected to
      // the real schema: outcome_mappings uses source/target_outcome_id (not
      // parent/child) and outcome_attainment uses attainment_percent (not
      // score_percent), so the flow now renders real mappings instead of empty.
      const [outcomesRes, mappingsRes, attainmentsRes] = await Promise.all([
        supabase.from("learning_outcomes").select("id, type, title"),
        supabase
          .from("outcome_mappings")
          .select("source_outcome_id, target_outcome_id, weight"),
        supabase
          .from("outcome_attainment")
          .select("outcome_id, attainment_percent"),
      ]);
      if (outcomesRes.error) throw outcomesRes.error;
      if (mappingsRes.error) throw mappingsRes.error;
      if (attainmentsRes.error) throw attainmentsRes.error;

      return transformToSankey(
        (outcomesRes.data ?? []).map((o) => ({
          id: o.id,
          type: o.type as "ILO" | "PLO" | "CLO",
          title: o.title,
        })),
        (mappingsRes.data ?? []).map((m) => ({
          parent_id: m.source_outcome_id,
          child_id: m.target_outcome_id,
          weight: Number(m.weight ?? 0),
        })),
        (attainmentsRes.data ?? []).map((a) => ({
          outcome_id: a.outcome_id,
          score_percent: Number(a.attainment_percent ?? 0),
        }))
      );
    },
    enabled: !!programId,
    staleTime: 5 * 60_000,
  });
};

export const useGapAnalysis = (programId?: string, _semesterId?: string) => {
  return useQuery({
    queryKey: queryKeys.gapAnalysisData.list({ programId }),
    queryFn: async (): Promise<GapResult[]> => {
      // Parallel reads (was serial). outcome_mappings.parent_outcome_id ->
      // source_outcome_id (the parent in a source->target mapping); evidence is
      // keyed by clo_id.
      const [outcomesRes, mappingsRes, evidenceRes] = await Promise.all([
        supabase.from("learning_outcomes").select("id, title, type"),
        supabase.from("outcome_mappings").select("source_outcome_id"),
        supabase.from("evidence").select("clo_id"),
      ]);
      if (outcomesRes.error) throw outcomesRes.error;
      if (mappingsRes.error) throw mappingsRes.error;
      if (evidenceRes.error) throw evidenceRes.error;

      const mappings = mappingsRes.data ?? [];
      const evidence = evidenceRes.data ?? [];

      const childCountMap = new Map<string, number>();
      for (const m of mappings) {
        const pid = m.source_outcome_id;
        childCountMap.set(pid, (childCountMap.get(pid) ?? 0) + 1);
      }

      const evidenceCountMap = new Map<string, number>();
      const assessedCLOs = new Set<string>();
      for (const e of evidence) {
        const cid = e.clo_id;
        evidenceCountMap.set(cid, (evidenceCountMap.get(cid) ?? 0) + 1);
        assessedCLOs.add(cid);
      }

      return analyzeGaps(
        (outcomesRes.data ?? []).map((o) => ({
          id: o.id,
          title: o.title,
          type: o.type as "ILO" | "PLO" | "CLO",
          mapped_children_count: childCountMap.get(o.id) ?? 0,
          evidence_count: evidenceCountMap.get(o.id) ?? 0,
          has_assessments: assessedCLOs.has(o.id),
        }))
      );
    },
    enabled: !!programId,
    staleTime: 5 * 60_000,
  });
};

export const useCoverageHeatmap = (
  programId?: string,
  _semesterId?: string
) => {
  return useQuery({
    queryKey: queryKeys.coverageHeatmapData.list({ programId }),
    queryFn: async (): Promise<HeatmapMatrix> => {
      // Parallel reads (was serial). evidence has NO course_id column, so we
      // resolve each evidence row's course via its CLO (learning_outcomes
      // .course_id) and use the real attainment column (score_percent on
      // evidence).
      const [closRes, coursesRes, evidenceRes] = await Promise.all([
        supabase
          .from("learning_outcomes")
          .select("id, title, course_id")
          .eq("type", "CLO"),
        supabase.from("courses").select("id, name"),
        supabase.from("evidence").select("clo_id, score_percent"),
      ]);
      if (closRes.error) throw closRes.error;
      if (coursesRes.error) throw coursesRes.error;
      if (evidenceRes.error) throw evidenceRes.error;

      const clos = closRes.data ?? [];
      const cloToCourse = new Map(clos.map((c) => [c.id, c.course_id ?? ""]));

      return buildHeatmapMatrix(
        clos.map((c) => ({ id: c.id, title: c.title })),
        (coursesRes.data ?? []).map((c) => ({ id: c.id, name: c.name })),
        (evidenceRes.data ?? []).map((e) => ({
          clo_id: e.clo_id,
          course_id: cloToCourse.get(e.clo_id) ?? "",
          score_percent: Number(e.score_percent ?? 0),
        }))
      );
    },
    enabled: !!programId,
    staleTime: 5 * 60_000,
  });
};
