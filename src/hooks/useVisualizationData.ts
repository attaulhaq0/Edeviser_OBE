// Task 117.4: Visualization TanStack Query hooks
// NOTE: Some queries reference columns that may not exist in the generated types yet.

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { transformToSankey, type SankeyNode, type SankeyLink } from '@/lib/sankeyTransform';
import { analyzeGaps, type GapResult } from '@/lib/gapAnalysis';
import { buildHeatmapMatrix, type HeatmapMatrix } from '@/lib/coverageHeatmap';

type AnyRow = Record<string, unknown>;

export const useSankeyData = (programId?: string, _courseId?: string, _semesterId?: string) => {
  return useQuery({
    queryKey: queryKeys.sankeyData.list({ programId }),
    queryFn: async (): Promise<{ nodes: SankeyNode[]; links: SankeyLink[] }> => {
      const { data: outcomes } = await supabase.from('learning_outcomes').select('id, type, title');
      const { data: rawMappings } = await supabase.from('outcome_mappings' as never).select('*');
      const { data: rawAttainments } = await supabase.from('outcome_attainment' as never).select('*');

      const mappings = (rawMappings ?? []) as Array<AnyRow>;
      const attainments = (rawAttainments ?? []) as Array<AnyRow>;

      return transformToSankey(
        (outcomes ?? []).map((o) => ({ id: o.id, type: o.type as 'ILO' | 'PLO' | 'CLO', title: o.title })),
        mappings.map((m) => ({ parent_id: String(m.parent_outcome_id ?? ''), child_id: String(m.child_outcome_id ?? ''), weight: Number(m.weight ?? 0) })),
        attainments.map((a) => ({ outcome_id: String(a.outcome_id ?? ''), score_percent: Number(a.score_percent ?? 0) })),
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
      const { data: outcomes } = await supabase.from('learning_outcomes').select('id, title, type');
      const { data: rawMappings } = await supabase.from('outcome_mappings' as never).select('*');
      const { data: rawEvidence } = await supabase.from('evidence' as never).select('*');

      const mappings = (rawMappings ?? []) as Array<AnyRow>;
      const evidence = (rawEvidence ?? []) as Array<AnyRow>;

      const childCountMap = new Map<string, number>();
      for (const m of mappings) {
        const pid = String(m.parent_outcome_id ?? '');
        childCountMap.set(pid, (childCountMap.get(pid) ?? 0) + 1);
      }

      const evidenceCountMap = new Map<string, number>();
      for (const e of evidence) {
        const cid = String(e.clo_id ?? '');
        evidenceCountMap.set(cid, (evidenceCountMap.get(cid) ?? 0) + 1);
      }

      const assessedCLOs = new Set<string>();
      // Simplified: mark all CLOs with evidence as assessed
      for (const e of evidence) {
        assessedCLOs.add(String(e.clo_id ?? ''));
      }

      return analyzeGaps(
        (outcomes ?? []).map((o) => ({
          id: o.id,
          title: o.title,
          type: o.type as 'ILO' | 'PLO' | 'CLO',
          mapped_children_count: childCountMap.get(o.id) ?? 0,
          evidence_count: evidenceCountMap.get(o.id) ?? 0,
          has_assessments: assessedCLOs.has(o.id),
        })),
      );
    },
    enabled: !!programId,
    staleTime: 5 * 60_000,
  });
};

export const useCoverageHeatmap = (programId?: string, _semesterId?: string) => {
  return useQuery({
    queryKey: queryKeys.coverageHeatmapData.list({ programId }),
    queryFn: async (): Promise<HeatmapMatrix> => {
      const { data: clos } = await supabase.from('learning_outcomes').select('id, title').eq('type', 'CLO');
      const { data: courses } = await supabase.from('courses').select('id, name');
      const { data: rawEvidence } = await supabase.from('evidence' as never).select('*');

      const evidence = (rawEvidence ?? []) as Array<AnyRow>;

      return buildHeatmapMatrix(
        (clos ?? []).map((c) => ({ id: c.id, title: c.title })),
        (courses ?? []).map((c) => ({ id: c.id, name: c.name })),
        evidence.map((e) => ({
          clo_id: String(e.clo_id ?? ''),
          course_id: String(e.course_id ?? ''),
          score_percent: Number(e.score_percent ?? 0),
        })),
      );
    },
    enabled: !!programId,
    staleTime: 5 * 60_000,
  });
};
