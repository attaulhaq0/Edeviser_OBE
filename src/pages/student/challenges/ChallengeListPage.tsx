// =============================================================================
// ChallengeListPage — Student challenge list with active, upcoming, completed
// Task 6.1: status badges, progress indicators, cooperative/competitive labels
// =============================================================================

import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useStudentChallenges, type Challenge } from "@/hooks/useChallenges";
import { useRealtime } from "@/hooks/useRealtime";
import { queryKeys } from "@/lib/queryKeys";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import Shimmer from "@/components/shared/Shimmer";
import { NoChallenges } from "@/components/shared/EmptyState";
import { Trophy, Target, Users, Handshake, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

const getTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    academic: "Academic",
    habit: "Habit",
    xp_race: "XP Race",
    blooms_climb: "Bloom's Climb",
    cooperative: "Cooperative",
    team: "Team",
    course_wide: "Course-Wide",
  };
  return labels[type] ?? type;
};

const ChallengeCard = ({
  challenge,
  onClick,
}: {
  challenge: Challenge;
  onClick: () => void;
}) => {
  const challengeType = challenge.challenge_type ?? challenge.goal_metric;
  const isCooperative = (challenge.challenge_type as string) === "cooperative";
  const isTeam = challengeType === "team";
  const iconClassName = cn(
    "h-4 w-4",
    isCooperative ? "text-green-600" : "text-amber-600"
  );

  return (
    <Card
      className="bg-white border-0 shadow-md rounded-xl p-4 cursor-pointer hover:shadow-lg transition-shadow"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "p-2 rounded-lg shrink-0",
            isCooperative ? "bg-green-50" : "bg-amber-50"
          )}
        >
          {isCooperative ? (
            <Handshake className={iconClassName} />
          ) : isTeam ? (
            <Users className={iconClassName} />
          ) : (
            <Target className={iconClassName} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold truncate">{challenge.title}</p>
          {challenge.description && (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
              {challenge.description}
            </p>
          )}
          <div className="flex gap-2 mt-2 flex-wrap">
            <Badge variant="outline" className="text-xs">
              {getTypeLabel(challenge.challenge_type ?? "course_wide")}
            </Badge>
            <Badge variant="outline" className="text-xs">
              Goal: {challenge.goal_target}
            </Badge>
            <Badge className="text-xs bg-amber-50 text-amber-700 border-amber-200">
              +{challenge.reward_value ?? 0} XP
            </Badge>
          </div>
          <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
            <Calendar className="h-3 w-3" />
            <span>
              {new Date(challenge.start_date).toLocaleDateString()} —{" "}
              {new Date(challenge.end_date).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};

const ChallengeListPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: challenges, isLoading } = useStudentChallenges(user?.id);
  const [activeTab, setActiveTab] = useState("active");

  // Realtime subscription for challenge progress updates
  const handleProgressUpdate = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.challengeProgress.lists(),
    });
    queryClient.invalidateQueries({
      queryKey: queryKeys.studentChallenges.lists(),
    });
  }, [queryClient]);

  useRealtime({
    table: "challenge_progress",
    event: "*",
    onPayload: handleProgressUpdate,
    pollingFn: handleProgressUpdate,
    pollingInterval: 30_000,
  });

  const now = new Date();
  const active = (challenges ?? []).filter(
    (c) =>
      c.status === "active" ||
      (new Date(c.start_date) <= now && new Date(c.end_date) >= now)
  );
  const upcoming = (challenges ?? []).filter(
    (c) => c.status === "draft" || new Date(c.start_date) > now
  );
  const completed = (challenges ?? []).filter(
    (c) =>
      c.status === "completed" ||
      (c.status !== "active" && new Date(c.end_date) < now)
  );

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
          {[
            { value: "active", label: `Active (${active.length})` },
            { value: "upcoming", label: `Upcoming (${upcoming.length})` },
            { value: "completed", label: `Completed (${completed.length})` },
          ].map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="rounded-xl border px-4 py-1.5 text-sm font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:border-blue-600 bg-white text-gray-600 border-gray-200"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="active" className="mt-4 space-y-3">
          {active.length === 0 ? (
            <NoChallenges />
          ) : (
            active.map((c) => (
              <ChallengeCard
                key={c.id}
                challenge={c}
                onClick={() => navigate(`/student/challenges/${c.id}`)}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="upcoming" className="mt-4 space-y-3">
          {upcoming.length === 0 ? (
            <NoChallenges />
          ) : (
            upcoming.map((c) => (
              <ChallengeCard
                key={c.id}
                challenge={c}
                onClick={() => navigate(`/student/challenges/${c.id}`)}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-4 space-y-3">
          {completed.length === 0 ? (
            <NoChallenges />
          ) : (
            completed.map((c) => (
              <ChallengeCard
                key={c.id}
                challenge={c}
                onClick={() => navigate(`/student/challenges/${c.id}`)}
              />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ChallengeListPage;
