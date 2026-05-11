// =============================================================================
// ChallengeProgressBar — Accessible progress bar with ARIA attributes
// Task 4.4: ARIA progressbar role, aria-valuenow/min/max
// =============================================================================

import { cn } from "@/lib/utils";

export interface ChallengeProgressBarProps {
  current: number;
  goal: number;
  label?: string;
  showPercentage?: boolean;
  showValues?: boolean;
  colorClass?: string;
  className?: string;
}

const ChallengeProgressBar = ({
  current,
  goal,
  label = "Challenge progress",
  showPercentage = true,
  showValues = true,
  colorClass,
  className,
}: ChallengeProgressBarProps) => {
  const safeGoal = Math.max(goal, 1);
  const clampedCurrent = Math.max(0, Math.min(current, safeGoal));
  const percentage = Math.round((clampedCurrent / safeGoal) * 100);
  const isComplete = clampedCurrent >= safeGoal;

  const barColor =
    colorClass ??
    (isComplete
      ? "bg-green-500"
      : percentage >= 75
      ? "bg-blue-500"
      : percentage >= 50
      ? "bg-amber-500"
      : "bg-blue-400");

  return (
    <div className={cn("space-y-1.5", className)}>
      {/* Header row */}
      {(showPercentage || showValues) && (
        <div className="flex items-center justify-between">
          {showValues && (
            <span className="text-xs font-medium text-gray-600">
              {clampedCurrent.toLocaleString()} / {safeGoal.toLocaleString()}
            </span>
          )}
          {showPercentage && (
            <span
              className={cn(
                "text-xs font-bold tabular-nums",
                isComplete ? "text-green-600" : "text-gray-600"
              )}
            >
              {percentage}%
            </span>
          )}
        </div>
      )}

      {/* Progress bar */}
      <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
        <div
          role="progressbar"
          aria-valuenow={clampedCurrent}
          aria-valuemin={0}
          aria-valuemax={safeGoal}
          aria-label={label}
          className={cn(
            "h-full rounded-full transition-all duration-500 ease-out",
            barColor
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default ChallengeProgressBar;
