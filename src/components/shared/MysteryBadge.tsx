// =============================================================================
// MysteryBadge — Badge with hidden conditions, reveals on earn
// =============================================================================

import { HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MysteryBadgeProps {
  name: string;
  emoji: string;
  isEarned: boolean;
  hint?: string;
  className?: string;
}

const MysteryBadge = ({ name, emoji, isEarned, hint, className }: MysteryBadgeProps) => (
  <div
    className={cn(
      'flex flex-col items-center gap-1 rounded-xl p-3 text-center transition-all',
      isEarned ? 'bg-amber-50' : 'bg-gray-100',
      className,
    )}
  >
    <div
      className={cn(
        'flex h-12 w-12 items-center justify-center rounded-full text-2xl',
        isEarned ? 'animate-badge-pop' : 'grayscale opacity-40',
      )}
    >
      {isEarned ? emoji : <HelpCircle className="h-6 w-6 text-gray-400" />}
    </div>
    <span className={cn('text-xs font-semibold', isEarned ? 'text-gray-900' : 'text-gray-400')}>
      {isEarned ? name : '???'}
    </span>
    {!isEarned && hint && (
      <span className="text-[10px] text-gray-400 italic">{hint}</span>
    )}
  </div>
);

export default MysteryBadge;
export type { MysteryBadgeProps };
