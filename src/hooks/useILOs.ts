import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { logAuditEvent } from '@/lib/auditLogger';
import { useAuth } from '@/hooks/useAuth';
import type { CreateILOFormData, UpdateILOFormData, ReorderFormData } from '@/lib/schemas/ilo';
import type { LearningOutcome } from '@/types/app';
import type { PaginatedResult } from '@/types/pagination';
import { getPaginationRange } from '@/types/pagination';



// ─── useILOs — list ILOs for the current institution ────────────────────────

export const useILOs = (pagination?: { page?: number; pageSize?: number }) => {
  const { page, pageSize, from, to } = getPaginationRange(pagination?.page, pagination?.pageSize);

  return useQuery({
    queryKey: queryKeys.ilos.list({ page, pageSize }),
    queryFn: async (): Promise<PaginatedResult<LearningOutcome>> => {
      const { data, error, count } = await supabase.from('learning_outcomes')
        .select('*', { count: 'exact' })
        .eq('type', 'ILO')
        .order('sort_order', { ascending: true })
        .range(from, to);

      if (error) throw error;
      return { data: (data ?? []) as LearningOutcome[], count: count ?? 0, page, pageSize };
    },
  });
};

// ─── useILO — single ILO detail ────────────────────────────────────────────

export const useILO = (id: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.ilos.detail(id ?? ''),
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


// ─── useCreateILO — insert into learning_outcomes ───────────────────────────

export const useCreateILO = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: CreateILOFormData): Promise<LearningOutcome> => {
      const { data: result, error } = await supabase.from('learning_outcomes')
        .insert({ ...data, type: 'ILO' })
        .select()
        .single();

      if (error) throw error;

      const ilo = result as LearningOutcome;

      await logAuditEvent({
        action: 'create',
        entity_type: 'ilo',
        entity_id: ilo.id,
        changes: data,
        performed_by: user?.id ?? 'unknown',
      });

      return ilo;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ilos.lists() });
    },
  });
};

// ─── useUpdateILO — update learning_outcomes ────────────────────────────────

export const useUpdateILO = (id: string) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (
      data: UpdateILOFormData,
    ): Promise<LearningOutcome> => {
      const { data: result, error } = await supabase.from('learning_outcomes')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      await logAuditEvent({
        action: 'update',
        entity_type: 'ilo',
        entity_id: id,
        changes: data,
        performed_by: user?.id ?? 'unknown',
      });

      return result as LearningOutcome;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ilos.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.ilos.detail(id) });
    },
  });
};

// ─── useDeleteILO — hard delete with dependency check ───────────────────────

export const useDeleteILO = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      // Check for dependent PLOs via outcome_mappings
      const { data: deps, error: depsError } = await supabase.from('outcome_mappings')
        .select('id, target_outcome_id')
        .eq('source_outcome_id', id);

      if (depsError) throw depsError;

      if (deps && (deps ?? []).length > 0) {
        // Fetch the dependent PLO titles for a helpful error message
        const childIds = (deps ?? []).map(
          (d) => d.target_outcome_id,
        );
        const { data: plos, error: ploError } = await supabase.from('learning_outcomes')
          .select('id, title')
          .in('id', childIds);

        if (ploError) throw ploError;

        const ploNames = (plos ?? [])
          .map((p) => p.title)
          .join(', ');

        throw new Error(
          `Cannot delete ILO: it has mapped PLOs (${ploNames}). Remove the mappings first.`,
        );
      }

      const { error } = await supabase.from('learning_outcomes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await logAuditEvent({
        action: 'delete',
        entity_type: 'ilo',
        entity_id: id,
        changes: null,
        performed_by: user?.id ?? 'unknown',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ilos.lists() });
    },
  });
};

// ─── useReorderILOs — batch update sort_order ───────────────────────────────

export const useReorderILOs = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: ReorderFormData): Promise<void> => {
      const rows = data.items.map((item, index) => ({
        id: item.id,
        sort_order: index,
      }));

      // Partial upsert: only id + sort_order needed since onConflict='id' triggers UPDATE
      const { error } = await supabase.from('learning_outcomes')
        .upsert(rows as never, { onConflict: 'id', ignoreDuplicates: false });

      if (error) throw error;

      await logAuditEvent({
        action: 'reorder',
        entity_type: 'ilo',
        entity_id: 'batch',
        changes: { items: data.items },
        performed_by: user?.id ?? 'unknown',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ilos.lists() });
    },
  });
};
