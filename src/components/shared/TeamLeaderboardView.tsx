// =============================================================================
// TeamLeaderboardView — Task 4.6
// Team leaderboard tab content with medals, streak display, course/program
// scope, Cooperation Score sort
// =============================================================================

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Medal, Flame, Trophy, Users, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import CooperationScoreDisplay from '@/components/shared/CooperationScoreDisplay';
import TeamHealthBadge from '@/components/shared/TeamHealthBadge';
import Shimmer from '@/components/shared/Shimmer';

export interface TeamLeaderboardEntry {
  team_id: string;
  team_name: string;
  xp_total: number;
  streak_count: number;
  member_count: number;
  cooperation_score: number;
  health_score: number;
  health_status: 'healthy' | 'needs_attention' | 'at_risk';
}

interface TeamLeaderboardViewProps {
  entries: TeamLeaderboardEntry[];
  currentTeamId?: string;
  isLoading?: boolean;
  className?: string;
}

type SortMode = 'xp' | 'cooperation';

const getMedalColor = (rank: number): string | null => {
  if (rank === 1) return '#EAB308';
  if (rank === 2) return '#9CA3AF';
  if (rank === 3) return '#D97706';
  return null;
};

const getRankBg = (rank: number): string => {
  if (rank === 1) return 'bg-yellow-50 border-yellow-200';
  if (rank === 2) return 'bg-gray-50 border-gray-200';
  if (rank === 3) return 'bg-amber-50 border-amber-200';
  return 'bg-white border-slate-100';
};

const TeamLeaderboardView = ({
  entries,
  currentTeamId,
  isLoading,
  className,
}: TeamLeaderboardViewProps) => {
  const [sortMode, setSortMode] = useState<SortMode>('xp');

  const sorted = [...entries].sort((a, b) => {
    if (sortMode === 'cooperation') return b.cooperation_score - a.cooperation_score;
    return b.xp_total - a.xp_total;
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Shimmer key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <Card
      className={cn('bg-white border-0 shadow-md rounded-xl overflow-hidden', className)}
      data-testid="team-leaderboard-view"
    >
      <div
        className="px-6 py-4 flex items-center justify-between"
        style={{ background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)' }}
      >
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-white" />
          <h2 className="text-lg font-bold tracking-tight text-white">Team Leaderboard</h2>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setSortMode((m) => (m === 'xp' ? 'cooperation' : 'xp'))}
          className="h-7 text-xs text-white/80 hover:text-white hover:bg-white/10"
        >
          <ArrowUpDown className="h-3.5 w-3.5 me-1" />
          {sortMode === 'xp' ? 'Sort by Cooperation' : 'Sort by XP'}
        </Button>
      </div>

      <div className="p-4 space-y-2">
        {sorted.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No teams yet.</p>
        ) : (
          sorted.map((entry, index) => {
            const rank = index + 1;
            const medalColor = getMedalColor(rank);
            const isCurrent = entry.team_id === currentTeamId;

            return (
              <div
                key={entry.team_id}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors',
                  getRankBg(rank),
                  isCurrent && 'ring-2 ring-blue-400',
                )}
                data-testid={`team-rank-${rank}`}
              >
                {/* Rank */}
                <div className="flex items-center justify-center w-8 shrink-0">
                  {medalColor ? (
                    <Medal className="h-5 w-5" style={{ color: medalColor }} />
                  ) : (
                    <span className="text-sm font-bold text-gray-500">#{rank}</span>
                  )}
                </div>

                {/* Team Avatar */}
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-600 shrink-0">
                  {entry.team_name.charAt(0).toUpperCase()}
                </div>

                {/* Team Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'text-sm font-semibold truncate',
                        isCurrent && 'text-blue-700',
                      )}
                    >
                      {entry.team_name}
                      {isCurrent && (
                        <span className="ms-1 text-xs font-normal text-blue-500">(Your Team)</span>
                      )}
                    </span>
                    <span className="text-xs text-gray-400 shrink-0">
                      <Users className="h-3 w-3 inline me-0.5" />
                      {entry.member_count}
                    </span>
                  </div>
                </div>

                {/* Streak */}
                {entry.streak_count > 0 && (
                  <div className="flex items-center gap-1 shrink-0">
                    <Flame className="h-4 w-4 text-orange-500" />
                    <span className="text-xs font-bold text-orange-600">{entry.streak_count}</span>
                  </div>
                )}

                {/* Cooperation Score */}
                <CooperationScoreDisplay score={entry.cooperation_score} compact />

                {/* Health */}
                <TeamHealthBadge score={entry.health_score} status={entry.health_status} showScore={false} />

                {/* XP */}
                <div className="text-end shrink-0">
                  <span className="text-sm font-bold text-amber-500">
                    {entry.xp_total.toLocaleString()} XP
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
};

export default TeamLeaderboardView;
