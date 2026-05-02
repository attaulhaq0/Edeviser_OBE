// =============================================================================
// useTeamMembers — TanStack Query hooks for team member management
// Task 3.2: list members with contribution status, add member, remove member
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { toast } from 'sonner';
import type { ContributionStatus } from '@/lib/contributionThresholds';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TeamMember {
  id: string;
  team_id: string;
  student_id: string;
  role: 'captain' | 'member';
  joined_at: string;
  left_at: string | null;
  contribution_status: ContributionStatus;
  contribution_status_since: string | null;
  consecutive_low_days: number;
}

// ─── useTeamMembers — list active members with contribution status ───────────

export const useTeamMembers = (teamId?: string) => {
  return useQuery({
    queryKey: queryKeys.teamMembers.list({ teamId }),
    queryFn: async (): Promise<TeamMember[]> => {
      const { data, error } = await supabase
        .from('team_members' as never)
        .select('*')
        .eq('team_id', teamId!)
        .is('left_at', null)
        .order('role', { ascending: true })
        .order('joined_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as TeamMember[];
    },
    enabled: !!teamId,
  });
};

// ─── useAddTeamMember ────────────────────────────────────────────────────────

interface AddMemberInput {
  team_id: string;
  student_id: string;
  role?: 'captain' | 'member';
}

export const useAddTeamMember = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: AddMemberInput) => {
      const { data, error } = await supabase
        .from('team_members' as never)
        .insert({ role: 'member', ...input } as never)
        .select()
        .single();
      if (error) throw error;
      return data as TeamMember;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.teamMembers.list({ teamId: variables.team_id }) });
      qc.invalidateQueries({ queryKey: queryKeys.teams.lists() });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add team member');
    },
  });
};

// ─── useRemoveTeamMember — soft remove by setting left_at ────────────────────

interface RemoveMemberInput {
  memberId: string;
  teamId: string;
}

export const useRemoveTeamMember = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ memberId }: RemoveMemberInput) => {
      const { data, error } = await supabase
        .from('team_members' as never)
        .update({ left_at: new Date().toISOString() } as never)
        .eq('id', memberId)
        .select()
        .single();
      if (error) throw error;
      return data as TeamMember;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.teamMembers.list({ teamId: variables.teamId }) });
      qc.invalidateQueries({ queryKey: queryKeys.teams.lists() });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to remove team member');
    },
  });
};
