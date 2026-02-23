import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

// ─── Mutation types ─────────────────────────────────────────────────────────

export interface CreateSubmissionInput {
  assignment_id: string;
  file_url: string;
  is_late: boolean;
  institution_id: string;
}

// ─── Student assignment view types ──────────────────────────────────────────

export interface StudentAssignment {
  id: string;
  title: string;
  description: string;
  course_id: string;
  due_date: string;
  total_marks: number;
  rubric_id: string;
  late_window_hours: number;
  prerequisites: Array<{ clo_id: string; required_attainment: number }> | null;
  institution_id: string;
  created_at: string;
  updated_at: string;
  submissions: Pick<Submission, 'id' | 'is_late' | 'created_at'>[] | null;
}

// ─── useCreateSubmission — insert a submission record ───────────────────────

export const useCreateSubmission = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateSubmissionInput): Promise<Submission> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await db
        .from('submissions')
        .insert({
          assignment_id: input.assignment_id,
          student_id: user.id,
          file_url: input.file_url,
          is_late: input.is_late,
          institution_id: input.institution_id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Submission;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.submissions.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.assignments.lists() });
    },
  });
};

// ─── useUploadSubmissionFile — upload file to Supabase Storage ──────────────

export interface UploadSubmissionFileParams {
  file: File;
  assignmentId: string;
  institutionId: string;
}

export const useUploadSubmissionFile = () => {
  return useMutation({
    mutationFn: async (params: UploadSubmissionFileParams): Promise<string> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { uploadSubmissionFile } = await import('@/lib/fileUpload');
      return uploadSubmissionFile({
        file: params.file,
        assignmentId: params.assignmentId,
        studentId: user.id,
        institutionId: params.institutionId,
      });
    },
  });
};

// ─── useStudentAssignments — assignments for the current student's courses ──

export const useStudentAssignments = (courseId?: string) => {
  return useQuery({
    queryKey: queryKeys.assignments.list({ courseId, scope: 'student' }),
    queryFn: async (): Promise<StudentAssignment[]> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get courses the student is enrolled in
      const { data: enrollments, error: enrollError } = await db
        .from('student_courses')
        .select('course_id')
        .eq('student_id', user.id);

      if (enrollError) throw enrollError;

      const courseIds = (enrollments as Array<{ course_id: string }>).map(
        (e) => e.course_id,
      );

      if (courseIds.length === 0) return [];

      let query = db
        .from('assignments')
        .select('*, submissions(id, is_late, created_at)')
        .in('course_id', courseIds)
        .eq('submissions.student_id', user.id)
        .order('due_date', { ascending: true });

      if (courseId) {
        query = query.eq('course_id', courseId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as StudentAssignment[];
    },
  });
};
