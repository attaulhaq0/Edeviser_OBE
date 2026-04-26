// =============================================================================
// ChallengeDetailPage — Task 6.2
// Challenge info, progress bar, challenge leaderboard (hidden for cooperative),
// completion banner
// =============================================================================

import { useParams } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import {
  useChallengeDetail,
  useChallengeProgressForParticipant,
  useChallengeProgressAll,
} from '@/hooks/useChallengeProgress';
import { useChallengeRealtime } from '@/hooks/useChallengeRealtime';
import ChallengeProgressBar from '@/components/shared/ChallengeProgressBar';
import ChallengeLeaderboard from '@/components/shared/ChallengeLeaderboard';
import Shimmer from '@/components/shared/Shimmer';
import { Trophy, Target, Calendar, Zap, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { CHALLENGE_TYPES, type ChallengeTypeId } from '@/lib/challengeTypes';

const ChallengeDetailPage = () => {
  const { id: challengeId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data: challenge, isLoading } = useChallengeDetail(challengeId);
  const { data: myProgress } = useChallengeProgressForParticipant(challengeId, user?.id);
  const { data: allProgress } = useChallengeProgressAll(challengeId);

  // Realtime updates
  useChallengeRealtime({ challengeId, enabled: !!challengeId });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Shimmer className="h-40 rounded-xl" />
        <Shimmer className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!challenge) {
    return (
      <Card className="bg-white border-0 shadow-md rounded-xl p-8 text-center">
        <Target className="h-8 w-8 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-500">Challenge not found.</p>
      </Card>
    );
  }

  const typeConfig = CHALLENGE_TYPES[challenge.challenge_type as ChallengeTypeId];
  const isCooperative = challenge.challenge_type === 'cooperative';
  const isCompleted = myProgress?.completed_at !== null && myProgress?.completed_at !== undefined;

  const leaderboardEntries = (allProgress ?? []).map((p) => ({
    participant_id: p.participant_id,
    participant_name: `Participant`, // Would be resolved via join in production
    participant_type: p.participant_type,
    current_progress: p.current_progress,
    completed_at: p.completed_at,
  }));

  return (
    <div className="space-y-6">
      {/* Completion Banner */}
      {isCompleted && (
        <Card className="bg-green-50 border-0 shadow-md rounded-xl p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-green-500" />
            <div>
              <p className="text-sm font-bold text-green-700">Challenge Completed! 🎉</p>
              <p className="text-xs text-green-600">
                You earned {challenge.reward_xp} XP for completing this challenge.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Challenge Info Card */}
      <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
        <div
          className="px-6 py-4 flex items-center gap-2"
          style={{ background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)' }}
        >
          <Trophy className="h-5 w-5 text-white" />
          <h1 className="text-lg font-bold tracking-tight text-white">{challenge.title}</h1>
        </div>
        <div className="p-6 space-y-4">
          {challenge.description && (
            <p className="text-sm text-gray-600">{challenge.description}</p>
          )}

          {/* Metadata */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-xs">
              {typeConfig?.label ?? challenge.challenge_type}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {challenge.participation_mode === 'team' ? 'Team' : 'Individual'}
            </Badge>
            {isCooperative && (
              <Badge className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                Cooperative
              </Badge>
            )}
            <Badge
              variant="outline"
              className={
                challenge.status === 'active'
                  ? 'text-xs bg-green-50 text-green-700 border-green-200'
                  : 'text-xs bg-gray-50 text-gray-500 border-gray-200'
              }
            >
              {challenge.status.charAt(0).toUpperCase() + challenge.status.slice(1)}
            </Badge>
          </div>

          {/* Dates */}
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              <span>
                {format(new Date(challenge.start_date), 'MMM d, yyyy')} —{' '}
                {format(new Date(challenge.end_date), 'MMM d, yyyy')}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Zap className="h-3.5 w-3.5 text-amber-500" />
              <span className="font-bold text-amber-600">+{challenge.reward_xp} XP</span>
            </div>
          </div>

          {/* Goal */}
          <div className="p-3 rounded-lg bg-slate-50">
            <p className="text-[10px] font-black tracking-widest uppercase text-gray-500 mb-1">
              Goal
            </p>
            <p className="text-sm font-medium">
              {typeConfig?.goalDescription ?? 'Complete the challenge goal'}: {challenge.goal_target}{' '}
              {typeConfig?.goalUnit ?? 'units'}
            </p>
          </div>

          {/* My Progress */}
          {myProgress && (
            <div>
              <p className="text-[10px] font-black tracking-widest uppercase text-gray-500 mb-2">
                Your Progress
              </p>
              <ChallengeProgressBar
                current={myProgress.current_progress}
                target={challenge.goal_target}
                size="lg"
              />
            </div>
          )}
        </div>
      </Card>

      {/* Challenge Leaderboard (hidden for cooperative) */}
      {!isCooperative && leaderboardEntries.length > 0 && (
        <ChallengeLeaderboard
          entries={leaderboardEntries}
          goalTarget={challenge.goal_target}
          currentParticipantId={user?.id}
        />
      )}

      {/* Cooperative message */}
      {isCooperative && (
        <Card className="bg-blue-50 border-0 shadow-md rounded-xl p-4">
          <p className="text-sm text-blue-700">
            This is a cooperative challenge. Your team works together toward a shared goal — no
            competitive leaderboard is shown.
          </p>
        </Card>
      )}
    </div>
  );
};

export default ChallengeDetailPage;
