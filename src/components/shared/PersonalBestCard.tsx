// Task 23.1: Personal Best Card — Metric comparison with delta arrows
// Requirement 129.1: Personal Best leaderboard comparison card

import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PersonalBestCardProps {
  label: string;
  currentValue: number;
  previousValue: number;
  unit?: string;
  className?: string;
}

const PersonalBestCard = ({
  label,
  currentValue,
  previousValue,
  unit = 'XP',
  className,
}: PersonalBestCardProps) => {
  const delta = useMemo(() => currentValue - previousValue, [currentValue, previousValue]);

  const percentChange = useMemo(() => {
    if (previousValue === 0) return currentValue > 0 ? 100 : 0;
    return Math.round(((currentValue - previousValue) / previousValue) * 100);
  }, [currentValue, previousValue]);

  const isPositive = delta > 0;
  const isNeutral = delta === 0;

  return (
    <Card
      data-testid="personal-best-card"
      className={cn('bg-white border-0 shadow-md rounded-xl p-4', className)}
    >
      <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">
        {label}
      </p>
      <div className="flex items-end gap-2 mt-1">
        <span className="text-2xl font-black">
          {currentValue.toLocaleString()}
        </span>
        <span className="text-xs text-gray-400 mb-1">{unit}</span>
      </div>
      <div className="flex items-center gap-1.5 mt-2">
        {isNeutral ? (
          <Minus className="h-4 w-4 text-gray-400" />
        ) : isPositive ? (
          <TrendingUp className="h-4 w-4 text-green-500" data-testid="delta-up" />
        ) : (
          <TrendingDown className="h-4 w-4 text-red-500" data-testid="delta-down" />
        )}
        <span
          data-testid="delta-value"
          className={cn(
            'text-xs font-bold',
            isNeutral && 'text-gray-400',
            isPositive && 'text-green-600',
            !isPositive && !isNeutral && 'text-red-500',
          )}
        >
          {isPositive ? '+' : ''}
          {delta.toLocaleString()} {unit}
        </span>
        <span
          data-testid="percent-change"
          className={cn(
            'text-[10px] font-semibold',
            isNeutral && 'text-gray-400',
            isPositive && 'text-green-500',
            !isPositive && !isNeutral && 'text-red-400',
          )}
        >
          ({isPositive ? '+' : ''}
          {percentChange}%)
        </span>
      </div>
      <p className="text-[10px] text-gray-400 mt-1">vs previous week</p>
    </Card>
  );
};

export default PersonalBestCard;
