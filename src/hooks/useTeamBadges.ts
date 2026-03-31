// Task 132.3: Team badges TanStack Query hook with realtime subscription

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { useRealtime } from '@/hooks/useRealtime';

export interface TeamBadge {
  id: string;
  badge_key: string;
  badge_name: string;
  emoji: string;
  awarded_at: string;
  team_id: string;
}

export const useTeamBadges = (teamId: string | undefined) => {
  const queryClient = useQueryClient();

  useRealtime({
    table: 'badges',
    event: 'INSERT',
    filter: teamId ? `team_id=eq.${teamId}` : undefined,
    onPayload: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teamBadges.list({ teamId }) });
    },
  });

  return useQuery({
    queryKey: queryKeys.teamBadges.list({ teamId }),
    queryFn: async (): Promise<TeamBadge[]> => {
      const { data, error } = await supabase
        .from('badges' as never)
        .select('id, badge_key, badge_name, emoji, awarded_at, team_id')
        .eq('team_id', teamId!)
        .eq('scope', 'team')
        .order('awarded_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as TeamBadge[];
    },
    enabled: !!teamId,
  });
};
