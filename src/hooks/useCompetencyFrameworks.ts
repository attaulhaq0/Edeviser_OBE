// Task 114.3: Competency Framework TanStack Query hooks

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface CompetencyFramework {
  id: string;
  institution_id: string;
  name: string;
  version: string;
  source: string | null;
}

export interface CompetencyItem {
  id: string;
  framework_id: string;
  parent_id: string | null;
  level: 'domain' | 'competency' | 'indicator';
  code: string;
  title: string;
  sort_order: number;
  children?: CompetencyItem[];
}

export interface CompetencyOutcomeMapping {
  id: string;
  competency_item_id: string;
  outcome_id: string;
}

// NOTE: These hooks reference tables that require database migrations (tasks 114.1).
// Until migrations are applied, queries will return empty results.

export const useCompetencyFrameworks = (institutionId?: string) => {
  return useQuery({
    queryKey: ['competencyFrameworks', institutionId],
    queryFn: async (): Promise<CompetencyFramework[]> => {
      const { data, error } = await supabase
        .from('competency_frameworks' as never)
        .select('*')
        .eq('institution_id', institutionId!)
        .order('name');
      if (error) throw error;
      return (data ?? []) as CompetencyFramework[];
    },
    enabled: !!institutionId,
  });
};

export const useCompetencyItems = (frameworkId?: string) => {
  return useQuery({
    queryKey: ['competencyItems', frameworkId],
    queryFn: async (): Promise<CompetencyItem[]> => {
      const { data, error } = await supabase
        .from('competency_items' as never)
        .select('*')
        .eq('framework_id', frameworkId!)
        .order('sort_order');
      if (error) throw error;
      return (data ?? []) as CompetencyItem[];
    },
    enabled: !!frameworkId,
  });
};

export const useCreateCompetencyFramework = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; version: string; source?: string; institution_id: string }) => {
      const { data, error } = await supabase.from('competency_frameworks' as never).insert(input as never).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['competencyFrameworks'] }),
  });
};

export const useImportCompetencyCSV = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { framework_id: string; csv_content: string }) => {
      const { data, error } = await supabase.functions.invoke('import-competency-csv', { body: params });
      if (error) throw error;
      return data as { imported: number; errors: string[] };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['competencyItems'] }),
  });
};

export const useCompetencyOutcomeMappings = (frameworkId?: string) => {
  return useQuery({
    queryKey: ['competencyOutcomeMappings', frameworkId],
    queryFn: async (): Promise<CompetencyOutcomeMapping[]> => {
      const { data: items } = await supabase.from('competency_items' as never).select('id').eq('framework_id', frameworkId!);
      const itemIds = ((items ?? []) as Array<{ id: string }>).map((i) => i.id);
      if (itemIds.length === 0) return [];
      const { data, error } = await supabase.from('competency_outcome_mappings' as never).select('*').in('competency_item_id', itemIds);
      if (error) throw error;
      return (data ?? []) as CompetencyOutcomeMapping[];
    },
    enabled: !!frameworkId,
  });
};
