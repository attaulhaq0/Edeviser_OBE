// =============================================================================
// NotificationCenter — Dropdown list of notifications
// Validates: Requirements 31.4
// =============================================================================

import { useCallback } from 'react';
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
import { formatDistanceToNow } from 'date-fns';

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
};

const NotificationCenter = ({ onClose: _onClose }: NotificationCenterProps) => {
  const { user } = useAuth();
  const { data: notifications = [], isLoading } = useNotifications(user?.id);
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const deleteNotification = useDeleteNotification();

  const hasUnread = notifications.some((n) => !n.is_read);

  const handleNotificationClick = useCallback(
    (notificationId: string, isRead: boolean) => {
      if (!isRead) {
        markAsRead.mutate(notificationId);
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
    (e: React.MouseEvent, notificationId: string) => {
      e.stopPropagation();
      deleteNotification.mutate(notificationId);
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
            <CheckCheck className="h-3 w-3 mr-1" />
            Mark all read
          </Button>
        )}
      </div>

      {/* Notification list */}
      <div className="overflow-y-auto flex-1">
        {isLoading ? (
          <div className="p-4 text-center text-sm text-gray-500">Loading…</div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 px-4">
            <Bell className="h-8 w-8 text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">No notifications yet</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              role="button"
              tabIndex={0}
              className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-slate-50 ${
                !notification.is_read ? 'bg-blue-50/50' : ''
              }`}
              onClick={() => handleNotificationClick(notification.id, notification.is_read)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleNotificationClick(notification.id, notification.is_read);
                }
              }}
            >
              {/* Type icon */}
              <div className="mt-0.5 shrink-0">
                {NOTIFICATION_ICONS[notification.type] ?? (
                  <Bell className="h-4 w-4 text-gray-400" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${!notification.is_read ? 'font-semibold' : 'font-medium'} text-gray-900 truncate`}>
                  {notification.title}
                </p>
                <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">
                  {notification.body}
                </p>
                <p className="text-[10px] text-gray-400 mt-1">
                  {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                </p>
              </div>

              {/* Actions */}
              <div className="shrink-0 flex items-center gap-1">
                {!notification.is_read && (
                  <span className="h-2 w-2 rounded-full bg-blue-500" aria-label="Unread" />
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-gray-400 hover:text-red-500"
                  onClick={(e) => handleDelete(e, notification.id)}
                  aria-label="Delete notification"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationCenter;
