// =============================================================================
// PomodoroIndicator — Shows current interval number, type (Work/Break/Long
// Break), and progress dots for completed intervals
// =============================================================================

import { cn } from "@/lib/utils";
import type { PomodoroIntervalType } from "@/types/planner";

interface PomodoroIndicatorProps {
  /** Current interval index (0-based) */
  currentInterval: number;
  /** Type of the current interval */
  intervalType: PomodoroIntervalType;
  /** Total completed work intervals in this cycle (max 4 before long break) */
  className?: string;
}

const INTERVAL_LABELS: Record<PomodoroIntervalType, string> = {
  work: "Work",
  break: "Break",
  long_break: "Long Break",
};

const INTERVAL_COLORS: Record<PomodoroIntervalType, string> = {
  work: "text-blue-600",
  break: "text-teal-600",
  long_break: "text-amber-600",
};

/**
 * Compute how many work intervals have been completed in the current
 * Pomodoro cycle (a cycle = 4 work intervals before a long break).
 *
 * Interval sequence: work(0), break(1), work(2), break(3), work(4), break(5), work(6), long_break(7)
 * Work intervals are at even indices: 0, 2, 4, 6
 * So completed work intervals = floor(currentInterval / 2) within the cycle.
 */
function getCompletedWorkIntervals(currentInterval: number): number {
  // Each cycle is 8 intervals (4 work + 3 break + 1 long break)
  const posInCycle = currentInterval % 8;
  // Work intervals are at positions 0, 2, 4, 6
  // Completed work = how many even positions are strictly before current
  return Math.floor(posInCycle / 2);
}

function getCurrentWorkNumber(currentInterval: number): number {
  return getCompletedWorkIntervals(currentInterval) + 1;
}

const PomodoroIndicator = ({
  currentInterval,
  intervalType,
  className,
}: PomodoroIndicatorProps) => {
  const completedWork = getCompletedWorkIntervals(currentInterval);
  const currentWorkNum = getCurrentWorkNumber(currentInterval);
  const label = INTERVAL_LABELS[intervalType];
  const colorClass = INTERVAL_COLORS[intervalType];

  return (
    <div
      className={cn("flex flex-col items-center gap-2", className)}
      role="status"
      aria-label={`Pomodoro ${currentWorkNum} of 4, ${label}`}
    >
      {/* Interval label */}
      <span className={cn("text-sm font-semibold", colorClass)}>
        {intervalType === "work" ? `Pomodoro ${currentWorkNum} of 4` : label}
      </span>

      {/* Progress dots */}
      <div className="flex items-center gap-1.5" aria-hidden="true">
        {Array.from({ length: 4 }).map((_, i) => {
          const isCompleted = i < completedWork;
          const isCurrent = i === completedWork && intervalType === "work";

          return (
            <div
              key={i}
              className={cn(
                "h-2.5 w-2.5 rounded-full transition-colors",
                isCompleted && "bg-teal-500",
                isCurrent && "bg-blue-500 ring-2 ring-blue-200",
                !isCompleted && !isCurrent && "bg-gray-200"
              )}
            />
          );
        })}
      </div>
    </div>
  );
};

export default PomodoroIndicator;
export type { PomodoroIndicatorProps };
