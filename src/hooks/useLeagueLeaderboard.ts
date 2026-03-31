// =============================================================================
// useLeagueLeaderboard — TanStack Query hooks for League Tiers & Percentile Bands
// Task 148.4 — Requirements: 131.1, 132.1, 132.2
// =============================================================================

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import {
  type LeagueTierName,
  type LeagueThresholds,
  DEFAULT_LEAGUE_THRESHOLDS,
  getLeagueTier,
} from '@/lib/leagueTier';
import { calculatePercentileBand, type PercentileBandResult } from '@/lib/percentileBand';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LeagueLeaderboardEntry {
  student_id: string;
  full_name: string;
  weekly_xp: number;
  xp_total: number;
  level: number;
  tier: LeagueTierName;
  rank: number;
}

// ─── useLeagueLeaderboard ────────────────────────────────────────────────────
// Fetches within-tier ranking by weekly XP (Req 132.2, 132.6)

export const useLeagueLeaderboard = (courseId?: string, tier?: LeagueTierName) => {
  return useQuery({
    queryKey: queryKeys.leagueLeaderboard.list({ courseId, tier }),
    queryFn: async (): Promise<LeagueLeaderboardEntry[]> => {
      // Fetch all students with gamification data
      let gamQuery = supabase
        .from('student_gamification')
        .select('student_id, xp_total, level')
        .order('xp_total', { ascending: false });

      // Scope to course if provided
      if (courseId) {
        const { data: enrollments, error: enrollErr } = await supabase
          .from('student_courses')
          .select('student_id')
          .eq('course_id', courseId)
          .eq('status', 'active');
        if (enrollErr) throw enrollErr;
        const studentIds = (enrollments ?? []).map((e) => e.student_id);
        if (studentIds.length === 0) return [];
        gamQuery = gamQuery.in('student_id', studentIds);
      }

      const { data: gamData, error: gamErr } = await gamQuery;
      if (gamErr) throw gamErr;

      // Fetch institution league thresholds
      const thresholds = await fetchLeagueThresholds();

      // Filter by tier
      const tieredStudents = (gamData ?? []).filter((s) => {
        const studentTier = getLeagueTier(s.xp_total, thresholds);
        return !tier || studentTier === tier;
      });

      if (tieredStudents.length === 0) return [];

      // Fetch weekly XP from leaderboard_weekly
      const studentIds = tieredStudents.map((s) => s.student_id);
      const { data: weeklyData, error: weeklyErr } = await supabase
        .from('leaderboard_weekly')
        .select('student_id, xp_total')
        .in('student_id', studentIds);
      if (weeklyErr) throw weeklyErr;

      const weeklyMap = new Map<string, number>();
      for (const w of weeklyData ?? []) {
        const sid = w.student_id;
        if (sid) weeklyMap.set(sid, w.xp_total ?? 0);
      }

      // Fetch names
      const { data: profiles, error: profileErr } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', studentIds);
      if (profileErr) throw profileErr;

      const nameMap = new Map<string, string>();
      for (const p of profiles ?? []) {
        nameMap.set(p.id, p.full_name);
      }

      // Fetch anonymous opt-outs
      const { data: optOuts } = await supabase
        .from('student_gamification')
        .select('student_id')
        .eq('leaderboard_anonymous', true);
      const optOutIds = new Set((optOuts ?? []).map((r) => r.student_id));

      // Build entries sorted by weekly XP (Req 132.6)
      const entries = tieredStudents
        .map((s) => ({
          student_id: s.student_id,
          full_name: optOutIds.has(s.student_id)
            ? 'Anonymous'
            : (nameMap.get(s.student_id) ?? 'Unknown'),
          weekly_xp: weeklyMap.get(s.student_id) ?? 0,
          xp_total: s.xp_total,
          level: s.level,
          tier: getLeagueTier(s.xp_total, thresholds),
          rank: 0,
        }))
        .sort((a, b) => b.weekly_xp - a.weekly_xp)
        .map((entry, index) => ({ ...entry, rank: index + 1 }));

      return entries.slice(0, 50);
    },
    enabled: !!tier,
  });
};

// ─── useStudentLeagueTier ────────────────────────────────────────────────────
// Fetches the current tier for a student (Req 132.1)

export const useStudentLeagueTier = (studentId?: string) => {
  return useQuery({
    queryKey: queryKeys.leagueTier.detail(studentId ?? ''),
    queryFn: async (): Promise<{ tier: LeagueTierName; xpTotal: number } | null> => {
      if (!studentId) return null;

      const { data, error } = await supabase
        .from('student_gamification')
        .select('xp_total')
        .eq('student_id', studentId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      const thresholds = await fetchLeagueThresholds();
      return {
        tier: getLeagueTier(data.xp_total, thresholds),
        xpTotal: data.xp_total,
      };
    },
    enabled: !!studentId,
  });
};

// ─── useStudentPercentileBand ────────────────────────────────────────────────
// Fetches percentile position for a student (Req 131.1, 131.2, 131.3)

export const useStudentPercentileBand = (studentId?: string, courseId?: string) => {
  return useQuery({
    queryKey: queryKeys.percentileBand.list({ studentId, courseId }),
    queryFn: async (): Promise<{ band: PercentileBandResult; rank: number; totalStudents: number } | null> => {
      if (!studentId) return null;

      // Get student's XP
      const { data: gamData, error: gamErr } = await supabase
        .from('student_gamification')
        .select('xp_total')
        .eq('student_id', studentId)
        .maybeSingle();

      if (gamErr) throw gamErr;
      if (!gamData) return null;

      const myXp = gamData.xp_total;

      // Count students with more XP (for rank)
      let countQuery = supabase
        .from('student_gamification')
        .select('student_id', { count: 'exact', head: true })
        .gt('xp_total', myXp);

      let totalQuery = supabase
        .from('student_gamification')
        .select('student_id', { count: 'exact', head: true });

      if (courseId) {
        const { data: enrollments } = await supabase
          .from('student_courses')
          .select('student_id')
          .eq('course_id', courseId)
          .eq('status', 'active');
        const ids = (enrollments ?? []).map((e) => e.student_id);
        if (ids.length === 0) return { band: { type: 'exact', rank: 1 }, rank: 1, totalStudents: 0 };
        countQuery = countQuery.in('student_id', ids);
        totalQuery = totalQuery.in('student_id', ids);
      }

      const [{ count: aboveCount, error: countErr }, { count: totalCount, error: totalErr }] =
        await Promise.all([countQuery, totalQuery]);

      if (countErr) throw countErr;
      if (totalErr) throw totalErr;

      const rank = (aboveCount ?? 0) + 1;
      const total = totalCount ?? 0;

      return {
        band: calculatePercentileBand(rank, total),
        rank,
        totalStudents: total,
      };
    },
    enabled: !!studentId,
  });
};

// ─── Helper ──────────────────────────────────────────────────────────────────

async function fetchLeagueThresholds(): Promise<LeagueThresholds> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return DEFAULT_LEAGUE_THRESHOLDS;

  const { data: profile } = await supabase
    .from('profiles')
    .select('institution_id')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile?.institution_id) return DEFAULT_LEAGUE_THRESHOLDS;

  const { data: settings } = await supabase
    .from('institution_settings')
    .select('*')
    .eq('institution_id', profile.institution_id)
    .maybeSingle();

  const rawSettings = settings as Record<string, unknown> | null;
  if (!rawSettings?.league_thresholds) return DEFAULT_LEAGUE_THRESHOLDS;

  const lt = rawSettings.league_thresholds as Record<string, number>;
  return {
    bronze: lt.bronze ?? DEFAULT_LEAGUE_THRESHOLDS.bronze,
    silver: lt.silver ?? DEFAULT_LEAGUE_THRESHOLDS.silver,
    gold: lt.gold ?? DEFAULT_LEAGUE_THRESHOLDS.gold,
    diamond: lt.diamond ?? DEFAULT_LEAGUE_THRESHOLDS.diamond,
  };
}
