// =============================================================================
// useReplacementVotes — Task 3.12
// Initiate vote, cast vote, resolve vote, teacher override, list votes for team
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';

export interface ReplacementVote {
  id: string;
  team_id: string;
  target_member_id: string;
  initiated_by: string;
  status: 'open' | 'approved' | 'rejected' | 'expired';
  votes_for: number;
  votes_against: number;
  created_at: string;
  resolved_at: string | null;
  teacher_override: boolean;
  target_name?: string;
  initiator_name?: string;
}

export const useReplacementVotes = (teamId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.replacementVotes.list({ teamId }),
    queryFn: async (): Promise<ReplacementVote[]> => {
      const { data, error } = await supabase
        .from('replacement_votes' as never)
        .select('*')
        .eq('team_id', teamId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ReplacementVote[];
    },
    enabled: !!teamId,
  });
};

export const useInitiateVote = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      team_id: string;
      target_member_id: string;
      initiated_by: string;
    }) => {
      // Check cooldown: no re-vote within 7 days of a failed vote for same member
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: recentVotes } = await supabase
        .from('replacement_votes' as never)
        .select('id')
        .eq('team_id', input.team_id)
        .eq('target_member_id', input.target_member_id)
        .in('status', ['rejected', 'expired'])
        .gte('resolved_at', sevenDaysAgo);

      if (recentVotes && recentVotes.length > 0) {
        throw new Error('Cannot initiate a new vote for this member within 7 days of a failed vote');
      }

      const { data, error } = await supabase
        .from('replacement_votes' as never)
        .insert(input as never)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.replacementVotes.lists() });
    },
  });
};

export const useCastVote = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      voteId,
      vote,
    }: {
      voteId: string;
      vote: 'for' | 'against';
    }) => {
      const column = vote === 'for' ? 'votes_for' : 'votes_against';

      // Fetch current vote
      const { data: current, error: fetchErr } = await supabase
        .from('replacement_votes' as never)
        .select('*')
        .eq('id', voteId)
        .single();
      if (fetchErr) throw fetchErr;

      const c = current as Record<string, unknown>;
      const newValue = ((c[column] as number) ?? 0) + 1;

      const { error } = await supabase
        .from('replacement_votes' as never)
        .update({ [column]: newValue } as never)
        .eq('id', voteId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.replacementVotes.lists() });
    },
  });
};

export const useTeacherOverrideVote = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      voteId,
      decision,
    }: {
      voteId: string;
      decision: 'approved' | 'rejected';
    }) => {
      const { error } = await supabase
        .from('replacement_votes' as never)
        .update({
          status: decision,
          teacher_override: true,
          resolved_at: new Date().toISOString(),
        } as never)
        .eq('id', voteId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.replacementVotes.lists() });
    },
  });
};
