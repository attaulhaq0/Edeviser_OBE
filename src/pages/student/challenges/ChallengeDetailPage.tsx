// =============================================================================
// ChallengeDetailPage — Challenge info, progress bar, leaderboard
// Task 6.2: hidden leaderboard for cooperative, completion banner
// =============================================================================

import { useParams, useNavigate } from "react-router-dom";
import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useChallengeDetail } from "@/hooks/useChallengeDetail";
import {
  useMyChallengeProgress,
  useChallengeLeaderboardParticipants,
} from "@/hooks/useChallengeParticipation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ChallengeProgressBar from "@/components/shared/ChallengeProgressBar";
import ChallengeLeaderboard from "@/components/shared/ChallengeLeaderboard";
import Shimmer from "@/components/shared/Shimmer";
import {
  ArrowLeft,
  Trophy,
  Calendar,
  Target,
  Handshake,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

const ChallengeDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: challenge, isLoading, isError, error } = useChallengeDetail(id);
  const { data: myProgress } = useMyChallengeProgress(id, user?.id);
  const { data: leaderboardParticipants } =
    useChallengeLeaderboardParticipants(id);

  // R28.2 / R28.3a: a genuine query failure surfaces BOTH a toast and a
  // dedicated error UI state — distinct from the graceful not-found state that
  // a `null` (zero-row) result produces. Toast fires once per error.
  useEffect(() => {
    if (isError) {
      toast.error("Failed to load this challenge. Please try again.");
    }
  }, [isError, error]);

  const [now] = useState(() => Date.now());
  const daysLeft = useMemo(() => {
    if (!challenge) return 0;
    return Math.max(
      0,
      Math.ceil(
        (new Date(challenge.end_date).getTime() - now) / (1000 * 60 * 60 * 24)
      )
    );
  }, [challenge, now]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Shimmer className="h-10 w-48 rounded-lg" />
        <Shimmer className="h-48 rounded-xl" />
      </div>
    );
  }

  // R28.2: query failure → dedicated error state (distinct from not-found).
  if (isError) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 me-1" /> Back
        </Button>
        <Card className="bg-white border-0 shadow-md rounded-xl p-8 text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-sm font-semibold text-gray-700">
            Something went wrong
          </p>
          <p className="text-sm text-gray-500">
            We couldn't load this challenge. Please try again.
          </p>
        </Card>
      </div>
    );
  }

  // R27.2: zero-row result → graceful not-found state (never throws).
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

  const isCooperative = challenge.challenge_type === "cooperative";
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
              <p className="text-sm font-bold text-green-700">
                Challenge Completed!
              </p>
              <p className="text-xs text-green-600">
                Completed on{" "}
                {new Date(myProgress!.completed_at!).toLocaleDateString()}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Challenge Info */}
      <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden gap-0 py-0">
        <div
          className="px-6 py-4 flex items-center gap-2"
          style={{
            background: "var(--brand-gradient)",
          }}
        >
          {isCooperative ? (
            <Handshake className="h-5 w-5 text-white" />
          ) : (
            <Trophy className="h-5 w-5 text-white" />
          )}
          <h1 className="text-lg font-bold tracking-tight text-white">
            {challenge.title}
          </h1>
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
            {challenge.status === "active" && (
              <Badge className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                {daysLeft} days left
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>
                Start: {new Date(challenge.start_date).toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>
                End: {new Date(challenge.end_date).toLocaleDateString()}
              </span>
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
        <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden gap-0 py-0">
          <div
            className="px-6 py-4 flex items-center gap-2"
            style={{
              background: "var(--brand-gradient)",
            }}
          >
            <Trophy className="h-5 w-5 text-white" />
            <h2 className="text-lg font-bold tracking-tight text-white">
              Leaderboard
            </h2>
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
            This is a cooperative challenge — everyone works together toward the
            goal. No leaderboard is shown.
          </p>
        </Card>
      )}
    </div>
  );
};

export default ChallengeDetailPage;
