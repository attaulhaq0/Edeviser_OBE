import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { logAuditEvent } from "@/lib/auditLogger";
import { useAuth } from "@/hooks/useAuth";
import type {
  CreateCourseFormData,
  UpdateCourseFormData,
} from "@/lib/schemas/course";
import type { Course } from "@/types/app";
import type { Profile } from "@/types/app";
import type { PaginatedResult } from "@/types/pagination";
import { getPaginationRange } from "@/types/pagination";
import { sanitizePostgrestValue } from "@/lib/sanitizeFilter";

// ─── Filter types ────────────────────────────────────────────────────────────

export interface CourseFilters {
  search?: string;
  programId?: string;
  page?: number;
  pageSize?: number;
}

/**
 * A course list row with its program and teacher embedded via PostgREST
 * to-one joins (Req 5.1). The names are resolved in the same round trip as the
 * list query (no N+1, Req 5.5); the columns render them through `resolveName`
 * so a missing relation falls back to a label instead of a Raw_UUID (Req 5.6).
 */
export interface CourseWithRelations extends Course {
  programs: { name: string } | null;
  teacher: { full_name: string | null } | null;
}

// ─── useCourses — list courses with optional search/program filter ───────────

export const useCourses = (filters: CourseFilters = {}) => {
  const { page, pageSize, from, to } = getPaginationRange(
    filters.page,
    filters.pageSize
  );

  return useQuery({
    queryKey: queryKeys.courses.list({ ...filters, page, pageSize } as Record<
      string,
      unknown
    >),
    queryFn: async (): Promise<PaginatedResult<CourseWithRelations>> => {
      let query = supabase
        .from("courses")
        .select(
          "*, programs!courses_program_id_fkey(name), teacher:profiles!courses_teacher_id_fkey(full_name)",
          { count: "exact" }
        )
        .order("created_at", { ascending: false })
        .range(from, to);

      if (filters.programId) {
        query = query.eq("program_id", filters.programId);
      }

      if (filters.search) {
        const safe = sanitizePostgrestValue(filters.search);
        query = query.or(`name.ilike.%${safe}%,code.ilike.%${safe}%`);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return {
        data: (data ?? []) as unknown as CourseWithRelations[],
        count: count ?? 0,
        page,
        pageSize,
      };
    },
    staleTime: 30_000,
  });
};

// ─── useCourse — single course detail ────────────────────────────────────────

export const useCourse = (id: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.courses.detail(id ?? ""),
    queryFn: async (): Promise<Course | null> => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("id", id!)
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
      const { data: result, error } = await supabase
        .from("courses")
        .insert(data as never)
        .select()
        .single();

      if (error) throw error;

      const course = result as Course;

      await logAuditEvent({
        action: "create",
        entity_type: "course",
        entity_id: course.id,
        changes: data as Record<string, unknown>,
        performed_by: user?.id ?? "unknown",
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
      const { data: result, error } = await supabase
        .from("courses")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      await logAuditEvent({
        action: "update",
        entity_type: "course",
        entity_id: id,
        changes: data as Record<string, unknown>,
        performed_by: user?.id ?? "unknown",
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
      const { data: result, error } = await supabase
        .from("courses")
        .update({ is_active: false })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      await logAuditEvent({
        action: "soft_delete",
        entity_type: "course",
        entity_id: id,
        changes: { is_active: false },
        performed_by: user?.id ?? "unknown",
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
    queryKey: queryKeys.users.list({ role: "teacher" }),
    queryFn: async (): Promise<Profile[]> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "teacher")
        .eq("is_active", true)
        .order("full_name", { ascending: true });

      if (error) throw error;
      return data as Profile[];
    },
    staleTime: 30_000,
  });
};
