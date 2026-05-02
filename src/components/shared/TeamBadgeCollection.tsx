// =============================================================================
// TeamBadgeCollection — Grid of earned team badges with badge-pop animation
// Task 4.3: grid display with animation, honors prefers-reduced-motion
// =============================================================================

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Award } from 'lucide-react';
import { format } from 'date-fns';

export interface TeamBadgeItem {
  id: string;
  badgeKey: string;
  badgeName: string;
  emoji: string;
  description?: string;
  earnedAt: string;
}

export interface TeamBadgeCollectionProps {
  badges: TeamBadgeItem[];
  className?: string;
}

const TeamBadgeCollection = ({ badges, className }: TeamBadgeCollectionProps) => {
  if (badges.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-8 text-center', className)}>
        <Award className="h-8 w-8 text-gray-300 mb-2" />
        <p className="text-sm text-gray-400">No team badges earned yet</p>
        <p className="text-xs text-gray-400 mt-0.5">Keep working together to unlock badges!</p>
      </div>
    );
  }

  return (
    <div
      className={cn('grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3', className)}
      role="list"
      aria-label="Team badges"
    >
      {badges.map((badge) => (
        <Card
          key={badge.id}
          role="listitem"
          className="bg-white border-0 shadow-md rounded-xl p-3 flex flex-col items-center text-center gap-1.5 animate-badge-pop motion-reduce:animate-none"
          data-testid={`team-badge-${badge.badgeKey}`}
        >
          <span className="text-3xl" aria-hidden="true">
            {badge.emoji}
          </span>
          <span className="text-xs font-bold tracking-wide">{badge.badgeName}</span>
          {badge.description && (
            <span className="text-[10px] text-gray-500 leading-tight line-clamp-2">
              {badge.description}
            </span>
          )}
          <span className="text-[10px] text-gray-400">
            {format(new Date(badge.earnedAt), 'MMM d, yyyy')}
          </span>
        </Card>
      ))}
    </div>
  );
};

export default TeamBadgeCollection;
