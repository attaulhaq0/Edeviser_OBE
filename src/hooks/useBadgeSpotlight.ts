/**
 * Hook for weekly badge spotlight query. Task 20.11
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { resolveBadgeSpotlight, getISOWeekNumber } from '@/lib/badgeSpotlightResolver';

export interface BadgeSpotlightData {
  badgeId: string | null;
  badgeName: string | null;
  progress: number; // 0-100
  description: string;
}

export const useBadgeSpotlight = (studentId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.badgeSpotlight.detail(studentId ?? ''),
    queryFn: async (): Promise<BadgeSpotlightData | null> => {
      if (!studentId) return null;

      // Fetch all non-archived badge definitions
      const { data: badges, error } = await supabase
        .from('badge_definitions')
        .select('id, name, is_archived, tier_conditions')
        .eq('is_archived', false);
      if (error) throw error;

      const weekNumber = getISOWeekNumber(new Date());
      const spotlight = resolveBadgeSpotlight({
        studentId,
        weekNumber,
        availableBadges: badges ?? [],
      });

      if (!spotlight.spotlightBadgeId) return null;

      return {
        badgeId: spotlight.spotlightBadgeId,
        badgeName: spotlight.spotlightBadgeName,
        progress: 0, // Would be computed from student's progress toward badge conditions
        description: `This week's spotlight badge`,
      };
    },
    enabled: !!studentId,
  });
};
