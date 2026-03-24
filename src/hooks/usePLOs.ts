import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { logAuditEvent } from '@/lib/auditLogger';
import { useAuth } from '@/hooks/useAuth';
import type { CreatePLOFormData } from '@/lib/schemas/plo';
import type { LearningOutcome } from '@/types/app';
import type { Database } from '@/types/database';
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

// ─── usePLOs — list PLOs, optionally filtered by program_id ─────────────────

export const usePLOs = (programId?: string, pagination?: { page?: number; pageSize?: number }) => {
  const { page, pageSize, from, to } = getPaginationRange(pagination?.page, pagination?.pageSize);

  return useQuery({
    queryKey: queryKeys.plos.list({ programId, page, pageSize }),
    queryFn: async (): Promise<PaginatedResult<LearningOutcome>> => {
      let query = supabase.from('learning_outcomes')
        .select('*', { count: 'exact' })
        .eq('type', 'PLO')
        .order('sort_order', { ascending: true })
        .range(from, to);

      if (programId) {
        query = query.eq('program_id', programId);
      }

      const { data, error, count } = await query;

      if (error) throw error;
      return { data: (data ?? []) as LearningOutcome[], count: count ?? 0, page, pageSize };
    },
  });
};

// ─── usePLO — single PLO detail ────────────────────────────────────────────

export const usePLO = (id: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.plos.detail(id ?? ''),
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

// ─── useCreatePLO — insert into learning_outcomes ───────────────────────────

export const useCreatePLO = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: CreatePLOFormData): Promise<LearningOutcome> => {
      const { data: result, error } = await supabase.from('learning_outcomes')
        .insert({ ...data, type: 'PLO' } as never)
        .select()
        .single();

      if (error) throw error;

      const plo = result as LearningOutcome;

      await logAuditEvent({
        action: 'create',
        entity_type: 'plo',
        entity_id: plo.id,
        changes: data,
        performed_by: user?.id ?? 'unknown',
      });

      return plo;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.plos.lists() });
    },
  });
};

// ─── useUpdatePLO — update learning_outcomes ────────────────────────────────

export const useUpdatePLO = (id: string) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (
      data: Partial<CreatePLOFormData>,
    ): Promise<LearningOutcome> => {
      const { data: result, error } = await supabase.from('learning_outcomes')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      await logAuditEvent({
        action: 'update',
        entity_type: 'plo',
        entity_id: id,
        changes: data,
        performed_by: user?.id ?? 'unknown',
      });

      return result as LearningOutcome;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.plos.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.plos.detail(id) });
    },
  });
};

// ─── useDeletePLO — hard delete with dependency check ───────────────────────

export const useDeletePLO = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      // Check for dependent CLOs via outcome_mappings
      const { data: deps, error: depsError } = await supabase.from('outcome_mappings')
        .select('id, target_outcome_id')
        .eq('source_outcome_id', id);

      if (depsError) throw depsError;

      if (deps && (deps ?? []).length > 0) {
        // Fetch the dependent CLO titles for a helpful error message
        const childIds = (deps ?? []).map(
          (d) => d.target_outcome_id,
        );
        const { data: clos, error: cloError } = await supabase.from('learning_outcomes')
          .select('id, title')
          .in('id', childIds);

        if (cloError) throw cloError;

        const cloNames = (clos ?? [])
          .map((c) => c.title)
          .join(', ');

        throw new Error(
          `Cannot delete PLO: it has mapped CLOs (${cloNames}). Remove the mappings first.`,
        );
      }

      const { error } = await supabase.from('learning_outcomes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await logAuditEvent({
        action: 'delete',
        entity_type: 'plo',
        entity_id: id,
        changes: null,
        performed_by: user?.id ?? 'unknown',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.plos.lists() });
    },
  });
};

// ─── useReorderPLOs — batch update sort_order ───────────────────────────────

export const useReorderPLOs = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: { items: Array<{ id: string; sort_order: number }> }): Promise<void> => {
      const updates = data.items.map((item, index) => ({
        id: item.id,
        sort_order: index,
      }));

      // Partial upsert: ON CONFLICT (id) only updates sort_order.
      // Cast needed because Supabase Insert type requires `type` and `title`,
      // but PostgreSQL's ON CONFLICT clause correctly handles partial columns.
      const { error } = await supabase.from('learning_outcomes')
        .upsert(
          updates as Database['public']['Tables']['learning_outcomes']['Insert'][],
          { onConflict: 'id' },
        );

      if (error) throw error;

      await logAuditEvent({
        action: 'reorder',
        entity_type: 'plo',
        entity_id: 'batch',
        changes: { items: data.items },
        performed_by: user?.id ?? 'unknown',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.plos.lists() });
    },
  });
};

// ─── usePLOMappings — fetch ILO mappings for a PLO ──────────────────────────

export const usePLOMappings = (ploId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.outcomeMappings.list({ ploId }),
    queryFn: async (): Promise<OutcomeMapping[]> => {
      const { data, error } = await supabase.from('outcome_mappings')
        .select('*')
        .eq('target_outcome_id', ploId!);

      if (error) throw error;
      return data as OutcomeMapping[];
    },
    enabled: !!ploId,
  });
};

// ─── useUpdatePLOMappings — replace outcome_mappings for a PLO→ILO ─────────

export const useUpdatePLOMappings = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      ploId: string;
      mappings: Array<{ source_outcome_id: string; weight: number }>;
    }): Promise<void> => {
      // Delete existing mappings for this PLO
      const { error: deleteError } = await supabase.from('outcome_mappings')
        .delete()
        .eq('target_outcome_id', data.ploId);

      if (deleteError) throw deleteError;

      // Insert new mappings
      if (data.mappings.length > 0) {
        const rows = data.mappings.map((m) => ({
          source_outcome_id: m.source_outcome_id,
          target_outcome_id: data.ploId,
          weight: m.weight,
        }));

        const { error: insertError } = await supabase.from('outcome_mappings')
          .insert(rows);

        if (insertError) throw insertError;
      }

      await logAuditEvent({
        action: 'update',
        entity_type: 'plo_mappings',
        entity_id: data.ploId,
        changes: { mappings: data.mappings },
        performed_by: user?.id ?? 'unknown',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.outcomeMappings.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.plos.lists() });
    },
  });
};
