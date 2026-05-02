// =============================================================================
// TeamLeaderboardView — Team leaderboard tab content
// Task 4.6: medals, streak display, course/program scope, Cooperation Score sort
// =============================================================================

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Flame, Users, ArrowUpDown } from 'lucide-react';
import type { TeamLeaderboardEntry, TeamLeaderboardSort, TeamLeaderboardScope } from '@/hooks/useTeamLeaderboard';

export interface TeamLeaderboardViewProps {
  entries: TeamLeaderboardEntry[];
  currentTeamId?: string;
  scope: TeamLeaderboardScope;
  sortBy: TeamLeaderboardSort;
  onSortChange?: (sort: TeamLeaderboardSort) => void;
  onScopeChange?: (scope: TeamLeaderboardScope) => void;
  isLive?: boolean;
  className?: string;
}

const MEDAL_ICONS: Record<number, string> = {
  1: '🥇',
  2: '🥈',
  3: '🥉',
};

const TeamLeaderboardView = ({
  entries,
  currentTeamId,
  sortBy,
  onSortChange,
  isLive,
  className,
}: TeamLeaderboardViewProps) => {
  const toggleSort = () => {
    onSortChange?.(sortBy === 'xp_total' ? 'cooperation_score' : 'xp_total');
  };

  if (entries.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
        <Users className="h-10 w-10 text-gray-300 mb-3" />
        <p className="text-sm font-medium text-gray-500">No teams found</p>
        <p className="text-xs text-gray-400 mt-1">Teams will appear here once created</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isLive && (
            <Badge variant="outline" className="text-[10px] text-green-600 border-green-300 bg-green-50">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse me-1" />
              Live
            </Badge>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={toggleSort}
          className="text-xs gap-1.5 active:scale-95 transition-transform duration-100"
        >
          <ArrowUpDown className="h-3.5 w-3.5" />
          {sortBy === 'xp_total' ? 'Sort by Co-op Score' : 'Sort by XP'}
        </Button>
      </div>

      {/* Leaderboard list */}
      <div role="list" aria-label="Team leaderboard">
        {entries.map((entry) => {
          const isCurrent = entry.team_id === currentTeamId;
          const medal = MEDAL_ICONS[entry.rank];

          return (
            <div
              key={entry.team_id}
              role="listitem"
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors',
                isCurrent && 'bg-blue-50 ring-1 ring-blue-200',
                !isCurrent && 'hover:bg-slate-50',
              )}
            >
              {/* Rank */}
              <div className={cn(
                'h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold',
                entry.rank === 1 && 'bg-yellow-50 text-yellow-700',
                entry.rank === 2 && 'bg-gray-50 text-gray-600',
                entry.rank === 3 && 'bg-amber-50 text-amber-700',
                entry.rank > 3 && 'bg-gray-100 text-gray-500',
              )}>
                {medal ?? entry.rank}
              </div>

              {/* Avatar + Name */}
              <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-600 shrink-0">
                {entry.avatar_letter}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={cn(
                    'text-sm font-medium truncate',
                    isCurrent && 'font-bold text-blue-700',
                  )}>
                    {entry.team_name}
                  </span>
                  {isCurrent && (
                    <span className="text-[10px] text-blue-500">(Your Team)</span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs text-gray-500 flex items-center gap-0.5">
                    <Users className="h-3 w-3" /> {entry.member_count}
                  </span>
                  {entry.streak_count > 0 && (
                    <span className="text-xs text-orange-500 flex items-center gap-0.5">
                      <Flame className="h-3 w-3" /> {entry.streak_count}d
                    </span>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="text-end shrink-0">
                <p className="text-sm font-bold tabular-nums">
                  {sortBy === 'xp_total'
                    ? `${entry.xp_total.toLocaleString()} XP`
                    : `${entry.cooperation_score}`}
                </p>
                <p className="text-[10px] text-gray-400">
                  {sortBy === 'xp_total' ? 'Team XP' : 'Co-op Score'}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TeamLeaderboardView;
