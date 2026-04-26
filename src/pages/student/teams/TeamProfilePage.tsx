// =============================================================================
// TeamProfilePage — Tasks 5.1, 5.6, 12.1
// Team name, avatar, members with contribution status, Team_XP, Team_Streak,
// Cooperation Score, badges, active challenges, XP breakdown, teaching moments,
// replacement votes
// =============================================================================

import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useTeamProfile } from '@/hooks/useTeamProfile';
import { useTeamMembersList } from '@/hooks/useTeamMembers';
import { useTeamBadges } from '@/hooks/useTeamBadges';
import { useReplacementVotes, useCastVote } from '@/hooks/useReplacementVotes';
import { usePeerTeachingMoments, useCreateTeachingMoment, useRecordTeachingMomentView } from '@/hooks/usePeerTeaching';
import TeamMemberList from '@/components/shared/TeamMemberList';
import TeamBadgeCollection from '@/components/shared/TeamBadgeCollection';
import CooperationScoreDisplay from '@/components/shared/CooperationScoreDisplay';
import TeamHealthBadge from '@/components/shared/TeamHealthBadge';
import ChallengeProgressBar from '@/components/shared/ChallengeProgressBar';
import ReplacementVoteCard from '@/components/shared/ReplacementVoteCard';
import PeerTeachingMomentCard from '@/components/shared/PeerTeachingMomentCard';
import PeerTeachingMomentForm from '@/components/shared/PeerTeachingMomentForm';
import Shimmer from '@/components/shared/Shimmer';
import { toast } from 'sonner';
import { Users, Zap, Flame, Trophy, Swords, BookOpen, AlertTriangle } from 'lucide-react';

const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;

const TeamProfilePage = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const { user } = useAuth();
  const { data: team, isLoading: teamLoading } = useTeamProfile(teamId);
  const { data: members, isLoading: membersLoading } = useTeamMembersList(teamId);
  const { data: badges } = useTeamBadges(teamId ?? '');
  const { data: votes } = useReplacementVotes(teamId);
  const castVoteMutation = useCastVote();
  const { data: teachingMoments } = usePeerTeachingMoments(teamId);
  const createMomentMutation = useCreateTeachingMoment();
  const recordViewMutation = useRecordTeachingMomentView();
  const [showTeachingForm, setShowTeachingForm] = useState(false);
  const [selectedCloId, setSelectedCloId] = useState<string | null>(null);
  const [fallbackExpiresAt] = useState(() => new Date(Date.now() + FORTY_EIGHT_HOURS_MS).toISOString());

  if (teamLoading) {
    return (
      <div className="space-y-6">
        <Shimmer className="h-40 rounded-xl" />
        <Shimmer className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!team) {
    return (
      <Card className="bg-white border-0 shadow-md rounded-xl p-8 text-center">
        <Users className="h-8 w-8 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-500">Team not found.</p>
      </Card>
    );
  }

  const memberData = (members ?? []).map((m) => ({
    id: m.id,
    student_id: m.student_id,
    student_name: m.student_name,
    role: m.role,
    xp_contribution: m.xp_contribution,
    contribution_status: m.contribution_status,
    joined_at: m.joined_at,
  }));

  const earnedBadges = (badges ?? []).map((b) => ({
    id: b.id,
    badge_key: b.badge_key,
    earned_at: b.awarded_at,
  }));

  const isCaptain = memberData.some(
    (m) => m.student_id === user?.id && m.role === 'captain',
  );

  return (
    <div className="space-y-6">
      {/* Hero Card */}
      <Card
        className="border-0 shadow-lg rounded-xl overflow-hidden text-white"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #312e81 100%)' }}
      >
        <div className="p-6">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold">
              {team.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{team.name}</h1>
              <p className="text-sm text-white/70 mt-0.5">
                {memberData.length} member{memberData.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* KPI Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div>
              <p className="text-[10px] font-black tracking-widest uppercase text-white/50">Team XP</p>
              <div className="flex items-center gap-1.5 mt-1">
                <Zap className="h-4 w-4 text-amber-400" />
                <span className="text-xl font-black">{(team.xp_total ?? 0).toLocaleString()}</span>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-black tracking-widest uppercase text-white/50">Streak</p>
              <div className="flex items-center gap-1.5 mt-1">
                <Flame className="h-4 w-4 text-orange-400" />
                <span className="text-xl font-black">{team.streak_count ?? 0}</span>
                <span className="text-xs text-white/50">days</span>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-black tracking-widest uppercase text-white/50">Cooperation</p>
              <span className="text-xl font-black mt-1 block">{team.cooperation_score ?? 100}</span>
            </div>
            <div>
              <p className="text-[10px] font-black tracking-widest uppercase text-white/50">Health</p>
              <div className="mt-1">
                <TeamHealthBadge
                  score={team.health_score ?? 100}
                  status={team.health_status ?? 'healthy'}
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Members Section */}
      <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
        <div
          className="px-6 py-4 flex items-center gap-2"
          style={{ background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)' }}
        >
          <Users className="h-5 w-5 text-white" />
          <h2 className="text-lg font-bold tracking-tight text-white">Members</h2>
        </div>
        <div className="p-6">
          {membersLoading ? (
            <Shimmer className="h-32 rounded-lg" />
          ) : (
            <TeamMemberList
              members={memberData}
              teamXpTotal={team.xp_total ?? 0}
            />
          )}
        </div>
      </Card>

      {/* Cooperation Score Detail */}
      <Card className="bg-white border-0 shadow-md rounded-xl p-6">
        <h3 className="text-sm font-bold text-gray-700 mb-3">Cooperation Score</h3>
        <CooperationScoreDisplay score={team.cooperation_score ?? 100} />
      </Card>

      {/* Team Badges */}
      <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
        <div
          className="px-6 py-4 flex items-center gap-2"
          style={{ background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)' }}
        >
          <Trophy className="h-5 w-5 text-white" />
          <h2 className="text-lg font-bold tracking-tight text-white">Team Badges</h2>
        </div>
        <div className="p-6">
          <TeamBadgeCollection earnedBadges={earnedBadges} showUnearned />
        </div>
      </Card>

      {/* Active Challenges */}
      {team.activeChallenges && team.activeChallenges.length > 0 && (
        <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
          <div
            className="px-6 py-4 flex items-center gap-2"
            style={{ background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)' }}
          >
            <Swords className="h-5 w-5 text-white" />
            <h2 className="text-lg font-bold tracking-tight text-white">Active Challenges</h2>
          </div>
          <div className="p-6 space-y-4">
            {team.activeChallenges.map((challenge: { id: string; title: string; goal_target: number; current_progress: number }) => (
              <div key={challenge.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{challenge.title}</span>
                  <Badge variant="outline" className="text-xs">Active</Badge>
                </div>
                <ChallengeProgressBar
                  current={challenge.current_progress}
                  target={challenge.goal_target}
                  size="md"
                />
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Replacement Votes — Task 5.6 */}
      {votes && votes.length > 0 && (
        <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
          <div
            className="px-6 py-4 flex items-center gap-2"
            style={{ background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)' }}
          >
            <AlertTriangle className="h-5 w-5 text-white" />
            <h2 className="text-lg font-bold tracking-tight text-white">Replacement Votes</h2>
          </div>
          <div className="p-6 space-y-3">
            {votes.map((vote) => (
              <ReplacementVoteCard
                key={vote.id}
                vote={{
                  ...vote,
                  target_member_name: vote.target_name ?? 'Unknown',
                  initiated_by_name: vote.initiator_name ?? 'Unknown',
                  total_eligible_voters: 0,
                  expires_at: vote.resolved_at ?? fallbackExpiresAt,
                  status: vote.status === 'open' ? 'active' : vote.status,
                }}
                isCaptain={isCaptain}
                isTeacher={false}
                onVote={(voteId, decision) => {
                  castVoteMutation.mutate(
                    { voteId, vote: decision },
                    {
                      onSuccess: () => toast.success('Vote cast'),
                      onError: (err) => toast.error(err.message),
                    },
                  );
                }}
                onTeacherOverride={() => {}}
                isVoting={castVoteMutation.isPending}
              />
            ))}
          </div>
        </Card>
      )}

      {/* Teaching Moments — Task 12.1 */}
      <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{ background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)' }}
        >
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-white" />
            <h2 className="text-lg font-bold tracking-tight text-white">Teaching Moments</h2>
          </div>
          {!showTeachingForm && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowTeachingForm(true)}
              className="text-white/80 hover:text-white hover:bg-white/10 text-xs"
            >
              + Create
            </Button>
          )}
        </div>
        <div className="p-6 space-y-4">
          {showTeachingForm && selectedCloId && teamId && (
            <PeerTeachingMomentForm
              teamId={teamId}
              cloId={selectedCloId}
              cloTitle="Selected CLO"
              onSubmit={(data) => {
                createMomentMutation.mutate(
                  { ...data, author_id: user?.id ?? '' },
                  {
                    onSuccess: () => {
                      toast.success('Teaching moment shared! +30 XP');
                      setShowTeachingForm(false);
                      setSelectedCloId(null);
                    },
                    onError: (err) => toast.error(err.message),
                  },
                );
              }}
              onCancel={() => {
                setShowTeachingForm(false);
                setSelectedCloId(null);
              }}
              isPending={createMomentMutation.isPending}
            />
          )}

          {teachingMoments && teachingMoments.length > 0 ? (
            teachingMoments.map((moment) => (
              <PeerTeachingMomentCard
                key={moment.id}
                moment={{
                  ...moment,
                  author_name: moment.author_name ?? 'Unknown',
                  clo_title: '',
                  view_count: moment.view_count ?? 0,
                  avg_clarity_rating: moment.avg_clarity ?? null,
                  avg_helpfulness_rating: moment.avg_helpfulness ?? null,
                }}
                onView={(momentId) => {
                  recordViewMutation.mutate({
                    teaching_moment_id: momentId,
                    viewer_id: user?.id ?? '',
                  });
                }}
              />
            ))
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">
              No teaching moments yet. Master a CLO (≥85%) to share your knowledge!
            </p>
          )}
        </div>
      </Card>
    </div>
  );
};

export default TeamProfilePage;
