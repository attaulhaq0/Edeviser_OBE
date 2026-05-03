// =============================================================================
// useActiveBoosts — TanStack Query hook for active XP boost status
// =============================================================================

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ActiveBoost {
  id: string;
  boost_type: string;
  multiplier: number;
  activated_at: string;
  expires_at: string;
}

// ─── useActiveBoosts — fetch active boosts for a student ─────────────────────

export const useActiveBoosts = (studentId: string) => {
  return useQuery({
    queryKey: queryKeys.marketplace.boosts(studentId),
    queryFn: async (): Promise<ActiveBoost[]> => {
      const now = new Date().toISOString();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('student_active_boosts')
        .select('id, boost_type, multiplier, activated_at, expires_at')
        .eq('student_id', studentId)
        .gt('expires_at', now)
        .order('expires_at', { ascending: true });

      if (error) throw error;

      return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
        id: row.id as string,
        boost_type: row.boost_type as string,
        multiplier: row.multiplier as number,
        activated_at: row.activated_at as string,
        expires_at: row.expires_at as string,
      }));
    },
    enabled: !!studentId,
    staleTime: 10_000,
    refetchInterval: 30_000, // Refresh frequently for countdown accuracy
  });
};
