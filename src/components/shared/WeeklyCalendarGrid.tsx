// =============================================================================
// WeeklyCalendarGrid — 7-column grid (Mon–Sun) with day headers, today
// highlight, session/task/deadline/review cards per day; single-day view
// on mobile with tab navigation
// =============================================================================

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  Play,
  SkipForward,
  CheckCircle2,
} from "lucide-react";
import StudySessionCard from "@/components/shared/StudySessionCard";
import PlannerTaskItem from "@/components/shared/PlannerTaskItem";
import DeadlineItem from "@/components/shared/DeadlineItem";
import { ReviewSessionBadge } from "@/components/shared/ReviewSessionBadge";
import { sortTasksByPriority } from "@/lib/plannerUtils";
import type {
  WeekDay,
  StudySession,
  PlannerTask,
  ReviewSchedule,
} from "@/types/planner";

interface WeeklyCalendarGridProps {
  weekData: WeekDay[];
  today: string;
  reviews?: ReviewSchedule[];
  onSessionStart?: (session: StudySession) => void;
  onSessionEdit?: (session: StudySession) => void;
  onTaskToggle?: (task: PlannerTask) => void;
  onTaskEdit?: (task: PlannerTask) => void;
  onTaskDelete?: (task: PlannerTask) => void;
  onDayClick?: (date: string) => void;
  onStartReview?: (review: ReviewSchedule) => void;
  onSkipReview?: (reviewId: string) => void;
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

/** Group reviews by reviewDate into a Map for O(1) lookup per day. */
const groupReviewsByDate = (
  reviews: ReviewSchedule[]
): Map<string, ReviewSchedule[]> => {
  const map = new Map<string, ReviewSchedule[]>();
  for (const review of reviews) {
    const existing = map.get(review.reviewDate);
    if (existing) {
      existing.push(review);
    } else {
      map.set(review.reviewDate, [review]);
    }
  }
  return map;
};

// ─── Review Item (shared between desktop & mobile) ───────────────────────────

interface ReviewItemProps {
  review: ReviewSchedule;
  onStartReview?: (review: ReviewSchedule) => void;
  onSkipReview?: (reviewId: string) => void;
  readOnly?: boolean;
  compact?: boolean;
}

const ReviewItem = ({
  review,
  onStartReview,
  onSkipReview,
  readOnly = false,
  compact = false,
}: ReviewItemProps) => {
  const isPending = review.status === "pending";
  const isCompleted = review.status === "completed";
  const isSkipped = review.status === "skipped";

  return (
    <div
      className={cn(
        "rounded-md border-2 border-dashed p-2 transition-shadow",
        isPending && "border-purple-300 bg-purple-50/40",
        isCompleted && "border-green-300 bg-green-50/30 opacity-60",
        isSkipped && "border-slate-300 bg-slate-50/30 opacity-60"
      )}
      data-testid="review-item"
    >
      <div className="flex items-start justify-between gap-1.5">
        <div className="flex-1 min-w-0 space-y-1">
          <ReviewSessionBadge
            intervalDays={review.intervalDays}
            status={review.status}
          />
          <p
            className={cn(
              "text-[11px] font-medium text-slate-700 line-clamp-1",
              isSkipped && "line-through text-slate-400"
            )}
          >
            CLO: {review.cloId}
          </p>
        </div>

        {/* Actions or status indicator */}
        <div className="flex items-center gap-1 shrink-0">
          {isPending && !readOnly && (
            <>
              <Button
                size="sm"
                className={cn(
                  "gap-0.5 bg-gradient-to-r from-teal-500 to-blue-600 text-[10px] active:scale-95",
                  compact ? "h-6 px-1.5" : "h-7 px-2"
                )}
                onClick={() => onStartReview?.(review)}
                aria-label={`Start review for CLO ${review.cloId}`}
              >
                <Play className="h-3 w-3" />
                Start
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "gap-0.5 text-[10px]",
                  compact ? "h-6 px-1.5" : "h-7 px-2"
                )}
                onClick={() => onSkipReview?.(review.id)}
                aria-label={`Skip review for CLO ${review.cloId}`}
              >
                <SkipForward className="h-3 w-3" />
                Skip
              </Button>
            </>
          )}

          {isCompleted && (
            <span className="flex items-center gap-0.5 text-[10px] text-green-600 font-medium">
              <CheckCircle2 className="h-3 w-3" />
              Done
            </span>
          )}

          {isSkipped && (
            <span className="flex items-center gap-0.5 text-[10px] text-slate-400 font-medium">
              <SkipForward className="h-3 w-3" />
              Skipped
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Day Column (Desktop) ────────────────────────────────────────────────────

interface DayColumnProps {
  day: WeekDay;
  dayReviews: ReviewSchedule[];
  onSessionStart?: (session: StudySession) => void;
  onSessionEdit?: (session: StudySession) => void;
  onTaskToggle?: (task: PlannerTask) => void;
  onTaskEdit?: (task: PlannerTask) => void;
  onTaskDelete?: (task: PlannerTask) => void;
  onDayClick?: (date: string) => void;
  onStartReview?: (review: ReviewSchedule) => void;
  onSkipReview?: (reviewId: string) => void;
  readOnly?: boolean;
}

const DayColumn = ({
  day,
  dayReviews,
  onSessionStart,
  onSessionEdit,
  onTaskToggle,
  onTaskEdit,
  onTaskDelete,
  onDayClick,
  onStartReview,
  onSkipReview,
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

        {/* Reviews (after sessions/tasks, before deadlines) */}
        {dayReviews.map((review) => (
          <ReviewItem
            key={review.id}
            review={review}
            onStartReview={onStartReview}
            onSkipReview={onSkipReview}
            readOnly={readOnly}
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
          dayReviews.length === 0 &&
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
  reviewsByDate: Map<string, ReviewSchedule[]>;
  onSessionStart?: (session: StudySession) => void;
  onSessionEdit?: (session: StudySession) => void;
  onTaskToggle?: (task: PlannerTask) => void;
  onTaskEdit?: (task: PlannerTask) => void;
  onTaskDelete?: (task: PlannerTask) => void;
  onStartReview?: (review: ReviewSchedule) => void;
  onSkipReview?: (reviewId: string) => void;
  readOnly?: boolean;
}

const MobileDayView = ({
  weekData,
  today,
  reviewsByDate,
  onSessionStart,
  onSessionEdit,
  onTaskToggle,
  onTaskEdit,
  onTaskDelete,
  onStartReview,
  onSkipReview,
  readOnly = false,
}: MobileDayViewProps) => {
  const todayIndex = weekData.findIndex((d) => d.date === today);
  const [selectedIndex, setSelectedIndex] = useState(
    todayIndex >= 0 ? todayIndex : 0
  );

  const selectedDay = weekData[selectedIndex];
  if (!selectedDay) return null;

  const sortedTasks = sortTasksByPriority(selectedDay.tasks);
  const mobileReviews = reviewsByDate.get(selectedDay.date) ?? [];

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

        {/* Reviews */}
        {mobileReviews.map((review) => (
          <ReviewItem
            key={review.id}
            review={review}
            onStartReview={onStartReview}
            onSkipReview={onSkipReview}
            readOnly={readOnly}
          />
        ))}

        {selectedDay.deadlines.map((deadline) => (
          <DeadlineItem key={deadline.id} deadline={deadline} />
        ))}

        {selectedDay.sessions.length === 0 &&
          selectedDay.tasks.length === 0 &&
          mobileReviews.length === 0 &&
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
  reviews = [],
  onSessionStart,
  onSessionEdit,
  onTaskToggle,
  onTaskEdit,
  onTaskDelete,
  onDayClick,
  onStartReview,
  onSkipReview,
  readOnly = false,
}: WeeklyCalendarGridProps) => {
  const reviewsByDate = useMemo(() => groupReviewsByDate(reviews), [reviews]);

  return (
    <>
      {/* Desktop: 7-column grid */}
      <div className="hidden md:grid md:grid-cols-7 md:gap-2">
        {weekData.map((day) => (
          <DayColumn
            key={day.date}
            day={day}
            dayReviews={reviewsByDate.get(day.date) ?? []}
            onSessionStart={onSessionStart}
            onSessionEdit={onSessionEdit}
            onTaskToggle={onTaskToggle}
            onTaskEdit={onTaskEdit}
            onTaskDelete={onTaskDelete}
            onDayClick={onDayClick}
            onStartReview={onStartReview}
            onSkipReview={onSkipReview}
            readOnly={readOnly}
          />
        ))}
      </div>

      {/* Mobile: single-day view with tab navigation */}
      <div className="md:hidden">
        <MobileDayView
          weekData={weekData}
          today={today}
          reviewsByDate={reviewsByDate}
          onSessionStart={onSessionStart}
          onSessionEdit={onSessionEdit}
          onTaskToggle={onTaskToggle}
          onTaskEdit={onTaskEdit}
          onTaskDelete={onTaskDelete}
          onStartReview={onStartReview}
          onSkipReview={onSkipReview}
          readOnly={readOnly}
        />
      </div>
    </>
  );
};

export default WeeklyCalendarGrid;
export type { WeeklyCalendarGridProps };
