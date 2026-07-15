// =============================================================================
// NotificationsFeedPage — full-page "see all" notifications (net-new screen)
// =============================================================================
// Built from the prototype design system (`@/design-system`): PageHeader (with a
// mark-all action) + SectionCard + StatePanel + Button. Reuses the existing
// notification hooks. The bell dropdown (`NotificationCenter`) is the preview;
// this is the full feed. Cross-cutting; routed under the student layout.
// =============================================================================

import { useTranslation } from "react-i18next";
import { formatDistanceToNow } from "date-fns";
import {
  AlertTriangle,
  Award,
  Bell,
  CheckCheck,
  FileText,
  Flame,
  GraduationCap,
  Layers,
  Sparkles,
  Trash2,
  Unlock,
  Users,
  type LucideIcon,
} from "lucide-react";

import { Button, PageHeader, SectionCard, StatePanel } from "@/design-system";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import {
  useNotifications,
  useMarkAsRead,
  useMarkAllAsRead,
  useDeleteNotification,
  type NotificationType,
} from "@/hooks/useNotifications";

const TYPE_ICON: Partial<Record<NotificationType, LucideIcon>> = {
  grade_released: GraduationCap,
  new_assignment: FileText,
  badge_earned: Award,
  streak_at_risk: Flame,
  at_risk_alert: AlertTriangle,
  peer_milestone: Users,
  perfect_day_nudge: Sparkles,
  prerequisite_unlocked: Unlock,
  digest: Layers,
};

const NotificationsFeedPage = () => {
  const { t } = useTranslation("common");
  const { user } = useAuth();
  const { data: notifications, isLoading, isError } = useNotifications(user?.id);
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const deleteNotification = useDeleteNotification();

  const titleText = t("notificationsFeed.title", "Notifications");

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title={titleText} />
        <StatePanel variant="loading" />
      </div>
    );
  }

  if (isError || !notifications) {
    return (
      <div className="space-y-6">
        <PageHeader title={titleText} />
        <StatePanel
          variant="error"
          message={t(
            "notificationsFeed.error",
            "Could not load notifications. Please try again."
          )}
        />
      </div>
    );
  }

  const hasUnread = notifications.some((n) => !n.is_read);
  const markAllAction = hasUnread ? (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="text-blue-600 hover:text-blue-700"
      onClick={() => user?.id && markAllAsRead.mutate(user.id)}
      disabled={markAllAsRead.isPending}
      data-testid="notif-mark-all"
    >
      <CheckCheck className="h-4 w-4" aria-hidden="true" />
      {t("notificationsFeed.markAll", "Mark all read")}
    </Button>
  ) : undefined;

  return (
    <div className="space-y-6">
      <PageHeader title={titleText} action={markAllAction} />

      <SectionCard icon={Bell} title={t("notificationsFeed.recent", "Recent")}>
        {notifications.length === 0 ? (
          <p className="py-3 text-sm text-gray-500">
            {t("notificationsFeed.empty", "No notifications yet.")}
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {notifications.map((n) => {
              const Icon = TYPE_ICON[n.type] ?? Bell;
              return (
                <li key={n.id} className="flex items-start gap-3 py-3">
                  <button
                    type="button"
                    onClick={() => !n.is_read && markAsRead.mutate(n.id)}
                    className={cn(
                      "flex flex-1 items-start gap-3 text-start",
                      !n.is_read && "cursor-pointer"
                    )}
                    data-testid={`notif-${n.id}`}
                  >
                    <span
                      className="mt-0.5 shrink-0 text-gray-500"
                      aria-hidden="true"
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "block truncate text-sm text-gray-900",
                          n.is_read ? "font-medium" : "font-bold"
                        )}
                      >
                        {n.title}
                      </span>
                      {n.body && (
                        <span className="mt-0.5 block line-clamp-2 text-xs text-gray-500">
                          {n.body}
                        </span>
                      )}
                      <span className="mt-1 block text-[10px] text-gray-400">
                        {formatDistanceToNow(new Date(n.created_at), {
                          addSuffix: true,
                        })}
                      </span>
                    </span>
                    {!n.is_read && (
                      <span
                        className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-500"
                        aria-label={t("notificationsFeed.unread", "Unread")}
                      />
                    )}
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 text-gray-400 hover:text-red-500"
                    onClick={() => deleteNotification.mutate(n.id)}
                    aria-label={t("notificationsFeed.delete", "Delete notification")}
                    data-testid={`notif-delete-${n.id}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>
    </div>
  );
};

export default NotificationsFeedPage;
