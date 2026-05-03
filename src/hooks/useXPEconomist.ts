// =============================================================================
// useXPEconomist — Earn/spend ratio, XP velocity, inflation indicator
// Task 20.1
// =============================================================================

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { computeEarnSpendRatio, type EarnSpendResult } from '@/lib/earnSpendRatioCalculator';

export const useEarnSpendRatio = (institutionId?: string) => {
  return useQuery({
    queryKey: queryKeys.economist.list({ institutionId, type: 'ratio' }),
    queryFn: async (): Promise<EarnSpendResult> => {
      const { data: earnData, error: earnErr } = await supabase
        .from('xp_transactions')
        .select('xp_amount');
      if (earnErr) throw earnErr;

      const totalEarned = (earnData ?? []).reduce(
        (sum, row) => sum + (row.xp_amount ?? 0),
        0,
      );

      const { data: spendData, error: spendErr } = await supabase
        .from('xp_purchases')
        .select('xp_cost')
        .neq('status', 'refunded');
      if (spendErr) throw spendErr;

      const totalSpent = (spendData ?? []).reduce(
        (sum, row) => sum + (row.xp_cost ?? 0),
        0,
      );

      return computeEarnSpendRatio({ totalEarned, totalSpent });
    },
    enabled: !!institutionId,
    staleTime: 60_000,
  });
};

export interface XPVelocityPoint {
  week: string;
  earned: number;
  spent: number;
}

export const useXPVelocity = (institutionId?: string, weeks = 8) => {
  return useQuery({
    queryKey: queryKeys.economist.list({ institutionId, type: 'velocity', weeks }),
    queryFn: async (): Promise<XPVelocityPoint[]> => {
      const now = new Date();
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - weeks * 7);

      const { data: earnData, error: earnErr } = await supabase
        .from('xp_transactions')
        .select('xp_amount, created_at')
        .gte('created_at', startDate.toISOString());
      if (earnErr) throw earnErr;

      const { data: spendData, error: spendErr } = await supabase
        .from('xp_purchases')
        .select('xp_cost, purchased_at')
        .neq('status', 'refunded')
        .gte('purchased_at', startDate.toISOString());
      if (spendErr) throw spendErr;

      const points: XPVelocityPoint[] = [];
      for (let i = weeks - 1; i >= 0; i--) {
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - (i + 1) * 7);
        const weekEnd = new Date(now);
        weekEnd.setDate(weekEnd.getDate() - i * 7);

        const earned = (earnData ?? [])
          .filter((t) => {
            const d = new Date(t.created_at);
            return d >= weekStart && d < weekEnd;
          })
          .reduce((sum, t) => sum + (t.xp_amount ?? 0), 0);

        const spent = (spendData ?? [])
          .filter((t) => {
            const d = new Date(t.purchased_at);
            return d >= weekStart && d < weekEnd;
          })
          .reduce((sum, t) => sum + (t.xp_cost ?? 0), 0);

        points.push({
          week: weekStart.toISOString().slice(0, 10),
          earned,
          spent,
        });
      }

      return points;
    },
    enabled: !!institutionId,
    staleTime: 60_000,
  });
};

export const useEarnSpendTimeSeries = (institutionId?: string, weeks = 12) => {
  return useXPVelocity(institutionId, weeks);
};
