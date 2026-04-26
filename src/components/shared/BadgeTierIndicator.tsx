// Task 24.1: Badge Tier Indicator — Bronze/Silver/Gold visual ring on badges
// Requirement 133.1: Visual tier indicator on badge icons

import { cn } from '@/lib/utils';
import type { BadgeTier } from '@/hooks/useTieredBadges';

interface BadgeTierIndicatorProps {
  tier: BadgeTier | null;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const TIER_RING_COLORS: Record<BadgeTier, string> = {
  bronze: 'ring-amber-600',
  silver: 'ring-gray-400',
  gold: 'ring-yellow-400',
};

const TIER_BG_COLORS: Record<BadgeTier, string> = {
  bronze: 'bg-amber-50',
  silver: 'bg-gray-50',
  gold: 'bg-yellow-50',
};

const SIZE_MAP = {
  sm: 'ring-2 p-0.5',
  md: 'ring-[3px] p-1',
  lg: 'ring-4 p-1.5',
} as const;

const BadgeTierIndicator = ({
  tier,
  children,
  size = 'md',
  className,
}: BadgeTierIndicatorProps) => {
  if (!tier) {
    return (
      <div
        data-testid="badge-tier-indicator-none"
        className={cn('inline-flex items-center justify-center rounded-full', className)}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      data-testid={`badge-tier-indicator-${tier}`}
      className={cn(
        'inline-flex items-center justify-center rounded-full',
        SIZE_MAP[size],
        TIER_RING_COLORS[tier],
        TIER_BG_COLORS[tier],
        className,
      )}
    >
      {children}
    </div>
  );
};

export default BadgeTierIndicator;
