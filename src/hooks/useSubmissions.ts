import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';

// Bridge the generated types gap until database.ts is regenerated.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as unknown as { from: (table: string) => any };

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Submission {
  id: string;
  assignment_id: string;
  student_id: string;
  file_url: string;
  is_late: boolean;
  created_at: string;
  institution_id: string;
}

export interface SubmissionWithRelations extends Submission {
  profiles: { id: string; full_name: string; email: string } | null;
  assignments: { id: string; title: string; total_marks: number; course_id: string } | null;
  grades: { id: string } | null;
}

// ─── Filter types ───────────────────────────────────────────────────────────

export interface SubmissionFilters {
  courseId?: string;
  assignmentId?: string;
  status?: string;
}

// ─── useSubmissions — list submissions with profile & assignment joins ───────

export const useSubmissions = (filters: SubmissionFilters = {}) => {
  return useQuery({
    queryKey: queryKeys.submissions.list(filters as Record<string, unknown>),
    queryFn: async (): Promise<SubmissionWithRelations[]> => {
      let query = db
        .from('submissions')
        .select('*, profiles!submissions_student_id_fkey(id, full_name, email), assignments(id, title, total_marks, course_id), grades(id)')
        .order('created_at', { ascending: false });

      if (filters.assignmentId) {
        query = query.eq('assignment_id', filters.assignmentId);
      }

      if (filters.courseId) {
        query = query.eq('assignments.course_id', filters.courseId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as SubmissionWithRelations[];
    },
  });
};

// ─── useSubmission — single submission detail ───────────────────────────────

export const useSubmission = (id?: string) => {
  return useQuery({
    queryKey: queryKeys.submissions.detail(id ?? ''),
    queryFn: async (): Promise<SubmissionWithRelations | null> => {
      const { data, error } = await db
        .from('submissions')
        .select('*, profiles!submissions_student_id_fkey(id, full_name, email), assignments(id, title, total_marks, course_id), grades(id)')
        .eq('id', id!)
        .maybeSingle();

      if (error) throw error;
      return data as SubmissionWithRelations | null;
    },
    enabled: !!id,
  });
};

// ─── usePendingSubmissions — submissions without grades (grading queue) ─────

export const usePendingSubmissions = (courseId?: string) => {
  return useQuery({
    queryKey: queryKeys.submissions.list({ courseId, status: 'pending' }),
    queryFn: async (): Promise<SubmissionWithRelations[]> => {
      let query = db
        .from('submissions')
        .select('*, profiles!submissions_student_id_fkey(id, full_name, email), assignments(id, title, total_marks, course_id), grades(id)')
        .order('created_at', { ascending: false });

      if (courseId) {
        query = query.eq('assignments.course_id', courseId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Filter client-side: only submissions without a grade record
      const submissions = data as SubmissionWithRelations[];
      return submissions.filter((s) => !s.grades);
    },
  });
};
