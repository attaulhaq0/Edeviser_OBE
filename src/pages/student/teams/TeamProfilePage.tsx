// =============================================================================
// TeamProfilePage — Student team profile with stats, members, badges,
// active challenges, XP breakdown, teaching moments, replacement votes
// Task 5.1 + 5.6
// =============================================================================

import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTeamProfile } from "@/hooks/useTeamProfile";
import {
  useReplacementVotes,
  useInitiateVote,
  useCastVote,
} from "@/hooks/useReplacementVotes";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import TeamMemberList, {
  type TeamMemberItem,
} from "@/components/shared/TeamMemberList";
import TeamBadgeCollection, {
  type TeamBadgeItem,
} from "@/components/shared/TeamBadgeCollection";
import ChallengeProgressBar from "@/components/shared/ChallengeProgressBar";
import CooperationScoreDisplay from "@/components/shared/CooperationScoreDisplay";
import PeerTeachingMomentCard from "@/components/shared/PeerTeachingMomentCard";
import ReplacementVoteCard from "@/components/shared/ReplacementVoteCard";
import Shimmer from "@/components/shared/Shimmer";
import { TEAM_BADGE_DEFINITIONS } from "@/lib/teamBadgeDefinitions";
import {
  Users,
  Zap,
  Flame,
  Trophy,
  Target,
  BookOpen,
  Vote,
} from "lucide-react";
import type { ContributionStatus } from "@/lib/contributionThresholds";

const TeamProfilePage = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const { user } = useAuth();
  const { data: profile, isLoading } = useTeamProfile(teamId);
  const { data: votes } = useReplacementVotes(teamId);
  const initiateVoteMutation = useInitiateVote();
  const castVoteMutation = useCastVote();

  // Map members to TeamMemberItem format
  const memberItems: TeamMemberItem[] = useMemo(() => {
    if (!profile) return [];
    return profile.members.map((m) => ({
      id: m.id,
      studentId: m.student_id,
      displayName: m.student_id, // Will show student_id as name (profile join not available)
      role: m.role as "captain" | "member",
      xpContribution: 0,
      contributionStatus: (m.contribution_status ??
        "active") as ContributionStatus,
    }));
  }, [profile]);

  // Map badges to TeamBadgeItem format
  const badgeItems: TeamBadgeItem[] = useMemo(() => {
    if (!profile) return [];
    return profile.badges.map((b) => {
      const def = TEAM_BADGE_DEFINITIONS.find((d) => d.id === b.badge_key);
      return {
        id: b.id,
        badgeKey: b.badge_key,
        badgeName: def?.name ?? b.badge_key,
        emoji: def?.icon ?? "🏆",
        description: def?.description,
        earnedAt: b.earned_at,
      };
    });
  }, [profile]);

  // Inactive members for vote initiation
  const inactiveMembers = useMemo(() => {
    return memberItems
      .filter((m) => m.contributionStatus === "inactive")
      .map((m) => ({ id: m.studentId, name: m.displayName }));
  }, [memberItems]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Shimmer className="h-10 w-48 rounded-lg" />
        <Shimmer className="h-48 rounded-xl" />
        <Shimmer className="h-32 rounded-xl" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Team Profile</h1>
        <Card className="bg-white border-0 shadow-md rounded-xl p-8 text-center">
          <Users className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Team not found.</p>
        </Card>
      </div>
    );
  }

  const { team, activeChallenges, teachingMoments } = profile;
  const isCaptain = team.captain_id === user?.id;
  const openVotes = (votes ?? []).filter((v) => v.status === "open");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="h-12 w-12 rounded-full flex items-center justify-center text-lg font-bold text-white shrink-0"
          style={{
            background: "var(--brand-gradient)",
          }}
        >
          {team.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{team.name}</h1>
          <p className="text-xs text-gray-500">
            Created {new Date(team.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white border-0 shadow-md rounded-xl p-4 group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">
                Team XP
              </p>
              <p className="text-2xl font-black mt-1">
                {team.xp_total.toLocaleString()}
              </p>
            </div>
            <div className="p-2 rounded-lg bg-amber-50 group-hover:scale-110 transition-transform">
              <Zap className="h-5 w-5 text-amber-500" />
            </div>
          </div>
        </Card>

        <Card className="bg-white border-0 shadow-md rounded-xl p-4 group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">
                Streak
              </p>
              <p className="text-2xl font-black mt-1 bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
                {team.streak_count}
              </p>
            </div>
            <div className="p-2 rounded-lg bg-orange-50 group-hover:scale-110 transition-transform">
              <Flame className="h-5 w-5 text-orange-500 animate-streak-flame" />
            </div>
          </div>
        </Card>

        <Card className="bg-white border-0 shadow-md rounded-xl p-4 group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">
                Members
              </p>
              <p className="text-2xl font-black mt-1">{memberItems.length}</p>
            </div>
            <div className="p-2 rounded-lg bg-blue-50 group-hover:scale-110 transition-transform">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="bg-white border-0 shadow-md rounded-xl p-4 group">
          <CooperationScoreDisplay score={team.cooperation_score} />
        </Card>
      </div>

      {/* Members Section */}
      <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden gap-0 py-0">
        <div
          className="px-6 py-4 flex items-center gap-2"
          style={{
            background: "var(--brand-gradient)",
          }}
        >
          <Users className="h-5 w-5 text-white" />
          <h2 className="text-lg font-bold tracking-tight text-white">
            Members
          </h2>
        </div>
        <div className="p-6">
          <TeamMemberList members={memberItems} totalTeamXp={team.xp_total} />
        </div>
      </Card>

      {/* Badges Section */}
      {badgeItems.length > 0 && (
        <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden gap-0 py-0">
          <div
            className="px-6 py-4 flex items-center gap-2"
            style={{
              background: "var(--brand-gradient)",
            }}
          >
            <Trophy className="h-5 w-5 text-white" />
            <h2 className="text-lg font-bold tracking-tight text-white">
              Badges
            </h2>
          </div>
          <div className="p-6">
            <TeamBadgeCollection badges={badgeItems} />
          </div>
        </Card>
      )}

      {/* Active Challenges */}
      {activeChallenges.length > 0 && (
        <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden gap-0 py-0">
          <div
            className="px-6 py-4 flex items-center gap-2"
            style={{
              background: "var(--brand-gradient)",
            }}
          >
            <Target className="h-5 w-5 text-white" />
            <h2 className="text-lg font-bold tracking-tight text-white">
              Active Challenges
            </h2>
          </div>
          <div className="p-6 space-y-4">
            {activeChallenges.map((challenge) => (
              <div key={challenge.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">{challenge.title}</p>
                  <Badge variant="outline" className="text-xs">
                    {challenge.challenge_type}
                  </Badge>
                </div>
                <ChallengeProgressBar
                  current={challenge.current_progress}
                  goal={challenge.goal_target}
                  label={challenge.title}
                />
                {challenge.completed_at && (
                  <p className="text-xs text-green-600 font-medium">
                    ✓ Completed{" "}
                    {new Date(challenge.completed_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Teaching Moments Section */}
      {teachingMoments.length > 0 && (
        <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden gap-0 py-0">
          <div
            className="px-6 py-4 flex items-center gap-2"
            style={{
              background: "var(--brand-gradient)",
            }}
          >
            <BookOpen className="h-5 w-5 text-white" />
            <h2 className="text-lg font-bold tracking-tight text-white">
              Teaching Moments
            </h2>
          </div>
          <div className="p-6 space-y-4">
            {teachingMoments.map((moment) => (
              <PeerTeachingMomentCard
                key={moment.id}
                title={moment.title}
                explanationText={moment.explanation_text}
                mediaUrl={moment.media_url}
                authorName={moment.author_id}
                createdAt={moment.created_at}
              />
            ))}
          </div>
        </Card>
      )}

      {/* Replacement Votes Section (Task 5.6) */}
      {(openVotes.length > 0 || (isCaptain && inactiveMembers.length > 0)) && (
        <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden gap-0 py-0">
          <div
            className="px-6 py-4 flex items-center gap-2"
            style={{
              background: "var(--brand-gradient)",
            }}
          >
            <Vote className="h-5 w-5 text-white" />
            <h2 className="text-lg font-bold tracking-tight text-white">
              Replacement Votes
            </h2>
          </div>
          <div className="p-6">
            <ReplacementVoteCard
              vote={
                openVotes[0]
                  ? {
                      id: openVotes[0].id,
                      targetMemberName: openVotes[0].target_member_id,
                      targetMemberId: openVotes[0].target_member_id,
                      status: openVotes[0].status,
                      votesFor: openVotes[0].votes_for,
                      votesAgainst: openVotes[0].votes_against,
                      createdAt: openVotes[0].created_at,
                      resolvedAt: openVotes[0].resolved_at,
                      teacherOverride: openVotes[0].teacher_override,
                    }
                  : null
              }
              isCaptain={isCaptain}
              isTeacher={false}
              totalMembers={memberItems.length}
              inactiveMembers={inactiveMembers}
              onInitiateVote={(targetMemberId) => {
                initiateVoteMutation.mutate({
                  team_id: teamId!,
                  target_member_id: targetMemberId,
                  initiated_by: user?.id ?? "",
                });
              }}
              onCastVote={(voteId, voteFor) => {
                castVoteMutation.mutate({
                  voteId,
                  teamId: teamId!,
                  voteFor,
                });
              }}
              isInitiating={initiateVoteMutation.isPending}
              isCasting={castVoteMutation.isPending}
            />
          </div>
        </Card>
      )}
    </div>
  );
};

export default TeamProfilePage;
