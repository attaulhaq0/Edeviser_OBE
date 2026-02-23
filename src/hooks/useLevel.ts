// =============================================================================
// useLevel — TanStack Query hook for student level data
// =============================================================================

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { calculateLevel, LEVEL_THRESHOLDS } from '@/lib/xpLevelCalculator';

export interface LevelData {
  level: number;
  title: string;
  xpTotal: number;
  xpForCurrentLevel: number;
  xpForNextLevel: number;
  progressPercent: number;
}

/**
 * Compute level progress data from raw XP total.
 */
export function computeLevelData(xpTotal: number): LevelData {
  const level = calculateLevel(xpTotal);
  const currentThreshold = LEVEL_THRESHOLDS.find((t) => t.level === level);
  const nextThreshold = LEVEL_THRESHOLDS.find((t) => t.level === level + 1);

  const xpForCurrentLevel = currentThreshold?.xpRequired ?? 0;
  const xpForNextLevel = nextThreshold?.xpRequired ?? xpForCurrentLevel;
  const range = xpForNextLevel - xpForCurrentLevel;
  const progressPercent = range > 0
    ? Math.min(Math.round(((xpTotal - xpForCurrentLevel) / range) * 100), 100)
    : 100;

  return {
    level,
    title: currentThreshold?.title ?? 'Newcomer',
    xpTotal,
    xpForCurrentLevel,
    xpForNextLevel,
    progressPercent,
  };
}

export const useLevel = (studentId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.studentGamification.list({ scope: 'level', studentId }),
    queryFn: async (): Promise<LevelData> => {
      if (!studentId) {
        return computeLevelData(0);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as unknown as { from: (table: string) => any })
        .from('student_gamification')
        .select('xp_total')
        .eq('student_id', studentId)
        .maybeSingle();

      if (error) throw error;

      const xpTotal = (data as { xp_total: number } | null)?.xp_total ?? 0;
      return computeLevelData(xpTotal);
    },
    enabled: !!studentId,
    staleTime: 30_000,
  });
};
