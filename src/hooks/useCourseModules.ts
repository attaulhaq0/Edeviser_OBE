// Task 66.6: Course module/material TanStack Query hooks
// Requirements: 76
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { logAuditEvent } from "@/lib/auditLogger";
import type { Database, Json } from "@/types/database";

// ─── Types ──────────────────────────────────────────────────────────────────

export type MaterialType = "file" | "link" | "video" | "text";

export interface CourseModule {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  sort_order: number;
  is_published: boolean;
  created_at: string;
}

export interface CourseMaterial {
  id: string;
  module_id: string;
  title: string;
  type: MaterialType;
  content_url: string | null;
  file_path: string | null;
  description: string | null;
  sort_order: number;
  is_published: boolean;
  clo_ids: string[];
  created_at: string;
}

export interface CreateModuleInput {
  course_id: string;
  title: string;
  description?: string;
  sort_order: number;
  is_published: boolean;
}

export interface UpdateModuleInput {
  id: string;
  title?: string;
  description?: string | null;
  sort_order?: number;
  is_published?: boolean;
}

export interface CreateMaterialInput {
  module_id: string;
  title: string;
  type: MaterialType;
  content_url?: string;
  file_path?: string;
  description?: string;
  sort_order: number;
  is_published: boolean;
  clo_ids?: string[];
}

export interface UpdateMaterialInput {
  id: string;
  title?: string;
  type?: MaterialType;
  content_url?: string | null;
  file_path?: string | null;
  description?: string | null;
  sort_order?: number;
  is_published?: boolean;
  clo_ids?: string[];
}

// ─── Cast helpers ───────────────────────────────────────────────────────────

function castModule(row: Record<string, unknown>): CourseModule {
  return {
    id: row.id as string,
    course_id: row.course_id as string,
    title: row.title as string,
    description: (row.description as string | null) ?? null,
    sort_order: row.sort_order as number,
    is_published: row.is_published as boolean,
    created_at: row.created_at as string,
  };
}

function castMaterial(row: Record<string, unknown>): CourseMaterial {
  const rawCloIds = row.clo_ids;
  const cloIds = Array.isArray(rawCloIds) ? (rawCloIds as string[]) : [];
  return {
    id: row.id as string,
    module_id: row.module_id as string,
    title: row.title as string,
    type: row.type as MaterialType,
    content_url: (row.content_url as string | null) ?? null,
    file_path: (row.file_path as string | null) ?? null,
    description: (row.description as string | null) ?? null,
    sort_order: row.sort_order as number,
    is_published: row.is_published as boolean,
    clo_ids: cloIds,
    created_at: row.created_at as string,
  };
}

// ─── Module Queries ─────────────────────────────────────────────────────────

export const useCourseModules = (courseId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.courseModules.list({ courseId }),
    queryFn: async () => {
      if (!courseId) return [];
      const { data, error } = await supabase
        .from("course_modules")
        .select(
          "id, course_id, title, description, sort_order, is_published, created_at"
        )
        .eq("course_id", courseId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((r) =>
        castModule(r as unknown as Record<string, unknown>)
      );
    },
    enabled: !!courseId,
  });
};

// ─── Material Queries ───────────────────────────────────────────────────────

export const useCourseMaterials = (moduleId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.courseMaterials.list({ moduleId }),
    queryFn: async () => {
      if (!moduleId) return [];
      const { data, error } = await supabase
        .from("course_materials")
        .select(
          "id, module_id, title, type, content_url, file_path, description, sort_order, is_published, clo_ids, created_at"
        )
        .eq("module_id", moduleId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((r) =>
        castMaterial(r as unknown as Record<string, unknown>)
      );
    },
    enabled: !!moduleId,
  });
};

export const useCourseAllMaterials = (courseId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.courseMaterials.list({ courseId }),
    queryFn: async () => {
      if (!courseId) return [];
      // Fetch modules first, then materials for all modules
      const { data: modules, error: modErr } = await supabase
        .from("course_modules")
        .select("id")
        .eq("course_id", courseId);
      if (modErr) throw modErr;
      if (!modules || modules.length === 0) return [];
      const moduleIds = modules.map((m) => m.id);
      const { data, error } = await supabase
        .from("course_materials")
        .select(
          "id, module_id, title, type, content_url, file_path, description, sort_order, is_published, clo_ids, created_at"
        )
        .in("module_id", moduleIds)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((r) =>
        castMaterial(r as unknown as Record<string, unknown>)
      );
    },
    enabled: !!courseId,
  });
};

// ─── Module Mutations ───────────────────────────────────────────────────────

export const useCreateModule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateModuleInput & { performedBy: string }) => {
      const { performedBy, ...payload } = input;
      const { data, error } = await supabase
        .from("course_modules")
        .insert({
          course_id: payload.course_id,
          title: payload.title,
          description: payload.description ?? null,
          sort_order: payload.sort_order,
          is_published: payload.is_published,
        })
        .select()
        .single();
      if (error) throw error;
      await logAuditEvent({
        action: "create",
        entity_type: "course_module",
        entity_id: data.id,
        changes: {
          course_id: payload.course_id,
          title: payload.title,
          sort_order: payload.sort_order,
          is_published: payload.is_published,
        },
        performed_by: performedBy,
      });
      return castModule(data as unknown as Record<string, unknown>);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.courseModules.list({
          courseId: variables.course_id,
        }),
      });
    },
  });
};

export const useUpdateModule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateModuleInput & { performedBy: string }) => {
      const { id, performedBy, ...updates } = input;
      const { data, error } = await supabase
        .from("course_modules")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      await logAuditEvent({
        action: "update",
        entity_type: "course_module",
        entity_id: id,
        changes: updates,
        performed_by: performedBy,
      });
      return castModule(data as unknown as Record<string, unknown>);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.courseModules.lists(),
      });
    },
  });
};

export const useDeleteModule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      performedBy,
    }: {
      id: string;
      performedBy: string;
    }) => {
      const { error } = await supabase
        .from("course_modules")
        .delete()
        .eq("id", id);
      if (error) throw error;
      await logAuditEvent({
        action: "delete",
        entity_type: "course_module",
        entity_id: id,
        changes: null,
        performed_by: performedBy,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.courseModules.lists(),
      });
    },
  });
};

// ─── Material Mutations ─────────────────────────────────────────────────────

export const useCreateMaterial = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: CreateMaterialInput & { performedBy: string }
    ) => {
      const { performedBy, ...payload } = input;
      const { data, error } = await supabase
        .from("course_materials")
        .insert({
          module_id: payload.module_id,
          title: payload.title,
          type: payload.type,
          content_url: payload.content_url ?? null,
          file_path: payload.file_path ?? null,
          description: payload.description ?? null,
          sort_order: payload.sort_order,
          is_published: payload.is_published,
          clo_ids: (payload.clo_ids ?? []) as unknown as Json,
        })
        .select()
        .single();
      if (error) throw error;
      await logAuditEvent({
        action: "create",
        entity_type: "course_material",
        entity_id: data.id,
        changes: {
          module_id: payload.module_id,
          title: payload.title,
          type: payload.type,
          sort_order: payload.sort_order,
          is_published: payload.is_published,
          clo_ids: payload.clo_ids,
        },
        performed_by: performedBy,
      });
      return castMaterial(data as unknown as Record<string, unknown>);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.courseMaterials.list({
          moduleId: variables.module_id,
        }),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.courseMaterials.lists(),
      });
    },
  });
};

export const useUpdateMaterial = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: UpdateMaterialInput & { performedBy: string }
    ) => {
      const { id, performedBy, ...updates } = input;
      const { clo_ids, ...rest } = updates;
      const updatePayload: Database["public"]["Tables"]["course_materials"]["Update"] =
        {
          ...rest,
          ...(clo_ids !== undefined
            ? { clo_ids: clo_ids as unknown as Json }
            : {}),
        };
      const { data, error } = await supabase
        .from("course_materials")
        .update(updatePayload)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      await logAuditEvent({
        action: "update",
        entity_type: "course_material",
        entity_id: id,
        changes: updates,
        performed_by: performedBy,
      });
      return castMaterial(data as unknown as Record<string, unknown>);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.courseMaterials.lists(),
      });
    },
  });
};

export const useDeleteMaterial = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      performedBy,
    }: {
      id: string;
      performedBy: string;
    }) => {
      const { error } = await supabase
        .from("course_materials")
        .delete()
        .eq("id", id);
      if (error) throw error;
      await logAuditEvent({
        action: "delete",
        entity_type: "course_material",
        entity_id: id,
        changes: null,
        performed_by: performedBy,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.courseMaterials.lists(),
      });
    },
  });
};

// ─── File Upload for Materials ──────────────────────────────────────────────

const MATERIAL_BUCKET = "course-materials";
const MATERIAL_MAX_SIZE = 50 * 1024 * 1024; // 50MB
const MATERIAL_ALLOWED_EXTENSIONS = [
  "pdf",
  "doc",
  "docx",
  "pptx",
  "png",
  "jpg",
  "jpeg",
  "gif",
  "mp4",
  "zip",
];

export const uploadMaterialFile = async (
  file: File,
  courseId: string
): Promise<string> => {
  if (file.size > MATERIAL_MAX_SIZE) {
    throw new Error(
      `File size exceeds 50MB limit. Your file is ${(
        file.size /
        (1024 * 1024)
      ).toFixed(1)}MB.`
    );
  }
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!MATERIAL_ALLOWED_EXTENSIONS.includes(ext)) {
    throw new Error(
      `File type ".${ext}" is not allowed. Accepted: ${MATERIAL_ALLOWED_EXTENSIONS.join(
        ", "
      )}`
    );
  }
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${courseId}/${Date.now()}_${safeName}`;

  // Guard against path traversal in filename or courseId
  if (path.includes("..")) {
    throw new Error(
      "Invalid file path: path traversal sequences are not allowed."
    );
  }

  const { error } = await supabase.storage
    .from(MATERIAL_BUCKET)
    .upload(path, file);
  if (error) throw new Error(`Upload failed: ${error.message}`);
  // course-materials is a private bucket. Return the storage path —
  // consumers must call getSignedUrl("course-materials", path) at READ time.
  // See src/lib/storageUrl.ts.
  return path;
};
