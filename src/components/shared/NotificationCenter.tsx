// =============================================================================
// NotificationCenter — Dropdown list of notifications
// Validates: Requirements 31.4
// =============================================================================

import { useCallback, useMemo } from 'react';
import {
  Bell,
  CheckCheck,
  Trash2,
  GraduationCap,
  FileText,
  Award,
  Flame,
  AlertTriangle,
  Users,
  Sparkles,
  Unlock,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import {
  useNotifications,
  useMarkAsRead,
  useMarkAllAsRead,
  useDeleteNotification,
} from '@/hooks/useNotifications';
import type { NotificationType } from '@/hooks/useNotifications';
import { groupNotifications, type BatchedNotification } from '@/lib/notificationBatcher';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface NotificationCenterProps {
  onClose: () => void;
}

const NOTIFICATION_ICONS: Record<NotificationType, React.ReactNode> = {
  grade_released: <GraduationCap className="h-4 w-4 text-blue-500" />,
  new_assignment: <FileText className="h-4 w-4 text-teal-500" />,
  badge_earned: <Award className="h-4 w-4 text-amber-500" />,
  streak_at_risk: <Flame className="h-4 w-4 text-red-500" />,
  at_risk_alert: <AlertTriangle className="h-4 w-4 text-orange-500" />,
  peer_milestone: <Users className="h-4 w-4 text-purple-500" />,
  perfect_day_nudge: <Sparkles className="h-4 w-4 text-green-500" />,
  prerequisite_unlocked: <Unlock className="h-4 w-4 text-indigo-500" />,
  digest: <Layers className="h-4 w-4 text-slate-500" />,
};

const NotificationCenter = ({ onClose: _onClose }: NotificationCenterProps) => {
  const { user } = useAuth();
  const { data: notifications = [], isLoading } = useNotifications(user?.id);
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const deleteNotification = useDeleteNotification();

  const hasUnread = notifications.some((n) => !n.is_read);

  // Group notifications by type when >3 of same type (Requirement 65.3)
  const groupedNotifications = useMemo(
    () => groupNotifications(notifications),
    [notifications],
  );

  const handleNotificationClick = useCallback(
    (item: BatchedNotification) => {
      // Mark all items in the group as read
      for (const n of item.items) {
        if (!n.is_read) {
          markAsRead.mutate(n.id);
        }
      }
    },
    [markAsRead],
  );

  const handleMarkAllAsRead = useCallback(() => {
    if (user?.id) {
      markAllAsRead.mutate(user.id);
    }
  }, [markAllAsRead, user]);

  const handleDelete = useCallback(
    (e: React.MouseEvent, item: BatchedNotification) => {
      e.stopPropagation();
      // Delete all items in the group
      for (const n of item.items) {
        deleteNotification.mutate(n.id);
      }
    },
    [deleteNotification],
  );

  return (
    <div className="flex flex-col max-h-96">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h3 className="text-sm font-semibold">Notifications</h3>
        {hasUnread && (
          <Button
            variant="ghost"
            size="sm"
            className="h-auto px-2 py-1 text-xs text-blue-600 hover:text-blue-700"
            onClick={handleMarkAllAsRead}
            disabled={markAllAsRead.isPending}
          >
            <CheckCheck className="h-3 w-3 me-1" />
            Mark all read
          </Button>
        )}
      </div>

      {/* Notification list */}
      <div className="overflow-y-auto flex-1">
        {isLoading ? (
          <div className="p-4 text-center text-sm text-gray-500">Loading…</div>
        ) : groupedNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 px-4">
            <Bell className="h-8 w-8 text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">No notifications yet</p>
          </div>
        ) : (
          groupedNotifications.map((item, idx) => {
            const hasUnreadItems = item.items.some((n) => !n.is_read);
            const mostRecent = item.items.length > 0 ? item.items[0] : undefined;
            const timeAgo = mostRecent
              ? formatDistanceToNow(new Date(mostRecent.created_at), { addSuffix: true })
              : '';

            return (
              <button
                key={item.is_grouped ? `group-${item.type}-${idx}` : mostRecent?.id ?? idx}
                type="button"
                className={cn(
                  'flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-slate-50 w-full text-start',
                  hasUnreadItems && 'bg-blue-50/50',
                )}
                onClick={() => handleNotificationClick(item)}
              >
                {/* Type icon */}
                <div className="mt-0.5 shrink-0">
                  {item.is_grouped ? (
                    <Layers className="h-4 w-4 text-slate-500" />
                  ) : (
                    NOTIFICATION_ICONS[item.type as NotificationType] ?? (
                      <Bell className="h-4 w-4 text-gray-400" />
                    )
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${hasUnreadItems ? 'font-semibold' : 'font-medium'} text-gray-900 truncate`}>
                    {item.title}
                  </p>
                  <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">
                    {item.body}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-1">{timeAgo}</p>
                </div>

                {/* Actions */}
                <div className="shrink-0 flex items-center gap-1">
                  {hasUnreadItems && (
                    <span className="h-2 w-2 rounded-full bg-blue-500" aria-label="Unread" />
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-gray-400 hover:text-red-500"
                    onClick={(e) => handleDelete(e, item)}
                    aria-label="Delete notification"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

export default NotificationCenter;
