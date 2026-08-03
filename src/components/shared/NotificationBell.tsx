import { useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { NoNotifications } from "@/components/shared/EmptyState";
import { useAuth } from "@/hooks/useAuth";
import { useNotificationRealtime } from "@/hooks/useNotificationRealtime";
import {
  useUnreadCount,
  useNotifications,
  useMarkAsRead,
  useMarkAllAsRead,
  type Notification,
} from "@/hooks/useNotifications";
import { formatRelativeTime } from "@/lib/i18nHelpers";
import { formatNotificationTitle } from "@/lib/notificationPresentation";

// ─── Date grouping helpers ────────────────────────────────────────────────────

type NotificationGroup = "today" | "earlierThisWeek" | "older";

const getGroup = (dateStr: string): NotificationGroup => {
  const now = new Date();
  const date = new Date(dateStr);

  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());

  if (date >= startOfToday) return "today";
  if (date >= startOfWeek) return "earlierThisWeek";
  return "older";
};

const groupNotifications = (
  notifications: Notification[]
): Record<NotificationGroup, Notification[]> => {
  const groups: Record<NotificationGroup, Notification[]> = {
    today: [],
    earlierThisWeek: [],
    older: [],
  };
  for (const n of notifications) {
    groups[getGroup(n.created_at)].push(n);
  }
  return groups;
};

// ─── Relative time helper ─────────────────────────────────────────────────────

const getRelativeTime = (dateStr: string, locale: string): string => {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = date.getTime() - now.getTime();
  const diffMinutes = Math.round(diffMs / 60_000);
  const diffHours = Math.round(diffMs / 3_600_000);
  const diffDays = Math.round(diffMs / 86_400_000);

  const safeLocale = locale.startsWith("ar") ? "ar-QA" : "en";

  if (Math.abs(diffMinutes) < 60) {
    return formatRelativeTime(diffMinutes, "minute", safeLocale);
  }
  if (Math.abs(diffHours) < 24) {
    return formatRelativeTime(diffHours, "hour", safeLocale);
  }
  return formatRelativeTime(diffDays, "day", safeLocale);
};

// ─── NotificationRow ─────────────────────────────────────────────────────────

interface NotificationRowProps {
  notification: Notification;
  locale: string;
  onSelect: (notification: Notification) => void;
}

const NotificationRow = ({
  notification,
  locale,
  onSelect,
}: NotificationRowProps) => (
  <Button
    type="button"
    variant="ghost"
    onClick={() => onSelect(notification)}
    className={[
      "h-auto w-full justify-start rounded-none border-b border-border px-4 py-3 text-start last:border-0",
      "hover:bg-muted/70 focus-visible:relative focus-visible:z-10",
      !notification.is_read ? "bg-blue-50/50 dark:bg-blue-950/20" : "",
    ].join(" ")}
  >
    <div className="flex items-start justify-between gap-2">
      <p className="text-sm font-medium text-foreground leading-snug">
        {formatNotificationTitle(notification.title)}
      </p>
      <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
        {getRelativeTime(notification.created_at, locale)}
      </span>
    </div>
    {notification.body && (
      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
        {notification.body}
      </p>
    )}
  </Button>
);

// ─── NotificationBell ─────────────────────────────────────────────────────────

/**
 * Notification bell button with unread badge.
 * Opens a Shadcn Popover listing real notifications grouped by recency.
 * Each notification can be acknowledged independently; the panel also exposes
 * an explicit mark-all action and a role-aware full-feed route.
 *
 * Design: ADR-18, ADR-19
 * Requirements: 2.29
 */
const NotificationBell = () => {
  const { t, i18n } = useTranslation("common");
  const { user, role } = useAuth();
  const [open, setOpen] = useState(false);

  // Mount the realtime subscription so the bell updates live (toast + count
  // invalidation on each new notification). Centralized via useRealtime.
  useNotificationRealtime();

  const { data: unreadCount = 0 } = useUnreadCount(user?.id);
  const { data: notifications = [] } = useNotifications(user?.id);
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const badgeCount = unreadCount <= 99 ? unreadCount : "99+";
  const groups = groupNotifications(notifications);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
  };

  const handleNotificationSelect = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead.mutate(notification.id);
    }
  };

  const groupLabels: Record<NotificationGroup, string> = {
    today: t("header.groupLabel.today"),
    earlierThisWeek: t("header.groupLabel.earlierThisWeek"),
    older: t("header.groupLabel.older"),
  };

  const groupOrder: NotificationGroup[] = ["today", "earlierThisWeek", "older"];

  // Compose aria-label: "Notifications" when 0, "Notifications, N unread" when > 0
  // Use a direct string fallback so the aria-label is always human-readable
  const notificationsLabel = t("header.notificationsLabel") || "Notifications";
  const bellAriaLabel =
    unreadCount > 0
      ? `${notificationsLabel}, ${unreadCount} unread`
      : notificationsLabel;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="relative"
          aria-label={bellAriaLabel}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span
              aria-live="polite"
              aria-label={t("header.unreadCount", { count: unreadCount })}
              className="absolute -top-0.5 -end-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white leading-none"
            >
              {badgeCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-[380px] max-h-[480px] p-0 flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            {t("header.notificationsLabel")}
          </h3>
          {unreadCount > 0 && user?.id ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-primary"
              onClick={() => markAllAsRead.mutate(user.id)}
              disabled={markAllAsRead.isPending}
            >
              <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
              {t("header.markAllRead")}
            </Button>
          ) : null}
        </div>

        {/* Notification list */}
        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <NoNotifications className="py-8" />
          ) : (
            groupOrder.map((group) => {
              const items = groups[group];
              if (items.length === 0) return null;
              return (
                <div key={group}>
                  <div className="px-4 py-2 bg-muted/50">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {groupLabels[group]}
                    </p>
                  </div>
                  {items.map((n) => (
                    <NotificationRow
                      key={n.id}
                      notification={n}
                      locale={i18n.language}
                      onSelect={handleNotificationSelect}
                    />
                  ))}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="px-4 py-3 border-t border-border">
            <Button
              asChild
              variant="ghost"
              className="h-auto w-full justify-center px-0 py-0 text-xs font-semibold text-primary"
            >
              <a
                href={`/${role ?? "student"}/notifications`}
                onClick={() => setOpen(false)}
              >
                {t("header.seeAllNotifications", "View all →")}
              </a>
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
