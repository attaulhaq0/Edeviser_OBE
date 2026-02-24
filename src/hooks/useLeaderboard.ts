// =============================================================================
// useLeaderboard — TanStack Query hooks for leaderboard data
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LeaderboardEntry {
  student_id: string;
  full_name: string;
  xp_total: number;
  level: number;
  streak_current: number;
  rank: number;
}

export type LeaderboardFilter = 'course' | 'program' | 'all';
export type LeaderboardTimeframe = 'weekly' | 'all_time';

interface MyRankData {
  rank: number;
  xp_total: number;
  level: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as unknown as { from: (table: string) => any };

// ─── useLeaderboard ──────────────────────────────────────────────────────────

export const useLeaderboard = (
  filter: LeaderboardFilter,
  timeframe: LeaderboardTimeframe,
  courseId?: string,
  programId?: string,
) => {
  return useQuery({
    queryKey: queryKeys.leaderboard.list({ filter, timeframe, courseId, programId }),
    queryFn: async (): Promise<LeaderboardEntry[]> => {
      if (timeframe === 'weekly') {
        return fetchWeeklyLeaderboard(filter, courseId, programId);
      }
      return fetchAllTimeLeaderboard(filter, courseId, programId);
    },
  });
};

// ─── Weekly leaderboard (materialized view) ──────────────────────────────────

async function fetchWeeklyLeaderboard(
  filter: LeaderboardFilter,
  courseId?: string,
  programId?: string,
): Promise<LeaderboardEntry[]> {
  let query = db
    .from('leaderboard_weekly')
    .select('student_id, full_name, xp_total, level, streak_current, global_rank')
    .order('xp_total', { ascending: false })
    .limit(50);

  if (filter === 'course' && courseId) {
    const studentIds = await getStudentIdsByCourse(courseId);
    if (studentIds.length === 0) return [];
    query = query.in('student_id', studentIds);
  } else if (filter === 'program' && programId) {
    const studentIds = await getStudentIdsByProgram(programId);
    if (studentIds.length === 0) return [];
    query = query.in('student_id', studentIds);
  }

  const { data, error } = await query;
  if (error) throw error;

  const optOutIds = await getOptOutStudentIds();

  return assignRanks(
    (data as Array<{
      student_id: string;
      full_name: string;
      xp_total: number;
      level: number;
      streak_current: number;
      global_rank: number;
    }>) ?? [],
    optOutIds,
  );
}

// ─── All-time leaderboard (direct query) ─────────────────────────────────────

async function fetchAllTimeLeaderboard(
  filter: LeaderboardFilter,
  courseId?: string,
  programId?: string,
): Promise<LeaderboardEntry[]> {
  let studentIdFilter: string[] | null = null;

  if (filter === 'course' && courseId) {
    studentIdFilter = await getStudentIdsByCourse(courseId);
    if (studentIdFilter.length === 0) return [];
  } else if (filter === 'program' && programId) {
    studentIdFilter = await getStudentIdsByProgram(programId);
    if (studentIdFilter.length === 0) return [];
  }

  let query = db
    .from('student_gamification')
    .select('student_id, xp_total, level, streak_current')
    .order('xp_total', { ascending: false })
    .limit(50);

  if (studentIdFilter) {
    query = query.in('student_id', studentIdFilter);
  }

  const { data: gamData, error: gamError } = await query;
  if (gamError) throw gamError;

  const rows = (gamData as Array<{
    student_id: string;
    xp_total: number;
    level: number;
    streak_current: number;
  }>) ?? [];

  if (rows.length === 0) return [];

  // Fetch profile names for these students
  const ids = rows.map((r) => r.student_id);
  const { data: profileData, error: profileError } = await db
    .from('profiles')
    .select('id, full_name')
    .in('id', ids);

  if (profileError) throw profileError;

  const nameMap = new Map<string, string>();
  for (const p of (profileData as Array<{ id: string; full_name: string }>) ?? []) {
    nameMap.set(p.id, p.full_name);
  }

  const optOutIds = await getOptOutStudentIds();

  const merged = rows.map((r) => ({
    student_id: r.student_id,
    full_name: nameMap.get(r.student_id) ?? 'Unknown',
    xp_total: r.xp_total,
    level: r.level,
    streak_current: r.streak_current,
    global_rank: 0,
  }));

  return assignRanks(merged, optOutIds);
}

// ─── useMyRank ───────────────────────────────────────────────────────────────

export const useMyRank = (
  filter: LeaderboardFilter,
  timeframe: LeaderboardTimeframe,
  courseId?: string,
  programId?: string,
) => {
  return useQuery({
    queryKey: queryKeys.leaderboard.detail('my-rank'),
    queryFn: async (): Promise<MyRankData | null> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      // Get the student's gamification data
      const { data: gamData, error: gamError } = await db
        .from('student_gamification')
        .select('xp_total, level')
        .eq('student_id', user.id)
        .maybeSingle();

      if (gamError) throw gamError;
      if (!gamData) return null;

      const myXp = (gamData as { xp_total: number; level: number }).xp_total;
      const myLevel = (gamData as { xp_total: number; level: number }).level;

      // For weekly timeframe, use the materialized view rank
      if (timeframe === 'weekly') {
        const { data: weeklyData, error: weeklyError } = await db
          .from('leaderboard_weekly')
          .select('global_rank')
          .eq('student_id', user.id)
          .maybeSingle();

        if (weeklyError) throw weeklyError;
        const weeklyRank = (weeklyData as { global_rank: number } | null)?.global_rank ?? 0;
        return { rank: weeklyRank || 1, xp_total: myXp, level: myLevel };
      }

      // For all-time, count students with more XP to determine rank
      let countQuery = db
        .from('student_gamification')
        .select('student_id', { count: 'exact', head: true })
        .gt('xp_total', myXp);

      if (filter === 'course' && courseId) {
        const studentIds = await getStudentIdsByCourse(courseId);
        if (studentIds.length === 0) return { rank: 1, xp_total: myXp, level: myLevel };
        countQuery = countQuery.in('student_id', studentIds);
      } else if (filter === 'program' && programId) {
        const studentIds = await getStudentIdsByProgram(programId);
        if (studentIds.length === 0) return { rank: 1, xp_total: myXp, level: myLevel };
        countQuery = countQuery.in('student_id', studentIds);
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
    queryKey: queryKeys.studentGamification.detail('anonymous-status'),
    queryFn: async (): Promise<{ isAnonymous: boolean }> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return { isAnonymous: false };

      const { data, error } = await db
        .from('student_gamification')
        .select('leaderboard_opt_out')
        .eq('student_id', user.id)
        .maybeSingle();

      if (error) throw error;

      const optOut = (data as { leaderboard_opt_out: boolean } | null)?.leaderboard_opt_out ?? false;
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
      if (!user) throw new Error('Not authenticated');

      // Get current opt-out status
      const { data: current, error: fetchError } = await db
        .from('student_gamification')
        .select('leaderboard_opt_out')
        .eq('student_id', user.id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      const currentOptOut = (current as { leaderboard_opt_out: boolean } | null)?.leaderboard_opt_out ?? false;
      const newOptOut = !currentOptOut;

      const { error: updateError } = await db
        .from('student_gamification')
        .update({ leaderboard_opt_out: newOptOut })
        .eq('student_id', user.id);

      if (updateError) throw updateError;

      return newOptOut;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leaderboard.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.studentGamification.all });
    },
  });
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getStudentIdsByCourse(courseId: string): Promise<string[]> {
  const { data, error } = await db
    .from('student_courses')
    .select('student_id')
    .eq('course_id', courseId)
    .eq('status', 'active');

  if (error) throw error;
  return ((data as Array<{ student_id: string }>) ?? []).map((r) => r.student_id);
}

async function getStudentIdsByProgram(programId: string): Promise<string[]> {
  // Get all courses in the program, then get enrolled students
  const { data: courses, error: courseError } = await db
    .from('courses')
    .select('id')
    .eq('program_id', programId);

  if (courseError) throw courseError;

  const courseIds = ((courses as Array<{ id: string }>) ?? []).map((c) => c.id);
  if (courseIds.length === 0) return [];

  const { data, error } = await db
    .from('student_courses')
    .select('student_id')
    .in('course_id', courseIds)
    .eq('status', 'active');

  if (error) throw error;

  // Deduplicate student IDs (a student may be in multiple courses)
  const unique = [...new Set(((data as Array<{ student_id: string }>) ?? []).map((r) => r.student_id))];
  return unique;
}

async function getOptOutStudentIds(): Promise<Set<string>> {
  const { data, error } = await db
    .from('student_gamification')
    .select('student_id')
    .eq('leaderboard_opt_out', true);

  if (error) throw error;
  return new Set(((data as Array<{ student_id: string }>) ?? []).map((r) => r.student_id));
}

function assignRanks(
  rows: Array<{
    student_id: string;
    full_name: string;
    xp_total: number;
    level: number;
    streak_current: number;
    global_rank: number;
  }>,
  optOutIds: Set<string>,
): LeaderboardEntry[] {
  return rows.map((row, index) => ({
    student_id: row.student_id,
    full_name: optOutIds.has(row.student_id) ? 'Anonymous' : row.full_name,
    xp_total: row.xp_total,
    level: row.level,
    streak_current: row.streak_current,
    rank: index + 1,
  }));
}
