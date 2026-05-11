// =============================================================================
// useNotifications — TanStack Query hooks for notification system
// Validates: Requirements 31
// =============================================================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";

// ─── Types ───────────────────────────────────────────────────────────────────

export type NotificationType =
  | "grade_released"
  | "new_assignment"
  | "badge_earned"
  | "streak_at_risk"
  | "at_risk_alert"
  | "peer_milestone"
  | "perfect_day_nudge"
  | "prerequisite_unlocked"
  | "digest";

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  is_read: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// ─── useNotifications ────────────────────────────────────────────────────────

export const useNotifications = (userId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.notifications.list({ userId }),
    queryFn: async (): Promise<Notification[]> => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from("notifications")
        .select("id, user_id, type, title, body, is_read, metadata, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data ?? []) as Notification[];
    },
    enabled: !!userId,
  });
};

// ─── useUnreadCount ──────────────────────────────────────────────────────────

export const useUnreadCount = (userId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.notifications.list({ userId, scope: "unread-count" }),
    queryFn: async (): Promise<number> => {
      if (!userId) return 0;

      const { count, error } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_read", false);

      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!userId,
  });
};

// ─── useMarkAsRead ───────────────────────────────────────────────────────────

export const useMarkAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string): Promise<void> => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
};

// ─── useMarkAllAsRead ────────────────────────────────────────────────────────

export const useMarkAllAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string): Promise<void> => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", userId)
        .eq("is_read", false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
};

// ─── useDeleteNotification ───────────────────────────────────────────────────

export const useDeleteNotification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string): Promise<void> => {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
};
