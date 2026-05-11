// =============================================================================
// ChallengeLeaderboard — Per-challenge participant ranking
// Task 4.5: medals, anonymous support, current user highlight
// =============================================================================

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Trophy, EyeOff } from "lucide-react";

export interface LeaderboardParticipant {
  participantId: string;
  displayName: string;
  currentProgress: number;
  goalTarget: number;
  completedAt: string | null;
  rank: number;
  isAnonymous?: boolean;
}

export interface ChallengeLeaderboardProps {
  participants: LeaderboardParticipant[];
  currentUserId?: string;
  goalTarget: number;
  className?: string;
}

const MEDAL_STYLES: Record<number, { icon: string; bg: string; text: string }> =
  {
    1: { icon: "🥇", bg: "bg-yellow-50", text: "text-yellow-700" },
    2: { icon: "🥈", bg: "bg-gray-50", text: "text-gray-600" },
    3: { icon: "🥉", bg: "bg-amber-50", text: "text-amber-700" },
  };

const ChallengeLeaderboard = ({
  participants,
  currentUserId,
  goalTarget,
  className,
}: ChallengeLeaderboardProps) => {
  if (participants.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center py-8 text-center",
          className
        )}
      >
        <Trophy className="h-8 w-8 text-gray-300 mb-2" />
        <p className="text-sm text-gray-400">No participants yet</p>
      </div>
    );
  }

  return (
    <div
      className={cn("space-y-1", className)}
      role="list"
      aria-label="Challenge leaderboard"
    >
      {participants.map((p) => {
        const isCurrentUser = p.participantId === currentUserId;
        const medal = MEDAL_STYLES[p.rank];
        const pct =
          goalTarget > 0
            ? Math.round((p.currentProgress / goalTarget) * 100)
            : 0;
        const isComplete = p.completedAt !== null;

        return (
          <div
            key={p.participantId}
            role="listitem"
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 transition-colors",
              isCurrentUser && "bg-blue-50 ring-1 ring-blue-200",
              !isCurrentUser && "hover:bg-slate-50"
            )}
          >
            {/* Rank */}
            <div
              className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold",
                medal
                  ? `${medal.bg} ${medal.text}`
                  : "bg-gray-100 text-gray-500"
              )}
            >
              {medal ? (
                <span aria-label={`Rank ${p.rank}`}>{medal.icon}</span>
              ) : (
                <span>{p.rank}</span>
              )}
            </div>

            {/* Name */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                {p.isAnonymous ? (
                  <>
                    <EyeOff className="h-3.5 w-3.5 text-gray-400" />
                    <span className="text-sm font-medium text-gray-400 italic">
                      Anonymous
                    </span>
                  </>
                ) : (
                  <span
                    className={cn(
                      "text-sm font-medium truncate",
                      isCurrentUser && "font-bold text-blue-700"
                    )}
                  >
                    {p.displayName}
                    {isCurrentUser && (
                      <span className="text-xs font-normal text-blue-500 ms-1">
                        (You)
                      </span>
                    )}
                  </span>
                )}
              </div>
              {/* Mini progress bar */}
              <div className="flex items-center gap-2 mt-0.5">
                <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-300",
                      isComplete ? "bg-green-500" : "bg-blue-400"
                    )}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
                <span className="text-[10px] font-medium text-gray-500 tabular-nums">
                  {pct}%
                </span>
              </div>
            </div>

            {/* Completion badge */}
            {isComplete && (
              <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px]">
                ✓ Done
              </Badge>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ChallengeLeaderboard;
