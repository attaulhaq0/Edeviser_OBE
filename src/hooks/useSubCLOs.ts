import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { logAuditEvent } from '@/lib/auditLogger';
import { useAuth } from '@/hooks/useAuth';
import type { SubCLOFormData } from '@/lib/schemas/subCLO';
import type { LearningOutcome } from '@/types/app';

// ─── useSubCLOs — list Sub-CLOs for a parent CLO ───────────────────────────

export const useSubCLOs = (cloId?: string) => {
  return useQuery({
    queryKey: queryKeys.subCLOs.list({ cloId: cloId ?? '' }),
    queryFn: async (): Promise<LearningOutcome[]> => {
      const { data, error } = await supabase
        .from('learning_outcomes')
        .select('*')
        .eq('type', 'SUB_CLO' as 'CLO')
        .eq('parent_outcome_id', cloId!)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return (data ?? []) as LearningOutcome[];
    },
    enabled: !!cloId,
  });
};

// ─── useCreateSubCLO ────────────────────────────────────────────────────────

export const useCreateSubCLO = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: SubCLOFormData): Promise<LearningOutcome> => {
      const { data: result, error } = await supabase
        .from('learning_outcomes')
        .insert({
          title: data.title,
          description: data.description ?? null,
          code: data.code,
          weight: data.weight,
          parent_outcome_id: data.parent_outcome_id,
          type: 'SUB_CLO',
        } as never)
        .select()
        .single();

      if (error) throw error;

      const subCLO = result as LearningOutcome;

      await logAuditEvent({
        action: 'create',
        entity_type: 'sub_clo',
        entity_id: subCLO.id,
        changes: data,
        performed_by: user?.id ?? 'unknown',
      });

      return subCLO;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.subCLOs.list({ cloId: variables.parent_outcome_id }),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.clos.lists() });
    },
  });
};

// ─── useUpdateSubCLO ────────────────────────────────────────────────────────

export const useUpdateSubCLO = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      id: string;
      parentCloId: string;
      data: Partial<SubCLOFormData>;
    }): Promise<LearningOutcome> => {
      const { id, data } = params;

      const { data: result, error } = await supabase
        .from('learning_outcomes')
        .update({
          ...(data.title !== undefined && { title: data.title }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.code !== undefined && { code: data.code }),
          ...(data.weight !== undefined && { weight: data.weight }),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      await logAuditEvent({
        action: 'update',
        entity_type: 'sub_clo',
        entity_id: id,
        changes: data,
        performed_by: user?.id ?? 'unknown',
      });

      return result as LearningOutcome;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.subCLOs.list({ cloId: variables.parentCloId }),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.clos.lists() });
    },
  });
};

// ─── useDeleteSubCLO — blocks deletion if evidence exists ───────────────────

export const useDeleteSubCLO = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      id: string;
      parentCloId: string;
    }): Promise<void> => {
      const { id } = params;

      // Check for linked evidence — block deletion if any exist
      const { count, error: evidenceError } = await supabase
        .from('evidence')
        .select('id', { count: 'exact', head: true })
        .eq('outcome_id', id);

      if (evidenceError) throw evidenceError;

      if (count && count > 0) {
        throw new Error(
          `Cannot delete Sub-CLO: ${count} evidence record(s) are linked to it. Remove or reassign evidence first.`,
        );
      }

      const { error } = await supabase
        .from('learning_outcomes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await logAuditEvent({
        action: 'delete',
        entity_type: 'sub_clo',
        entity_id: id,
        changes: {},
        performed_by: user?.id ?? 'unknown',
      });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.subCLOs.list({ cloId: variables.parentCloId }),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.clos.lists() });
    },
  });
};
