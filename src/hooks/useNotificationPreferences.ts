// Task 94.3: Notification preferences hook
// Query/mutate profiles.notification_preferences JSONB column

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import type { Json } from '@/types/database';

export interface QuietHours {
  enabled: boolean;
  start: string; // HH:mm
  end: string;   // HH:mm
}

export interface NotificationPreferences {
  muted_courses: string[]; // course IDs
  quiet_hours: QuietHours;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  muted_courses: [],
  quiet_hours: { enabled: false, start: '22:00', end: '07:00' },
};

export const useNotificationPreferences = (userId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.notificationPreferences.detail(userId ?? ''),
    queryFn: async (): Promise<NotificationPreferences> => {
      if (!userId) return DEFAULT_PREFERENCES;

      const { data, error } = await supabase
        .from('profiles')
        .select('notification_preferences')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;

      const prefs = data?.notification_preferences as NotificationPreferences | null;
      return prefs ?? DEFAULT_PREFERENCES;
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
        .from('profiles')
        .update({ notification_preferences: preferences as unknown as Json })
        .eq('id', userId);

      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.notificationPreferences.detail(variables.userId),
      });
    },
  });
};
