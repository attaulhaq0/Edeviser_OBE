// Task 148.7: League Tier Badge component
// Requirements: 132.3

import { type LeagueTierName, TIER_COLORS } from '@/lib/leagueTier';
import { Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LeagueTierBadgeProps {
  tier: LeagueTierName;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_MAP = {
  sm: { badge: 'px-2 py-0.5 text-xs', icon: 'h-3 w-3' },
  md: { badge: 'px-3 py-1 text-sm', icon: 'h-4 w-4' },
  lg: { badge: 'px-4 py-1.5 text-base', icon: 'h-5 w-5' },
} as const;

const LeagueTierBadge = ({ tier, size = 'md', className }: LeagueTierBadgeProps) => {
  const sizeClasses = SIZE_MAP[size];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-bold',
        TIER_COLORS[tier],
        sizeClasses.badge,
        className,
      )}
      data-testid={`league-badge-${tier.toLowerCase()}`}
    >
      <Shield className={sizeClasses.icon} />
      {tier}
    </span>
  );
};

export default LeagueTierBadge;
