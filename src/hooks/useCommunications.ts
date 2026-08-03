import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";

export interface CommunicationAttachment {
  name: string;
  url: string;
}

export type CommunicationItem =
  | {
      kind: "notification";
      id: string;
      title: string;
      body: string;
      isRead: boolean;
      createdAt: string;
      deepLink?: string;
    }
  | {
      kind: "announcement";
      id: string;
      title: string;
      body: string;
      isRead: boolean;
      isPinned: boolean;
      createdAt: string;
      attachments: CommunicationAttachment[];
    };

export const useCommunications = (userId: string | undefined) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.notifications.list({ userId }),
    queryFn: async () => {
      if (!userId) return { notifications: [], announcements: [] };

      // Fetch personal notifications
      const { data: notifData, error: notifError } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (notifError) throw notifError;

      // Fetch institution & course announcements
      const { data: annData, error: annError } = await supabase
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false });

      if (annError) throw annError;

      // Fetch read tracking for this user from announcement_reads (supporting user_id or student_id)
      const { data: readData } = await supabase
        .from("announcement_reads")
        .select("announcement_id")
        .or(`student_id.eq.${userId},user_id.eq.${userId}`);

      const readAnnouncementIds = new Set(
        (readData ?? []).map((r) => r.announcement_id)
      );

      const notifications: CommunicationItem[] = (notifData ?? []).map((n) => ({
        kind: "notification",
        id: n.id,
        title: n.title ?? "Notification",
        body: n.body ?? "",
        isRead: n.is_read ?? false,
        createdAt: n.created_at,
      }));

      const announcements: CommunicationItem[] = (annData ?? []).map((a) => ({
        kind: "announcement",
        id: a.id,
        title: a.title ?? "Announcement",
        body: a.content ?? "",
        isRead: readAnnouncementIds.has(a.id),
        isPinned: a.is_pinned ?? false,
        createdAt: a.created_at,
        attachments: [],
      }));

      return { notifications, announcements };
    },
    enabled: !!userId,
  });

  const markNotificationRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });

  const markAnnouncementRead = useMutation({
    mutationFn: async (announcementId: string) => {
      if (!userId) return;
      // Multi-role user-aware insert/upsert into announcement_reads
      const payload = {
        announcement_id: announcementId,
        student_id: userId,
        user_id: userId,
      } as unknown as Record<string, unknown>;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("announcement_reads")
        .upsert(payload, { onConflict: "announcement_id,student_id" });
      if (error) {
        // Fallback for schemas with strict FK to students table
        await supabase.from("announcement_reads").insert({
          announcement_id: announcementId,
          student_id: userId,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.announcements.all });
    },
  });

  return {
    ...query,
    markNotificationRead: markNotificationRead.mutate,
    markAnnouncementRead: markAnnouncementRead.mutate,
  };
};
