// =============================================================================
// TeamBadgeCollection — Task 4.3
// Grid of earned team badges with badge-pop animation
// =============================================================================

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { TEAM_BADGE_DEFINITIONS, type TeamBadgeDef } from '@/lib/teamBadgeDefinitions';
import { format } from 'date-fns';

export interface EarnedTeamBadge {
  id: string;
  badge_key: string;
  earned_at: string;
}

interface TeamBadgeCollectionProps {
  earnedBadges: EarnedTeamBadge[];
  showUnearned?: boolean;
  className?: string;
}

const TeamBadgeCollection = ({
  earnedBadges,
  showUnearned = false,
  className,
}: TeamBadgeCollectionProps) => {
  const earnedKeys = new Set(earnedBadges.map((b) => b.badge_key));

  const badgesToShow: Array<{
    def: TeamBadgeDef;
    earned: EarnedTeamBadge | undefined;
    isEarned: boolean;
  }> = TEAM_BADGE_DEFINITIONS.map((def) => {
    const earned = earnedBadges.find((b) => b.badge_key === def.id);
    return { def, earned, isEarned: earnedKeys.has(def.id) };
  }).filter((b) => showUnearned || b.isEarned);

  if (badgesToShow.length === 0) {
    return (
      <p className="text-xs text-gray-400 text-center py-4" data-testid="no-team-badges">
        No team badges earned yet. Keep working together!
      </p>
    );
  }

  return (
    <div
      className={cn('grid grid-cols-2 sm:grid-cols-3 gap-3', className)}
      data-testid="team-badge-collection"
    >
      <AnimatePresence>
        {badgesToShow.map(({ def, earned, isEarned }) => (
          <motion.div
            key={def.id}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <Card
              className={cn(
                'bg-white border-0 shadow-md rounded-xl p-3 flex flex-col items-center text-center gap-1.5',
                isEarned
                  ? 'border-s-4 border-s-amber-400'
                  : 'opacity-40 grayscale',
              )}
              data-testid={`team-badge-${def.id}`}
            >
              <span
                className={cn('text-2xl', isEarned && 'animate-badge-pop')}
                aria-hidden="true"
              >
                {def.icon}
              </span>
              <span className="text-xs font-bold tracking-wide">{def.name}</span>
              <span className="text-[10px] text-gray-500 leading-tight">
                {def.description}
              </span>
              {earned && (
                <span className="text-[10px] text-gray-400">
                  {format(new Date(earned.earned_at), 'MMM d, yyyy')}
                </span>
              )}
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default TeamBadgeCollection;
