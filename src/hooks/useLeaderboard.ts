// =============================================================================
// useLeaderboard — TanStack Query hooks for leaderboard data
// =============================================================================
//
// Task 7.2: the institution leaderboard is fetched through the paginated,
// opt-out-aware `get_leaderboard_page` RPC instead of the old whole-institution
// `get_leaderboard` fetch + client-side top-50 slice. The RPC:
//   - is institution-scoped (raises on `auth_institution_id()` mismatch),
//   - excludes opted-out students set-based (no `getOptOutStudentIds` scan),
//   - returns one ranked page plus the total eligible cohort count.
// The eligible count drives the min-cohort gate (`leaderboardState`) using the
// institution's configurable `leaderboard_min_cohort_size`, and pagination is
// computed with the shared `pagination.ts` helpers so paging is never capped at
// a fixed 50. Requirements: 6.1, 6.3, 6.5, 32.1, 32.2, 32.3.

import {
  useQuery,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { leaderboardState, type LeaderboardState } from "@/lib/leaderboardGate";
import { hasMore } from "@/lib/pagination";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LeaderboardEntry {
  student_id: string;
  full_name: string;
  xp_total: number;
  level: number;
  streak_current: number;
  rank: number;
}

export type LeaderboardFilter = "course" | "program" | "all";
export type LeaderboardTimeframe = "weekly" | "all_time";

/**
 * Resolved leaderboard payload exposed to the page.
 *
 * `state` carries the min-cohort gate decision; when `locked`, `entries` is
 * empty so no rank or medal can ever be rendered for an ineligible cohort
 * (R6.1, R6.4). `eligibleCount` is the total non-opted-out cohort size returned
 * by the RPC, independent of the current page.
 */
export interface LeaderboardData {
  entries: LeaderboardEntry[];
  eligibleCount: number;
  state: LeaderboardState;
  minCohortSize: number;
  pageSize: number;
}

/**
 * Return contract of `useLeaderboard`. Mirrors the parts of a TanStack Query
 * result the leaderboard page relies on (`data`/`isLoading`) and adds the
 * "load more" affordance for paging beyond the first page (R32.2).
 */
export interface UseLeaderboardResult {
  data: LeaderboardData;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  hasMore: boolean;
  fetchNextPage: () => void;
  isFetchingNextPage: boolean;
}

interface MyRankData {
  rank: number;
  xp_total: number;
  level: number;
}

interface LeaderboardSettings {
  minCohortSize: number;
  pageSize: number;
}

interface LeaderboardPageResult {
  entries: LeaderboardEntry[];
  eligibleCount: number;
}

// Mirror the `institution_settings` column defaults so the gate stays sane if a
// row has not been provisioned yet (configurable per institution — R6.3).
const DEFAULT_MIN_COHORT_SIZE = 5;
const DEFAULT_PAGE_SIZE = 50;

// ─── useLeaderboard ──────────────────────────────────────────────────────────

export const useLeaderboard = (
  filter: LeaderboardFilter,
  timeframe: LeaderboardTimeframe,
  courseId?: string,
  programId?: string,
  institutionId?: string | null
): UseLeaderboardResult => {
  // The configurable min-cohort threshold and page size live in
  // institution_settings (R6.3, R32.2); read them via the existing
  // institution-scoped read policy.
  const settingsQuery = useQuery({
    queryKey: queryKeys.institutionSettings.detail(
      institutionId ?? "no-institution"
    ),
    queryFn: (): Promise<LeaderboardSettings> =>
      fetchLeaderboardSettings(institutionId as string),
    enabled: Boolean(institutionId),
    staleTime: 5 * 60 * 1000,
  });

  const pageSize = settingsQuery.data?.pageSize ?? DEFAULT_PAGE_SIZE;
  const minCohortSize =
    settingsQuery.data?.minCohortSize ?? DEFAULT_MIN_COHORT_SIZE;

  // Institution-scoped paginated leaderboard. The RPC handles opt-out exclusion
  // and ranking; `filter`/`timeframe`/`courseId`/`programId` participate in the
  // query key so cache entries stay separated per selection.
  const infinite = useInfiniteQuery({
    queryKey: queryKeys.leaderboard.list({
      scope: "page",
      filter,
      timeframe,
      courseId,
      programId,
      institutionId,
      pageSize,
    }),
    queryFn: ({ pageParam }): Promise<LeaderboardPageResult> =>
      fetchLeaderboardPage(institutionId as string, pageSize, pageParam),
    initialPageParam: 0,
    getNextPageParam: (_lastPage, allPages) => {
      const eligibleCount = allPages[0]?.eligibleCount ?? 0;
      const loaded = allPages.reduce((sum, p) => sum + p.entries.length, 0);
      // `hasMore` is 1-based on the page index; after N loaded pages we ask
      // whether a row exists beyond page N. The next offset is the count of
      // rows already loaded.
      return hasMore(allPages.length, pageSize, eligibleCount)
        ? loaded
        : undefined;
    },
    enabled: Boolean(institutionId) && settingsQuery.isSuccess,
  });

  const pages = infinite.data?.pages ?? [];
  const eligibleCount = pages[0]?.eligibleCount ?? 0;
  const state = leaderboardState(eligibleCount, minCohortSize);

  // R6.1/R6.4: while locked, surface no ranked rows so the UI cannot award a
  // position or medal regardless of how it renders. Opt-out exclusion (R6.5,
  // R32.4) is already enforced inside the RPC.
  const entries = state === "unlocked" ? pages.flatMap((p) => p.entries) : [];

  return {
    data: { entries, eligibleCount, state, minCohortSize, pageSize },
    isLoading:
      (Boolean(institutionId) && settingsQuery.isLoading) || infinite.isLoading,
    isError: settingsQuery.isError || infinite.isError,
    error: settingsQuery.error ?? infinite.error,
    hasMore: state === "unlocked" && (infinite.hasNextPage ?? false),
    fetchNextPage: () => {
      void infinite.fetchNextPage();
    },
    isFetchingNextPage: infinite.isFetchingNextPage,
  };
};

// ─── Leaderboard data fetchers ───────────────────────────────────────────────

async function fetchLeaderboardSettings(
  institutionId: string
): Promise<LeaderboardSettings> {
  const { data, error } = await supabase
    .from("institution_settings")
    .select("leaderboard_min_cohort_size, leaderboard_page_size")
    .eq("institution_id", institutionId)
    .maybeSingle();

  if (error) throw error;

  return {
    minCohortSize: data?.leaderboard_min_cohort_size ?? DEFAULT_MIN_COHORT_SIZE,
    pageSize: data?.leaderboard_page_size ?? DEFAULT_PAGE_SIZE,
  };
}

async function fetchLeaderboardPage(
  institutionId: string,
  pageSize: number,
  offset: number
): Promise<LeaderboardPageResult> {
  const { data, error } = await supabase.rpc("get_leaderboard_page", {
    p_institution_id: institutionId,
    p_limit: pageSize,
    p_offset: offset,
  });

  if (error) throw error;

  const rows = data ?? [];
  // `eligible_count` is the same window count on every row; read it from the
  // first row of the page (0 when the cohort/page is empty).
  const firstRow = rows[0];
  const eligibleCount = firstRow ? Number(firstRow.eligible_count) : 0;

  const entries: LeaderboardEntry[] = rows.map((row) => ({
    student_id: row.student_id,
    full_name: row.full_name,
    xp_total: Number(row.xp_total),
    level: row.level,
    streak_current: row.streak_current,
    rank: Number(row.global_rank),
  }));

  return { entries, eligibleCount };
}

// ─── useMyRank ───────────────────────────────────────────────────────────────

export const useMyRank = (
  filter: LeaderboardFilter,
  timeframe: LeaderboardTimeframe,
  courseId?: string,
  programId?: string
) => {
  return useQuery({
    queryKey: queryKeys.leaderboard.list({
      scope: "my-rank",
      filter,
      timeframe,
      courseId,
      programId,
    }),
    queryFn: async (): Promise<MyRankData | null> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      // Get the student's gamification data
      const { data: gamData, error: gamError } = await supabase
        .from("student_gamification")
        .select("xp_total, level")
        .eq("student_id", user.id)
        .maybeSingle();

      if (gamError) throw gamError;
      if (!gamData) return null;

      const myXp = gamData.xp_total;
      const myLevel = gamData.level;

      // For weekly timeframe, compute scoped rank from materialized view
      if (timeframe === "weekly") {
        let scopeFilter: string[] | null = null;

        if (filter === "course" && courseId) {
          scopeFilter = await getStudentIdsByCourse(courseId);
          if (scopeFilter.length === 0)
            return { rank: 1, xp_total: myXp, level: myLevel };
        } else if (filter === "program" && programId) {
          scopeFilter = await getStudentIdsByProgram(programId);
          if (scopeFilter.length === 0)
            return { rank: 1, xp_total: myXp, level: myLevel };
        }

        let weeklyCountQuery = supabase
          .from("student_gamification")
          .select("student_id", { count: "exact", head: true })
          .gt("xp_total", myXp);

        if (scopeFilter) {
          weeklyCountQuery = weeklyCountQuery.in("student_id", scopeFilter);
        }

        const { count: weeklyCount, error: weeklyError } =
          await weeklyCountQuery;
        if (weeklyError) throw weeklyError;

        return { rank: (weeklyCount ?? 0) + 1, xp_total: myXp, level: myLevel };
      }

      // For all-time, count students with more XP to determine rank
      let countQuery = supabase
        .from("student_gamification")
        .select("student_id", { count: "exact", head: true })
        .gt("xp_total", myXp);

      if (filter === "course" && courseId) {
        const studentIds = await getStudentIdsByCourse(courseId);
        if (studentIds.length === 0)
          return { rank: 1, xp_total: myXp, level: myLevel };
        countQuery = countQuery.in("student_id", studentIds);
      } else if (filter === "program" && programId) {
        const studentIds = await getStudentIdsByProgram(programId);
        if (studentIds.length === 0)
          return { rank: 1, xp_total: myXp, level: myLevel };
        countQuery = countQuery.in("student_id", studentIds);
      }

      const { count, error: countError } = await countQuery;
      if (countError) throw countError;

      return {
        rank: (count ?? 0) + 1,
        xp_total: myXp,
        level: myLevel,
      };
    },
  });
};

// ─── useAnonymousStatus ──────────────────────────────────────────────────────

export const useAnonymousStatus = () => {
  return useQuery({
    queryKey: queryKeys.studentGamification.detail("anonymous-status"),
    queryFn: async (): Promise<{ isAnonymous: boolean }> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return { isAnonymous: false };

      const { data, error } = await supabase
        .from("student_gamification")
        .select("leaderboard_anonymous")
        .eq("student_id", user.id)
        .maybeSingle();

      if (error) throw error;

      const optOut = data?.leaderboard_anonymous ?? false;
      return { isAnonymous: optOut };
    },
  });
};

// ─── useToggleAnonymous ──────────────────────────────────────────────────────

export const useToggleAnonymous = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<boolean> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get current opt-out status
      const { data: current, error: fetchError } = await supabase
        .from("student_gamification")
        .select("leaderboard_anonymous")
        .eq("student_id", user.id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      const currentOptOut = current?.leaderboard_anonymous ?? false;
      const newOptOut = !currentOptOut;

      const { error: updateError } = await supabase
        .from("student_gamification")
        .update({ leaderboard_anonymous: newOptOut })
        .eq("student_id", user.id);

      if (updateError) throw updateError;

      return newOptOut;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.leaderboard.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.studentGamification.all,
      });
    },
  });
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getStudentIdsByCourse(courseId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("student_courses")
    .select("student_id")
    .eq("course_id", courseId)
    .eq("status", "active");

  if (error) throw error;
  return (data ?? []).map((r) => r.student_id);
}

async function getStudentIdsByProgram(programId: string): Promise<string[]> {
  // Get all courses in the program, then get enrolled students
  const { data: courses, error: courseError } = await supabase
    .from("courses")
    .select("id")
    .eq("program_id", programId);

  if (courseError) throw courseError;

  const courseIds = (courses ?? []).map((c) => c.id);
  if (courseIds.length === 0) return [];

  const { data, error } = await supabase
    .from("student_courses")
    .select("student_id")
    .in("course_id", courseIds)
    .eq("status", "active");

  if (error) throw error;

  // Deduplicate student IDs (a student may be in multiple courses)
  const unique = [...new Set((data ?? []).map((r) => r.student_id))];
  return unique;
}
