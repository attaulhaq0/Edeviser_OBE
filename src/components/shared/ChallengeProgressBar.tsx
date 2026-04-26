// =============================================================================
// ChallengeProgressBar — Task 4.4
// Accessible progress bar with ARIA progressbar role, aria-valuenow/min/max
// =============================================================================

import { cn } from '@/lib/utils';

interface ChallengeProgressBarProps {
  current: number;
  target: number;
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const ChallengeProgressBar = ({
  current,
  target,
  className,
  showLabel = true,
  size = 'md',
}: ChallengeProgressBarProps) => {
  const safeTarget = Math.max(target, 1);
  const percentage = Math.min(100, Math.round((current / safeTarget) * 100));
  const isComplete = current >= target;

  const heightClass = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  }[size];

  return (
    <div className={cn('space-y-1', className)}>
      {showLabel && (
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-gray-600">
            {current.toLocaleString()} / {target.toLocaleString()}
          </span>
          <span
            className={cn(
              'font-bold',
              isComplete ? 'text-green-600' : 'text-blue-600',
            )}
          >
            {percentage}%
          </span>
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={target}
        aria-label={`Progress: ${current} of ${target} (${percentage}%)`}
        className={cn('bg-gray-100 rounded-full overflow-hidden', heightClass)}
      >
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            isComplete
              ? 'bg-gradient-to-r from-green-400 to-green-600'
              : 'bg-gradient-to-r from-teal-500 to-blue-600',
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default ChallengeProgressBar;
