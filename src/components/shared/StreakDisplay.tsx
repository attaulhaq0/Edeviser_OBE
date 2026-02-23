import { Flame, Snowflake } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { getNextMilestone, getMilestoneProgress } from '@/lib/streakMilestones';

export interface StreakDisplayProps {
  streakCount: number;
  lastLoginDate?: string;
  compact?: boolean;
  streakFreezesAvailable?: number;
}

const StreakDisplay = ({
  streakCount,
  compact = false,
  streakFreezesAvailable = 0,
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
            <span className="text-sm font-medium text-gray-500">day streak</span>
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
