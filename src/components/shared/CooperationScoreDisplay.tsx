// =============================================================================
// CooperationScoreDisplay — Task 4.9
// Cooperation score gauge with color coding
// =============================================================================

import { cn } from '@/lib/utils';

interface CooperationScoreDisplayProps {
  score: number;
  className?: string;
  compact?: boolean;
}

const getScoreColor = (score: number): string => {
  if (score >= 80) return 'text-green-600';
  if (score >= 50) return 'text-yellow-600';
  return 'text-red-600';
};

const getScoreBg = (score: number): string => {
  if (score >= 80) return 'bg-green-50';
  if (score >= 50) return 'bg-yellow-50';
  return 'bg-red-50';
};

const getScoreLabel = (score: number): string => {
  if (score >= 80) return 'Excellent';
  if (score >= 50) return 'Fair';
  return 'Low';
};

const CooperationScoreDisplay = ({
  score,
  className,
  compact = false,
}: CooperationScoreDisplayProps) => {
  const clampedScore = Math.max(0, Math.min(100, score));

  if (compact) {
    return (
      <span
        className={cn(
          'text-xs font-bold px-1.5 py-0.5 rounded',
          getScoreBg(clampedScore),
          getScoreColor(clampedScore),
          className,
        )}
        data-testid="cooperation-score"
      >
        {clampedScore}
      </span>
    );
  }

  return (
    <div
      className={cn('flex items-center gap-2', className)}
      data-testid="cooperation-score-display"
    >
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-black tracking-widest uppercase text-gray-500">
            Cooperation
          </span>
          <span className={cn('text-sm font-bold', getScoreColor(clampedScore))}>
            {clampedScore}
          </span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              clampedScore >= 80
                ? 'bg-green-500'
                : clampedScore >= 50
                  ? 'bg-yellow-500'
                  : 'bg-red-500',
            )}
            style={{ width: `${clampedScore}%` }}
          />
        </div>
        <span className={cn('text-[10px] mt-0.5', getScoreColor(clampedScore))}>
          {getScoreLabel(clampedScore)}
        </span>
      </div>
    </div>
  );
};

export default CooperationScoreDisplay;
