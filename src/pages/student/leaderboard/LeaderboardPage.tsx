// =============================================================================
// LeaderboardPage — Student leaderboard with Top XP, Personal Best, Most Improved
// =============================================================================

import { useMemo, useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { parseAsString, useQueryState } from "nuqs";
import {
  Trophy,
  Flame,
  Medal,
  TrendingUp,
  Star,
  BarChart3,
  Shield,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useReducedMotion } from "framer-motion";
import confetti from "canvas-confetti";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { useAuth } from "@/hooks/useAuth";
import { useRealtime } from "@/hooks/useRealtime";
import { queryKeys } from "@/lib/queryKeys";
import {
  useLeaderboard,
  useMyRank,
  useAnonymousStatus,
  type LeaderboardEntry,
  type LeaderboardFilter,
  type LeaderboardTimeframe,
} from "@/hooks/useLeaderboard";
import { usePersonalBestLeaderboard } from "@/hooks/usePersonalBestLeaderboard";
import { useMostImprovedLeaderboard } from "@/hooks/useMostImprovedLeaderboard";
import {
  useLeagueLeaderboard,
  useStudentLeagueTier,
  useStudentPercentileBand,
} from "@/hooks/useLeagueLeaderboard";
import { useStudentCourseProgram } from "./useStudentCourseProgram";
import TeamLeaderboard from "@/pages/student/leaderboard/TeamLeaderboard";
import { useTeamRealtime } from "@/hooks/useTeamRealtime";
import LeagueTierBadge from "@/components/shared/LeagueTierBadge";
import {
  calculatePercentileBand,
  formatPercentileBand,
} from "@/lib/percentileBand";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Shimmer from "@/components/shared/Shimmer";
import AnonymousToggle from "@/components/shared/AnonymousToggle";
import ReconnectBanner from "@/components/shared/ReconnectBanner";
import { cn } from "@/lib/utils";

// ─── Constants ───────────────────────────────────────────────────────────────

const FILTER_OPTIONS: Array<{ value: LeaderboardFilter; label: string }> = [
  { value: "all", label: "All Students" },
  { value: "course", label: "My Course" },
  { value: "program", label: "My Program" },
];

const TIMEFRAME_OPTIONS: Array<{ value: LeaderboardTimeframe; label: string }> =
  [
    { value: "weekly", label: "Weekly" },
    { value: "all_time", label: "All Time" },
  ];

type LeaderboardTab = "top_xp" | "personal_best" | "most_improved" | "league";

// ─── Medal helpers ───────────────────────────────────────────────────────────

const getMedalColor = (rank: number): string | null => {
  if (rank === 1) return "#EAB308";
  if (rank === 2) return "#9CA3AF";
  if (rank === 3) return "#D97706";
  return null;
};

const getRankBg = (rank: number): string => {
  if (rank === 1) return "bg-yellow-50 border-yellow-200";
  if (rank === 2) return "bg-gray-50 border-gray-200";
  if (rank === 3) return "bg-amber-50 border-amber-200";
  return "bg-white border-slate-100";
};

// ─── LeaderboardRow ──────────────────────────────────────────────────────────

interface LeaderboardRowProps {
  entry: LeaderboardEntry;
  isCurrentUser: boolean;
  totalStudents?: number;
}

const LeaderboardRow = ({
  entry,
  isCurrentUser,
  totalStudents,
}: LeaderboardRowProps) => {
  const medalColor = getMedalColor(entry.rank);
  const isAnonymous = entry.full_name === "Anonymous";

  // Percentile band display for ranks > 10 (Req 131.1, 131.2)
  const bandResult = totalStudents
    ? calculatePercentileBand(entry.rank, totalStudents)
    : null;
  const displayRank = bandResult
    ? formatPercentileBand(bandResult)
    : `#${entry.rank}`;

  return (
    <div
      className={cn(
        "flex items-center gap-4 px-4 py-3 rounded-xl border transition-colors",
        getRankBg(entry.rank),
        isCurrentUser && "ring-2 ring-blue-400"
      )}
    >
      <div className="flex items-center justify-center w-10 shrink-0">
        {medalColor ? (
          <Medal className="h-6 w-6" style={{ color: medalColor }} />
        ) : (
          <span className="text-sm font-bold text-gray-500">{displayRank}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm font-semibold truncate",
            isAnonymous ? "text-gray-400 italic" : "text-gray-900",
            isCurrentUser && "text-blue-700"
          )}
        >
          {entry.full_name}
          {isCurrentUser && (
            <span className="ms-1 text-xs font-normal text-blue-500">
              (You)
            </span>
          )}
        </p>
      </div>
      <div className="text-end shrink-0">
        <span className="text-sm font-bold text-amber-500">
          {entry.xp_total.toLocaleString()} XP
        </span>
      </div>
      <Badge
        variant="secondary"
        className="shrink-0 bg-blue-50 text-blue-700 border-blue-200"
      >
        Lv {entry.level}
      </Badge>
      {entry.streak_current > 0 && (
        <div className="flex items-center gap-1 shrink-0">
          <Flame className="h-4 w-4 text-orange-500" />
          <span className="text-xs font-bold text-orange-600">
            {entry.streak_current}
          </span>
        </div>
      )}
    </div>
  );
};

// ─── MyRankCard ──────────────────────────────────────────────────────────────

interface MyRankCardProps {
  rank: number | null;
  xpTotal: number;
  level: number;
  isLoading: boolean;
  totalStudents?: number;
}

const MyRankCard = ({
  rank,
  xpTotal,
  level,
  isLoading,
  totalStudents,
}: MyRankCardProps) => {
  if (isLoading) {
    return <Shimmer className="h-24 rounded-xl" />;
  }

  // Calculate percentile band for display (Req 131.1, 131.2, 131.4)
  const bandResult =
    rank && totalStudents ? calculatePercentileBand(rank, totalStudents) : null;
  const displayRank = bandResult
    ? formatPercentileBand(bandResult)
    : rank
    ? `#${rank}`
    : "—";

  return (
    <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
      <div
        className="px-6 py-4 flex items-center gap-2"
        style={{
          background:
            "linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)",
        }}
      >
        <Trophy className="h-5 w-5 text-white" />
        <h2 className="text-lg font-bold tracking-tight text-white">
          Your Rank
        </h2>
      </div>
      <div className="p-6 flex items-center gap-6">
        <div className="text-center">
          <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">
            Rank
          </p>
          <p className="text-2xl font-black">{displayRank}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">
            Total XP
          </p>
          <p className="text-2xl font-black text-amber-500">
            {xpTotal.toLocaleString()}
          </p>
        </div>
        <div className="text-center">
          <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">
            Level
          </p>
          <p className="text-2xl font-black text-blue-600">{level}</p>
        </div>
      </div>
    </Card>
  );
};

// ─── PersonalBestChart ───────────────────────────────────────────────────────

interface PersonalBestChartProps {
  studentId: string;
}

const PersonalBestChart = ({ studentId }: PersonalBestChartProps) => {
  const { data: weeks, isLoading } = usePersonalBestLeaderboard(studentId);
  const prefersReducedMotion = useReducedMotion();
  const confettiFired = useRef(false);

  // Fire confetti when current week is the personal best
  useEffect(() => {
    if (!weeks || confettiFired.current || prefersReducedMotion) return;
    const currentWeek = weeks.find((w) => w.isCurrentWeek);
    if (currentWeek?.isPersonalBest && currentWeek.xp > 0) {
      confettiFired.current = true;
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
        colors: ["#EAB308", "#14B8A6", "#3B82F6"],
      });
    }
  }, [weeks, prefersReducedMotion]);

  if (isLoading) {
    return <Shimmer className="h-64 rounded-xl" />;
  }

  if (!weeks || weeks.length === 0) {
    return (
      <p className="text-sm text-gray-500 text-center py-8">
        No XP data available yet. Start earning XP to see your personal best!
      </p>
    );
  }

  const currentWeek = weeks.find((w) => w.isCurrentWeek);
  const isNewPersonalBest = currentWeek?.isPersonalBest && currentWeek.xp > 0;

  return (
    <div className="space-y-4">
      {isNewPersonalBest && (
        <div className="flex items-center gap-2 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3">
          <Star className="h-5 w-5 text-yellow-500" />
          <span className="text-sm font-bold text-yellow-700">
            New Personal Best! 🎉
          </span>
        </div>
      )}

      <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
        <div
          className="px-6 py-4 flex items-center gap-2"
          style={{
            background:
              "linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)",
          }}
        >
          <BarChart3 className="h-5 w-5 text-white" />
          <h2 className="text-lg font-bold tracking-tight text-white">
            Your Weekly XP
          </h2>
        </div>
        <div className="p-6">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={weeks}
              margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="weekLabel"
                tick={{ fontSize: 12, fill: "#64748b" }}
                axisLine={{ stroke: "#e2e8f0" }}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "#64748b" }}
                axisLine={{ stroke: "#e2e8f0" }}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "0.75rem",
                  border: "1px solid #e2e8f0",
                  fontSize: "0.875rem",
                }}
                formatter={(value) => [`${value ?? 0} XP`, "XP Earned"]}
              />
              <Bar dataKey="xp" radius={[6, 6, 0, 0]}>
                {weeks.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      entry.isPersonalBest
                        ? "#EAB308"
                        : entry.isCurrentWeek
                        ? "#3B82F6"
                        : "#94a3b8"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-blue-500" />
              <span>Current Week</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-yellow-500" />
              <span>Personal Best</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-slate-400" />
              <span>Previous Weeks</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

// ─── MostImprovedList ────────────────────────────────────────────────────────

interface MostImprovedListProps {
  courseId?: string;
  currentUserId: string;
}

const MostImprovedList = ({
  courseId,
  currentUserId,
}: MostImprovedListProps) => {
  const { data: entries, isLoading } = useMostImprovedLeaderboard(courseId);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Shimmer key={i} className="h-14 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!entries || entries.length === 0) {
    return (
      <p className="text-sm text-gray-500 text-center py-8">
        No improvement data available yet. Keep earning XP to see who is
        improving the most!
      </p>
    );
  }

  return (
    <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
      <div
        className="px-6 py-4 flex items-center gap-2"
        style={{
          background:
            "linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)",
        }}
      >
        <TrendingUp className="h-5 w-5 text-white" />
        <h2 className="text-lg font-bold tracking-tight text-white">
          Most Improved — Top 20
        </h2>
      </div>
      <div className="p-4 space-y-2">
        {entries.map((entry, index) => {
          const isCurrentUser = entry.student_id === currentUserId;
          const isTop3 = index < 3;

          return (
            <div
              key={entry.student_id}
              className={cn(
                "flex items-center gap-4 px-4 py-3 rounded-xl border transition-colors",
                isTop3
                  ? "bg-green-50 border-green-200"
                  : "bg-white border-slate-100",
                isCurrentUser && "ring-2 ring-blue-400"
              )}
            >
              <div className="flex items-center justify-center w-10 shrink-0">
                <span className="text-sm font-bold text-gray-500">
                  #{index + 1}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "text-sm font-semibold truncate",
                    isCurrentUser && "text-blue-700"
                  )}
                >
                  {entry.student_name}
                  {isCurrentUser && (
                    <span className="ms-1 text-xs font-normal text-blue-500">
                      (You)
                    </span>
                  )}
                </p>
              </div>
              <div className="text-end shrink-0">
                <span
                  className={cn(
                    "text-sm font-bold",
                    entry.improvement_percent >= 0
                      ? "text-green-600"
                      : "text-red-500"
                  )}
                >
                  {entry.improvement_percent >= 0 ? "+" : ""}
                  {entry.improvement_percent.toFixed(1)}%
                </span>
              </div>
              <div className="text-end shrink-0">
                <span className="text-xs text-gray-500">
                  {entry.xp_delta >= 0 ? "+" : ""}
                  {entry.xp_delta.toLocaleString()} XP
                </span>
              </div>
              {isTop3 && (
                <Badge
                  variant="secondary"
                  className="shrink-0 bg-green-100 text-green-700 border-green-200"
                >
                  <Star className="h-3 w-3 me-1" />
                  Rising Star
                </Badge>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
};

// ─── LeagueLeaderboardList ───────────────────────────────────────────────────

interface LeagueLeaderboardListProps {
  courseId?: string;
  currentUserId: string;
}

const LeagueLeaderboardList = ({
  courseId,
  currentUserId,
}: LeagueLeaderboardListProps) => {
  const { data: tierData, isLoading: isLoadingTier } =
    useStudentLeagueTier(currentUserId);
  const currentTier = tierData?.tier ?? "Bronze";
  const { data: entries, isLoading: isLoadingEntries } = useLeagueLeaderboard(
    courseId,
    currentTier
  );

  if (isLoadingTier || isLoadingEntries) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Shimmer key={i} className="h-14 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Current tier display */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-gray-600">Your League:</span>
        <LeagueTierBadge tier={currentTier} size="lg" />
      </div>

      <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
        <div
          className="px-6 py-4 flex items-center gap-2"
          style={{
            background:
              "linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)",
          }}
        >
          <Shield className="h-5 w-5 text-white" />
          <h2 className="text-lg font-bold tracking-tight text-white">
            {currentTier} League — Weekly XP
          </h2>
        </div>
        <div className="p-4 space-y-2">
          {!entries || entries.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">
              No students in your league tier yet.
            </p>
          ) : (
            entries.map((entry) => {
              const isCurrentUser = entry.student_id === currentUserId;
              return (
                <div
                  key={entry.student_id}
                  className={cn(
                    "flex items-center gap-4 px-4 py-3 rounded-xl border transition-colors",
                    getRankBg(entry.rank),
                    isCurrentUser && "ring-2 ring-blue-400"
                  )}
                >
                  <div className="flex items-center justify-center w-10 shrink-0">
                    {getMedalColor(entry.rank) ? (
                      <Medal
                        className="h-6 w-6"
                        style={{ color: getMedalColor(entry.rank)! }}
                      />
                    ) : (
                      <span className="text-sm font-bold text-gray-500">
                        #{entry.rank}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "text-sm font-semibold truncate",
                        isCurrentUser && "text-blue-700"
                      )}
                    >
                      {entry.full_name}
                      {isCurrentUser && (
                        <span className="ms-1 text-xs font-normal text-blue-500">
                          (You)
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="text-end shrink-0">
                    <span className="text-sm font-bold text-amber-500">
                      {entry.weekly_xp.toLocaleString()} XP
                    </span>
                  </div>
                  <LeagueTierBadge tier={entry.tier} size="sm" />
                </div>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
};

// ─── LeaderboardPage ─────────────────────────────────────────────────────────

const LeaderboardPage = () => {
  useTranslation("student");
  const { user, institutionId } = useAuth();
  const userId = user?.id ?? "";
  const queryClient = useQueryClient();

  // Check if student opted out of public leaderboard
  const { data: anonymousStatus } = useAnonymousStatus();
  const isOptedOut = anonymousStatus?.isAnonymous ?? false;

  // Polling fallback
  const pollingFn = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.leaderboard.lists() });
  }, [queryClient]);

  const { isLive, retryCount } = useRealtime({
    table: "student_gamification",
    event: "UPDATE",
    filter: institutionId ? `institution_id=eq.${institutionId}` : undefined,
    onPayload: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.leaderboard.lists(),
      });
    },
    pollingFn,
    pollingInterval: 30_000,
  });

  // URL-persisted state
  const [mode, setMode] = useQueryState(
    "mode",
    parseAsString.withDefault("individual")
  );

  // Task 7.3: Team realtime subscription for team XP updates
  useTeamRealtime(institutionId ?? undefined);

  // Default tab: personal_best for opt-out students, top_xp otherwise (Req 129.5)
  const defaultTab: LeaderboardTab = isOptedOut ? "personal_best" : "top_xp";
  const [tab, setTab] = useQueryState(
    "tab",
    parseAsString.withDefault(defaultTab)
  );

  const [filter, setFilter] = useQueryState(
    "filter",
    parseAsString.withDefault("all")
  );
  const [timeframe, setTimeframe] = useQueryState(
    "timeframe",
    parseAsString.withDefault("all_time")
  );

  const {
    courses,
    programs,
    isLoading: isLoadingContext,
  } = useStudentCourseProgram(userId);

  const [selectedCourseId, setSelectedCourseId] = useQueryState(
    "courseId",
    parseAsString.withDefault("")
  );
  const [selectedProgramId, setSelectedProgramId] = useQueryState(
    "programId",
    parseAsString.withDefault("")
  );

  const effectiveCourseId = useMemo(() => {
    if (filter !== "course") return undefined;
    if (selectedCourseId) return selectedCourseId;
    return courses[0]?.id;
  }, [filter, selectedCourseId, courses]);

  const effectiveProgramId = useMemo(() => {
    if (filter !== "program") return undefined;
    if (selectedProgramId) return selectedProgramId;
    return programs[0]?.id;
  }, [filter, selectedProgramId, programs]);

  const VALID_FILTERS: LeaderboardFilter[] = ["all", "course", "program"];
  const VALID_TIMEFRAMES: LeaderboardTimeframe[] = ["weekly", "all_time"];

  const typedFilter: LeaderboardFilter = VALID_FILTERS.includes(
    filter as LeaderboardFilter
  )
    ? (filter as LeaderboardFilter)
    : "all";
  const typedTimeframe: LeaderboardTimeframe = VALID_TIMEFRAMES.includes(
    timeframe as LeaderboardTimeframe
  )
    ? (timeframe as LeaderboardTimeframe)
    : "all_time";

  const { data: leaderboardData, isLoading: isLoadingLeaderboard } =
    useLeaderboard(
      typedFilter,
      typedTimeframe,
      effectiveCourseId,
      effectiveProgramId,
      institutionId
    );

  const { data: myRankData, isLoading: isLoadingMyRank } = useMyRank(
    typedFilter,
    typedTimeframe,
    effectiveCourseId,
    effectiveProgramId
  );

  const entries = leaderboardData ?? [];

  // Percentile band data for the current user (Req 131.4)
  const { data: percentileData } = useStudentPercentileBand(
    userId,
    effectiveCourseId
  );
  const totalStudents = percentileData?.totalStudents ?? entries.length;

  // Student league tier for League tab (fetched for LeagueTierBadge rendering)
  useStudentLeagueTier(userId);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Trophy className="h-6 w-6 text-amber-500" />
          <h1 className="text-2xl font-bold tracking-tight">Leaderboard</h1>
        </div>
        <AnonymousToggle />
      </div>

      {/* Mode Tabs: Individual vs Teams */}
      <div className="flex gap-2">
        {[
          { value: "individual", label: "Individual" },
          { value: "teams", label: "Teams" },
        ].map((opt) => (
          <button
            key={opt.value}
            onClick={() => setMode(opt.value)}
            className={cn(
              "px-4 py-1.5 rounded-xl text-sm font-semibold transition-colors",
              mode === opt.value
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-600 border border-gray-200"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {mode === "teams" ? (
        <TeamLeaderboard courseId={effectiveCourseId ?? courses[0]?.id} />
      ) : (
        <>
          <ReconnectBanner isDisconnected={!isLive} retryCount={retryCount} />

          {/* Leaderboard Tab Navigation: Top XP | Personal Best | Most Improved (Req 129.4) */}
          <div className="flex gap-2 flex-wrap">
            {[
              {
                value: "top_xp" as LeaderboardTab,
                label: "Top XP",
                icon: Trophy,
              },
              {
                value: "personal_best" as LeaderboardTab,
                label: "Personal Best",
                icon: BarChart3,
              },
              {
                value: "most_improved" as LeaderboardTab,
                label: "Most Improved",
                icon: TrendingUp,
              },
              {
                value: "league" as LeaderboardTab,
                label: "League",
                icon: Shield,
              },
            ].map((opt) => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.value}
                  onClick={() => setTab(opt.value)}
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-sm font-semibold transition-colors",
                    tab === opt.value
                      ? "bg-blue-600 text-white"
                      : "bg-white text-gray-600 border border-gray-200"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {opt.label}
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          {tab === "personal_best" ? (
            <PersonalBestChart studentId={userId} />
          ) : tab === "most_improved" ? (
            <MostImprovedList
              courseId={effectiveCourseId}
              currentUserId={userId}
            />
          ) : tab === "league" ? (
            <LeagueLeaderboardList
              courseId={effectiveCourseId}
              currentUserId={userId}
            />
          ) : (
            <>
              {/* Top XP — original leaderboard content */}
              <Tabs value={filter} onValueChange={(v) => setFilter(v)}>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <TabsList className="gap-2 bg-transparent p-0">
                    {FILTER_OPTIONS.map((opt) => (
                      <TabsTrigger
                        key={opt.value}
                        value={opt.value}
                        className={cn(
                          "rounded-xl border px-4 py-1.5 text-sm font-medium transition-colors",
                          filter === opt.value
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white text-gray-600 border-gray-200 hover:bg-slate-50"
                        )}
                      >
                        {opt.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  <div className="flex items-center gap-2">
                    {TIMEFRAME_OPTIONS.map((opt) => (
                      <Button
                        key={opt.value}
                        variant="outline"
                        size="sm"
                        onClick={() => setTimeframe(opt.value)}
                        className={cn(
                          "rounded-xl text-sm font-medium",
                          timeframe === opt.value
                            ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:text-white"
                            : "bg-white text-gray-600 border-gray-200"
                        )}
                      >
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <TabsContent value="course" className="mt-4">
                  {!isLoadingContext && courses.length > 0 && (
                    <Select
                      value={effectiveCourseId ?? ""}
                      onValueChange={(v) => setSelectedCourseId(v)}
                    >
                      <SelectTrigger className="w-64 bg-white">
                        <SelectValue placeholder="Select a course" />
                      </SelectTrigger>
                      <SelectContent>
                        {courses.map((c: { id: string; name: string }) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {!isLoadingContext && courses.length === 0 && (
                    <p className="text-sm text-gray-500">
                      No enrolled courses found.
                    </p>
                  )}
                </TabsContent>

                <TabsContent value="program" className="mt-4">
                  {!isLoadingContext && programs.length > 0 && (
                    <Select
                      value={effectiveProgramId ?? ""}
                      onValueChange={(v) => setSelectedProgramId(v)}
                    >
                      <SelectTrigger className="w-64 bg-white">
                        <SelectValue placeholder="Select a program" />
                      </SelectTrigger>
                      <SelectContent>
                        {programs.map((p: { id: string; name: string }) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {!isLoadingContext && programs.length === 0 && (
                    <p className="text-sm text-gray-500">No programs found.</p>
                  )}
                </TabsContent>

                <TabsContent value="all" />
              </Tabs>

              <MyRankCard
                rank={myRankData?.rank ?? null}
                xpTotal={myRankData?.xp_total ?? 0}
                level={myRankData?.level ?? 1}
                isLoading={isLoadingMyRank}
                totalStudents={totalStudents}
              />

              <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
                <div
                  className="px-6 py-4 flex items-center gap-2"
                  style={{
                    background:
                      "linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)",
                  }}
                >
                  <Medal className="h-5 w-5 text-white" />
                  <h2 className="text-lg font-bold tracking-tight text-white">
                    Top 50
                  </h2>
                </div>
                <div className="p-4 space-y-2">
                  {isLoadingLeaderboard ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <Shimmer key={i} className="h-14 rounded-xl" />
                    ))
                  ) : entries.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-8">
                      No leaderboard data available yet.
                    </p>
                  ) : (
                    entries.map((entry) => (
                      <LeaderboardRow
                        key={entry.student_id}
                        entry={entry}
                        isCurrentUser={entry.student_id === userId}
                        totalStudents={totalStudents}
                      />
                    ))
                  )}
                </div>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default LeaderboardPage;
