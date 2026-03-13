import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { logAuditEvent } from '@/lib/auditLogger';
import { useAuth } from '@/hooks/useAuth';
import type { CreateCLOFormData } from '@/lib/schemas/clo';
import type { LearningOutcome } from '@/types/app';
import type { PaginatedResult } from '@/types/pagination';
import { getPaginationRange } from '@/types/pagination';



// ─── Types ──────────────────────────────────────────────────────────────────

export interface OutcomeMapping {
  id: string;
  source_outcome_id: string;
  target_outcome_id: string;
  weight: number;
  created_at: string;
}

// ─── useCLOs — list CLOs, optionally filtered by course_id ──────────────────

export const useCLOs = (courseId?: string, pagination?: { page?: number; pageSize?: number }) => {
  const { page, pageSize, from, to } = getPaginationRange(pagination?.page, pagination?.pageSize);

  return useQuery({
    queryKey: queryKeys.clos.list({ courseId, page, pageSize }),
    queryFn: async (): Promise<PaginatedResult<LearningOutcome>> => {
      let query = supabase.from('learning_outcomes')
        .select('*', { count: 'exact' })
        .eq('type', 'CLO')
        .order('sort_order', { ascending: true })
        .range(from, to);

      if (courseId) {
        query = query.eq('course_id', courseId);
      }

      const { data, error, count } = await query;

      if (error) throw error;
      return { data: (data ?? []) as LearningOutcome[], count: count ?? 0, page, pageSize };
    },
  });
};

// ─── useCLO — single CLO detail ────────────────────────────────────────────

export const useCLO = (id?: string) => {
  return useQuery({
    queryKey: queryKeys.clos.detail(id ?? ''),
    queryFn: async (): Promise<LearningOutcome | null> => {
      const { data, error } = await supabase.from('learning_outcomes')
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
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: CreateCLOFormData): Promise<LearningOutcome> => {
      const { plo_mappings, ...cloFields } = data;

      const { data: result, error } = await supabase.from('learning_outcomes')
        .insert({ ...cloFields, type: 'CLO' } as never)
        .select()
        .single();

      if (error) throw error;

      const clo = result as LearningOutcome;

      // Insert PLO mappings if provided
      if (plo_mappings && plo_mappings.length > 0) {
        const rows = plo_mappings.map((m) => ({
          source_outcome_id: m.plo_id,
          target_outcome_id: clo.id,
          weight: m.weight,
        }));

        const { error: mappingError } = await supabase.from('outcome_mappings')
          .insert(rows);

        if (mappingError) throw mappingError;
      }

      await logAuditEvent({
        action: 'create',
        entity_type: 'clo',
        entity_id: clo.id,
        changes: data,
        performed_by: user?.id ?? 'unknown',
      });

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
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (
      data: Partial<CreateCLOFormData>,
    ): Promise<LearningOutcome> => {
      const { plo_mappings, ...cloFields } = data;

      const { data: result, error } = await supabase.from('learning_outcomes')
        .update(cloFields)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Replace PLO mappings if provided
      if (plo_mappings !== undefined) {
        const { error: deleteError } = await supabase.from('outcome_mappings')
          .delete()
          .eq('target_outcome_id', id);

        if (deleteError) throw deleteError;

        if (plo_mappings.length > 0) {
          const rows = plo_mappings.map((m) => ({
            source_outcome_id: m.plo_id,
            target_outcome_id: id,
            weight: m.weight,
          }));

          const { error: insertError } = await supabase.from('outcome_mappings')
            .insert(rows);

          if (insertError) throw insertError;
        }
      }

      await logAuditEvent({
        action: 'update',
        entity_type: 'clo',
        entity_id: id,
        changes: data,
        performed_by: user?.id ?? 'unknown',
      });

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
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      // Check for dependent assignments via outcome_mappings where this CLO is a parent
      const { error: depsError } = await supabase.from('outcome_mappings')
        .select('id')
        .eq('target_outcome_id', id);

      if (depsError) throw depsError;

      // Remove outcome_mappings where this CLO is the child
      const { error: deleteMappingsError } = await supabase.from('outcome_mappings')
        .delete()
        .eq('target_outcome_id', id);

      if (deleteMappingsError) throw deleteMappingsError;

      // Delete the CLO itself
      const { error } = await supabase.from('learning_outcomes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await logAuditEvent({
        action: 'delete',
        entity_type: 'clo',
        entity_id: id,
        changes: {},
        performed_by: user?.id ?? 'unknown',
      });
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
      const results = await Promise.all(
        data.items.map((item, index) =>
          supabase.from('learning_outcomes')
            .update({ sort_order: index })
            .eq('id', item.id)
        )
      );
      const failed = results.find((r) => r.error);
      if (failed?.error) throw failed.error;
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
      const { data, error } = await supabase.from('outcome_mappings')
        .select('*')
        .eq('target_outcome_id', cloId!);

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
      mappings: Array<{ source_outcome_id: string; weight: number }>;
    }): Promise<void> => {
      // Delete existing mappings for this CLO
      const { error: deleteError } = await supabase.from('outcome_mappings')
        .delete()
        .eq('target_outcome_id', data.cloId);

      if (deleteError) throw deleteError;

      // Insert new mappings
      if (data.mappings.length > 0) {
        const rows = data.mappings.map((m) => ({
          source_outcome_id: m.source_outcome_id,
          target_outcome_id: data.cloId,
          weight: m.weight,
        }));

        const { error: insertError } = await supabase.from('outcome_mappings')
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
