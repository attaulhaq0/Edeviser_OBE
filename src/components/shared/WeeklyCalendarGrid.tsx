// =============================================================================
// WeeklyCalendarGrid — 7-column grid (Mon–Sun) with day headers, today
// highlight, session/task/deadline cards per day; single-day view on mobile
// with tab navigation
// =============================================================================

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import StudySessionCard from "@/components/shared/StudySessionCard";
import PlannerTaskItem from "@/components/shared/PlannerTaskItem";
import DeadlineItem from "@/components/shared/DeadlineItem";
import { sortTasksByPriority } from "@/lib/plannerUtils";
import type { WeekDay, StudySession, PlannerTask } from "@/types/planner";

interface WeeklyCalendarGridProps {
  weekData: WeekDay[];
  today: string;
  onSessionStart?: (session: StudySession) => void;
  onSessionEdit?: (session: StudySession) => void;
  onTaskToggle?: (task: PlannerTask) => void;
  onTaskEdit?: (task: PlannerTask) => void;
  onTaskDelete?: (task: PlannerTask) => void;
  onDayClick?: (date: string) => void;
  readOnly?: boolean;
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const formatDayHeader = (dateStr: string): string => {
  try {
    return format(parseISO(dateStr), "d");
  } catch {
    return dateStr;
  }
};

const formatDayHeaderFull = (dateStr: string): string => {
  try {
    return format(parseISO(dateStr), "EEEE, MMM d");
  } catch {
    return dateStr;
  }
};

// ─── Day Column (Desktop) ────────────────────────────────────────────────────

interface DayColumnProps {
  day: WeekDay;
  onSessionStart?: (session: StudySession) => void;
  onSessionEdit?: (session: StudySession) => void;
  onTaskToggle?: (task: PlannerTask) => void;
  onTaskEdit?: (task: PlannerTask) => void;
  onTaskDelete?: (task: PlannerTask) => void;
  onDayClick?: (date: string) => void;
  readOnly?: boolean;
}

const DayColumn = ({
  day,
  onSessionStart,
  onSessionEdit,
  onTaskToggle,
  onTaskEdit,
  onTaskDelete,
  onDayClick,
  readOnly = false,
}: DayColumnProps) => {
  const sortedTasks = useMemo(
    () => sortTasksByPriority(day.tasks),
    [day.tasks]
  );
  const dayIndex = (() => {
    try {
      const d = parseISO(day.date);
      const jsDay = d.getDay();
      return jsDay === 0 ? 6 : jsDay - 1; // Mon=0 ... Sun=6
    } catch {
      return 0;
    }
  })();

  return (
    <div
      className={cn(
        "flex flex-col rounded-lg border p-2 min-h-[200px]",
        day.isToday
          ? "border-blue-400 bg-blue-50/30 ring-1 ring-blue-200"
          : "border-gray-200 bg-white"
      )}
    >
      {/* Day header */}
      <button
        type="button"
        className={cn(
          "mb-2 flex items-center justify-between rounded-md px-2 py-1 text-xs font-semibold transition-colors",
          day.isToday
            ? "bg-blue-600 text-white"
            : "text-gray-600 hover:bg-gray-100"
        )}
        onClick={() => onDayClick?.(day.date)}
        aria-label={`View ${formatDayHeaderFull(day.date)}`}
      >
        <span>{DAY_LABELS[dayIndex]}</span>
        <span>{formatDayHeader(day.date)}</span>
      </button>

      {/* Items */}
      <div className="flex-1 space-y-1.5 overflow-y-auto">
        {/* Sessions */}
        {day.sessions.map((session) => (
          <StudySessionCard
            key={session.id}
            session={session}
            onStart={readOnly ? undefined : onSessionStart}
            onEdit={readOnly ? undefined : onSessionEdit}
            compact
          />
        ))}

        {/* Tasks (sorted by priority) */}
        {sortedTasks.map((task) => (
          <PlannerTaskItem
            key={task.id}
            task={task}
            onToggle={readOnly ? undefined : onTaskToggle}
            onEdit={readOnly ? undefined : onTaskEdit}
            onDelete={readOnly ? undefined : onTaskDelete}
            compact
          />
        ))}

        {/* Deadlines */}
        {day.deadlines.map((deadline) => (
          <DeadlineItem key={deadline.id} deadline={deadline} compact />
        ))}

        {/* Empty state */}
        {day.sessions.length === 0 &&
          day.tasks.length === 0 &&
          day.deadlines.length === 0 && (
            <p className="py-4 text-center text-[11px] text-gray-400">
              No items
            </p>
          )}
      </div>
    </div>
  );
};

// ─── Mobile Day View ─────────────────────────────────────────────────────────

interface MobileDayViewProps {
  weekData: WeekDay[];
  today: string;
  onSessionStart?: (session: StudySession) => void;
  onSessionEdit?: (session: StudySession) => void;
  onTaskToggle?: (task: PlannerTask) => void;
  onTaskEdit?: (task: PlannerTask) => void;
  onTaskDelete?: (task: PlannerTask) => void;
  readOnly?: boolean;
}

const MobileDayView = ({
  weekData,
  today,
  onSessionStart,
  onSessionEdit,
  onTaskToggle,
  onTaskEdit,
  onTaskDelete,
  readOnly = false,
}: MobileDayViewProps) => {
  const todayIndex = weekData.findIndex((d) => d.date === today);
  const [selectedIndex, setSelectedIndex] = useState(
    todayIndex >= 0 ? todayIndex : 0
  );

  const selectedDay = weekData[selectedIndex];
  if (!selectedDay) return null;

  const sortedTasks = sortTasksByPriority(selectedDay.tasks);

  return (
    <div className="space-y-3">
      {/* Day tabs */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 shrink-0"
          disabled={selectedIndex === 0}
          onClick={() => setSelectedIndex((i) => Math.max(0, i - 1))}
          aria-label="Previous day"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="flex flex-1 gap-1 overflow-x-auto">
          {weekData.map((day, index) => {
            const dayIndex = (() => {
              try {
                const d = parseISO(day.date);
                const jsDay = d.getDay();
                return jsDay === 0 ? 6 : jsDay - 1;
              } catch {
                return index;
              }
            })();

            return (
              <button
                key={day.date}
                type="button"
                className={cn(
                  "flex min-w-[44px] flex-col items-center rounded-xl px-2 py-1.5 text-xs font-medium transition-colors",
                  index === selectedIndex
                    ? "bg-blue-600 text-white"
                    : day.isToday
                    ? "bg-blue-100 text-blue-700 border border-blue-300"
                    : "bg-white text-gray-600 border border-gray-200"
                )}
                onClick={() => setSelectedIndex(index)}
                aria-label={formatDayHeaderFull(day.date)}
              >
                <span className="text-[10px]">{DAY_LABELS[dayIndex]}</span>
                <span className="text-sm font-bold">
                  {formatDayHeader(day.date)}
                </span>
              </button>
            );
          })}
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 shrink-0"
          disabled={selectedIndex === weekData.length - 1}
          onClick={() =>
            setSelectedIndex((i) => Math.min(weekData.length - 1, i + 1))
          }
          aria-label="Next day"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Selected day header */}
      <h3 className="text-sm font-semibold text-gray-700">
        {formatDayHeaderFull(selectedDay.date)}
        {selectedDay.isToday && (
          <span className="ms-2 text-xs font-normal text-blue-600">Today</span>
        )}
      </h3>

      {/* Items */}
      <div className="space-y-2">
        {selectedDay.sessions.map((session) => (
          <StudySessionCard
            key={session.id}
            session={session}
            onStart={readOnly ? undefined : onSessionStart}
            onEdit={readOnly ? undefined : onSessionEdit}
          />
        ))}

        {sortedTasks.map((task) => (
          <PlannerTaskItem
            key={task.id}
            task={task}
            onToggle={readOnly ? undefined : onTaskToggle}
            onEdit={readOnly ? undefined : onTaskEdit}
            onDelete={readOnly ? undefined : onTaskDelete}
          />
        ))}

        {selectedDay.deadlines.map((deadline) => (
          <DeadlineItem key={deadline.id} deadline={deadline} />
        ))}

        {selectedDay.sessions.length === 0 &&
          selectedDay.tasks.length === 0 &&
          selectedDay.deadlines.length === 0 && (
            <p className="py-8 text-center text-sm text-gray-400">
              Nothing planned for this day
            </p>
          )}
      </div>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

const WeeklyCalendarGrid = ({
  weekData,
  today,
  onSessionStart,
  onSessionEdit,
  onTaskToggle,
  onTaskEdit,
  onTaskDelete,
  onDayClick,
  readOnly = false,
}: WeeklyCalendarGridProps) => {
  return (
    <>
      {/* Desktop: 7-column grid */}
      <div className="hidden md:grid md:grid-cols-7 md:gap-2">
        {weekData.map((day) => (
          <DayColumn
            key={day.date}
            day={day}
            onSessionStart={onSessionStart}
            onSessionEdit={onSessionEdit}
            onTaskToggle={onTaskToggle}
            onTaskEdit={onTaskEdit}
            onTaskDelete={onTaskDelete}
            onDayClick={onDayClick}
            readOnly={readOnly}
          />
        ))}
      </div>

      {/* Mobile: single-day view with tab navigation */}
      <div className="md:hidden">
        <MobileDayView
          weekData={weekData}
          today={today}
          onSessionStart={onSessionStart}
          onSessionEdit={onSessionEdit}
          onTaskToggle={onTaskToggle}
          onTaskEdit={onTaskEdit}
          onTaskDelete={onTaskDelete}
          readOnly={readOnly}
        />
      </div>
    </>
  );
};

export default WeeklyCalendarGrid;
export type { WeeklyCalendarGridProps };
