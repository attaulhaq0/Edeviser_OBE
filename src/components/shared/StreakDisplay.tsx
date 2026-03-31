import { Flame, Snowflake, Trophy, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { getNextMilestone, getMilestoneProgress } from '@/lib/streakMilestones';

const TOTAL_ACTIVE_MILESTONES = [30, 60, 100, 200, 365] as const;

export interface StreakDisplayProps {
  streakCount: number;
  lastLoginDate?: string;
  compact?: boolean;
  streakFreezesAvailable?: number;
  /** Weekend rest days within current streak period (sabbatical) */
  restDays?: number;
  /** Total active days since account creation */
  totalActiveDays?: number;
  /** Whether Streak Sabbatical is enabled for the institution */
  streakSabbaticalEnabled?: boolean;
  /** Whether the streak was just reset (show motivational message) */
  streakJustReset?: boolean;
}

function isTotalActiveMilestone(days: number): boolean {
  return (TOTAL_ACTIVE_MILESTONES as readonly number[]).includes(days);
}

const StreakDisplay = ({
  streakCount,
  compact = false,
  streakFreezesAvailable = 0,
  restDays = 0,
  totalActiveDays = 0,
  streakSabbaticalEnabled = false,
  streakJustReset = false,
}: StreakDisplayProps) => {
  if (compact) {
    return (
      <div className="flex items-center gap-1.5" aria-label={`${streakCount} day streak`}>
        <Flame className="h-4 w-4 text-orange-500 animate-streak-flame" />
        <span className="text-sm font-bold text-orange-600">{streakCount}</span>
      </div>
    );
  }

  const nextMilestone = getNextMilestone(streakCount);
  const progress = getMilestoneProgress(streakCount);
  const showRangeFormat = streakSabbaticalEnabled && restDays > 0;
  const showMilestoneCelebration = totalActiveDays > 0 && isTotalActiveMilestone(totalActiveDays);

  return (
    <Card className="bg-white border-0 shadow-md rounded-xl p-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-orange-50">
          <Flame className="h-5 w-5 text-orange-500 animate-streak-flame" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
              {streakCount}
            </span>
            {showRangeFormat ? (
              <span className="text-sm font-medium text-gray-500" data-testid="streak-range-label">
                day streak, {restDays} rest day{restDays !== 1 ? 's' : ''}
              </span>
            ) : (
              <span className="text-sm font-medium text-gray-500">day streak</span>
            )}
          </div>
        </div>

        {streakFreezesAvailable > 0 && (
          <div
            className="flex items-center gap-0.5"
            aria-label={`${streakFreezesAvailable} streak freeze${streakFreezesAvailable > 1 ? 's' : ''} available`}
          >
            {Array.from({ length: Math.min(streakFreezesAvailable, 2) }).map((_, i) => (
              <Snowflake key={i} className="h-4 w-4 text-blue-400" />
            ))}
          </div>
        )}
      </div>

      {/* Total Active Days counter */}
      {totalActiveDays > 0 && (
        <div className="mt-3 flex items-center gap-2" data-testid="total-active-days">
          {showMilestoneCelebration ? (
            <Trophy className="h-4 w-4 text-amber-500 animate-badge-pop" />
          ) : (
            <Trophy className="h-4 w-4 text-gray-400" />
          )}
          <span className="text-xs font-medium text-gray-600">
            {totalActiveDays} Total Active Day{totalActiveDays !== 1 ? 's' : ''}
          </span>
          {showMilestoneCelebration && (
            <span className="text-xs font-bold text-amber-600 animate-xp-pulse" data-testid="active-days-milestone">
              Milestone!
            </span>
          )}
        </div>
      )}

      {/* Motivational message on streak reset */}
      {streakJustReset && totalActiveDays > 0 && (
        <div className="mt-3 flex items-center gap-2 bg-blue-50 rounded-lg p-2.5" data-testid="streak-reset-message">
          <RefreshCw className="h-4 w-4 text-blue-500 shrink-0" />
          <p className="text-xs text-blue-700 font-medium">
            Your {totalActiveDays} total active days of learning are still an achievement
          </p>
        </div>
      )}

      {nextMilestone !== null && (
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">
              Next milestone: {nextMilestone} days
            </span>
            <span className="text-xs font-medium text-gray-600">{progress}%</span>
          </div>
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-red-500 to-orange-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${progress}% progress toward ${nextMilestone} day milestone`}
            />
          </div>
        </div>
      )}

      {nextMilestone === null && (
        <p className="mt-2 text-xs text-green-600 font-medium">
          All milestones reached!
        </p>
      )}
    </Card>
  );
};

export default StreakDisplay;
