import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { logAuditEvent } from '@/lib/auditLogger';
import { useAuth } from '@/providers/AuthProvider';
import type { CreateCourseFormData, UpdateCourseFormData } from '@/lib/schemas/course';
import type { Course } from '@/types/app';
import type { Profile } from '@/types/app';

// Bridge the generated types gap until database.ts is regenerated.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as unknown as { from: (table: string) => any };

// ─── Filter types ────────────────────────────────────────────────────────────

export interface CourseFilters {
  search?: string;
  programId?: string;
}

// ─── useCourses — list courses with optional search/program filter ───────────

export const useCourses = (filters: CourseFilters = {}) => {
  return useQuery({
    queryKey: queryKeys.courses.list(filters as Record<string, unknown>),
    queryFn: async (): Promise<Course[]> => {
      let query = db
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters.programId) {
        query = query.eq('program_id', filters.programId);
      }

      if (filters.search) {
        query = query.or(
          `name.ilike.%${filters.search}%,code.ilike.%${filters.search}%`,
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Course[];
    },
    staleTime: 30_000,
  });
};

// ─── useCourse — single course detail ────────────────────────────────────────

export const useCourse = (id: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.courses.detail(id ?? ''),
    queryFn: async (): Promise<Course | null> => {
      const { data, error } = await db
        .from('courses')
        .select('*')
        .eq('id', id!)
        .maybeSingle();

      if (error) throw error;
      return data as Course | null;
    },
    enabled: !!id,
    staleTime: 30_000,
  });
};


// ─── useCreateCourse — insert with audit logging ─────────────────────────────

export const useCreateCourse = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: CreateCourseFormData): Promise<Course> => {
      const { data: result, error } = await db
        .from('courses')
        .insert(data)
        .select()
        .single();

      if (error) throw error;

      const course = result as Course;

      await logAuditEvent({
        action: 'create',
        entity_type: 'course',
        entity_id: course.id,
        changes: data as unknown as Record<string, unknown>,
        performed_by: user?.id ?? 'unknown',
      });

      return course;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.courses.lists() });
    },
  });
};

// ─── useUpdateCourse — update with audit logging ─────────────────────────────

export const useUpdateCourse = (id: string) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: UpdateCourseFormData): Promise<Course> => {
      const { data: result, error } = await db
        .from('courses')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      await logAuditEvent({
        action: 'update',
        entity_type: 'course',
        entity_id: id,
        changes: data as Record<string, unknown>,
        performed_by: user?.id ?? 'unknown',
      });

      return result as Course;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.courses.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.courses.detail(id) });
    },
  });
};

// ─── useSoftDeleteCourse — set is_active = false ─────────────────────────────

export const useSoftDeleteCourse = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string): Promise<Course> => {
      const { data: result, error } = await db
        .from('courses')
        .update({ is_active: false })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      await logAuditEvent({
        action: 'soft_delete',
        entity_type: 'course',
        entity_id: id,
        changes: { is_active: false },
        performed_by: user?.id ?? 'unknown',
      });

      return result as Course;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.courses.lists() });
    },
  });
};

// ─── useTeachers — fetch active teachers for assignment dropdowns ────────────

export const useTeachers = () => {
  return useQuery({
    queryKey: queryKeys.users.list({ role: 'teacher' }),
    queryFn: async (): Promise<Profile[]> => {
      const { data, error } = await db
        .from('profiles')
        .select('*')
        .eq('role', 'teacher')
        .eq('is_active', true)
        .order('full_name', { ascending: true });

      if (error) throw error;
      return data as Profile[];
    },
    staleTime: 30_000,
  });
};
