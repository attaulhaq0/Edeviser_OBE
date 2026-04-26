// =============================================================================
// ChallengeListPage — Task 6.1
// List active, upcoming, completed challenges with status badges,
// progress indicators, cooperative/competitive labels
// =============================================================================

import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useStudentChallenges, type Challenge } from '@/hooks/useChallenges';
import { useRealtime } from '@/hooks/useRealtime';
import { queryKeys } from '@/lib/queryKeys';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import ChallengeProgressBar from '@/components/shared/ChallengeProgressBar';
import Shimmer from '@/components/shared/Shimmer';
import { Trophy, Target, Users, Handshake, ArrowRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const statusBadge = (status: string) => {
  switch (status) {
    case 'active':
      return <Badge className="bg-green-50 text-green-700 border-green-200 text-xs">Active</Badge>;
    case 'ended':
    case 'completed':
      return <Badge className="bg-gray-50 text-gray-600 border-gray-200 text-xs">Ended</Badge>;
    case 'draft':
      return <Badge className="bg-blue-50 text-blue-600 border-blue-200 text-xs">Upcoming</Badge>;
    default:
      return null;
  }
};

const typeBadge = (type: string) => {
  if (type === 'cooperative') {
    return (
      <Badge variant="outline" className="text-xs gap-1">
        <Handshake className="h-3 w-3" /> Cooperative
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-xs gap-1">
      <Target className="h-3 w-3" /> Competitive
    </Badge>
  );
};

const ChallengeCard = ({ challenge }: { challenge: Challenge }) => {
  const isTeam = challenge.participation_mode === 'team' || challenge.challenge_type === 'team';

  return (
    <Link to={`/student/challenges/${challenge.id}`}>
      <Card className="bg-white border-0 shadow-md rounded-xl p-4 hover:shadow-lg transition-shadow cursor-pointer">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <div className="p-2 rounded-lg bg-amber-50">
              {isTeam ? (
                <Users className="h-4 w-4 text-amber-600" />
              ) : (
                <Trophy className="h-4 w-4 text-amber-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">{challenge.title}</p>
              {challenge.description && (
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{challenge.description}</p>
              )}
              <div className="flex gap-2 mt-2 flex-wrap">
                {statusBadge(challenge.status)}
                {typeBadge(challenge.challenge_type)}
                <Badge className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                  +{challenge.reward_xp ?? challenge.reward_value ?? 0} XP
                </Badge>
              </div>
              {challenge.status === 'active' && (
                <div className="mt-3">
                  <ChallengeProgressBar current={0} target={challenge.goal_target} showLabel />
                </div>
              )}
              <p className="text-xs text-gray-400 mt-2">
                {challenge.status === 'active'
                  ? `Ends ${formatDistanceToNow(new Date(challenge.end_date), { addSuffix: true })}`
                  : `Started ${formatDistanceToNow(new Date(challenge.start_date), { addSuffix: true })}`}
              </p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-gray-400 shrink-0 mt-1" />
        </div>
      </Card>
    </Link>
  );
};

const ChallengeListPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: challenges, isLoading } = useStudentChallenges(user?.id);
  const [activeTab, setActiveTab] = useState('active');

  const handleProgressUpdate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.challengeProgress.lists() });
  }, [queryClient]);

  useRealtime({
    table: 'challenge_progress',
    event: '*',
    onPayload: handleProgressUpdate,
    pollingFn: handleProgressUpdate,
    pollingInterval: 30_000,
  });

  const active = (challenges ?? []).filter((c) => c.status === 'active');
  const upcoming = (challenges ?? []).filter((c) => c.status === 'draft');
  const ended = (challenges ?? []).filter((c) => c.status === 'ended' || c.status === 'completed');

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
            value="upcoming"
            className="rounded-xl border px-4 py-1.5 text-sm font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:border-blue-600 bg-white text-gray-600 border-gray-200"
          >
            Upcoming ({upcoming.length})
          </TabsTrigger>
          <TabsTrigger
            value="ended"
            className="rounded-xl border px-4 py-1.5 text-sm font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:border-blue-600 bg-white text-gray-600 border-gray-200"
          >
            Completed ({ended.length})
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

        <TabsContent value="upcoming" className="mt-4 space-y-3">
          {upcoming.length === 0 ? (
            <Card className="bg-white border-0 shadow-md rounded-xl p-8 text-center text-gray-500 text-sm">
              No upcoming challenges.
            </Card>
          ) : (
            upcoming.map((c) => <ChallengeCard key={c.id} challenge={c} />)
          )}
        </TabsContent>

        <TabsContent value="ended" className="mt-4 space-y-3">
          {ended.length === 0 ? (
            <Card className="bg-white border-0 shadow-md rounded-xl p-8 text-center text-gray-500 text-sm">
              No completed challenges yet.
            </Card>
          ) : (
            ended.map((c) => <ChallengeCard key={c.id} challenge={c} />)
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ChallengeListPage;
