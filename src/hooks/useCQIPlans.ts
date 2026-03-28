import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { logAuditEvent } from '@/lib/auditLogger';

// ─── Types ──────────────────────────────────────────────────────────────────

export type CQIPlanStatus = 'planned' | 'in_progress' | 'completed' | 'evaluated';
export type OutcomeType = 'PLO' | 'CLO';

export interface CQIActionPlan {
  id: string;
  program_id: string;
  semester_id: string;
  outcome_id: string;
  outcome_type: string;
  baseline_attainment: number;
  target_attainment: number;
  action_description: string;
  responsible_person: string;
  status: CQIPlanStatus;
  result_attainment: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCQIPlanInput {
  program_id: string;
  semester_id: string;
  outcome_id: string;
  outcome_type: OutcomeType;
  baseline_attainment: number;
  target_attainment: number;
  action_description: string;
  responsible_person: string;
}

export interface UpdateCQIPlanInput {
  id: string;
  action_description?: string;
  responsible_person?: string;
  status?: CQIPlanStatus;
  target_attainment?: number;
  result_attainment?: number | null;
}

// ─── Queries ────────────────────────────────────────────────────────────────

export const useCQIPlans = (filters: Record<string, unknown> = {}) => {
  return useQuery({
    queryKey: queryKeys.cqiPlans.list(filters),
    queryFn: async (): Promise<CQIActionPlan[]> => {
      let query = supabase
        .from('cqi_action_plans')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters.program_id) {
        query = query.eq('program_id', filters.program_id as string);
      }
      if (filters.semester_id) {
        query = query.eq('semester_id', filters.semester_id as string);
      }
      if (filters.status) {
        query = query.eq('status', filters.status as string);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as CQIActionPlan[];
    },
  });
};

export const useCQIPlan = (planId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.cqiPlans.detail(planId ?? ''),
    queryFn: async (): Promise<CQIActionPlan | null> => {
      const { data, error } = await supabase
        .from('cqi_action_plans')
        .select('*')
        .eq('id', planId!)
        .maybeSingle();
      if (error) throw error;
      return data as CQIActionPlan | null;
    },
    enabled: !!planId,
  });
};


/** Summary counts by status for the coordinator dashboard CQI section. */
export interface CQIPlanSummary {
  planned: number;
  in_progress: number;
  completed: number;
  evaluated: number;
  total: number;
}

export const useCQIPlanSummary = (programId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.cqiPlans.list({ programId: programId ?? '', summary: true }),
    queryFn: async (): Promise<CQIPlanSummary> => {
      const { data, error } = await supabase
        .from('cqi_action_plans')
        .select('status')
        .eq('program_id', programId!);
      if (error) throw error;

      const plans = data ?? [];
      const summary: CQIPlanSummary = { planned: 0, in_progress: 0, completed: 0, evaluated: 0, total: plans.length };
      for (const plan of plans) {
        const s = plan.status as CQIPlanStatus;
        if (s in summary) {
          summary[s]++;
        }
      }
      return summary;
    },
    enabled: !!programId,
  });
};

// ─── Mutations ──────────────────────────────────────────────────────────────

export const useCreateCQIPlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ performedBy, ...input }: CreateCQIPlanInput & { performedBy: string }) => {
      const { data, error } = await supabase
        .from('cqi_action_plans')
        .insert({
          program_id: input.program_id,
          semester_id: input.semester_id,
          outcome_id: input.outcome_id,
          outcome_type: input.outcome_type,
          baseline_attainment: input.baseline_attainment,
          target_attainment: input.target_attainment,
          action_description: input.action_description,
          responsible_person: input.responsible_person,
          status: 'planned',
        })
        .select()
        .single();
      if (error) throw error;
      await logAuditEvent({
        action: 'create',
        entity_type: 'cqi_action_plan',
        entity_id: data.id,
        changes: {
          program_id: input.program_id,
          outcome_id: input.outcome_id,
          outcome_type: input.outcome_type,
          baseline_attainment: input.baseline_attainment,
          target_attainment: input.target_attainment,
          action_description: input.action_description,
          responsible_person: input.responsible_person,
        },
        performed_by: performedBy,
      });
      return data as CQIActionPlan;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cqiPlans.lists() });
    },
  });
};

export const useUpdateCQIPlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ performedBy, ...input }: UpdateCQIPlanInput & { performedBy: string }) => {
      const payload: Record<string, unknown> = {};
      if (input.action_description !== undefined) payload.action_description = input.action_description;
      if (input.responsible_person !== undefined) payload.responsible_person = input.responsible_person;
      if (input.status !== undefined) payload.status = input.status;
      if (input.target_attainment !== undefined) payload.target_attainment = input.target_attainment;
      if (input.result_attainment !== undefined) payload.result_attainment = input.result_attainment;

      const { data, error } = await supabase
        .from('cqi_action_plans')
        .update(payload)
        .eq('id', input.id)
        .select()
        .single();
      if (error) throw error;
      await logAuditEvent({
        action: 'update',
        entity_type: 'cqi_action_plan',
        entity_id: input.id,
        changes: payload,
        performed_by: performedBy,
      });
      return data as CQIActionPlan;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cqiPlans.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.cqiPlans.detail(variables.id) });
    },
  });
};

export const useDeleteCQIPlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, performedBy }: { id: string; performedBy: string }) => {
      const { error } = await supabase.from('cqi_action_plans').delete().eq('id', id);
      if (error) throw error;
      await logAuditEvent({
        action: 'delete',
        entity_type: 'cqi_action_plan',
        entity_id: id,
        changes: null,
        performed_by: performedBy,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cqiPlans.lists() });
    },
  });
};
