import { Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ReflectionStreakIndicatorProps {
  consecutiveWeeks: number;
}

const ReflectionStreakIndicator = ({
  consecutiveWeeks,
}: ReflectionStreakIndicatorProps) => {
  if (consecutiveWeeks <= 0) return null;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold',
        consecutiveWeeks >= 4
          ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white'
          : 'bg-orange-50 text-orange-700',
      )}
      data-testid="reflection-streak-indicator"
    >
      <Flame className="h-3.5 w-3.5" />
      {consecutiveWeeks} week{consecutiveWeeks !== 1 ? 's' : ''} streak
    </div>
  );
};

export default ReflectionStreakIndicator;
