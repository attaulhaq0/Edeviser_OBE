import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { logAuditEvent } from '@/lib/auditLogger';
import { useAuth } from '@/hooks/useAuth';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CourseSection {
  id: string;
  course_id: string;
  section_code: string;
  teacher_id: string;
  capacity: number;
  is_active: boolean;
  created_at: string;
}

export interface CourseSectionWithTeacher extends CourseSection {
  profiles: { id: string; full_name: string; email: string } | null;
}

export interface CreateCourseSectionInput {
  course_id: string;
  section_code: string;
  teacher_id: string;
  capacity: number;
  is_active?: boolean;
}

export interface UpdateCourseSectionInput {
  section_code?: string;
  teacher_id?: string;
  capacity?: number;
  is_active?: boolean;
}

// ─── useCourseSections — list sections for a course ─────────────────────────

export const useCourseSections = (courseId?: string) => {
  return useQuery({
    queryKey: queryKeys.courseSections.list({ courseId }),
    queryFn: async (): Promise<CourseSectionWithTeacher[]> => {
      const { data, error } = await supabase
        .from('course_sections')
        .select('*, profiles!course_sections_teacher_id_fkey(id, full_name, email)')
        .eq('course_id', courseId!)
        .order('section_code', { ascending: true });

      if (error) throw error;
      return (data ?? []) as CourseSectionWithTeacher[];
    },
    enabled: !!courseId,
  });
};

// ─── useCourseSection — single section detail ───────────────────────────────

export const useCourseSection = (id?: string) => {
  return useQuery({
    queryKey: queryKeys.courseSections.detail(id ?? ''),
    queryFn: async (): Promise<CourseSectionWithTeacher | null> => {
      const { data, error } = await supabase
        .from('course_sections')
        .select('*, profiles!course_sections_teacher_id_fkey(id, full_name, email)')
        .eq('id', id!)
        .maybeSingle();

      if (error) throw error;
      return data as CourseSectionWithTeacher | null;
    },
    enabled: !!id,
  });
};

// ─── useCreateCourseSection — insert with audit logging ─────────────────────

export const useCreateCourseSection = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateCourseSectionInput): Promise<CourseSection> => {
      const { data, error } = await supabase
        .from('course_sections')
        .insert({
          course_id: input.course_id,
          section_code: input.section_code,
          teacher_id: input.teacher_id,
          capacity: input.capacity,
          is_active: input.is_active ?? true,
        })
        .select()
        .single();

      if (error) throw error;

      const section = data as CourseSection;

      await logAuditEvent({
        action: 'create',
        entity_type: 'course_section',
        entity_id: section.id,
        changes: { ...input },
        performed_by: user?.id ?? 'unknown',
      });

      return section;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.courseSections.lists() });
    },
  });
};

// ─── useUpdateCourseSection — update with audit logging ─────────────────────

export const useUpdateCourseSection = (id: string) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: UpdateCourseSectionInput): Promise<CourseSection> => {
      const { data, error } = await supabase
        .from('course_sections')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      await logAuditEvent({
        action: 'update',
        entity_type: 'course_section',
        entity_id: id,
        changes: input as Record<string, unknown>,
        performed_by: user?.id ?? 'unknown',
      });

      return data as CourseSection;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.courseSections.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.courseSections.detail(id) });
    },
  });
};

// ─── useDeleteCourseSection — soft-delete by setting is_active = false ──────

export const useDeleteCourseSection = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string): Promise<CourseSection> => {
      const { data, error } = await supabase
        .from('course_sections')
        .update({ is_active: false })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      await logAuditEvent({
        action: 'soft_delete',
        entity_type: 'course_section',
        entity_id: id,
        changes: { is_active: false },
        performed_by: user?.id ?? 'unknown',
      });

      return data as CourseSection;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.courseSections.lists() });
    },
  });
};

// ─── useSectionEnrollmentCount — count active enrollments per section ────────

export const useSectionEnrollmentCount = (sectionId?: string) => {
  return useQuery({
    queryKey: queryKeys.courseSections.list({ sectionId, scope: 'enrollment_count' }),
    queryFn: async (): Promise<number> => {
      const { count, error } = await supabase
        .from('student_courses')
        .select('*', { count: 'exact', head: true })
        .eq('section_id', sectionId!)
        .eq('status', 'active');

      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!sectionId,
  });
};
