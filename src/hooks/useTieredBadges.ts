// Task 151.4: Badge Tier TanStack Query hooks

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';

export interface TieredBadgeData {
  id: string;
  name: string;
  emoji: string;
  description: string;
  category: string;
  tier: 'bronze' | 'silver' | 'gold' | null;
  is_pinned: boolean;
  archived_at: string | null;
  earned_at: string;
}

export const useTieredBadges = (studentId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.tieredBadges.detail(studentId ?? ''),
    queryFn: async (): Promise<TieredBadgeData[]> => {
      const { data, error } = await supabase
        .from('badges')
        .select('*')
        .eq('student_id', studentId!)
        .eq('scope', 'individual')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((b: Record<string, unknown>) => ({
        id: b.id as string,
        name: b.name as string,
        emoji: (b.emoji as string) ?? '🏅',
        description: (b.description as string) ?? '',
        category: (b.category as string) ?? 'general',
        tier: b.tier as 'bronze' | 'silver' | 'gold' | null,
        is_pinned: b.is_pinned === true,
        archived_at: (b.archived_at as string) ?? null,
        earned_at: b.created_at as string,
      }));
    },
    enabled: !!studentId,
  });
};

export const usePinBadge = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ badgeId, isPinned }: { badgeId: string; isPinned: boolean }) => {
      const { error } = await supabase
        .from('badges')
        .update({ is_pinned: isPinned } as never)
        .eq('id', badgeId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.tieredBadges.all }),
  });
};

export const useBadgeSpotlight = (institutionId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.badgeSpotlight.detail(institutionId ?? ''),
    queryFn: async () => {
      const today = new Date();
      const dayOfWeek = today.getDay();
      const monday = new Date(today);
      monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      const weekStart = monday.toISOString().slice(0, 10);

      const { data, error } = await supabase
        .from('badge_spotlight_schedule' as never)
        .select('*')
        .eq('institution_id', institutionId!)
        .eq('week_start', weekStart)
        .maybeSingle();
      if (error) throw error;
      return data as { category: string; is_manual: boolean } | null;
    },
    enabled: !!institutionId,
  });
};
