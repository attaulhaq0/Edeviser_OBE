// Task 66.1: Announcement TanStack Query hooks — CRUD for announcements within a course
// Requirements: 75
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { logAuditEvent } from "@/lib/auditLogger";
import { getSignedUrl } from "@/lib/storageUrl";
import {
  uploadAnnouncementAttachmentFile,
  type UploadedAnnouncementAttachment,
} from "@/lib/fileUpload";
import type { Database } from "@/types/database";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Announcement {
  id: string;
  course_id: string;
  author_id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateAnnouncementInput {
  course_id: string;
  author_id: string;
  title: string;
  content: string;
  is_pinned: boolean;
}

export interface UpdateAnnouncementInput {
  id: string;
  title?: string;
  content?: string;
  is_pinned?: boolean;
}

// ─── Cast helper ────────────────────────────────────────────────────────────

function castAnnouncement(row: Record<string, unknown>): Announcement {
  return {
    id: row.id as string,
    course_id: row.course_id as string,
    author_id: row.author_id as string,
    title: row.title as string,
    content: row.content as string,
    is_pinned: row.is_pinned as boolean,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

// ─── Queries ────────────────────────────────────────────────────────────────

export const useAnnouncements = (courseId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.announcements.list({ courseId }),
    queryFn: async () => {
      if (!courseId) return [];
      const { data, error } = await supabase
        .from("announcements")
        .select(
          "id, course_id, author_id, title, content, is_pinned, created_at, updated_at"
        )
        .eq("course_id", courseId)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) =>
        castAnnouncement(r as unknown as Record<string, unknown>)
      );
    },
    enabled: !!courseId,
  });
};

export const useAnnouncement = (announcementId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.announcements.detail(announcementId ?? ""),
    queryFn: async () => {
      if (!announcementId) return null;
      const { data, error } = await supabase
        .from("announcements")
        .select(
          "id, course_id, author_id, title, content, is_pinned, created_at, updated_at"
        )
        .eq("id", announcementId)
        .maybeSingle();
      if (error) throw error;
      return data
        ? castAnnouncement(data as unknown as Record<string, unknown>)
        : null;
    },
    enabled: !!announcementId,
  });
};

// ─── Mutations ──────────────────────────────────────────────────────────────

export const useCreateAnnouncement = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: CreateAnnouncementInput & { performedBy: string }
    ) => {
      const { performedBy, ...payload } = input;
      const { data, error } = await supabase
        .from("announcements")
        .insert({
          course_id: payload.course_id,
          author_id: payload.author_id,
          title: payload.title,
          content: payload.content,
          is_pinned: payload.is_pinned,
        })
        .select()
        .single();
      if (error) throw error;
      await logAuditEvent({
        action: "create",
        entity_type: "announcement",
        entity_id: data.id,
        changes: {
          course_id: payload.course_id,
          title: payload.title,
          is_pinned: payload.is_pinned,
        },
        performed_by: performedBy,
      });
      // Fan out notifications to the enrolled students via the authorized
      // SECURITY DEFINER RPC (Req 15.1, 15.2). This replaces the previous bug
      // that notified only the author. Non-fatal: the announcement was created
      // successfully, so a fan-out failure is logged rather than thrown (which
      // would lose the already-created announcement).
      const { error: fanOutErr } = await supabase.rpc(
        "fan_out_announcement_notifications",
        { p_announcement_id: data.id }
      );
      if (fanOutErr)
        console.error("Announcement fan-out failed:", fanOutErr.message);
      return castAnnouncement(data as unknown as Record<string, unknown>);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.announcements.list({
          courseId: variables.course_id,
        }),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.announcements.lists(),
      });
    },
  });
};

export const useUpdateAnnouncement = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: UpdateAnnouncementInput & { performedBy: string }
    ) => {
      const { id, performedBy, ...updates } = input;
      const { data, error } = await supabase
        .from("announcements")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      await logAuditEvent({
        action: "update",
        entity_type: "announcement",
        entity_id: id,
        changes: updates,
        performed_by: performedBy,
      });
      return castAnnouncement(data as unknown as Record<string, unknown>);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.announcements.lists(),
      });
    },
  });
};

export const useDeleteAnnouncement = () => {
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
        .from("announcements")
        .delete()
        .eq("id", id);
      if (error) throw error;
      await logAuditEvent({
        action: "delete",
        entity_type: "announcement",
        entity_id: id,
        changes: null,
        performed_by: performedBy,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.announcements.lists(),
      });
    },
  });
};

// ─── Student-facing: recent announcements across enrolled courses ───────────

export const useStudentAnnouncements = (
  studentId: string | undefined,
  limit = 5,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: queryKeys.announcements.list({ studentId, limit }),
    queryFn: async () => {
      if (!studentId) return [];
      // Get enrolled course IDs
      const { data: enrollments, error: enrollErr } = await supabase
        .from("student_courses")
        .select("course_id")
        .eq("student_id", studentId)
        .eq("status", "active");
      if (enrollErr) throw enrollErr;
      const courseIds = (enrollments ?? []).map((e) => e.course_id);
      if (courseIds.length === 0) return [];
      const { data, error } = await supabase
        .from("announcements")
        .select(
          "id, course_id, author_id, title, content, is_pinned, created_at, updated_at"
        )
        .in("course_id", courseIds)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []).map((r) =>
        castAnnouncement(r as unknown as Record<string, unknown>)
      );
    },
    // Caller-overridable gate (backward-compatible): 1- and 2-arg callers pass
    // no `options`, so `options?.enabled ?? true` collapses to the prior
    // `enabled: !!studentId`. The StudentDashboard passes `{ enabled: false }`
    // on the happy path so the aggregate-hydrated cache is used without this
    // hook firing, and `{ enabled: true }` only when the aggregate errors.
    enabled: !!studentId && (options?.enabled ?? true),
  });
};

// ─── Attachments & Read Receipts (Req 15.3, 15.4) ───────────────────────────

/** Private Storage bucket for announcement attachment files. */
const ANNOUNCEMENT_ATTACHMENT_BUCKET = "announcement-attachments";

export type AnnouncementAttachment =
  Database["public"]["Tables"]["announcement_attachments"]["Row"];

export type AnnouncementRead =
  Database["public"]["Tables"]["announcement_reads"]["Row"];

/**
 * List attachments for an announcement. RLS restricts visibility to the
 * authoring teacher and enrolled students (see migration
 * 20260604140311_create_announcement_reads_and_attachments.sql).
 */
export const useAnnouncementAttachments = (
  announcementId: string | undefined
) => {
  return useQuery({
    queryKey: queryKeys.announcementAttachments.list({ announcementId }),
    queryFn: async (): Promise<AnnouncementAttachment[]> => {
      if (!announcementId) return [];
      const { data, error } = await supabase
        .from("announcement_attachments")
        .select(
          "id, announcement_id, storage_path, file_name, content_type, size_bytes, created_at"
        )
        .eq("announcement_id", announcementId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!announcementId,
  });
};

/**
 * Upload a single file to the private `announcement-attachments` bucket under
 * an `{announcement_id}/` prefix and record a metadata row. Validation (type +
 * size) happens client-side inside uploadAnnouncementAttachmentFile before any
 * network call (engineering-guardrails.md).
 */
export const useUploadAnnouncementAttachment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      announcementId,
      file,
    }: {
      announcementId: string;
      file: File;
    }): Promise<AnnouncementAttachment> => {
      const uploaded: UploadedAnnouncementAttachment =
        await uploadAnnouncementAttachmentFile({ file, announcementId });

      const { data, error } = await supabase
        .from("announcement_attachments")
        .insert({
          announcement_id: announcementId,
          storage_path: uploaded.storage_path,
          file_name: uploaded.file_name,
          content_type: uploaded.content_type,
          size_bytes: uploaded.size_bytes,
        })
        .select(
          "id, announcement_id, storage_path, file_name, content_type, size_bytes, created_at"
        )
        .single();
      if (error) throw error;
      // Audit trail: uploading an attachment is a teacher mutation on shared
      // course content, so it is recorded (domain-knowledge.md — audit logs are
      // append-only). The actor is resolved from the authenticated session so
      // call sites need not thread the id through.
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await logAuditEvent({
          action: "create",
          entity_type: "announcement_attachment",
          entity_id: data.id,
          changes: {
            announcement_id: announcementId,
            file_name: uploaded.file_name,
          },
          performed_by: user.id,
        });
      }
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.announcementAttachments.list({
          announcementId: variables.announcementId,
        }),
      });
    },
  });
};

/**
 * Create a short-lived signed URL for downloading a private attachment.
 * Reuses the shared getSignedUrl helper (the bucket is private — no public URL).
 */
export const getAnnouncementAttachmentUrl = (
  storagePath: string
): Promise<string | null> =>
  getSignedUrl(ANNOUNCEMENT_ATTACHMENT_BUCKET, storagePath);

/**
 * Mark an announcement as read for the current student. Idempotent via the
 * UNIQUE(announcement_id, student_id) constraint — repeated views upsert the
 * same row instead of erroring or duplicating (Req 15.4).
 */
export const useMarkAnnouncementRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      announcementId,
      studentId,
    }: {
      announcementId: string;
      studentId: string;
    }): Promise<void> => {
      const { error } = await supabase
        .from("announcement_reads")
        .upsert(
          { announcement_id: announcementId, student_id: studentId },
          { onConflict: "announcement_id,student_id" }
        );
      if (error) throw error;
      // Audit trail (domain-knowledge.md — audit logs are append-only). A read
      // receipt is idempotent (one row per student+announcement via the upsert
      // conflict target), so this is low-volume. The student is the actor.
      await logAuditEvent({
        action: "read",
        entity_type: "announcement_read",
        entity_id: announcementId,
        changes: { announcement_id: announcementId, student_id: studentId },
        performed_by: studentId,
      });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.announcementReads.list({
          announcementId: variables.announcementId,
        }),
      });
    },
  });
};

/**
 * Teacher-facing: read receipts for an announcement the caller authored.
 * RLS limits this to the authoring teacher.
 */
export const useAnnouncementReadReceipts = (
  announcementId: string | undefined
) => {
  return useQuery({
    queryKey: queryKeys.announcementReads.list({ announcementId }),
    queryFn: async (): Promise<AnnouncementRead[]> => {
      if (!announcementId) return [];
      const { data, error } = await supabase
        .from("announcement_reads")
        .select("id, announcement_id, student_id, read_at")
        .eq("announcement_id", announcementId)
        .order("read_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!announcementId,
  });
};
