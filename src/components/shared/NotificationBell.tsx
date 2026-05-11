import { useState } from "react";
import { Bell } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { NoNotifications } from "@/components/shared/EmptyState";
import { useAuth } from "@/hooks/useAuth";
import {
  useUnreadCount,
  useNotifications,
  useMarkAllAsRead,
  type Notification,
} from "@/hooks/useNotifications";
import { formatRelativeTime } from "@/lib/i18nHelpers";

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
}

const NotificationRow = ({ notification, locale }: NotificationRowProps) => (
  <div
    className={[
      "px-4 py-3 border-b border-border last:border-0",
      !notification.is_read ? "bg-blue-50/50 dark:bg-blue-950/20" : "",
    ].join(" ")}
  >
    <div className="flex items-start justify-between gap-2">
      <p className="text-sm font-medium text-foreground leading-snug">
        {notification.title}
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
  </div>
);

// ─── NotificationBell ─────────────────────────────────────────────────────────

/**
 * Notification bell button with unread badge.
 * Opens a Shadcn Popover listing notifications grouped by Today / Earlier this week / Older.
 * On open, marks all visible unread notifications as read.
 *
 * Design: ADR-18, ADR-19
 * Requirements: 2.29
 */
const NotificationBell = () => {
  const { t, i18n } = useTranslation("common");
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  const { data: unreadCount = 0 } = useUnreadCount(user?.id);
  const { data: notifications = [] } = useNotifications(user?.id);
  const markAllAsRead = useMarkAllAsRead();

  const badgeCount = unreadCount <= 99 ? unreadCount : "99+";
  const groups = groupNotifications(notifications);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && unreadCount > 0 && user?.id) {
      markAllAsRead.mutate(user.id);
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
            <button
              type="button"
              onClick={() => {
                if (user?.id) markAllAsRead.mutate(user.id);
              }}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              {t("header.markAllRead")}
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
