import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { logAuditEvent } from '@/lib/auditLogger';
import { useAuth } from '@/hooks/useAuth';
import type { CreateAssignmentFormData } from '@/lib/schemas/assignment';
import type { PaginatedResult } from '@/types/pagination';
import { getPaginationRange } from '@/types/pagination';



// ─── Types ──────────────────────────────────────────────────────────────────

export interface Assignment {
  id: string;
  title: string;
  description: string;
  course_id: string;
  due_date: string;
  total_marks: number;
  rubric_id: string;
  clo_weights: Array<{ clo_id: string; weight: number }>;
  late_window_hours: number;
  prerequisites: Array<{ clo_id: string; required_attainment: number }> | null;
  institution_id: string;
  created_at: string;
  updated_at: string;
}

export interface AssignmentWithRelations extends Assignment {
  rubrics: { title: string } | null;
}

// ─── useAssignments — list assignments, optionally filtered by course_id ────

export const useAssignments = (courseId?: string, pagination?: { page?: number; pageSize?: number }) => {
  const { page, pageSize, from, to } = getPaginationRange(pagination?.page, pagination?.pageSize);

  return useQuery({
    queryKey: queryKeys.assignments.list({ courseId, page, pageSize }),
    queryFn: async (): Promise<PaginatedResult<AssignmentWithRelations>> => {
      let query = supabase.from('assignments')
        .select('*, rubrics(title)', { count: 'exact' })
        .order('due_date', { ascending: true })
        .range(from, to);

      if (courseId) {
        query = query.eq('course_id', courseId);
      }

      const { data, error, count } = await query;

      if (error) throw error;
      return { data: (data ?? []) as AssignmentWithRelations[], count: count ?? 0, page, pageSize };
    },
  });
};


// ─── useAssignment — single assignment detail with rubric join ──────────────

export const useAssignment = (id?: string) => {
  return useQuery({
    queryKey: queryKeys.assignments.detail(id ?? ''),
    queryFn: async (): Promise<AssignmentWithRelations | null> => {
      const { data, error } = await supabase.from('assignments')
        .select('*, rubrics(title)')
        .eq('id', id!)
        .maybeSingle();

      if (error) throw error;
      return data as AssignmentWithRelations | null;
    },
    enabled: !!id,
  });
};

// ─── useCreateAssignment — insert assignment ────────────────────────────────

export const useCreateAssignment = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: CreateAssignmentFormData): Promise<Assignment> => {
      const { data: result, error } = await supabase.from('assignments')
        .insert(data)
        .select()
        .single();

      if (error) throw error;

      const assignment = result as Assignment;

      await logAuditEvent({
        action: 'create',
        entity_type: 'assignment',
        entity_id: assignment.id,
        changes: data,
        performed_by: user?.id ?? 'unknown',
      });

      return assignment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assignments.lists() });
    },
  });
};

// ─── useUpdateAssignment — update assignment fields ─────────────────────────

export const useUpdateAssignment = (id: string) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (
      data: Partial<CreateAssignmentFormData>,
    ): Promise<Assignment> => {
      const { data: result, error } = await supabase.from('assignments')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      await logAuditEvent({
        action: 'update',
        entity_type: 'assignment',
        entity_id: id,
        changes: data,
        performed_by: user?.id ?? 'unknown',
      });

      return result as Assignment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assignments.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.assignments.detail(id) });
    },
  });
};

// ─── useDeleteAssignment — delete assignment by id ──────────────────────────

export const useDeleteAssignment = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from('assignments')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await logAuditEvent({
        action: 'delete',
        entity_type: 'assignment',
        entity_id: id,
        changes: {},
        performed_by: user?.id ?? 'unknown',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assignments.lists() });
    },
  });
};
