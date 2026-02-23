import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import type { CreateCLOFormData } from '@/lib/schemas/clo';
import type { LearningOutcome } from '@/types/app';

// The generated database.ts doesn't have the `learning_outcomes` table yet.
// We cast through `unknown` once to bridge the gap until types are regenerated.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as unknown as { from: (table: string) => any };

// ─── Types ──────────────────────────────────────────────────────────────────

export interface OutcomeMapping {
  id: string;
  parent_outcome_id: string;
  child_outcome_id: string;
  weight: number;
  created_at: string;
}

// ─── useCLOs — list CLOs, optionally filtered by course_id ──────────────────

export const useCLOs = (courseId?: string) => {
  return useQuery({
    queryKey: queryKeys.clos.list({ courseId }),
    queryFn: async (): Promise<LearningOutcome[]> => {
      let query = db
        .from('learning_outcomes')
        .select('*')
        .eq('type', 'CLO')
        .order('sort_order', { ascending: true });

      if (courseId) {
        query = query.eq('course_id', courseId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as LearningOutcome[];
    },
  });
};

// ─── useCLO — single CLO detail ────────────────────────────────────────────

export const useCLO = (id?: string) => {
  return useQuery({
    queryKey: queryKeys.clos.detail(id ?? ''),
    queryFn: async (): Promise<LearningOutcome | null> => {
      const { data, error } = await db
        .from('learning_outcomes')
        .select('*')
        .eq('id', id!)
        .maybeSingle();

      if (error) throw error;
      return data as LearningOutcome | null;
    },
    enabled: !!id,
  });
};


// ─── useCreateCLO — insert CLO + optional PLO mappings ──────────────────────

export const useCreateCLO = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateCLOFormData): Promise<LearningOutcome> => {
      const { plo_mappings, ...cloFields } = data;

      const { data: result, error } = await db
        .from('learning_outcomes')
        .insert({ ...cloFields, type: 'CLO' })
        .select()
        .single();

      if (error) throw error;

      const clo = result as LearningOutcome;

      // Insert PLO mappings if provided
      if (plo_mappings && plo_mappings.length > 0) {
        const rows = plo_mappings.map((m) => ({
          parent_outcome_id: m.plo_id,
          child_outcome_id: clo.id,
          weight: m.weight,
        }));

        const { error: mappingError } = await db
          .from('outcome_mappings')
          .insert(rows);

        if (mappingError) throw mappingError;
      }

      return clo;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clos.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.outcomeMappings.lists() });
    },
  });
};

// ─── useUpdateCLO — update CLO fields + optional PLO mapping replacement ────

export const useUpdateCLO = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      data: Partial<CreateCLOFormData>,
    ): Promise<LearningOutcome> => {
      const { plo_mappings, ...cloFields } = data;

      const { data: result, error } = await db
        .from('learning_outcomes')
        .update(cloFields)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Replace PLO mappings if provided
      if (plo_mappings !== undefined) {
        const { error: deleteError } = await db
          .from('outcome_mappings')
          .delete()
          .eq('child_outcome_id', id);

        if (deleteError) throw deleteError;

        if (plo_mappings.length > 0) {
          const rows = plo_mappings.map((m) => ({
            parent_outcome_id: m.plo_id,
            child_outcome_id: id,
            weight: m.weight,
          }));

          const { error: insertError } = await db
            .from('outcome_mappings')
            .insert(rows);

          if (insertError) throw insertError;
        }
      }

      return result as LearningOutcome;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clos.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.clos.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.outcomeMappings.lists() });
    },
  });
};

// ─── useDeleteCLO — delete mappings then CLO ────────────────────────────────

export const useDeleteCLO = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      // Check for dependent assignments via outcome_mappings where this CLO is a parent
      const { error: depsError } = await db
        .from('outcome_mappings')
        .select('id')
        .eq('child_outcome_id', id);

      if (depsError) throw depsError;

      // Remove outcome_mappings where this CLO is the child
      const { error: deleteMappingsError } = await db
        .from('outcome_mappings')
        .delete()
        .eq('child_outcome_id', id);

      if (deleteMappingsError) throw deleteMappingsError;

      // Delete the CLO itself
      const { error } = await db
        .from('learning_outcomes')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clos.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.outcomeMappings.lists() });
    },
  });
};

// ─── useReorderCLOs — batch update sort_order ───────────────────────────────

export const useReorderCLOs = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { items: Array<{ id: string; sort_order: number }> }): Promise<void> => {
      for (const item of data.items) {
        const { error } = await db
          .from('learning_outcomes')
          .update({ sort_order: item.sort_order })
          .eq('id', item.id);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clos.lists() });
    },
  });
};

// ─── useCLOMappings — fetch PLO mappings for a CLO ──────────────────────────

export const useCLOMappings = (cloId?: string) => {
  return useQuery({
    queryKey: queryKeys.outcomeMappings.list({ cloId }),
    queryFn: async (): Promise<OutcomeMapping[]> => {
      const { data, error } = await db
        .from('outcome_mappings')
        .select('*')
        .eq('child_outcome_id', cloId!);

      if (error) throw error;
      return data as OutcomeMapping[];
    },
    enabled: !!cloId,
  });
};

// ─── useUpdateCLOMappings — replace outcome_mappings for a CLO→PLO ──────────

export const useUpdateCLOMappings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      cloId: string;
      mappings: Array<{ parent_outcome_id: string; weight: number }>;
    }): Promise<void> => {
      // Delete existing mappings for this CLO
      const { error: deleteError } = await db
        .from('outcome_mappings')
        .delete()
        .eq('child_outcome_id', data.cloId);

      if (deleteError) throw deleteError;

      // Insert new mappings
      if (data.mappings.length > 0) {
        const rows = data.mappings.map((m) => ({
          parent_outcome_id: m.parent_outcome_id,
          child_outcome_id: data.cloId,
          weight: m.weight,
        }));

        const { error: insertError } = await db
          .from('outcome_mappings')
          .insert(rows);

        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.outcomeMappings.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.clos.lists() });
    },
  });
};
