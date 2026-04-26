// =============================================================================
// useChallengeLeaderboard — Task 3.7
// Fetch challenge leaderboard sorted by progress desc, completion time
// =============================================================================

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';

export interface ChallengeLeaderboardEntry {
  participant_id: string;
  participant_type: 'team' | 'individual';
  participant_name: string;
  current_progress: number;
  completed_at: string | null;
  rank: number;
  is_anonymous: boolean;
}

export const useChallengeLeaderboard = (challengeId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.challengeLeaderboard.detail(challengeId ?? ''),
    queryFn: async (): Promise<ChallengeLeaderboardEntry[]> => {
      const { data, error } = await supabase
        .from('challenge_progress' as never)
        .select('participant_id, participant_type, current_progress, completed_at')
        .eq('challenge_id', challengeId!)
        .order('current_progress', { ascending: false });

      if (error) throw error;
      if (!data || data.length === 0) return [];

      const entries = data as Array<{
        participant_id: string;
        participant_type: 'team' | 'individual';
        current_progress: number;
        completed_at: string | null;
      }>;

      // Sort: progress desc, then completed_at asc (earlier completion ranks higher)
      entries.sort((a, b) => {
        if (b.current_progress !== a.current_progress) {
          return b.current_progress - a.current_progress;
        }
        if (a.completed_at && b.completed_at) {
          return new Date(a.completed_at).getTime() - new Date(b.completed_at).getTime();
        }
        if (a.completed_at) return -1;
        if (b.completed_at) return 1;
        return 0;
      });

      // Resolve names
      const teamIds = entries
        .filter((e) => e.participant_type === 'team')
        .map((e) => e.participant_id);
      const studentIds = entries
        .filter((e) => e.participant_type === 'individual')
        .map((e) => e.participant_id);

      const teamNameMap = new Map<string, string>();
      const studentNameMap = new Map<string, { name: string; anonymous: boolean }>();

      if (teamIds.length > 0) {
        const { data: teams } = await supabase
          .from('teams' as never)
          .select('id, name')
          .in('id', teamIds);
        for (const t of (teams ?? []) as Array<{ id: string; name: string }>) {
          teamNameMap.set(t.id, t.name);
        }
      }

      if (studentIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles' as never)
          .select('id, full_name, leaderboard_anonymous')
          .in('id', studentIds);
        for (const p of (profiles ?? []) as Array<{
          id: string;
          full_name: string;
          leaderboard_anonymous: boolean;
        }>) {
          studentNameMap.set(p.id, {
            name: p.leaderboard_anonymous ? 'Anonymous' : p.full_name,
            anonymous: p.leaderboard_anonymous ?? false,
          });
        }
      }

      return entries.map((e, idx) => {
        let participantName = 'Unknown';
        let isAnonymous = false;

        if (e.participant_type === 'team') {
          participantName = teamNameMap.get(e.participant_id) ?? 'Unknown Team';
        } else {
          const info = studentNameMap.get(e.participant_id);
          participantName = info?.name ?? 'Unknown Student';
          isAnonymous = info?.anonymous ?? false;
        }

        return {
          participant_id: e.participant_id,
          participant_type: e.participant_type,
          participant_name: participantName,
          current_progress: e.current_progress,
          completed_at: e.completed_at,
          rank: idx + 1,
          is_anonymous: isAnonymous,
        };
      });
    },
    enabled: !!challengeId,
  });
};
