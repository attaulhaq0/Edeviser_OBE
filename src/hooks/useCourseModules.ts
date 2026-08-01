// =============================================================================
// useCourseModules — Hooks for course modules & course materials (LMS)
// Task 19.1
// =============================================================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { logAuditEvent } from "@/lib/auditLogger";
import { indexCourseMaterialIfSupported } from "@/lib/courseMaterialIndexing";
import type { Database, Json } from "@/types/database";

// ─── Interfaces ──────────────────────────────────────────────────────────────

export type MaterialType = "file" | "link" | "video" | "text";

export interface CourseModule {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  sort_order: number;
  is_published: boolean;
  created_at: string;
  updated_at?: string;
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
  updated_at?: string;
}

export interface CreateModuleInput {
  course_id: string;
  title: string;
  description?: string | null;
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
  content_url?: string | null;
  file_path?: string | null;
  description?: string | null;
  sort_order: number;
  is_published: boolean;
  clo_ids?: string[];
  course_id?: string;
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
  course_id?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function castModule(row: Record<string, unknown>): CourseModule {
  return {
    id: String(row.id ?? ""),
    course_id: String(row.course_id ?? ""),
    title: String(row.title ?? ""),
    description: row.description != null ? String(row.description) : null,
    sort_order: Number(row.sort_order ?? 0),
    is_published: Boolean(row.is_published ?? false),
    created_at: String(row.created_at ?? ""),
    updated_at:
      row.updated_at != null
        ? String(row.updated_at)
        : String(row.created_at ?? ""),
  };
}

function castMaterial(row: Record<string, unknown>): CourseMaterial {
  let cloIds: string[] = [];
  if (Array.isArray(row.clo_ids)) {
    cloIds = row.clo_ids.map(String);
  }
  return {
    id: String(row.id ?? ""),
    module_id: String(row.module_id ?? ""),
    title: String(row.title ?? ""),
    type: (row.type as MaterialType) ?? "file",
    content_url: row.content_url != null ? String(row.content_url) : null,
    file_path: row.file_path != null ? String(row.file_path) : null,
    description: row.description != null ? String(row.description) : null,
    sort_order: Number(row.sort_order ?? 0),
    is_published: Boolean(row.is_published ?? false),
    clo_ids: cloIds,
    created_at: String(row.created_at ?? ""),
    updated_at:
      row.updated_at != null
        ? String(row.updated_at)
        : String(row.created_at ?? ""),
  };
}

// ─── Module Hooks ────────────────────────────────────────────────────────────

export const useCourseModules = (courseId: string) => {
  return useQuery({
    queryKey: queryKeys.courseModules.list({ courseId }),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_modules")
        .select("*")
        .eq("course_id", courseId)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return (data ?? []).map((row) =>
        castModule(row as unknown as Record<string, unknown>)
      );
    },
    enabled: !!courseId,
  });
};

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

      const currentUserId =
        (await supabase.auth.getUser()).data.user?.id ?? performedBy;
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
        performed_by: currentUserId,
      }).catch((err: unknown) => console.error("Audit log error:", err));

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

      const currentUserId =
        (await supabase.auth.getUser()).data.user?.id ?? performedBy;
      await logAuditEvent({
        action: "update",
        entity_type: "course_module",
        entity_id: id,
        changes: updates,
        performed_by: currentUserId,
      }).catch((err: unknown) => console.error("Audit log error:", err));

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
      const { data: childMaterials } = await supabase
        .from("course_materials")
        .select("id, file_path")
        .eq("module_id", id);

      if (childMaterials && childMaterials.length > 0) {
        const filePaths = childMaterials
          .map((m) => m.file_path)
          .filter((p): p is string => !!p);

        if (filePaths.length > 0) {
          await supabase.storage
            .from(MATERIAL_BUCKET)
            .remove(filePaths)
            .catch((err: unknown) =>
              console.error("Storage child removal error:", err)
            );
        }

        await supabase.from("course_materials").delete().eq("module_id", id);
      }

      const { error } = await supabase
        .from("course_modules")
        .delete()
        .eq("id", id);
      if (error) throw error;

      const currentUserId =
        (await supabase.auth.getUser()).data.user?.id ?? performedBy;
      await logAuditEvent({
        action: "delete",
        entity_type: "course_module",
        entity_id: id,
        changes: null,
        performed_by: currentUserId,
      }).catch((err: unknown) => console.error("Audit log error:", err));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.courseModules.lists(),
      });
    },
  });
};

// ─── Material Hooks ──────────────────────────────────────────────────────────

export const useCourseMaterials = (moduleId: string) => {
  return useQuery({
    queryKey: queryKeys.courseMaterials.list({ moduleId }),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_materials")
        .select("*")
        .eq("module_id", moduleId)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return (data ?? []).map((row) =>
        castMaterial(row as unknown as Record<string, unknown>)
      );
    },
    enabled: !!moduleId,
  });
};

export const useCourseAllMaterials = (courseId: string) => {
  return useQuery({
    queryKey: queryKeys.courseMaterials.list({ courseId }),
    queryFn: async () => {
      const { data: modules } = await supabase
        .from("course_modules")
        .select("id")
        .eq("course_id", courseId);

      const moduleIds = (modules ?? []).map((m) => m.id);
      if (moduleIds.length === 0) return [];

      const { data, error } = await supabase
        .from("course_materials")
        .select("*")
        .in("module_id", moduleIds)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return (data ?? []).map((row) =>
        castMaterial(row as unknown as Record<string, unknown>)
      );
    },
    enabled: !!courseId,
  });
};

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

      const currentUserId =
        (await supabase.auth.getUser()).data.user?.id ?? performedBy;
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
        performed_by: currentUserId,
      }).catch((err: unknown) => console.error("Audit log error:", err));

      // Fire-and-forget non-blocking background vector indexing
      if (
        (payload.type === "file" || payload.file_path) &&
        payload.file_path &&
        payload.course_id
      ) {
        indexCourseMaterialIfSupported({
          filePath: payload.file_path,
          courseId: payload.course_id,
          sourceMaterialId: data.id,
          cloIds: payload.clo_ids ?? [],
        }).catch((err: unknown) =>
          console.error("Background indexing error:", err)
        );
      }

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
      const { clo_ids, course_id: courseId, ...rest } = updates;
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

      const currentUserId =
        (await supabase.auth.getUser()).data.user?.id ?? performedBy;
      await logAuditEvent({
        action: "update",
        entity_type: "course_material",
        entity_id: id,
        changes: updates,
        performed_by: currentUserId,
      }).catch((err: unknown) => console.error("Audit log error:", err));

      if (
        (updates.type === "file" || data.type === "file") &&
        (updates.file_path || data.file_path) &&
        (courseId || data.module_id)
      ) {
        indexCourseMaterialIfSupported({
          filePath: updates.file_path ?? data.file_path ?? "",
          courseId: courseId ?? "",
          sourceMaterialId: id,
          cloIds: updates.clo_ids,
          reindex: true,
        }).catch((err: unknown) =>
          console.error("Background re-indexing error:", err)
        );
      }

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
      const { data: mat } = await supabase
        .from("course_materials")
        .select("file_path")
        .eq("id", id)
        .single();

      if (mat?.file_path) {
        await supabase.storage
          .from(MATERIAL_BUCKET)
          .remove([mat.file_path])
          .catch((err: unknown) =>
            console.error("Storage removal error:", err)
          );
      }

      const { error } = await supabase
        .from("course_materials")
        .delete()
        .eq("id", id);
      if (error) throw error;

      const currentUserId =
        (await supabase.auth.getUser()).data.user?.id ?? performedBy;
      await logAuditEvent({
        action: "delete",
        entity_type: "course_material",
        entity_id: id,
        changes: null,
        performed_by: currentUserId,
      }).catch((err: unknown) => console.error("Audit log error:", err));
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

  if (path.includes("..")) {
    throw new Error(
      "Invalid file path: path traversal sequences are not allowed."
    );
  }

  const { error } = await supabase.storage
    .from(MATERIAL_BUCKET)
    .upload(path, file);
  if (error) throw new Error(`Upload failed: ${error.message}`);
  return path;
};
