/**
 * Hooks for XP Economist dashboard — earn/spend ratio, velocity, inflation indicators.
 * Task 20.1
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { computeEarnSpendRatio, computeXPVelocity } from '@/lib/earnSpendRatioCalculator';

export const useEarnSpendRatio = (institutionId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.economist.earnSpendRatio(institutionId ?? ''),
    queryFn: async () => {
      if (!institutionId) return null;
      const { data: earned, error: e1 } = await supabase.rpc('get_institution_total_earned', { p_institution_id: institutionId });
      const { data: spent, error: e2 } = await supabase.rpc('get_institution_total_spent', { p_institution_id: institutionId });
      if (e1 || e2) throw e1 || e2;
      return computeEarnSpendRatio({ totalEarned: earned ?? 0, totalSpent: spent ?? 0 });
    },
    enabled: !!institutionId,
  });
};

export const useXPVelocity = (institutionId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.economist.velocity(institutionId ?? ''),
    queryFn: async () => {
      if (!institutionId) return null;
      const { data, error } = await supabase.rpc('get_weekly_xp_flow', { p_institution_id: institutionId, p_weeks: 8 });
      if (error) throw error;
      const weeklyEarnings = (data ?? []).map((w: { earned: number }) => w.earned);
      const weeklySpending = (data ?? []).map((w: { spent: number }) => w.spent);
      return computeXPVelocity({ weeklyEarnings, weeklySpending });
    },
    enabled: !!institutionId,
  });
};

export const useEarnSpendTimeSeries = (institutionId: string | undefined, weeks: number = 12) => {
  return useQuery({
    queryKey: queryKeys.economist.timeSeries(institutionId ?? '', weeks),
    queryFn: async () => {
      if (!institutionId) return [];
      const { data, error } = await supabase.rpc('get_weekly_xp_flow', { p_institution_id: institutionId, p_weeks: weeks });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!institutionId,
  });
};
