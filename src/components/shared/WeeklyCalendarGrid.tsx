import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import StudySessionCard from "@/components/shared/StudySessionCard";
import PlannerTaskItem from "@/components/shared/PlannerTaskItem";
import DeadlineItem from "@/components/shared/DeadlineItem";
import Shimmer from "@/components/shared/Shimmer";
import type {
  WeekDay,
  StudySession,
  PlannerTask,
  ReviewSchedule,
} from "@/types/planner";

interface WeeklyCalendarGridProps {
  weekData: WeekDay[];
  today: string;
  isLoading?: boolean;
  readOnly?: boolean;
  reviews?: ReviewSchedule[];
  onStartSession?: (session: StudySession) => void;
  onEditSession?: (session: StudySession) => void;
  onToggleTask?: (task: PlannerTask) => void;
  onEditTask?: (task: PlannerTask) => void;
  onDeleteTask?: (task: PlannerTask) => void;
  onAddSession?: (date: string) => void;
  onAddTask?: (date: string) => void;
  onStartReview?: (review: ReviewSchedule) => void;
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const formatDayHeader = (dateStr: string): string => {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
};

const WeeklyCalendarGrid = ({
  weekData,
  today,
  isLoading = false,
  readOnly = false,
  reviews: _reviews = [],
  onStartSession,
  onEditSession,
  onToggleTask,
  onEditTask,
  onDeleteTask,
  onAddSession,
  onAddTask,
  onStartReview: _onStartReview,
}: WeeklyCalendarGridProps) => {
  // Mobile: single-day view with tab navigation
  const todayIndex = weekData.findIndex((d) => d.date === today);
  const [mobileDay, setMobileDay] = useState(todayIndex >= 0 ? todayIndex : 0);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <Shimmer key={i} className="h-48 rounded-xl" />
        ))}
      </div>
    );
  }

  const renderDayColumn = (day: WeekDay, index: number) => {
    const isToday = day.date === today;
    const sortedTasks = [...day.tasks].sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return order[a.priority] - order[b.priority];
    });

    return (
      <div
        key={day.date}
        className={cn(
          "rounded-xl border bg-white p-2 space-y-2 min-h-[200px]",
          isToday ? "border-blue-400 ring-1 ring-blue-200" : "border-slate-200"
        )}
      >
        {/* Day header */}
        <div
          className={cn(
            "text-center py-1 rounded-lg",
            isToday ? "bg-blue-600 text-white" : "bg-slate-50"
          )}
        >
          <p className="text-[10px] font-bold tracking-widest uppercase">
            {DAY_LABELS[index]}
          </p>
          <p
            className={cn("text-sm font-semibold", !isToday && "text-gray-700")}
          >
            {formatDayHeader(day.date)}
          </p>
        </div>

        {/* Sessions */}
        {day.sessions.map((session) => (
          <StudySessionCard
            key={session.id}
            session={session}
            onStart={() => onStartSession?.(session)}
            onEdit={() => onEditSession?.(session)}
            readOnly={readOnly}
          />
        ))}

        {/* Deadlines */}
        {day.deadlines.map((deadline) => (
          <DeadlineItem key={deadline.id} assignment={deadline} />
        ))}

        {/* Tasks */}
        {sortedTasks.length > 0 && (
          <div className="border-t border-slate-100 pt-1">
            {sortedTasks.map((task) => (
              <PlannerTaskItem
                key={task.id}
                task={task}
                onToggle={() => onToggleTask?.(task)}
                onEdit={() => onEditTask?.(task)}
                onDelete={() => onDeleteTask?.(task)}
                readOnly={readOnly}
              />
            ))}
          </div>
        )}

        {/* Add buttons */}
        {!readOnly && (
          <div className="flex items-center gap-1 pt-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-[10px] text-gray-400 hover:text-blue-600 flex-1"
              onClick={() => onAddSession?.(day.date)}
            >
              <Plus className="h-3 w-3" /> Session
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-[10px] text-gray-400 hover:text-blue-600 flex-1"
              onClick={() => onAddTask?.(day.date)}
            >
              <Plus className="h-3 w-3" /> Task
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Desktop: 7-column grid */}
      <div className="hidden md:grid md:grid-cols-7 gap-2">
        {weekData.map((day, i) => renderDayColumn(day, i))}
      </div>

      {/* Mobile: single-day view with tab navigation */}
      <div className="md:hidden space-y-3">
        <div className="flex gap-1 overflow-x-auto pb-1" role="tablist">
          {weekData.map((day, i) => (
            <button
              key={day.date}
              role="tab"
              aria-selected={mobileDay === i}
              className={cn(
                "flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                mobileDay === i
                  ? "bg-blue-600 text-white"
                  : day.date === today
                  ? "bg-blue-50 text-blue-600 border border-blue-200"
                  : "bg-white text-gray-600 border border-gray-200"
              )}
              onClick={() => setMobileDay(i)}
            >
              <span className="block text-[10px] uppercase">
                {DAY_LABELS[i]}
              </span>
              <span>{formatDayHeader(day.date)}</span>
            </button>
          ))}
        </div>
        {weekData[mobileDay] &&
          renderDayColumn(weekData[mobileDay]!, mobileDay)}
      </div>
    </>
  );
};

export default WeeklyCalendarGrid;
