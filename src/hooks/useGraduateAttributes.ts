// Task 112.3: Graduate Attribute TanStack Query hooks
// NOTE: These hooks reference tables that require database migrations (task 112.1).

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { logAuditEvent } from '@/lib/auditLogger';
import { useAuth } from '@/hooks/useAuth';

export interface GraduateAttribute {
  id: string;
  institution_id: string;
  title: string;
  description: string | null;
  code: string;
  created_at: string;
}

export interface GraduateAttributeMapping {
  id: string;
  graduate_attribute_id: string;
  ilo_id: string;
  weight: number;
}

export interface GAAttainment {
  attribute_id: string;
  title: string;
  code: string;
  avg_attainment: number;
  mapped_ilo_count: number;
}

export const useGraduateAttributes = (institutionId?: string) => {
  return useQuery({
    queryKey: queryKeys.graduateAttributes.list({ institutionId }),
    queryFn: async (): Promise<GraduateAttribute[]> => {
      const { data, error } = await supabase
        .from('graduate_attributes' as never)
        .select('*')
        .eq('institution_id', institutionId!);
      if (error) throw error;
      return (data ?? []) as GraduateAttribute[];
    },
    enabled: !!institutionId,
  });
};

export const useGraduateAttributeMappings = (attributeId?: string) => {
  return useQuery({
    queryKey: queryKeys.graduateAttributeMappings.list({ attributeId }),
    queryFn: async (): Promise<GraduateAttributeMapping[]> => {
      const { data, error } = await supabase
        .from('graduate_attribute_mappings' as never)
        .select('*')
        .eq('graduate_attribute_id', attributeId!);
      if (error) throw error;
      return (data ?? []) as GraduateAttributeMapping[];
    },
    enabled: !!attributeId,
  });
};

export const useCreateGraduateAttribute = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { title: string; description?: string; code: string }) => {
      const { data, error } = await supabase
        .from('graduate_attributes' as never)
        .insert({ ...input, institution_id: user?.user_metadata?.institution_id } as never)
        .select()
        .single();
      if (error) throw error;
      await logAuditEvent({ action: 'create', entity_type: 'graduate_attribute', entity_id: (data as { id: string }).id, changes: input, performed_by: user?.id ?? '' });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.graduateAttributes.lists() }),
  });
};

export const useUpdateGraduateAttribute = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string; title?: string; description?: string; code?: string }) => {
      const { data, error } = await supabase.from('graduate_attributes' as never).update(input as never).eq('id', id).select().single();
      if (error) throw error;
      await logAuditEvent({ action: 'update', entity_type: 'graduate_attribute', entity_id: id, changes: input, performed_by: user?.id ?? '' });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.graduateAttributes.lists() }),
  });
};

export const useDeleteGraduateAttribute = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('graduate_attributes' as never).delete().eq('id', id);
      if (error) throw error;
      await logAuditEvent({ action: 'delete', entity_type: 'graduate_attribute', entity_id: id, changes: {}, performed_by: user?.id ?? '' });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.graduateAttributes.lists() }),
  });
};

export const useGraduateAttributeAttainment = (institutionId?: string) => {
  return useQuery({
    queryKey: queryKeys.graduateAttributeAttainment.list({ institutionId }),
    queryFn: async (): Promise<GAAttainment[]> => {
      const { data: attrs } = await supabase.from('graduate_attributes' as never).select('id, title, code').eq('institution_id', institutionId!);
      if (!attrs) return [];

      const results: GAAttainment[] = [];
      for (const attr of attrs as Array<{ id: string; title: string; code: string }>) {
        const { data: mappings } = await supabase.from('graduate_attribute_mappings' as never).select('ilo_id, weight').eq('graduate_attribute_id', attr.id);
        const iloIds = ((mappings ?? []) as Array<{ ilo_id: string; weight: number }>).map((m) => m.ilo_id);
        if (iloIds.length === 0) {
          results.push({ attribute_id: attr.id, title: attr.title, code: attr.code, avg_attainment: 0, mapped_ilo_count: 0 });
          continue;
        }
        const { data: attainments } = await supabase.from('outcome_attainment' as never).select('outcome_id, score_percent').in('outcome_id', iloIds);
        const attMap = new Map(((attainments ?? []) as Array<{ outcome_id: string; score_percent: number }>).map((a) => [a.outcome_id, a.score_percent]));
        let weightedSum = 0;
        let totalWeight = 0;
        for (const m of (mappings ?? []) as Array<{ ilo_id: string; weight: number }>) {
          const score = attMap.get(m.ilo_id) ?? 0;
          weightedSum += score * m.weight;
          totalWeight += m.weight;
        }
        results.push({ attribute_id: attr.id, title: attr.title, code: attr.code, avg_attainment: totalWeight > 0 ? weightedSum / totalWeight : 0, mapped_ilo_count: iloIds.length });
      }
      return results;
    },
    enabled: !!institutionId,
  });
};
