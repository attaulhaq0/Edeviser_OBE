import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { logAuditEvent } from '@/lib/auditLogger';
import { useAuth } from '@/hooks/useAuth';
import type { CreateILOFormData, UpdateILOFormData, ReorderFormData } from '@/lib/schemas/ilo';
import type { LearningOutcome } from '@/types/app';

// The generated database.ts doesn't have the `learning_outcomes` table yet.
// We cast through `unknown` once to bridge the gap until types are regenerated.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as unknown as { from: (table: string) => any };

// ─── useILOs — list ILOs for the current institution ────────────────────────

export const useILOs = () => {
  return useQuery({
    queryKey: queryKeys.ilos.list({}),
    queryFn: async (): Promise<LearningOutcome[]> => {
      const { data, error } = await db
        .from('learning_outcomes')
        .select('*')
        .eq('type', 'ILO')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as LearningOutcome[];
    },
  });
};

// ─── useILO — single ILO detail ────────────────────────────────────────────

export const useILO = (id: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.ilos.detail(id ?? ''),
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


// ─── useCreateILO — insert into learning_outcomes ───────────────────────────

export const useCreateILO = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: CreateILOFormData): Promise<LearningOutcome> => {
      const { data: result, error } = await db
        .from('learning_outcomes')
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
      const { data: result, error } = await db
        .from('learning_outcomes')
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
      const { data: deps, error: depsError } = await db
        .from('outcome_mappings')
        .select('id, child_outcome_id')
        .eq('parent_outcome_id', id);

      if (depsError) throw depsError;

      if (deps && (deps as unknown[]).length > 0) {
        // Fetch the dependent PLO titles for a helpful error message
        const childIds = (deps as Array<{ child_outcome_id: string }>).map(
          (d) => d.child_outcome_id,
        );
        const { data: plos, error: ploError } = await db
          .from('learning_outcomes')
          .select('id, title')
          .in('id', childIds);

        if (ploError) throw ploError;

        const ploNames = (plos as Array<{ id: string; title: string }>)
          .map((p) => p.title)
          .join(', ');

        throw new Error(
          `Cannot delete ILO: it has mapped PLOs (${ploNames}). Remove the mappings first.`,
        );
      }

      const { error } = await db
        .from('learning_outcomes')
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
      for (const item of data.items) {
        const { error } = await db
          .from('learning_outcomes')
          .update({ sort_order: item.sort_order })
          .eq('id', item.id);

        if (error) throw error;
      }

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
