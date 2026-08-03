import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowRight,
  Calendar,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ListTodo,
  Lock,
  Plus,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useCalendarEvents, type CalendarEvent } from "@/hooks/useCalendar";
import { useAuth } from "@/hooks/useAuth";
import { useTimetableSlots } from "@/hooks/useTimetable";
import { useWeeklyPlannerData } from "@/hooks/useWeeklyPlanner";
import { dedupeCalendarEvents } from "@/lib/calendarDeadlines";
import { Shimmer } from "@/design-system";
import ErrorState from "@/components/shared/ErrorState";
import type { PlannerTask } from "@/types/planner";

type ViewMode = "monthly" | "weekly";

const getWeekStart = (date: Date): string => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());
  return start.toISOString().slice(0, 10);
};

const formatTime = (value: string): string => value.slice(0, 5);

const taskColor: Record<PlannerTask["priority"], string> = {
  high: "bg-amber-500",
  medium: "bg-blue-500",
  low: "bg-slate-400",
};

interface CalendarRailProps {
  events: CalendarEvent[];
  slots: ReturnType<typeof useTimetableSlots>["data"];
  planner: ReturnType<typeof useWeeklyPlannerData>;
  role: string | null | undefined;
  now: Date;
  t: TFunction;
}

const CalendarRail = ({
  events,
  slots,
  planner,
  role,
  now,
  t,
}: CalendarRailProps) => {
  const upcoming = events
    .filter(
      (event) =>
        (event.type === "assignment" || event.type === "quiz") &&
        new Date(event.date).getTime() >= now.getTime()
    )
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3);
  const todaySlots = (slots ?? []).filter(
    (slot) => slot.day_of_week === now.getDay()
  );
  const tasks = planner.tasks.slice(0, 3);

  return (
    <aside className="space-y-4 lg:sticky lg:top-6">
      <Card className="gap-0 p-4">
        <div className="mb-3 flex items-center gap-2">
          <CalendarClock className="size-4 text-teal-600" aria-hidden="true" />
          <h2 className="text-sm font-black text-slate-900">
            {t("calendar.todayClasses", "Today’s classes")}
          </h2>
        </div>
        {todaySlots.length === 0 ? (
          <p className="text-xs text-slate-500">
            {t("calendar.noClasses", "No classes scheduled today")}
          </p>
        ) : (
          <div className="space-y-2">
            {todaySlots.slice(0, 4).map((slot) => (
              <div
                key={slot.id}
                className="flex items-center gap-3 rounded-xl border-s-4 border-blue-500 bg-slate-50 p-2.5"
              >
                <div className="w-12 shrink-0 text-center">
                  <p className="text-xs font-black text-slate-900">
                    {formatTime(slot.start_time)}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {formatTime(slot.end_time)}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900">
                    {slot.course_name ||
                      slot.section_code ||
                      t("calendar.class", "Class")}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {slot.slot_type}
                    {slot.room ? ` · ${slot.room}` : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="gap-0 p-4">
        <div className="mb-2 flex items-center gap-2">
          <Clock3 className="size-4 text-amber-600" aria-hidden="true" />
          <h2 className="text-sm font-black text-slate-900">
            {t("calendar.upcomingDeadlines", "Upcoming deadlines")}
          </h2>
        </div>
        {upcoming.length === 0 ? (
          <p className="text-xs text-slate-500">
            {t("calendar.noDeadlines", "No upcoming deadlines")}
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {upcoming.map((event) => (
              <div
                key={`${event.type}-${event.id}`}
                className="flex items-center gap-3 py-2"
              >
                <span className="text-base" aria-hidden="true">
                  {event.type === "quiz" ? "🧪" : "📝"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {event.title}
                  </p>
                  <p className="truncate text-[11px] text-slate-500">
                    {event.course_name ?? ""}
                  </p>
                </div>
                <time
                  className="shrink-0 text-[10px] font-bold text-slate-500"
                  dateTime={event.date}
                >
                  {new Intl.DateTimeFormat(undefined, {
                    month: "short",
                    day: "numeric",
                  }).format(new Date(event.date))}
                </time>
              </div>
            ))}
          </div>
        )}
      </Card>

      {role === "student" && (
        <Card className="gap-0 p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ListTodo className="size-4 text-teal-600" aria-hidden="true" />
              <h2 className="text-sm font-black text-slate-900">
                {t("calendar.myTasks", "My tasks")}
              </h2>
            </div>
            <span className="text-[10px] font-bold text-slate-400">+10 XP</span>
          </div>
          {planner.isError ? (
            <p className="text-xs text-red-600">
              {t("calendar.tasksError", "Tasks could not be loaded")}
            </p>
          ) : tasks.length === 0 ? (
            <p className="text-xs text-slate-500">
              {t("calendar.noTasks", "No tasks this week")}
            </p>
          ) : (
            <div className="space-y-2">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-2 text-sm text-slate-700"
                >
                  <span
                    className={`size-2 shrink-0 rounded-full ${
                      taskColor[task.priority]
                    }`}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 truncate">{task.title}</span>
                </div>
              ))}
            </div>
          )}
          <Button asChild variant="outline" size="sm" className="mt-3 w-full">
            <Link to="/student/planner">
              <Plus className="size-3.5" />
              {t("calendar.addTask", "Add task")}
              <ArrowRight className="ms-auto size-3.5" />
            </Link>
          </Button>
        </Card>
      )}

      <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
        <Lock
          className="mt-0.5 size-3.5 shrink-0 text-slate-400"
          aria-hidden="true"
        />
        <p className="text-[11px] leading-relaxed text-slate-500">
          {t(
            "calendar.readOnlyNotice",
            "This calendar is read-only. Use Planner and Today to edit tasks."
          )}
        </p>
      </div>
    </aside>
  );
};

const CalendarView = () => {
  const { t, i18n } = useTranslation("common");
  const { user, role } = useAuth();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [viewMode, setViewMode] = useState<ViewMode>("monthly");
  const [selectedWeekStart, setSelectedWeekStart] = useState<Date>(() => {
    const d = new Date(now);
    d.setDate(d.getDate() - d.getDay());
    return d;
  });

  const {
    data: rawEvents = [],
    isLoading,
    isError,
    refetch,
  } = useCalendarEvents(month, year);
  const { data: timetableSlots = [] } = useTimetableSlots();
  const planner = useWeeklyPlannerData(
    role === "student" ? user?.id : undefined,
    getWeekStart(now)
  );

  // R21.4: present a deadline consistently across surfaces — a single logical
  // deadline must never be listed twice even if it arrives from more than one
  // source. Dedup is pure and lives in `src/lib/calendarDeadlines.ts`.
  const events = useMemo(() => dedupeCalendarEvents(rawEvents), [rawEvents]);

  const locale = i18n.language === "ar" ? "ar" : "en-US";
  const dayShortLabels = useMemo(
    () => [0, 1, 2, 3, 4, 5, 6].map((d) => t(`calendar.daysShort.${d}`)),
    [t]
  );

  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();

  const prev = () => {
    if (viewMode === "monthly") {
      if (month === 1) {
        setMonth(12);
        setYear(year - 1);
      } else setMonth(month - 1);
    } else {
      const d = new Date(selectedWeekStart);
      d.setDate(d.getDate() - 7);
      setSelectedWeekStart(d);
      // Sync month/year if week crosses month boundary
      setMonth(d.getMonth() + 1);
      setYear(d.getFullYear());
    }
  };

  const next = () => {
    if (viewMode === "monthly") {
      if (month === 12) {
        setMonth(1);
        setYear(year + 1);
      } else setMonth(month + 1);
    } else {
      const d = new Date(selectedWeekStart);
      d.setDate(d.getDate() + 7);
      setSelectedWeekStart(d);
      setMonth(d.getMonth() + 1);
      setYear(d.getFullYear());
    }
  };

  const eventsForDay = (day: number): CalendarEvent[] => {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(
      day
    ).padStart(2, "0")}`;
    return events.filter((e) => e.date?.startsWith(dateStr));
  };

  const eventsForDate = (date: Date): CalendarEvent[] => {
    const y = date.getFullYear();
    const m = date.getMonth() + 1;
    const d = date.getDate();
    const dateStr = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(
      2,
      "0"
    )}`;
    return events.filter((e) => e.date?.startsWith(dateStr));
  };

  // Week days for weekly view
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(selectedWeekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [selectedWeekStart]);

  const headerLabel =
    viewMode === "monthly"
      ? new Date(year, month - 1, 1).toLocaleDateString(locale, {
          month: "long",
          year: "numeric",
        })
      : `${
          weekDays[0]?.toLocaleDateString(locale, {
            month: "short",
            day: "numeric",
          }) ?? ""
        } – ${
          weekDays[6]?.toLocaleDateString(locale, {
            month: "short",
            day: "numeric",
            year: "numeric",
          }) ?? ""
        }`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("calendar.title")}
          </h1>
          <p className="text-sm text-gray-500">{t("calendar.subtitle")}</p>
        </div>
        <Tabs
          value={viewMode}
          onValueChange={(v) => setViewMode(v as ViewMode)}
        >
          <TabsList className="gap-2 rounded-xl">
            <TabsTrigger value="monthly" className="rounded-xl text-xs">
              {t("calendar.monthly")}
            </TabsTrigger>
            <TabsTrigger value="weekly" className="rounded-xl text-xs">
              {t("calendar.weekly")}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_336px]">
        <div className="min-w-0 space-y-6">
          <Card className="overflow-hidden rounded-xl border-0 bg-white py-0 shadow-md">
            <div
              className="px-6 py-4 flex items-center justify-between"
              style={{
                background: "var(--brand-gradient)",
              }}
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={prev}
                className="text-white hover:bg-white/20"
                aria-label={t("calendar.previous")}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2 text-white">
                <Calendar className="h-5 w-5" />
                <span className="text-lg font-bold tracking-tight">
                  {headerLabel}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={next}
                className="text-white hover:bg-white/20"
                aria-label={t("calendar.next")}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>

            <div className="p-4">
              {isLoading ? (
                <Shimmer className="h-64 rounded-lg" />
              ) : isError ? (
                <ErrorState
                  message={t("errors.generic")}
                  onRetry={() => void refetch()}
                  retryLabel={t("buttons.retry")}
                />
              ) : viewMode === "monthly" ? (
                <>
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {dayShortLabels.map((d, i) => (
                      <div
                        key={i}
                        className="text-center text-xs font-bold text-slate-500 py-1"
                      >
                        {d}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: firstDay }).map((_, i) => (
                      <div key={`empty-${i}`} className="h-20" />
                    ))}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                      const day = i + 1;
                      const dayEvents = eventsForDay(day);
                      const isToday =
                        day === now.getDate() &&
                        month === now.getMonth() + 1 &&
                        year === now.getFullYear();
                      return (
                        <div
                          key={day}
                          className={`h-20 rounded-lg border p-1 text-xs ${
                            isToday
                              ? "border-blue-500 bg-blue-50"
                              : "border-slate-100 hover:bg-slate-50"
                          }`}
                        >
                          <span
                            className={`font-semibold ${
                              isToday ? "text-blue-600" : "text-slate-700"
                            }`}
                          >
                            {day}
                          </span>
                          <div className="mt-0.5 space-y-0.5 overflow-hidden">
                            {dayEvents.slice(0, 2).map((e) => (
                              <Badge
                                key={e.id}
                                variant="outline"
                                className="text-[9px] px-1 py-0 truncate block"
                                style={{ borderColor: e.color, color: e.color }}
                              >
                                {e.title}
                              </Badge>
                            ))}
                            {dayEvents.length > 2 && (
                              <span className="text-[9px] text-slate-400">
                                {t("calendar.moreEvents", {
                                  n: dayEvents.length - 2,
                                })}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                /* Weekly View */
                <div className="space-y-2">
                  <div className="grid grid-cols-7 gap-2">
                    {weekDays.map((date, i) => {
                      const dayEvents = eventsForDate(date);
                      const isToday =
                        date.toDateString() === now.toDateString();
                      return (
                        <div key={i} className="space-y-1">
                          <div
                            className={`text-center text-xs font-bold py-1 rounded-lg ${
                              isToday
                                ? "bg-blue-500 text-white"
                                : "text-slate-500"
                            }`}
                          >
                            <div>{dayShortLabels[date.getDay()]}</div>
                            <div className="text-lg font-black">
                              {date.getDate()}
                            </div>
                          </div>
                          <div className="space-y-1 min-h-[120px]">
                            {dayEvents.map((e) => (
                              <div
                                key={e.id}
                                className="rounded-lg border p-1.5 text-xs"
                                style={{
                                  borderColor: e.color,
                                  backgroundColor: `${e.color}10`,
                                }}
                              >
                                <p
                                  className="font-medium truncate"
                                  style={{ color: e.color }}
                                >
                                  {e.title}
                                </p>
                                {e.course_name && (
                                  <p className="text-[9px] text-slate-500 truncate">
                                    {e.course_name}
                                  </p>
                                )}
                              </div>
                            ))}
                            {dayEvents.length === 0 && (
                              <div className="text-[9px] text-slate-300 text-center pt-4">
                                {t("calendar.noEvents")}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
        <CalendarRail
          events={events}
          slots={timetableSlots}
          planner={planner}
          role={role}
          now={now}
          t={t}
        />
      </div>
    </div>
  );
};

export default CalendarView;
