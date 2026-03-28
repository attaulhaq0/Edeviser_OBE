// =============================================================================
// useNotificationRealtime — Realtime subscription for new notifications
// On new notification: show toast + invalidate bell count
// Validates: Requirements 31.2, 37.4, 42
// =============================================================================

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryKeys } from '@/lib/queryKeys';
import { useAuth } from '@/hooks/useAuth';
import { useRealtime } from '@/hooks/useRealtime';
import type { NotificationType } from '@/hooks/useNotifications';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

const NOTIFICATION_EMOJI: Record<NotificationType, string> = {
  grade_released: '📝',
  new_assignment: '📄',
  badge_earned: '🏆',
  streak_at_risk: '🔥',
  at_risk_alert: '⚠️',
  peer_milestone: '👥',
  perfect_day_nudge: '✨',
  prerequisite_unlocked: '🔓',
  digest: '📋',
};

/**
 * Subscribe to realtime notifications for the current user.
 * Shows a Sonner toast on each new notification and invalidates
 * the notification queries so the bell count updates instantly.
 */
export const useNotificationRealtime = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const onPayload = useCallback(
    (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
      if (payload.eventType !== 'INSERT') return;

      const row = payload.new;
      const type = (row.type as NotificationType) ?? 'grade_released';
      const title = (row.title as string) ?? 'New notification';
      const body = (row.body as string) ?? '';
      const emoji = NOTIFICATION_EMOJI[type] ?? '🔔';

      // Show toast
      toast(`${emoji} ${title}`, {
        description: body,
        duration: 5000,
      });

      // Invalidate notification queries so bell count + list refresh
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
    [queryClient],
  );

  const { isLive, retryCount } = useRealtime({
    table: 'notifications',
    event: 'INSERT',
    filter: user?.id ? `user_id=eq.${user.id}` : undefined,
    onPayload,
  });

  return { isLive, retryCount };
};
