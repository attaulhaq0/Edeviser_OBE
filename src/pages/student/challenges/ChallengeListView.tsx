// Task 135.2: Student Challenge List View
// Active/completed tabs, live progress bars (Supabase Realtime),
// contribution leaderboard for course-wide, team progress for team-based

import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useStudentChallenges, useChallengeProgress, type Challenge, type ChallengeParticipant } from '@/hooks/useChallenges';
import { useRealtime } from '@/hooks/useRealtime';
import { queryKeys } from '@/lib/queryKeys';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import Shimmer from '@/components/shared/Shimmer';
import { Trophy, Target, Users } from 'lucide-react';

// ─── Progress Bar ───────────────────────────────────────────────────────────

const ProgressBar = ({ current, target }: { current: number; target: number }) => {
  const pct = Math.min(100, Math.round((current / Math.max(target, 1)) * 100));
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-gray-600">{current} / {target}</span>
        <span className="font-bold text-blue-600">{pct}%</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-teal-500 to-blue-600 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

// ─── Team Progress Display ──────────────────────────────────────────────────

const TeamProgressDisplay = ({ participants, target }: { participants: ChallengeParticipant[]; target: number }) => {
  const sorted = [...participants].sort((a, b) => b.current_progress - a.current_progress);
  return (
    <div className="mt-3 space-y-2">
      {sorted.map((p, idx) => (
        <div key={p.id} className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-500 w-5">{idx + 1}.</span>
          <div className="flex-1">
            <ProgressBar current={p.current_progress} target={target} />
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── Contribution Leaderboard ───────────────────────────────────────────────

const ContributionLeaderboard = ({ participants, target }: { participants: ChallengeParticipant[]; target: number }) => {
  const sorted = [...participants].sort((a, b) => b.current_progress - a.current_progress);
  const totalProgress = participants.reduce((sum, p) => sum + p.current_progress, 0);

  return (
    <div className="mt-3 space-y-3">
      <ProgressBar current={totalProgress} target={target} />
      <div className="space-y-1">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Top Contributors</p>
        {sorted.slice(0, 5).map((p, idx) => {
          const medals = ['🥇', '🥈', '🥉'];
          return (
            <div key={p.id} className="flex items-center justify-between py-1">
              <span className="text-xs font-medium text-gray-700">
                {idx < 3 ? medals[idx] : `${idx + 1}.`} Participant
              </span>
              <span className="text-xs font-bold text-amber-600">+{p.current_progress}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Challenge Card ─────────────────────────────────────────────────────────

const ChallengeCard = ({ challenge }: { challenge: Challenge }) => {
  const { data: participants } = useChallengeProgress(challenge.id);
  const isTeam = challenge.challenge_type === 'team';

  return (
    <Card className="bg-white border-0 shadow-md rounded-xl p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <div className="p-2 rounded-lg bg-amber-50">
            {isTeam ? <Users className="h-4 w-4 text-amber-600" /> : <Target className="h-4 w-4 text-amber-600" />}
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold">{challenge.title}</p>
            {challenge.description && (
              <p className="text-xs text-gray-500 mt-0.5">{challenge.description}</p>
            )}
            <div className="flex gap-2 mt-2 flex-wrap">
              <Badge variant="outline" className="text-xs">
                {isTeam ? 'Team' : 'Course-Wide'}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {challenge.goal_metric}: {challenge.goal_target}
              </Badge>
              <Badge className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                {challenge.reward_type === 'xp_bonus' ? `+${challenge.reward_value} XP` : 'Badge'}
              </Badge>
            </div>

            {/* Live progress */}
            {participants && participants.length > 0 && (
              isTeam ? (
                <TeamProgressDisplay participants={participants} target={challenge.goal_target} />
              ) : (
                <ContributionLeaderboard participants={participants} target={challenge.goal_target} />
              )
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

// ─── Main Component ─────────────────────────────────────────────────────────

const ChallengeListView = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: challenges, isLoading } = useStudentChallenges(user?.id);
  const [activeTab, setActiveTab] = useState('active');

  // Realtime subscription for challenge progress updates
  const handleProgressUpdate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.challengeProgress.lists() });
    queryClient.invalidateQueries({ queryKey: queryKeys.studentChallenges.lists() });
  }, [queryClient]);

  useRealtime({
    table: 'challenge_participants',
    event: '*',
    onPayload: handleProgressUpdate,
    pollingFn: handleProgressUpdate,
    pollingInterval: 30_000,
  });

  const active = (challenges ?? []).filter((c) => c.status === 'active');
  const completed = (challenges ?? []).filter((c) => c.status === 'completed');

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-500" />
          <h1 className="text-2xl font-bold tracking-tight">Challenges</h1>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Shimmer key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Trophy className="h-5 w-5 text-amber-500" />
        <h1 className="text-2xl font-bold tracking-tight">Challenges</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="gap-2 bg-transparent p-0">
          <TabsTrigger
            value="active"
            className="rounded-xl border px-4 py-1.5 text-sm font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:border-blue-600 bg-white text-gray-600 border-gray-200"
          >
            Active ({active.length})
          </TabsTrigger>
          <TabsTrigger
            value="completed"
            className="rounded-xl border px-4 py-1.5 text-sm font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:border-blue-600 bg-white text-gray-600 border-gray-200"
          >
            Completed ({completed.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4 space-y-3">
          {active.length === 0 ? (
            <Card className="bg-white border-0 shadow-md rounded-xl p-8 text-center text-gray-500 text-sm">
              No active challenges right now.
            </Card>
          ) : (
            active.map((c) => <ChallengeCard key={c.id} challenge={c} />)
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-4 space-y-3">
          {completed.length === 0 ? (
            <Card className="bg-white border-0 shadow-md rounded-xl p-8 text-center text-gray-500 text-sm">
              No completed challenges yet.
            </Card>
          ) : (
            completed.map((c) => (
              <Card key={c.id} className="bg-white border-0 shadow-md rounded-xl p-4 opacity-75">
                <div className="flex items-center gap-3">
                  <Trophy className="h-4 w-4 text-green-500" />
                  <div>
                    <p className="text-sm font-semibold">{c.title}</p>
                    <p className="text-xs text-gray-500">
                      {c.challenge_type === 'team' ? 'Team' : 'Course-Wide'} · Completed
                    </p>
                  </div>
                </div>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ChallengeListView;
