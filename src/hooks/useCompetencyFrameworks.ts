// Task 114.3: Competency Framework TanStack Query hooks

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";

export interface CompetencyFramework {
  id: string;
  institution_id: string;
  name: string;
  version: string | null;
  description: string | null;
}

import { toCompetencyItem } from "@/lib/competencyTree";
import type { CompetencyItem } from "@/lib/competencyTree";
export type { CompetencyItem } from "@/lib/competencyTree";

export interface CompetencyOutcomeMapping {
  id: string;
  competency_item_id: string;
  outcome_id: string;
}

export const useCompetencyFrameworks = (institutionId?: string) => {
  return useQuery({
    queryKey: queryKeys.competencyFrameworks.list({ institutionId }),
    queryFn: async (): Promise<CompetencyFramework[]> => {
      const { data, error } = await supabase
        .from("competency_frameworks")
        .select("id, institution_id, name, version, description")
        .eq("institution_id", institutionId!)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!institutionId,
  });
};

export const useCompetencyItems = (frameworkId?: string) => {
  return useQuery({
    queryKey: queryKeys.competencyItems.list({ frameworkId }),
    queryFn: async (): Promise<CompetencyItem[]> => {
      const { data, error } = await supabase
        .from("competency_items")
        .select(
          "id, framework_id, parent_id, level, name, description, sort_order"
        )
        .eq("framework_id", frameworkId!)
        .order("sort_order")
        .order("name");
      if (error) throw error;
      return (data ?? []).map(toCompetencyItem);
    },
    enabled: !!frameworkId,
  });
};

export const useCreateCompetencyFramework = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      version: string;
      source?: string;
      institution_id: string;
    }) => {
      const { data, error } = await supabase
        .from("competency_frameworks" as never)
        .insert(input as never)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: queryKeys.competencyFrameworks.lists(),
      }),
  });
};

export const useImportCompetencyCSV = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      framework_id: string;
      csv_content: string;
    }) => {
      const { data, error } = await supabase.functions.invoke(
        "import-competency-csv",
        { body: params }
      );
      if (error) throw error;
      return data as { imported: number; errors: string[] };
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.competencyItems.lists() }),
  });
};

export const useCompetencyOutcomeMappings = (frameworkId?: string) => {
  return useQuery({
    queryKey: queryKeys.competencyOutcomeMappings.list({ frameworkId }),
    queryFn: async (): Promise<CompetencyOutcomeMapping[]> => {
      const { data: items, error: itemsError } = await supabase
        .from("competency_items")
        .select("id")
        .eq("framework_id", frameworkId!);
      if (itemsError) throw itemsError;
      const itemIds = (items ?? []).map((i) => i.id);
      if (itemIds.length === 0) return [];
      const { data, error } = await supabase
        .from("competency_outcome_mappings" as never)
        .select("*")
        .in("competency_item_id", itemIds);
      if (error) throw error;
      return (data ?? []) as CompetencyOutcomeMapping[];
    },
    enabled: !!frameworkId,
  });
};
