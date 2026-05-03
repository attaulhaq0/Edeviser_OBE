// =============================================================================
// BadgeTierIndicator — Bronze/Silver/Gold visual indicator on badges
// Task 24.1
// =============================================================================

import { cn } from '@/lib/utils';

export type BadgeTierLevel = 'bronze' | 'silver' | 'gold';

interface BadgeTierIndicatorProps {
  tier: BadgeTierLevel | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const TIER_STYLES: Record<BadgeTierLevel, { bg: string; border: string; text: string; label: string }> = {
  bronze: {
    bg: 'bg-amber-600',
    border: 'border-amber-600',
    text: 'text-white',
    label: 'Bronze',
  },
  silver: {
    bg: 'bg-gray-400',
    border: 'border-gray-400',
    text: 'text-white',
    label: 'Silver',
  },
  gold: {
    bg: 'bg-yellow-400',
    border: 'border-yellow-400',
    text: 'text-yellow-900',
    label: 'Gold',
  },
};

const SIZE_MAP = {
  sm: 'text-[8px] px-1 py-0.5',
  md: 'text-[10px] px-1.5 py-0.5',
  lg: 'text-xs px-2 py-1',
} as const;

const BadgeTierIndicator = ({ tier, size = 'md', className }: BadgeTierIndicatorProps) => {
  if (!tier) return null;

  const style = TIER_STYLES[tier];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-bold uppercase tracking-wider',
        style.bg,
        style.text,
        SIZE_MAP[size],
        className,
      )}
      data-testid={`badge-tier-${tier}`}
    >
      {style.label}
    </span>
  );
};

export default BadgeTierIndicator;
