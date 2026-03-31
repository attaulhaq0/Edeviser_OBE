// Task 132.3: Team Badge Display component
// Displays team badges with emoji, name, description, earned date
// Animated notification when badge awarded (Framer Motion)

import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { useTeamBadges } from '@/hooks/useTeamBadges';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Types ───────────────────────────────────────────────────────────────────

interface TeamBadgeDisplayProps {
  teamId: string;
  compact?: boolean;
}

// ─── Badge metadata ──────────────────────────────────────────────────────────

const TEAM_BADGE_DESCRIPTIONS: Record<string, string> = {
  team_spirit: 'Team earned 500 XP together',
  unstoppable: 'Team won 3 challenges',
  dream_team: 'All members completed a Perfect Day on the same day',
  study_squad: 'Team maintained a 7-day streak',
};

// ─── Component ───────────────────────────────────────────────────────────────

const TeamBadgeDisplay = ({ teamId, compact = false }: TeamBadgeDisplayProps) => {
  const { data: badges, isLoading } = useTeamBadges(teamId);

  const badgeList = useMemo(() => badges ?? [], [badges]);

  if (isLoading) {
    return (
      <div className="animate-shimmer h-20 rounded-xl bg-gray-100" data-testid="team-badges-loading" />
    );
  }

  if (compact) {
    return (
      <div data-testid="team-badge-display-compact" className="flex gap-2 flex-wrap">
        {badgeList.length === 0 && (
          <span className="text-xs text-gray-400">No team badges yet</span>
        )}
        <AnimatePresence>
          {badgeList.map((badge) => (
            <motion.div
              key={badge.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 border border-amber-200"
              title={`${badge.badge_name} — ${TEAM_BADGE_DESCRIPTIONS[badge.badge_key] ?? ''}`}
            >
              <span className="text-sm" aria-hidden="true">{badge.emoji}</span>
              <span className="text-[10px] font-bold text-amber-700">{badge.badge_name}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div data-testid="team-badge-display" className="space-y-3">
      <h3 className="text-sm font-bold text-gray-700">Team Badges</h3>
      {badgeList.length === 0 && (
        <p className="text-xs text-gray-400">No team badges earned yet. Keep working together!</p>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <AnimatePresence>
          {badgeList.map((badge) => (
            <motion.div
              key={badge.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              <Card
                data-testid={`team-badge-${badge.badge_key}`}
                className="bg-white border-0 shadow-md rounded-xl p-3 flex flex-col items-center text-center gap-1.5 border-l-4 border-l-amber-400"
              >
                <span className="text-2xl animate-badge-pop" aria-hidden="true">
                  {badge.emoji}
                </span>
                <span className="text-xs font-bold tracking-wide">{badge.badge_name}</span>
                <span className="text-[10px] text-gray-500 leading-tight">
                  {TEAM_BADGE_DESCRIPTIONS[badge.badge_key] ?? ''}
                </span>
                <span className="text-[10px] text-gray-400">
                  {format(new Date(badge.awarded_at), 'MMM d, yyyy')}
                </span>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default TeamBadgeDisplay;
