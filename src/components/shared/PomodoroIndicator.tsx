import { cn } from '@/lib/utils';
import type { PomodoroIntervalType } from '@/types/planner';

interface PomodoroIndicatorProps {
  currentInterval: number;
  totalIntervals: number;
  intervalType: PomodoroIntervalType;
}

const typeLabels: Record<PomodoroIntervalType, string> = {
  work: 'Work',
  break: 'Break',
  long_break: 'Long Break',
};

const typeColors: Record<PomodoroIntervalType, string> = {
  work: 'bg-blue-500',
  break: 'bg-green-500',
  long_break: 'bg-teal-500',
};

const PomodoroIndicator = ({
  currentInterval,
  totalIntervals,
  intervalType,
}: PomodoroIndicatorProps) => (
  <div className="flex items-center gap-3">
    <span className="text-sm font-semibold text-gray-700">
      {typeLabels[intervalType]} {currentInterval} of {totalIntervals}
    </span>
    <div className="flex gap-1.5">
      {Array.from({ length: totalIntervals }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'h-2.5 w-2.5 rounded-full transition-colors',
            i < currentInterval ? typeColors[intervalType] : 'bg-gray-200',
          )}
        />
      ))}
    </div>
  </div>
);

export default PomodoroIndicator;
