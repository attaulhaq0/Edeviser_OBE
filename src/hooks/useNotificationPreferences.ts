// Task 94.3: Notification preferences hook
// Query/mutate profiles.notification_preferences JSONB column
// T30 consolidation: parsing + types live in `@/lib/notificationPrefs`
// (live-matching full shape, tolerant, sibling-key preserving).

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import type { Json } from "@/types/database";
import {
  parseNotificationPrefs,
  DEFAULT_NOTIFICATION_PREFS,
  type NotificationPrefs,
} from "@/lib/notificationPrefs";

// Historical name kept for existing consumers (shared prefs page, coordinator
// settings) — NotificationPrefs is a superset of the old partial shape.
export type NotificationPreferences = NotificationPrefs;

export const useNotificationPreferences = (userId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.notificationPreferences.detail(userId ?? ""),
    queryFn: async (): Promise<NotificationPreferences> => {
      if (!userId) return DEFAULT_NOTIFICATION_PREFS;

      const { data, error } = await supabase
        .from("profiles")
        .select("notification_preferences")
        .eq("id", userId)
        .maybeSingle();

      if (error) throw error;

      // T30: tolerant parse via the pure helpers — malformed/legacy jsonb
      // falls back per-field instead of an unchecked cast.
      return parseNotificationPrefs(data?.notification_preferences);
    },
    enabled: !!userId,
  });
};

export const useUpdateNotificationPreferences = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      preferences,
    }: {
      userId: string;
      preferences: NotificationPreferences;
    }): Promise<void> => {
      const { error } = await supabase
        .from("profiles")
        .update({ notification_preferences: preferences as unknown as Json })
        .eq("id", userId);

      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.notificationPreferences.detail(variables.userId),
      });
    },
  });
};
