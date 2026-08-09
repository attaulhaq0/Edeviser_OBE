import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  AlarmClock,
  ArrowRight,
  CalendarClock,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  FileText,
  Plus,
  FlaskConical,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCalendarEvents, type CalendarEvent } from "@/hooks/useCalendar";
import { useAuth } from "@/hooks/useAuth";
import { useTimetableSlots } from "@/hooks/useTimetable";
import { useWeeklyPlannerData } from "@/hooks/useWeeklyPlanner";
import { dedupeCalendarEvents } from "@/lib/calendarDeadlines";
import { getDeadlineUrgency } from "@/lib/plannerUtils";
import { Shimmer } from "@/design-system";
import ErrorState from "@/components/shared/ErrorState";
import type { PlannerTask } from "@/types/planner";

type CalendarMode = "month" | "agenda";

const CHIP_COLORS: Record<string, string> = {
  assignment: "#3b82f6",
  quiz: "#8b5cf6",
  class_session: "#14b8a6",
  academic: "#f59e0b",
};

const LEGEND = [
  ["assignment", "Assignment", "#3b82f6"],
  ["quiz", "Quiz", "#8b5cf6"],
  ["class", "Class", "#14b8a6"],
  ["academic", "Academic", "#f59e0b"],
  ["task", "My task", "#22c55e"],
] as const;

const getWeekStart = (date: Date): string => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());
  return start.toISOString().slice(0, 10);
};

const dateKey = (value: Date | string): string => {
  if (typeof value === "string") return value.slice(0, 10);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatTime = (value: string): string => value.slice(0, 5);

const formatDeadline = (value: string, now: Date, locale: string): string => {
  const date = new Date(value);
  if (dateKey(date) === dateKey(now)) {
    return date.getHours() > 0
      ? `Today ${new Intl.DateTimeFormat(locale, {
          hour: "numeric",
          minute: "2-digit",
        }).format(date)}`
      : "Today";
  }
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
  }).format(date);
};

const eventColor = (event: CalendarEvent): string =>
  event.color ?? CHIP_COLORS[event.type ?? ""] ?? "#22c55e";

const taskColor: Record<PlannerTask["priority"], string> = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#94a3b8",
};

interface CalendarRailProps {
  events: CalendarEvent[];
  slots: ReturnType<typeof useTimetableSlots>["data"];
  planner: ReturnType<typeof useWeeklyPlannerData>;
  role: string | null | undefined;
  now: Date;
  locale: string;
  t: ReturnType<typeof useTranslation>["t"];
}

const RailHeader = ({
  icon,
  title,
  right,
}: {
  icon: React.ReactNode;
  title: string;
  right?: string;
}) => (
  <div className="mb-3 flex items-center gap-2">
    <span className="grid size-6 place-items-center rounded-lg border border-sky-100 bg-sky-50 text-sky-700">
      {icon}
    </span>
    <h2 className="min-w-0 flex-1 text-[12px] font-black text-slate-900">
      {title}
    </h2>
    {right ? (
      <span className="shrink-0 text-[10px] font-extrabold text-sky-700">
        {right}
      </span>
    ) : null}
  </div>
);

const CalendarRail = ({
  events,
  slots,
  planner,
  role,
  now,
  locale,
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
  const todaySlots = (slots ?? [])
    .filter((slot) => slot.day_of_week === now.getDay())
    .slice(0, 4);
  const tasks = planner.tasks.slice(0, 3);
  const todayLabel = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(now);

  return (
    <aside className="min-w-0 space-y-4" aria-label="Calendar details">
      <Card className="rounded-2xl border-slate-200 p-4 shadow-sm">
        <RailHeader
          icon={<CalendarClock className="size-3.5" aria-hidden="true" />}
          title={`${t("calendar.today", "Today")} · ${todayLabel}`}
        />
        {todaySlots.length === 0 ? (
          <p className="text-xs text-slate-500">
            {t("calendar.noClasses", "No classes scheduled today")}
          </p>
        ) : (
          <div className="space-y-2">
            {todaySlots.map((slot, index) => {
              const border = ["#3b82f6", "#14b8a6", "#8b5cf6", "#f59e0b"][
                index % 4
              ];
              return (
                <div
                  key={slot.id}
                  className="flex items-center gap-3 rounded-xl border-s-4 bg-slate-50 p-2.5"
                  style={{ borderInlineStartColor: border }}
                >
                  <div className="w-12 shrink-0 text-center">
                    <p className="text-[11px] font-black text-slate-900">
                      {formatTime(slot.start_time)}
                    </p>
                    <p className="text-[9px] text-slate-500">
                      {formatTime(slot.end_time)}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-bold text-slate-900">
                      {slot.course_name ||
                        slot.section_code ||
                        t("calendar.class", "Class")}
                    </p>
                    <p className="truncate text-[10px] text-slate-500">
                      {slot.slot_type}
                      {slot.room ? ` · ${slot.room}` : ""}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card className="rounded-2xl border-slate-200 p-4 shadow-sm">
        <RailHeader
          icon={<AlarmClock className="size-3.5" aria-hidden="true" />}
          title={t("calendar.upcomingDeadlines", "Upcoming deadlines")}
        />
        {upcoming.length === 0 ? (
          <p className="text-xs text-slate-500">
            {t("calendar.noDeadlines", "No upcoming deadlines")}
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {upcoming.map((event) => {
              const urgency = getDeadlineUrgency(event.date, now);
              const urgencyClass =
                urgency === "red"
                  ? "border-red-200 bg-red-50 text-red-600"
                  : urgency === "yellow"
                  ? "border-amber-200 bg-amber-50 text-amber-600"
                  : "border-emerald-200 bg-emerald-50 text-emerald-600";
              return (
                <div
                  key={`${event.type}-${event.id}`}
                  className="flex items-center gap-2.5 py-2.5"
                >
                  {event.type === "quiz" ? (
                    <FlaskConical
                      className="size-4 shrink-0 text-violet-500"
                      aria-hidden="true"
                    />
                  ) : (
                    <FileText
                      className="size-4 shrink-0 text-slate-500"
                      aria-hidden="true"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-bold text-slate-900">
                      {event.title}
                    </p>
                    <p className="truncate text-[10px] text-slate-500">
                      {event.course_name ?? ""}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-bold ${urgencyClass}`}
                  >
                    {formatDeadline(event.date, now, locale)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {role === "student" ? (
        <Card className="rounded-2xl border-slate-200 p-4 shadow-sm">
          <RailHeader
            icon={<CheckSquare className="size-3.5" aria-hidden="true" />}
            title={t("calendar.myTasks", "My tasks")}
            right={t("calendar.xpEach", "+10 XP each")}
          />
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
                <label
                  key={task.id}
                  className="flex items-center gap-2 text-[12px] text-slate-700"
                >
                  <input
                    type="checkbox"
                    defaultChecked={task.status === "done"}
                    disabled={task.status === "done"}
                    className="size-3.5 accent-teal-600"
                  />
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: taskColor[task.priority] }}
                    aria-hidden="true"
                  />
                  <span
                    className={`min-w-0 flex-1 truncate ${
                      task.status === "done"
                        ? "text-slate-400 line-through"
                        : ""
                    }`}
                  >
                    {task.title}
                  </span>
                </label>
              ))}
            </div>
          )}
          <Button
            asChild
            variant="outline"
            size="sm"
            className="mt-3 h-7 w-full rounded-lg text-[10px] font-bold"
          >
            <Link to="/student/planner">
              <Plus className="size-3" aria-hidden="true" />
              {t("calendar.addTask", "Add task")}
              <ArrowRight className="ms-auto size-3" aria-hidden="true" />
            </Link>
          </Button>
        </Card>
      ) : null}
    </aside>
  );
};

const CalendarView = () => {
  const { t, i18n } = useTranslation("common");
  const { user, role } = useAuth();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [viewMode, setViewMode] = useState<CalendarMode>("month");

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
  const events = useMemo(() => dedupeCalendarEvents(rawEvents), [rawEvents]);
  const displayEvents = useMemo<CalendarEvent[]>(
    () => [
      ...events,
      ...planner.tasks
        .filter((task) => task.dueDate)
        .map((task) => ({
          id: `task-${task.id}`,
          title: task.title,
          date: task.dueDate,
          color: "#22c55e",
          course_name: task.courseName,
        })),
    ],
    [events, planner.tasks]
  );

  const locale = i18n.language === "ar" ? "ar-QA" : "en-US";
  const dayShortLabels = useMemo(() => {
    const defaults = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return [1, 2, 3, 4, 5, 6, 0].map((d) =>
      t(`calendar.daysShort.${d}`, defaults[d] ?? "Sun")
    );
  }, [t]);
  const firstDay = (new Date(year, month - 1, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month, 0).getDate();
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
  const headerLabel = new Date(year, month - 1, 1).toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
  });
  const sortedEvents = [...displayEvents].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const changeMonth = (delta: number) => {
    const next = new Date(year, month - 1 + delta, 1);
    setMonth(next.getMonth() + 1);
    setYear(next.getFullYear());
  };

  const goToday = () => {
    setMonth(now.getMonth() + 1);
    setYear(now.getFullYear());
  };

  return (
    <div
      className="mx-auto grid w-full max-w-[1620px] grid-cols-[minmax(0,1fr)_280px] gap-5 pt-1 pb-4 max-[1100px]:grid-cols-1"
      dir={i18n.language === "ar" ? "rtl" : "ltr"}
    >
      <Card className="min-w-0 rounded-2xl border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="size-7 rounded-lg text-slate-500"
              onClick={() => changeMonth(-1)}
              aria-label={t("calendar.previous", "Previous month")}
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
            </Button>
            <h2 className="min-w-[130px] text-center text-[16px] font-black">
              {headerLabel}
            </h2>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 rounded-lg text-slate-500"
              onClick={() => changeMonth(1)}
              aria-label={t("calendar.next", "Next month")}
            >
              <ChevronRight className="size-4" aria-hidden="true" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="ms-1 h-7 rounded-lg border-teal-200 px-2 text-[10px] font-bold text-teal-700 hover:bg-teal-50"
              onClick={goToday}
            >
              {t("calendar.today", "Today")}
            </Button>
          </div>

          <div className="flex items-center rounded-lg border border-slate-100 bg-slate-50 p-0.5 text-[11px] font-bold">
            <button
              type="button"
              className={`rounded-md px-2 py-1 ${
                viewMode === "month"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500"
              }`}
              onClick={() => setViewMode("month")}
              aria-pressed={viewMode === "month"}
            >
              ▦ {t("calendar.month", "Month")}
            </button>
            <button
              type="button"
              className={`rounded-md px-2 py-1 ${
                viewMode === "agenda"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500"
              }`}
              onClick={() => setViewMode("agenda")}
              aria-pressed={viewMode === "agenda"}
            >
              ☰ {t("calendar.agenda", "Agenda")}
            </button>
          </div>
        </div>

        {isLoading ? (
          <Shimmer className="h-[520px] rounded-xl" />
        ) : isError ? (
          <ErrorState
            message={t("errors.generic")}
            onRetry={() => void refetch()}
            retryLabel={t("buttons.retry")}
          />
        ) : viewMode === "month" ? (
          <>
            <div className="mb-1.5 grid grid-cols-7 gap-1.5">
              {dayShortLabels.map((day) => (
                <div
                  key={day}
                  className="py-1 text-center text-[9px] font-extrabold uppercase tracking-[0.08em] text-slate-500"
                >
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {Array.from({ length: totalCells }, (_, index) => {
                const day = index - firstDay + 1;
                const cellDate = new Date(year, month - 1, day);
                const outside = day < 1 || day > daysInMonth;
                const dayEvents = outside
                  ? []
                  : displayEvents.filter(
                      (event) => dateKey(event.date) === dateKey(cellDate)
                    );
                const todayCell =
                  !outside && dateKey(cellDate) === dateKey(now);
                return (
                  <div
                    key={`${year}-${month}-${index}`}
                    className={`flex min-h-[80px] min-w-0 flex-col gap-1 overflow-hidden rounded-xl border p-1.5 ${
                      outside
                        ? "border-slate-100 bg-slate-50 opacity-60"
                        : todayCell
                        ? "border-teal-500 bg-white shadow-[0_0_0_2px_rgba(20,184,166,0.16)]"
                        : "border-slate-100 bg-white"
                    }`}
                  >
                    <span
                      className={`text-[10px] font-extrabold ${
                        todayCell ? "text-teal-700" : "text-slate-600"
                      }`}
                    >
                      {cellDate.getDate()}
                    </span>
                    {!outside
                      ? dayEvents.slice(0, 3).map((event) => (
                          <span
                            key={event.id}
                            className="block truncate rounded px-1 py-0.5 text-[9px] font-bold leading-tight text-white"
                            style={{ backgroundColor: eventColor(event) }}
                            title={event.title}
                          >
                            {event.title}
                          </span>
                        ))
                      : null}
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-100 pt-3">
              {LEGEND.map(([, label, color]) => (
                <span
                  key={label}
                  className="flex items-center gap-1 text-[10px] font-semibold text-slate-600"
                >
                  <span
                    className="size-2 rounded-sm"
                    style={{ backgroundColor: color }}
                    aria-hidden="true"
                  />
                  {t(
                    `calendar.legend.${label.toLowerCase().replace(" ", "")}`,
                    label
                  )}
                </span>
              ))}
            </div>
          </>
        ) : (
          <div className="divide-y divide-slate-100">
            {sortedEvents.length === 0 ? (
              <p className="py-12 text-center text-sm text-slate-500">
                {t("calendar.noEvents", "No events")}
              </p>
            ) : (
              sortedEvents.map((event) => (
                <div key={event.id} className="flex items-center gap-3 py-3">
                  <div className="w-12 shrink-0 text-center">
                    <p className="text-lg font-black leading-none text-slate-900">
                      {new Date(event.date).getDate()}
                    </p>
                    <p className="text-[9px] font-bold uppercase text-slate-500">
                      {new Intl.DateTimeFormat(locale, {
                        weekday: "short",
                      }).format(new Date(event.date))}
                    </p>
                  </div>
                  <span
                    className="rounded px-2 py-1 text-[10px] font-bold text-white"
                    style={{ backgroundColor: eventColor(event) }}
                  >
                    {event.title}
                  </span>
                  <span className="truncate text-[10px] text-slate-500">
                    {event.course_name ?? ""}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </Card>

      <CalendarRail
        events={events}
        slots={timetableSlots}
        planner={planner}
        role={role}
        now={now}
        locale={locale}
        t={t}
      />
    </div>
  );
};

export default CalendarView;
