import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { logAuditEvent } from '@/lib/auditLogger';
import { useAuth } from '@/hooks/useAuth';
import type { PaginatedResult } from '@/types/pagination';
import { getPaginationRange } from '@/types/pagination';



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

export const useEnrollments = (courseId?: string, pagination?: { page?: number; pageSize?: number }) => {
  const { page, pageSize, from, to } = getPaginationRange(pagination?.page, pagination?.pageSize);

  return useQuery({
    queryKey: queryKeys.enrollments.list({ courseId, page, pageSize }),
    queryFn: async (): Promise<PaginatedResult<EnrollmentWithProfile>> => {
      let query = supabase.from('student_courses')
        .select('*, profiles(id, full_name, email)', { count: 'exact' })
        .order('enrolled_at', { ascending: false })
        .range(from, to);

      if (courseId) {
        query = query.eq('course_id', courseId);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { data: (data ?? []) as EnrollmentWithProfile[], count: count ?? 0, page, pageSize };
    },
  });
};

// ─── useEnrollment — single enrollment detail ───────────────────────────────

export const useEnrollment = (id?: string) => {
  return useQuery({
    queryKey: queryKeys.enrollments.detail(id ?? ''),
    queryFn: async (): Promise<EnrollmentWithProfile | null> => {
      const { data, error } = await supabase.from('student_courses')
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
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: EnrollStudentInput): Promise<Enrollment> => {
      const { data, error } = await supabase.from('student_courses')
        .insert({
          student_id: input.student_id,
          course_id: input.course_id,
          section_id: input.section_id ?? null,
        })
        .select()
        .single();

      if (error) throw error;

      const enrollment = data as Enrollment;

      await logAuditEvent({
        action: 'create',
        entity_type: 'enrollment',
        entity_id: enrollment.id,
        changes: input as unknown as Record<string, unknown>,
        performed_by: user?.id ?? 'unknown',
      });

      return enrollment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.enrollments.lists() });
    },
  });
};

// ─── useUnenrollStudent — soft-delete by setting status to 'dropped' ────────

export const useUnenrollStudent = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string): Promise<Enrollment> => {
      const { data, error } = await supabase.from('student_courses')
        .update({ status: 'dropped' })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      const enrollment = data as Enrollment;

      await logAuditEvent({
        action: 'delete',
        entity_type: 'enrollment',
        entity_id: id,
        changes: { status: 'dropped' },
        performed_by: user?.id ?? 'unknown',
      });

      return enrollment;
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
      const { data, error } = await supabase.from('student_courses')
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
