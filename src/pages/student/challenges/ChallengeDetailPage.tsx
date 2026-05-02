// =============================================================================
// ChallengeDetailPage — Challenge info, progress bar, leaderboard
// Task 6.2: hidden leaderboard for cooperative, completion banner
// =============================================================================

import { useParams, useNavigate } from 'react-router-dom';
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import ChallengeProgressBar from '@/components/shared/ChallengeProgressBar';
import ChallengeLeaderboard, { type LeaderboardParticipant } from '@/components/shared/ChallengeLeaderboard';
import Shimmer from '@/components/shared/Shimmer';
import {
  ArrowLeft,
  Trophy,
  Calendar,
  Target,
  Handshake,
  CheckCircle2,
} from 'lucide-react';

interface ChallengeDetail {
  id: string;
  title: string;
  description: string;
  challenge_type: string;
  participation_mode: string;
  goal_target: number;
  start_date: string;
  end_date: string;
  reward_xp: number;
  reward_badge_id: string | null;
  status: string;
}

interface ProgressRecord {
  current_progress: number;
  completed_at: string | null;
}

const useChallengeDetail = (challengeId?: string) => {
  return useQuery({
    queryKey: queryKeys.challenges.detail(challengeId ?? ''),
    queryFn: async (): Promise<ChallengeDetail | null> => {
      const { data, error } = await supabase
        .from('social_challenges' as never)
        .select('*')
        .eq('id', challengeId!)
        .single();
      if (error) throw error;
      return data as ChallengeDetail;
    },
    enabled: !!challengeId,
  });
};

const useMyProgress = (challengeId?: string, userId?: string) => {
  return useQuery({
    queryKey: queryKeys.challengeProgress.list({ challengeId, participantId: userId }),
    queryFn: async (): Promise<ProgressRecord | null> => {
      const { data, error } = await supabase
        .from('challenge_progress' as never)
        .select('current_progress, completed_at')
        .eq('challenge_id', challengeId!)
        .eq('participant_id', userId!)
        .maybeSingle();
      if (error) throw error;
      return data as ProgressRecord | null;
    },
    enabled: !!challengeId && !!userId,
  });
};

const useLeaderboardParticipants = (challengeId?: string) => {
  return useQuery({
    queryKey: queryKeys.challengeLeaderboard.list({ challengeId }),
    queryFn: async (): Promise<LeaderboardParticipant[]> => {
      const { data, error } = await supabase
        .from('challenge_progress' as never)
        .select('participant_id, participant_type, current_progress, completed_at')
        .eq('challenge_id', challengeId!)
        .order('current_progress', { ascending: false });
      if (error) throw error;

      return ((data ?? []) as Array<{
        participant_id: string;
        participant_type: string;
        current_progress: number;
        completed_at: string | null;
      }>).map((row, idx) => ({
        participantId: row.participant_id,
        displayName: `Participant ${idx + 1}`,
        currentProgress: row.current_progress,
        goalTarget: 0,
        completedAt: row.completed_at,
        rank: idx + 1,
      }));
    },
    enabled: !!challengeId,
  });
};

const ChallengeDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: challenge, isLoading } = useChallengeDetail(id);
  const { data: myProgress } = useMyProgress(id, user?.id);
  const { data: leaderboardParticipants } = useLeaderboardParticipants(id);

  const [now] = useState(() => Date.now());
  const daysLeft = useMemo(
    () => {
      if (!challenge) return 0;
      return Math.max(
        0,
        Math.ceil((new Date(challenge.end_date).getTime() - now) / (1000 * 60 * 60 * 24)),
      );
    },
    [challenge, now],
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Shimmer className="h-10 w-48 rounded-lg" />
        <Shimmer className="h-48 rounded-xl" />
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 me-1" /> Back
        </Button>
        <Card className="bg-white border-0 shadow-md rounded-xl p-8 text-center">
          <p className="text-sm text-gray-500">Challenge not found.</p>
        </Card>
      </div>
    );
  }

  const isCooperative = challenge.challenge_type === 'cooperative';
  const isCompleted = !!myProgress?.completed_at;

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4 me-1" /> Back to Challenges
      </Button>

      {/* Completion Banner */}
      {isCompleted && (
        <Card className="bg-green-50 border-0 shadow-md rounded-xl p-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
            <div>
              <p className="text-sm font-bold text-green-700">Challenge Completed!</p>
              <p className="text-xs text-green-600">
                Completed on {new Date(myProgress!.completed_at!).toLocaleDateString()}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Challenge Info */}
      <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
        <div
          className="px-6 py-4 flex items-center gap-2"
          style={{ background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)' }}
        >
          {isCooperative ? (
            <Handshake className="h-5 w-5 text-white" />
          ) : (
            <Trophy className="h-5 w-5 text-white" />
          )}
          <h1 className="text-lg font-bold tracking-tight text-white">{challenge.title}</h1>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600">{challenge.description}</p>

          <div className="flex gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs">
              {challenge.challenge_type}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {challenge.participation_mode}
            </Badge>
            <Badge className="text-xs bg-amber-50 text-amber-700 border-amber-200">
              +{challenge.reward_xp} XP
            </Badge>
            {challenge.status === 'active' && (
              <Badge className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                {daysLeft} days left
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>Start: {new Date(challenge.start_date).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>End: {new Date(challenge.end_date).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Progress */}
          <div className="pt-2">
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-1">
              <Target className="h-4 w-4" /> Your Progress
            </h3>
            <ChallengeProgressBar
              current={myProgress?.current_progress ?? 0}
              goal={challenge.goal_target}
              label={challenge.title}
            />
          </div>
        </div>
      </Card>

      {/* Leaderboard — hidden for cooperative challenges */}
      {!isCooperative && (
        <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
          <div
            className="px-6 py-4 flex items-center gap-2"
            style={{ background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)' }}
          >
            <Trophy className="h-5 w-5 text-white" />
            <h2 className="text-lg font-bold tracking-tight text-white">Leaderboard</h2>
          </div>
          <div className="p-6">
            <ChallengeLeaderboard
              participants={leaderboardParticipants ?? []}
              currentUserId={user?.id}
              goalTarget={challenge.goal_target}
            />
          </div>
        </Card>
      )}

      {isCooperative && (
        <Card className="bg-white border-0 shadow-md rounded-xl p-6 text-center">
          <Handshake className="h-8 w-8 text-green-500 mx-auto mb-2" />
          <p className="text-sm text-gray-500">
            This is a cooperative challenge — everyone works together toward the goal.
            No leaderboard is shown.
          </p>
        </Card>
      )}
    </div>
  );
};

export default ChallengeDetailPage;
