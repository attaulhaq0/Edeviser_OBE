/**
 * Hooks for league tier query and league-scoped leaderboard. Task 20.10
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { computeLeagueTier, type LeagueTier } from '@/lib/leagueTierCalculator';

export interface LeagueTierData {
  tier: LeagueTier;
  percentile: number;
  rank: number;
  totalStudents: number;
}

export const useLeagueTier = (studentId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.leagueTier.detail(studentId ?? ''),
    queryFn: async (): Promise<LeagueTierData | null> => {
      if (!studentId) return null;

      // Get student's XP
      const { data: student, error: e1 } = await supabase
        .from('student_gamification')
        .select('xp_total')
        .eq('student_id', studentId)
        .maybeSingle();
      if (e1) throw e1;

      // Get all students' XP in the same institution for percentile calculation
      const { data: cohort, error: e2 } = await supabase
        .from('student_gamification')
        .select('xp_total')
        .order('xp_total', { ascending: true });
      if (e2) throw e2;

      const cohortXPValues = (cohort ?? []).map((s) => s.xp_total ?? 0);
      const studentXP = student?.xp_total ?? 0;

      return computeLeagueTier({ studentXP, cohortXPValues });
    },
    enabled: !!studentId,
  });
};

export const useLeagueLeaderboard = (tier: LeagueTier | undefined) => {
  return useQuery({
    queryKey: queryKeys.leagueLeaderboard.list({ tier: tier ?? '' }),
    queryFn: async () => {
      if (!tier) return [];
      const { data, error } = await supabase
        .from('student_gamification')
        .select('student_id, xp_total, level, profiles!inner(full_name, avatar_url)')
        .eq('league_tier', tier)
        .order('xp_total', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!tier,
  });
};
