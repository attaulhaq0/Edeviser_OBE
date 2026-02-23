import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import type { CreateAssignmentFormData } from '@/lib/schemas/assignment';

// The generated database.ts doesn't have the `assignments` table yet.
// We cast through `unknown` once to bridge the gap until types are regenerated.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as unknown as { from: (table: string) => any };

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

export const useAssignments = (courseId?: string) => {
  return useQuery({
    queryKey: queryKeys.assignments.list({ courseId }),
    queryFn: async (): Promise<AssignmentWithRelations[]> => {
      let query = db
        .from('assignments')
        .select('*, rubrics(title)')
        .order('due_date', { ascending: true });

      if (courseId) {
        query = query.eq('course_id', courseId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as AssignmentWithRelations[];
    },
  });
};


// ─── useAssignment — single assignment detail with rubric join ──────────────

export const useAssignment = (id?: string) => {
  return useQuery({
    queryKey: queryKeys.assignments.detail(id ?? ''),
    queryFn: async (): Promise<AssignmentWithRelations | null> => {
      const { data, error } = await db
        .from('assignments')
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

  return useMutation({
    mutationFn: async (data: CreateAssignmentFormData): Promise<Assignment> => {
      const { data: result, error } = await db
        .from('assignments')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result as Assignment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assignments.lists() });
    },
  });
};

// ─── useUpdateAssignment — update assignment fields ─────────────────────────

export const useUpdateAssignment = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      data: Partial<CreateAssignmentFormData>,
    ): Promise<Assignment> => {
      const { data: result, error } = await db
        .from('assignments')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
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

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await db
        .from('assignments')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assignments.lists() });
    },
  });
};
