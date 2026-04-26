// =============================================================================
// ChallengeLeaderboard — Task 4.5
// Per-challenge participant ranking with medals, anonymous support,
// current user highlight
// =============================================================================

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Medal, Trophy, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import ChallengeProgressBar from '@/components/shared/ChallengeProgressBar';
import Shimmer from '@/components/shared/Shimmer';

export interface ChallengeLeaderboardEntry {
  participant_id: string;
  participant_name: string;
  participant_type: 'team' | 'individual';
  current_progress: number;
  completed_at: string | null;
  is_anonymous?: boolean;
}

interface ChallengeLeaderboardProps {
  entries: ChallengeLeaderboardEntry[];
  goalTarget: number;
  currentParticipantId?: string;
  isLoading?: boolean;
  className?: string;
}

const getMedalColor = (rank: number): string | null => {
  if (rank === 1) return '#EAB308'; // Gold
  if (rank === 2) return '#9CA3AF'; // Silver
  if (rank === 3) return '#D97706'; // Bronze
  return null;
};

const getRankBg = (rank: number): string => {
  if (rank === 1) return 'bg-yellow-50 border-yellow-200';
  if (rank === 2) return 'bg-gray-50 border-gray-200';
  if (rank === 3) return 'bg-amber-50 border-amber-200';
  return 'bg-white border-slate-100';
};

const ChallengeLeaderboard = ({
  entries,
  goalTarget,
  currentParticipantId,
  isLoading,
  className,
}: ChallengeLeaderboardProps) => {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Shimmer key={i} className="h-14 rounded-xl" />
        ))}
      </div>
    );
  }

  // Sort by progress desc, then by completion time asc
  const sorted = [...entries].sort((a, b) => {
    if (b.current_progress !== a.current_progress) {
      return b.current_progress - a.current_progress;
    }
    // Earlier completion wins
    if (a.completed_at && b.completed_at) {
      return new Date(a.completed_at).getTime() - new Date(b.completed_at).getTime();
    }
    if (a.completed_at) return -1;
    if (b.completed_at) return 1;
    return 0;
  });

  if (sorted.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-6">
        No participants yet.
      </p>
    );
  }

  return (
    <Card
      className={cn('bg-white border-0 shadow-md rounded-xl overflow-hidden', className)}
      data-testid="challenge-leaderboard"
    >
      <div
        className="px-6 py-4 flex items-center gap-2"
        style={{ background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)' }}
      >
        <Trophy className="h-5 w-5 text-white" />
        <h2 className="text-lg font-bold tracking-tight text-white">
          Challenge Leaderboard
        </h2>
      </div>
      <div className="p-4 space-y-2">
        {sorted.map((entry, index) => {
          const rank = index + 1;
          const medalColor = getMedalColor(rank);
          const isCurrent = entry.participant_id === currentParticipantId;
          const isCompleted = entry.completed_at !== null;
          const displayName = entry.is_anonymous ? 'Anonymous' : entry.participant_name;

          return (
            <div
              key={entry.participant_id}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors',
                getRankBg(rank),
                isCurrent && 'ring-2 ring-blue-400',
              )}
              data-testid={`challenge-rank-${rank}`}
            >
              {/* Rank */}
              <div className="flex items-center justify-center w-8 shrink-0">
                {medalColor ? (
                  <Medal className="h-5 w-5" style={{ color: medalColor }} />
                ) : (
                  <span className="text-sm font-bold text-gray-500">#{rank}</span>
                )}
              </div>

              {/* Name */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'text-sm font-semibold truncate',
                      entry.is_anonymous && 'text-gray-400 italic',
                      isCurrent && 'text-blue-700',
                    )}
                  >
                    {displayName}
                    {isCurrent && (
                      <span className="ms-1 text-xs font-normal text-blue-500">(You)</span>
                    )}
                  </span>
                  {entry.participant_type === 'team' && (
                    <Badge variant="outline" className="text-[10px]">Team</Badge>
                  )}
                  {isCompleted && (
                    <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                  )}
                </div>
              </div>

              {/* Progress */}
              <div className="w-32 shrink-0">
                <ChallengeProgressBar
                  current={entry.current_progress}
                  target={goalTarget}
                  size="sm"
                  showLabel={false}
                />
              </div>

              {/* Progress Value */}
              <span className="text-xs font-bold text-gray-600 shrink-0 w-16 text-end">
                {entry.current_progress} / {goalTarget}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default ChallengeLeaderboard;
