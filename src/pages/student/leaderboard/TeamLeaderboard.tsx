// =============================================================================
// TeamLeaderboard — Team leaderboard with realtime updates
// Task 131.4: All teams ranked by XP with Gold/Silver/Bronze styling
// =============================================================================

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Medal, Trophy, Users } from "lucide-react";
import { useTeamLeaderboard, useMyTeamId } from "@/hooks/useTeamLeaderboard";
import type {
  TeamLeaderboardEntry,
  TeamLeaderboardView,
} from "@/hooks/useTeamLeaderboard";
import { useAuth } from "@/hooks/useAuth";
import { PCard, SectionHeader, Shimmer } from "@/design-system";
import { InlineNoTeams } from "@/components/shared/EmptyState";
import ReconnectBanner from "@/components/shared/ReconnectBanner";
import { cn } from "@/lib/utils";
import { parseAsString, useQueryState } from "nuqs";

// ─── Medal helpers ───────────────────────────────────────────────────────────

const getMedalColor = (rank: number): string | null => {
  if (rank === 1) return "#EAB308"; // gold
  if (rank === 2) return "#9CA3AF"; // silver
  if (rank === 3) return "#D97706"; // bronze
  return null;
};

const getRankBg = (rank: number): string => {
  if (rank === 1) return "bg-yellow-50 border-yellow-200";
  if (rank === 2) return "bg-gray-50 border-gray-200";
  if (rank === 3) return "bg-amber-50 border-amber-200";
  return "bg-white border-slate-100";
};

// ─── TeamRow ─────────────────────────────────────────────────────────────────

interface TeamRowProps {
  entry: TeamLeaderboardEntry;
  isCurrentTeam: boolean;
  showWeekly: boolean;
}

const TeamRow = ({ entry, isCurrentTeam, showWeekly }: TeamRowProps) => {
  const medalColor = getMedalColor(entry.rank);

  return (
    <div
      className={cn(
        "flex items-center gap-4 px-4 py-3 rounded-xl border transition-colors",
        getRankBg(entry.rank),
        isCurrentTeam && "ring-2 ring-blue-400"
      )}
    >
      {/* Rank */}
      <div className="flex items-center justify-center w-10 shrink-0">
        {medalColor ? (
          <Medal className="h-6 w-6" style={{ color: medalColor }} />
        ) : (
          <span className="text-sm font-bold text-gray-500">#{entry.rank}</span>
        )}
      </div>

      {/* Avatar */}
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[linear-gradient(93.65deg,#14b8a6_5.37%,#0382bd_78.89%)] text-white font-bold text-sm shrink-0">
        {entry.avatar_letter}
      </div>

      {/* Team info */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm font-semibold truncate",
            isCurrentTeam && "text-blue-700"
          )}
        >
          {entry.team_name}
          {isCurrentTeam && (
            <Badge
              variant="outline"
              className="ms-2 text-xs text-blue-600 border-blue-200"
            >
              Your Team
            </Badge>
          )}
        </p>
        <p className="text-xs text-gray-500">
          <Users className="inline h-3 w-3 me-1" />
          {entry.member_count} members
        </p>
      </div>

      {/* XP */}
      <div className="text-end shrink-0">
        <span className="text-sm font-bold text-amber-500">
          {(showWeekly ? entry.xp_this_week : entry.xp_total).toLocaleString()}{" "}
          XP
        </span>
        {!showWeekly && entry.xp_this_week > 0 && (
          <p className="text-xs text-gray-400">
            +{entry.xp_this_week.toLocaleString()} this week
          </p>
        )}
      </div>
    </div>
  );
};

// ─── TeamLeaderboard ─────────────────────────────────────────────────────────

interface TeamLeaderboardProps {
  courseId?: string;
}

const TeamLeaderboard = ({ courseId }: TeamLeaderboardProps) => {
  const { user } = useAuth();
  const userId = user?.id;

  const [view, setView] = useQueryState(
    "teamView",
    parseAsString.withDefault("all_time")
  );

  const typedView: TeamLeaderboardView =
    view === "weekly" ? "weekly" : "all_time";

  const {
    data: entries,
    isLoading,
    isLive,
    retryCount,
  } = useTeamLeaderboard({ courseId });
  const { data: myTeamId } = useMyTeamId(userId, courseId);

  if (!courseId) {
    return (
      <PCard>
        <div className="p-6 text-center text-slate-500">
          Select a course to view team rankings.
        </div>
      </PCard>
    );
  }

  return (
    <div className="space-y-4">
      {/* Realtime status banner */}
      <ReconnectBanner isDisconnected={!isLive} retryCount={retryCount} />

      <div className="flex items-center justify-between gap-3">
        <SectionHeader icon={Trophy} title="Team Leaderboard" />
        <div className="flex gap-2">
          {(["all_time", "weekly"] as const).map((v) => (
            <Button
              key={v}
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setView(v)}
              className={cn(
                "h-auto rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors",
                typedView === v
                  ? "bg-blue-600 text-white hover:bg-blue-700 hover:text-white"
                  : "bg-white text-gray-600 border border-gray-200"
              )}
            >
              {v === "all_time" ? "All Time" : "Weekly"}
            </Button>
          ))}
        </div>
      </div>

      <PCard className="overflow-hidden">
        <div className="p-4">
          <SectionHeader icon={Users} title="Team Rankings" />
          <div className="mt-4 space-y-2">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Shimmer key={i} className="h-14 rounded-xl" />
              ))
            ) : !entries || entries.length === 0 ? (
              <InlineNoTeams />
            ) : (
              entries.map((entry) => (
                <TeamRow
                  key={entry.team_id}
                  entry={entry}
                  isCurrentTeam={entry.team_id === myTeamId}
                  showWeekly={typedView === "weekly"}
                />
              ))
            )}
          </div>
        </div>
      </PCard>
    </div>
  );
};

export default TeamLeaderboard;
