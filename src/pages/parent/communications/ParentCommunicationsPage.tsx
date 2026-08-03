import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Bell, Megaphone, CheckCircle2, Pin, Paperclip } from "lucide-react";

import { PCard, StatePanel } from "@/design-system";
import { ParentButton } from "@/components/shared/ParentButton";
import { ParentSectionIcon } from "@/components/shared/ParentSectionIcon";
import { useAuth } from "@/hooks/useAuth";
import {
  useCommunications,
  type CommunicationAttachment,
} from "@/hooks/useCommunications";
import { cn } from "@/lib/utils";

const ParentCommunicationsPage = () => {
  const { t } = useTranslation("common");
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab =
    searchParams.get("tab") === "announcements"
      ? "announcements"
      : "notifications";

  const { data, isLoading, isError, markNotificationRead } = useCommunications(
    user?.id
  );

  const notifications = useMemo(() => data?.notifications ?? [], [data]);
  const announcements = useMemo(() => data?.announcements ?? [], [data]);

  const setTab = (tab: "notifications" | "announcements") => {
    setSearchParams({ tab });
  };

  return (
    <div className="space-y-5 no-scrollbar">
      {/* ── Page Heading ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            {t("communications.title", "Communications & Updates")}
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            {t(
              "communications.subtitle",
              "Stay updated on your child's learning journey and school announcements."
            )}
          </p>
        </div>

        {/* Segmented Tab Switcher */}
        <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-900">
          <button
            type="button"
            onClick={() => setTab("notifications")}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all",
              activeTab === "notifications"
                ? "bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
            )}
          >
            <Bell className="h-3.5 w-3.5" aria-hidden="true" />
            {t("communications.notificationsTab", "Notifications")}
            {notifications.filter((n) => !n.isRead).length > 0 && (
              <span className="rounded-full bg-blue-600 px-1.5 py-0.2 text-[10px] font-black text-white">
                {notifications.filter((n) => !n.isRead).length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setTab("announcements")}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all",
              activeTab === "announcements"
                ? "bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
            )}
          >
            <Megaphone className="h-3.5 w-3.5" aria-hidden="true" />
            {t("communications.announcementsTab", "Announcements")}
          </button>
        </div>
      </div>

      {/* ── Tab Content ── */}
      {isLoading ? (
        <StatePanel variant="loading" />
      ) : isError ? (
        <StatePanel
          variant="error"
          message={t("communications.error", "Could not load updates.")}
        />
      ) : activeTab === "notifications" ? (
        <PCard className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ParentSectionIcon emoji="🔔" />
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                {t("communications.personalAlerts", "Personal Alerts")}
              </h2>
            </div>
          </div>

          {notifications.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              {t(
                "communications.noNotifications",
                "No notifications at this time."
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {notifications.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "flex items-start justify-between gap-3 py-3 transition-colors",
                    !item.isRead &&
                      "bg-blue-50/40 -mx-5 px-5 dark:bg-blue-950/20"
                  )}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="text-lg shrink-0 mt-0.5">
                      {!item.isRead ? "🔵" : "⚪"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {item.title}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                        {item.body}
                      </p>
                      <p className="mt-1 text-[10px] text-slate-400">
                        {new Date(item.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {!item.isRead && (
                    <ParentButton
                      variant="ghost"
                      size="sm"
                      onClick={() => markNotificationRead(item.id)}
                      className="shrink-0 text-xs"
                    >
                      <CheckCircle2
                        className="h-3.5 w-3.5 text-emerald-600"
                        aria-hidden="true"
                      />
                      Mark read
                    </ParentButton>
                  )}
                </div>
              ))}
            </div>
          )}
        </PCard>
      ) : (
        <PCard className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <ParentSectionIcon emoji="📣" />
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100">
              {t(
                "communications.schoolAnnouncements",
                "School & Course Announcements"
              )}
            </h2>
          </div>

          {announcements.length === 0 ? (
            <StatePanel
              variant="empty"
              message={t(
                "communications.noAnnouncements",
                "No announcements are available for your linked children."
              )}
            />
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {announcements.map((item) => {
                if (item.kind !== "announcement") return null;
                return (
                  <div key={item.id} className="py-4 first:pt-0 space-y-1">
                    <div className="flex items-center gap-2">
                      {item.isPinned && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-extrabold text-amber-700 border border-amber-200">
                          <Pin className="h-3 w-3" aria-hidden="true" /> Pinned
                        </span>
                      )}
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {item.title}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      {item.body}
                    </p>
                    {item.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {item.attachments.map(
                          (att: CommunicationAttachment) => (
                            <a
                              key={att.url}
                              href={att.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-bold text-sky-700 hover:underline"
                            >
                              <Paperclip
                                className="h-3 w-3"
                                aria-hidden="true"
                              />
                              {att.name}
                            </a>
                          )
                        )}
                      </div>
                    )}
                    <p className="text-[10px] text-slate-400 pt-0.5">
                      {new Date(item.createdAt).toLocaleString()}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </PCard>
      )}
    </div>
  );
};

export default ParentCommunicationsPage;
