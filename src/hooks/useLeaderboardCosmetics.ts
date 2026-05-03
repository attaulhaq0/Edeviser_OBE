// =============================================================================
// useLeaderboardCosmetics — Fetch equipped cosmetics for leaderboard rendering
// =============================================================================

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LeaderboardCosmeticData {
  studentId: string;
  avatarFrame: {
    border_color: string;
    border_width: string;
    border_style?: string;
    box_shadow?: string;
  } | null;
  displayTitle: {
    title_text: string;
    title_color: string;
  } | null;
}

// ─── useLeaderboardCosmetics — batch fetch cosmetics for leaderboard entries ─

export const useLeaderboardCosmetics = (studentIds: string[]) => {
  return useQuery({
    queryKey: ['leaderboard', 'cosmetics', ...studentIds.slice(0, 5)],
    queryFn: async (): Promise<Map<string, LeaderboardCosmeticData>> => {
      if (studentIds.length === 0) return new Map();

      // Fetch equipped items for all students in the leaderboard
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('student_equipped_items')
        .select(`
          student_id,
          slot,
          xp_purchases:purchase_id (
            marketplace_items:item_id (
              metadata,
              name
            )
          )
        `)
        .in('student_id', studentIds)
        .in('slot', ['avatar_frame', 'display_title']);

      if (error) throw error;

      const cosmeticMap = new Map<string, LeaderboardCosmeticData>();

      // Initialize all students with defaults
      for (const id of studentIds) {
        cosmeticMap.set(id, {
          studentId: id,
          avatarFrame: null,
          displayTitle: null,
        });
      }

      // Populate from query results
      for (const row of (data ?? []) as Array<Record<string, unknown>>) {
        const studentId = row.student_id as string;
        const slot = row.slot as string;
        const purchase = row.xp_purchases as Record<string, unknown> | null;
        const item = (purchase?.marketplace_items as Record<string, unknown>) ?? {};
        const metadata = (item.metadata ?? {}) as Record<string, unknown>;

        const existing = cosmeticMap.get(studentId) ?? {
          studentId,
          avatarFrame: null,
          displayTitle: null,
        };

        if (slot === 'avatar_frame') {
          existing.avatarFrame = {
            border_color: (metadata.border_color as string) ?? '#3b82f6',
            border_width: (metadata.border_width as string) ?? '3px',
            border_style: (metadata.border_style as string) ?? 'solid',
            box_shadow: (metadata.box_shadow as string) ?? undefined,
          };
        } else if (slot === 'display_title') {
          existing.displayTitle = {
            title_text: (metadata.title_text as string) ?? (item.name as string) ?? '',
            title_color: (metadata.title_color as string) ?? '#6366f1',
          };
        }

        cosmeticMap.set(studentId, existing);
      }

      return cosmeticMap;
    },
    enabled: studentIds.length > 0,
    staleTime: 60_000,
  });
};
