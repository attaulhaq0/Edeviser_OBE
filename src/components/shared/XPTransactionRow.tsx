// =============================================================================
// XPTransactionRow — Single XP transaction row for history list
// =============================================================================

import { Star, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface XPTransactionRowProps {
  sourceLabel: string;
  xpAmount: number;
  description?: string;
  timestamp: string;
  className?: string;
}

const XPTransactionRow = ({
  sourceLabel,
  xpAmount,
  description,
  timestamp,
  className,
}: XPTransactionRowProps) => {
  const isPositive = xpAmount >= 0;

  return (
    <div className={cn('flex items-center gap-3 py-3 border-b border-slate-100 last:border-0', className)}>
      <div className={cn('p-2 rounded-lg', isPositive ? 'bg-amber-50' : 'bg-red-50')}>
        {isPositive ? (
          <Star className="h-4 w-4 text-amber-500" />
        ) : (
          <TrendingDown className="h-4 w-4 text-red-500" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{sourceLabel}</p>
        {description && <p className="text-xs text-gray-500 truncate">{description}</p>}
      </div>
      <div className="text-right shrink-0">
        <p className={cn('text-sm font-bold tabular-nums', isPositive ? 'text-amber-600' : 'text-red-600')}>
          {isPositive ? '+' : ''}{xpAmount} XP
        </p>
        <p className="text-[10px] text-gray-400">{timestamp}</p>
      </div>
    </div>
  );
};

export default XPTransactionRow;
export type { XPTransactionRowProps };
