// Task 135.2: Student Challenge List View
// Active/completed tabs, live progress bars (Supabase Realtime),
// contribution leaderboard for course-wide, team progress for team-based

import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import {
  useStudentChallenges,
  useChallengeParticipantsBatch,
  type SocialChallenge,
  type ChallengeParticipant,
} from "@/hooks/useChallenges";
import { useRealtime } from "@/hooks/useRealtime";
import { queryKeys } from "@/lib/queryKeys";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PCard, SectionHeader, Shimmer } from "@/design-system";
import { NoChallenges } from "@/components/shared/EmptyState";
import { Trophy, Target, Users } from "lucide-react";
import { getEffectiveChallengeStatus } from "@/lib/challengeLifecycle";

const ProgressBar = ({
  current,
  target,
}: {
  current: number;
  target: number;
}) => {
  const pct = Math.min(100, Math.round((current / Math.max(target, 1)) * 100));
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-gray-600">
          {current} / {target}
        </span>
        <span className="font-bold text-blue-600">{pct}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-[linear-gradient(93.65deg,#14b8a6_5.37%,#0382bd_78.89%)] transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

const TeamProgressDisplay = ({
  participants,
  target,
}: {
  participants: ChallengeParticipant[];
  target: number;
}) => {
  const sorted = [...participants].sort(
    (a, b) => b.current_progress - a.current_progress
  );
  return (
    <div className="mt-3 space-y-2">
      {sorted.map((p, idx) => (
        <div key={p.id} className="flex items-center gap-2">
          <span className="w-5 text-xs font-bold text-gray-500">
            {idx + 1}.
          </span>
          <div className="flex-1">
            <ProgressBar current={p.current_progress} target={target} />
          </div>
        </div>
      ))}
    </div>
  );
};

const ContributionLeaderboard = ({
  participants,
  target,
}: {
  participants: ChallengeParticipant[];
  target: number;
}) => {
  const sorted = [...participants].sort(
    (a, b) => b.current_progress - a.current_progress
  );
  const totalProgress = participants.reduce(
    (sum, p) => sum + p.current_progress,
    0
  );

  return (
    <div className="mt-3 space-y-3">
      <ProgressBar current={totalProgress} target={target} />
      <div className="space-y-1">
        <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
          Top Contributors
        </p>
        {sorted.slice(0, 5).map((p, idx) => (
          <div key={p.id} className="flex items-center justify-between py-1">
            <span className="text-xs font-medium text-gray-700">
              {idx + 1}. Participant
            </span>
            <span className="text-xs font-bold text-amber-600">
              +{p.current_progress}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const ChallengeCard = ({
  challenge,
  participants,
}: {
  challenge: SocialChallenge;
  participants: ChallengeParticipant[];
}) => {
  const isTeam = challenge.participation_mode === "team";

  return (
    <Link
      to={`/student/challenges/${challenge.id}`}
      className="block rounded-[20px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      aria-label={`Open challenge: ${challenge.title}`}
    >
      <PCard className="p-4 transition-shadow hover:shadow-[0_18px_38px_rgba(16,24,40,0.11)]">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-amber-50 p-2">
            {isTeam ? (
              <Users className="h-4 w-4 text-amber-600" />
            ) : (
              <Target className="h-4 w-4 text-amber-600" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-bold">{challenge.title}</p>
              <Badge variant="outline" className="text-xs">
                {isTeam ? "Team" : "Individual"}
              </Badge>
              <Badge variant="outline" className="text-xs">
                Goal: {challenge.goal_target}
              </Badge>
              <Badge className="border-amber-200 bg-amber-50 text-xs text-amber-700">
                {challenge.reward_badge_id
                  ? "Badge"
                  : `+${challenge.reward_xp} XP`}
              </Badge>
            </div>
            {challenge.description && (
              <p className="mt-0.5 text-xs text-gray-500">
                {challenge.description}
              </p>
            )}

            {participants.length > 0 &&
              (isTeam ? (
                <TeamProgressDisplay
                  participants={participants}
                  target={challenge.goal_target}
                />
              ) : (
                <ContributionLeaderboard
                  participants={participants}
                  target={challenge.goal_target}
                />
              ))}
          </div>
        </div>
      </PCard>
    </Link>
  );
};

const ChallengeListView = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: challenges, isLoading } = useStudentChallenges(user?.id);
  const [activeTab, setActiveTab] = useState("active");

  const challengeIds = (challenges ?? []).map((c) => c.id);
  const { data: participantsMap } = useChallengeParticipantsBatch(challengeIds);

  const handleProgressUpdate = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.challengeProgress.lists(),
    });
    queryClient.invalidateQueries({
      queryKey: queryKeys.studentChallenges.lists(),
    });
  }, [queryClient]);

  useRealtime({
    table: "challenge_participants",
    event: "*",
    onPayload: handleProgressUpdate,
    pollingFn: handleProgressUpdate,
    pollingInterval: 30_000,
  });

  const now = new Date();
  const active = (challenges ?? []).filter(
    (challenge) => getEffectiveChallengeStatus(challenge, now) === "active"
  );
  const completed = (challenges ?? []).filter(
    (challenge) => getEffectiveChallengeStatus(challenge, now) === "completed"
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SectionHeader icon={Trophy} title="Challenges" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Shimmer key={i} className="h-32 rounded-[20px]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader icon={Trophy} title="Challenges" />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="gap-2 bg-transparent p-0">
          <TabsTrigger
            value="active"
            className="rounded-[12px] border border-gray-200 bg-white px-4 py-1.5 text-sm font-semibold text-gray-600 data-[state=active]:border-blue-600 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
          >
            Active ({active.length})
          </TabsTrigger>
          <TabsTrigger
            value="completed"
            className="rounded-[12px] border border-gray-200 bg-white px-4 py-1.5 text-sm font-semibold text-gray-600 data-[state=active]:border-blue-600 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
          >
            Completed ({completed.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4 space-y-3">
          {active.length === 0 ? (
            <NoChallenges />
          ) : (
            active.map((c) => (
              <ChallengeCard
                key={c.id}
                challenge={c}
                participants={participantsMap?.[c.id] ?? []}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-4 space-y-3">
          {completed.length === 0 ? (
            <NoChallenges />
          ) : (
            completed.map((c) => (
              <PCard key={c.id} className="p-4 opacity-75">
                <div className="flex items-center gap-3">
                  <Trophy className="h-4 w-4 text-green-500" />
                  <div>
                    <p className="text-sm font-semibold">{c.title}</p>
                    <p className="text-xs text-gray-500">
                      {c.participation_mode === "team" ? "Team" : "Individual"}{" "}
                      · Completed
                    </p>
                  </div>
                </div>
              </PCard>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ChallengeListView;
