import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import type { GradeFormData } from '@/lib/schemas/grade';

// Bridge the generated types gap until database.ts is regenerated.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as unknown as { from: (table: string) => any };

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Grade {
  id: string;
  submission_id: string;
  rubric_selections: Array<{ criterion_id: string; level_index: number; points: number }>;
  total_score: number;
  score_percent: number;
  overall_feedback: string | null;
  graded_by: string;
  created_at: string;
  institution_id: string;
}

export interface GradeWithRelations extends Grade {
  profiles: { id: string; full_name: string; email: string } | null;
}

// ─── useGrades — list grades for an assignment ──────────────────────────────

export const useGrades = (assignmentId?: string) => {
  return useQuery({
    queryKey: queryKeys.grades.list({ assignmentId }),
    queryFn: async (): Promise<GradeWithRelations[]> => {
      let query = db
        .from('grades')
        .select('*, profiles!grades_graded_by_fkey(id, full_name, email)')
        .order('created_at', { ascending: false });

      if (assignmentId) {
        query = query.eq('assignment_id', assignmentId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as GradeWithRelations[];
    },
    enabled: !!assignmentId,
  });
};

// ─── useGrade — single grade for a submission (may not exist) ───────────────

export const useGrade = (submissionId?: string) => {
  return useQuery({
    queryKey: queryKeys.grades.detail(submissionId ?? ''),
    queryFn: async (): Promise<Grade | null> => {
      const { data, error } = await db
        .from('grades')
        .select('*')
        .eq('submission_id', submissionId!)
        .maybeSingle();

      if (error) throw error;
      return data as Grade | null;
    },
    enabled: !!submissionId,
  });
};

// ─── useCreateGrade — insert grade for a submission ─────────────────────────

export const useCreateGrade = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: GradeFormData & { graded_by: string }): Promise<Grade> => {
      const { data: result, error } = await db
        .from('grades')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result as Grade;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.grades.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.submissions.lists() });
      // Evidence Generator (Task 17) runs via a database trigger on grades INSERT.
      // Invalidate evidence & attainment caches so the UI picks up new records.
      queryClient.invalidateQueries({ queryKey: queryKeys.evidence.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.outcomeAttainment.lists() });
    },
  });
};
