// =============================================================================
// LeaderboardPage — Student leaderboard with course/program/all filters
// =============================================================================

import { useMemo } from 'react';
import { parseAsString, useQueryState } from 'nuqs';
import { Trophy, Flame, Medal } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useLeaderboardRealtime } from '@/hooks/useLeaderboardRealtime';
import {
  useLeaderboard,
  useMyRank,
  type LeaderboardEntry,
  type LeaderboardFilter,
  type LeaderboardTimeframe,
} from '@/hooks/useLeaderboard';
import { useStudentCourseProgram } from './useStudentCourseProgram';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Shimmer from '@/components/shared/Shimmer';
import AnonymousToggle from '@/components/shared/AnonymousToggle';
import { cn } from '@/lib/utils';

// ─── Constants ───────────────────────────────────────────────────────────────

const FILTER_OPTIONS: Array<{ value: LeaderboardFilter; label: string }> = [
  { value: 'all', label: 'All Students' },
  { value: 'course', label: 'My Course' },
  { value: 'program', label: 'My Program' },
];

const TIMEFRAME_OPTIONS: Array<{ value: LeaderboardTimeframe; label: string }> = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'all_time', label: 'All Time' },
];

// ─── Medal helpers ───────────────────────────────────────────────────────────

const getMedalColor = (rank: number): string | null => {
  if (rank === 1) return '#EAB308'; // gold / yellow-400
  if (rank === 2) return '#9CA3AF'; // silver / gray-400
  if (rank === 3) return '#D97706'; // bronze / amber-600
  return null;
};

const getRankBg = (rank: number): string => {
  if (rank === 1) return 'bg-yellow-50 border-yellow-200';
  if (rank === 2) return 'bg-gray-50 border-gray-200';
  if (rank === 3) return 'bg-amber-50 border-amber-200';
  return 'bg-white border-slate-100';
};

// ─── LeaderboardRow ──────────────────────────────────────────────────────────

interface LeaderboardRowProps {
  entry: LeaderboardEntry;
  isCurrentUser: boolean;
}

const LeaderboardRow = ({ entry, isCurrentUser }: LeaderboardRowProps) => {
  const medalColor = getMedalColor(entry.rank);
  const isAnonymous = entry.full_name === 'Anonymous';

  return (
    <div
      className={cn(
        'flex items-center gap-4 px-4 py-3 rounded-xl border transition-colors',
        getRankBg(entry.rank),
        isCurrentUser && 'ring-2 ring-blue-400',
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

      {/* Name */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-sm font-semibold truncate',
            isAnonymous ? 'text-gray-400 italic' : 'text-gray-900',
            isCurrentUser && 'text-blue-700',
          )}
        >
          {entry.full_name}
          {isCurrentUser && <span className="ml-1 text-xs font-normal text-blue-500">(You)</span>}
        </p>
      </div>

      {/* XP */}
      <div className="text-right shrink-0">
        <span className="text-sm font-bold text-amber-500">{entry.xp_total.toLocaleString()} XP</span>
      </div>

      {/* Level */}
      <Badge variant="secondary" className="shrink-0 bg-blue-50 text-blue-700 border-blue-200">
        Lv {entry.level}
      </Badge>

      {/* Streak */}
      {entry.streak_current > 0 && (
        <div className="flex items-center gap-1 shrink-0">
          <Flame className="h-4 w-4 text-orange-500" />
          <span className="text-xs font-bold text-orange-600">{entry.streak_current}</span>
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
}

const MyRankCard = ({ rank, xpTotal, level, isLoading }: MyRankCardProps) => {
  if (isLoading) {
    return <Shimmer className="h-24 rounded-xl" />;
  }

  return (
    <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
      <div
        className="px-6 py-4 flex items-center gap-2"
        style={{ background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)' }}
      >
        <Trophy className="h-5 w-5 text-white" />
        <h2 className="text-lg font-bold tracking-tight text-white">Your Rank</h2>
      </div>
      <div className="p-6 flex items-center gap-6">
        <div className="text-center">
          <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">Rank</p>
          <p className="text-2xl font-black">#{rank ?? '—'}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">Total XP</p>
          <p className="text-2xl font-black text-amber-500">{xpTotal.toLocaleString()}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">Level</p>
          <p className="text-2xl font-black text-blue-600">{level}</p>
        </div>
      </div>
    </Card>
  );
};

// ─── LeaderboardPage ─────────────────────────────────────────────────────────

const LeaderboardPage = () => {
  const { user, institutionId } = useAuth();
  const userId = user?.id ?? '';

  // Subscribe to realtime XP changes so the leaderboard stays fresh
  useLeaderboardRealtime(institutionId ?? undefined);

  // URL-persisted filter state
  const [filter, setFilter] = useQueryState(
    'filter',
    parseAsString.withDefault('all'),
  );
  const [timeframe, setTimeframe] = useQueryState(
    'timeframe',
    parseAsString.withDefault('all_time'),
  );

  // Fetch student's enrolled courses and programs for the filter dropdowns
  const { courses, programs, isLoading: isLoadingContext } = useStudentCourseProgram(userId);

  // Selected course/program for scoped filters
  const [selectedCourseId, setSelectedCourseId] = useQueryState(
    'courseId',
    parseAsString.withDefault(''),
  );
  const [selectedProgramId, setSelectedProgramId] = useQueryState(
    'programId',
    parseAsString.withDefault(''),
  );

  // Resolve effective course/program IDs
  const effectiveCourseId = useMemo(() => {
    if (filter !== 'course') return undefined;
    if (selectedCourseId) return selectedCourseId;
    return courses[0]?.id;
  }, [filter, selectedCourseId, courses]);

  const effectiveProgramId = useMemo(() => {
    if (filter !== 'program') return undefined;
    if (selectedProgramId) return selectedProgramId;
    return programs[0]?.id;
  }, [filter, selectedProgramId, programs]);

  // Leaderboard data
  const VALID_FILTERS: LeaderboardFilter[] = ['all', 'course', 'program'];
  const VALID_TIMEFRAMES: LeaderboardTimeframe[] = ['weekly', 'all_time'];

  const typedFilter: LeaderboardFilter = VALID_FILTERS.includes(filter as LeaderboardFilter)
    ? (filter as LeaderboardFilter)
    : 'all';
  const typedTimeframe: LeaderboardTimeframe = VALID_TIMEFRAMES.includes(timeframe as LeaderboardTimeframe)
    ? (timeframe as LeaderboardTimeframe)
    : 'all_time';

  const {
    data: leaderboardData,
    isLoading: isLoadingLeaderboard,
  } = useLeaderboard(typedFilter, typedTimeframe, effectiveCourseId, effectiveProgramId);

  const {
    data: myRankData,
    isLoading: isLoadingMyRank,
  } = useMyRank(typedFilter, typedTimeframe, effectiveCourseId, effectiveProgramId);

  const entries = leaderboardData ?? [];

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

      {/* Filter Tabs */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v)}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <TabsList className="gap-2 bg-transparent p-0">
            {FILTER_OPTIONS.map((opt) => (
              <TabsTrigger
                key={opt.value}
                value={opt.value}
                className={cn(
                  'rounded-xl border px-4 py-1.5 text-sm font-medium transition-colors',
                  filter === opt.value
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-slate-50',
                )}
              >
                {opt.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Timeframe toggle */}
          <div className="flex items-center gap-2">
            {TIMEFRAME_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                variant="outline"
                size="sm"
                onClick={() => setTimeframe(opt.value)}
                className={cn(
                  'rounded-xl text-sm font-medium',
                  timeframe === opt.value
                    ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:text-white'
                    : 'bg-white text-gray-600 border-gray-200',
                )}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Course/Program selector (shown when filter is course or program) */}
        <TabsContent value="course" className="mt-4">
          {!isLoadingContext && courses.length > 0 && (
            <Select
              value={effectiveCourseId ?? ''}
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
            <p className="text-sm text-gray-500">No enrolled courses found.</p>
          )}
        </TabsContent>

        <TabsContent value="program" className="mt-4">
          {!isLoadingContext && programs.length > 0 && (
            <Select
              value={effectiveProgramId ?? ''}
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

        {/* Empty content for "all" tab to satisfy Tabs component */}
        <TabsContent value="all" />
      </Tabs>

      {/* My Rank Card */}
      <MyRankCard
        rank={myRankData?.rank ?? null}
        xpTotal={myRankData?.xp_total ?? 0}
        level={myRankData?.level ?? 1}
        isLoading={isLoadingMyRank}
      />

      {/* Leaderboard List */}
      <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
        <div
          className="px-6 py-4 flex items-center gap-2"
          style={{ background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)' }}
        >
          <Medal className="h-5 w-5 text-white" />
          <h2 className="text-lg font-bold tracking-tight text-white">Top 50</h2>
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
              />
            ))
          )}
        </div>
      </Card>
    </div>
  );
};

export default LeaderboardPage;
