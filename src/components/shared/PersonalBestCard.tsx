// =============================================================================
// PersonalBestCard — Metric comparison card with delta arrows
// Task 23.1
// =============================================================================

import { Card } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface PersonalBestCardProps {
  label: string;
  currentValue: number;
  previousValue: number;
  unit?: string;
  isPersonalBest?: boolean;
}

const PersonalBestCard = ({
  label,
  currentValue,
  previousValue,
  unit = 'XP',
  isPersonalBest = false,
}: PersonalBestCardProps) => {
  const delta = currentValue - previousValue;
  const deltaPercent =
    previousValue > 0 ? Math.round((delta / previousValue) * 100) : 0;

  return (
    <Card
      className={`bg-white border-0 shadow-md rounded-xl p-4 ${
        isPersonalBest ? 'ring-2 ring-amber-400' : ''
      }`}
      data-testid="personal-best-card"
    >
      <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">
        {label}
      </p>
      <div className="flex items-end gap-2 mt-1">
        <p className="text-2xl font-black">
          {currentValue.toLocaleString()}
        </p>
        <span className="text-xs text-gray-400 mb-1">{unit}</span>
      </div>

      <div className="flex items-center gap-1 mt-2">
        {delta > 0 ? (
          <>
            <TrendingUp className="h-3 w-3 text-green-500" data-testid="delta-up" />
            <span className="text-xs font-bold text-green-600">
              +{delta.toLocaleString()} ({deltaPercent}%)
            </span>
          </>
        ) : delta < 0 ? (
          <>
            <TrendingDown className="h-3 w-3 text-red-500" data-testid="delta-down" />
            <span className="text-xs font-bold text-red-600">
              {delta.toLocaleString()} ({deltaPercent}%)
            </span>
          </>
        ) : (
          <>
            <Minus className="h-3 w-3 text-gray-400" data-testid="delta-neutral" />
            <span className="text-xs font-bold text-gray-500">No change</span>
          </>
        )}
        <span className="text-[10px] text-gray-400 ms-1">vs previous</span>
      </div>

      {isPersonalBest && (
        <p className="text-[10px] font-bold text-amber-600 mt-1" data-testid="personal-best-label">
          ⭐ Personal Best!
        </p>
      )}
    </Card>
  );
};

export default PersonalBestCard;
