import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';

// The generated database.ts doesn't have the `enrollments` table yet.
// We cast through `unknown` once to bridge the gap until types are regenerated.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as unknown as { from: (table: string) => any };

// ─── Types ──────────────────────────────────────────────────────────────────

export type EnrollmentStatus = 'active' | 'dropped' | 'completed';

export interface Enrollment {
  id: string;
  student_id: string;
  course_id: string;
  section_id: string | null;
  enrolled_at: string;
  status: EnrollmentStatus;
  institution_id: string;
  created_at: string;
}

export interface EnrollmentWithProfile extends Enrollment {
  profiles: { id: string; full_name: string; email: string } | null;
}

export interface EnrollStudentInput {
  student_id: string;
  course_id: string;
  section_id?: string;
}

// ─── useEnrollments — list enrollments for a course with student profiles ───

export const useEnrollments = (courseId?: string) => {
  return useQuery({
    queryKey: queryKeys.enrollments.list({ courseId }),
    queryFn: async (): Promise<EnrollmentWithProfile[]> => {
      let query = db
        .from('student_courses')
        .select('*, profiles(id, full_name, email)')
        .order('enrolled_at', { ascending: false });

      if (courseId) {
        query = query.eq('course_id', courseId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as EnrollmentWithProfile[];
    },
  });
};

// ─── useEnrollment — single enrollment detail ───────────────────────────────

export const useEnrollment = (id?: string) => {
  return useQuery({
    queryKey: queryKeys.enrollments.detail(id ?? ''),
    queryFn: async (): Promise<EnrollmentWithProfile | null> => {
      const { data, error } = await db
        .from('student_courses')
        .select('*, profiles(id, full_name, email)')
        .eq('id', id!)
        .maybeSingle();

      if (error) throw error;
      return data as EnrollmentWithProfile | null;
    },
    enabled: !!id,
  });
};

// ─── useEnrollStudent — enroll a student in a course ────────────────────────

export const useEnrollStudent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: EnrollStudentInput): Promise<Enrollment> => {
      const { data, error } = await db
        .from('student_courses')
        .insert({
          student_id: input.student_id,
          course_id: input.course_id,
          section_id: input.section_id ?? null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Enrollment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.enrollments.lists() });
    },
  });
};

// ─── useUnenrollStudent — soft-delete by setting status to 'dropped' ────────

export const useUnenrollStudent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<Enrollment> => {
      const { data, error } = await db
        .from('student_courses')
        .update({ status: 'dropped' })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Enrollment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.enrollments.lists() });
    },
  });
};

// ─── useCourseStudents — active student profiles for a course ───────────────

export const useCourseStudents = (courseId?: string) => {
  return useQuery({
    queryKey: queryKeys.enrollments.list({ courseId, status: 'active' }),
    queryFn: async (): Promise<EnrollmentWithProfile[]> => {
      const { data, error } = await db
        .from('student_courses')
        .select('*, profiles(id, full_name, email)')
        .eq('course_id', courseId!)
        .eq('status', 'active')
        .order('enrolled_at', { ascending: false });

      if (error) throw error;
      return data as EnrollmentWithProfile[];
    },
    enabled: !!courseId,
  });
};
