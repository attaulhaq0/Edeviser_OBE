// Task 66.1: Announcement TanStack Query hooks — CRUD for announcements within a course
// Requirements: 75
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { logAuditEvent } from "@/lib/auditLogger";

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
      // Create notification for enrolled students
      const { error: notifyErr } = await supabase.from("notifications").insert({
        user_id: payload.author_id,
        type: "announcement",
        title: `New Announcement: ${payload.title}`,
        message: payload.content.slice(0, 200),
        metadata: { course_id: payload.course_id, announcement_id: data.id },
      });
      if (notifyErr)
        console.error("Notification insert failed:", notifyErr.message);
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
  limit = 5
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
    enabled: !!studentId,
  });
};
