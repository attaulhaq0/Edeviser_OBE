// =============================================================================
// useTeamMembers — Task 3.2
// List members with contribution status, add member, remove member (set left_at)
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';

export interface TeamMember {
  id: string;
  team_id: string;
  student_id: string;
  student_name: string;
  role: 'captain' | 'member';
  joined_at: string;
  left_at: string | null;
  contribution_status: 'active' | 'warning' | 'inactive';
  contribution_status_since: string | null;
  consecutive_low_days: number;
  xp_contribution: number;
}

export const useTeamMembersList = (teamId?: string) => {
  return useQuery({
    queryKey: queryKeys.teamMembers.list({ teamId }),
    queryFn: async (): Promise<TeamMember[]> => {
      const { data, error } = await supabase
        .from('team_members' as never)
        .select(`
          id,
          team_id,
          student_id,
          role,
          joined_at,
          left_at,
          contribution_status,
          contribution_status_since,
          consecutive_low_days,
          profiles:student_id (full_name)
        `)
        .eq('team_id', teamId!)
        .is('left_at', null)
        .order('role', { ascending: true })
        .order('joined_at', { ascending: true });

      if (error) throw error;

      return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
        id: row.id as string,
        team_id: row.team_id as string,
        student_id: row.student_id as string,
        student_name: (row.profiles as { full_name: string } | null)?.full_name ?? 'Unknown',
        role: row.role as 'captain' | 'member',
        joined_at: row.joined_at as string,
        left_at: row.left_at as string | null,
        contribution_status: (row.contribution_status as string ?? 'active') as 'active' | 'warning' | 'inactive',
        contribution_status_since: row.contribution_status_since as string | null,
        consecutive_low_days: (row.consecutive_low_days as number) ?? 0,
        xp_contribution: 0, // Computed separately or via RPC
      }));
    },
    enabled: !!teamId,
  });
};

export const useAddTeamMember = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { team_id: string; student_id: string; role?: 'captain' | 'member' }) => {
      const { data, error } = await supabase
        .from('team_members' as never)
        .insert({
          team_id: input.team_id,
          student_id: input.student_id,
          role: input.role ?? 'member',
        } as never)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teamMembers.list({ teamId: variables.team_id }) });
      queryClient.invalidateQueries({ queryKey: queryKeys.teams.lists() });
    },
  });
};

export const useRemoveTeamMember = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ memberId, teamId: _teamId }: { memberId: string; teamId: string }) => {
      const { error } = await supabase
        .from('team_members' as never)
        .update({ left_at: new Date().toISOString() } as never)
        .eq('id', memberId);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teamMembers.list({ teamId: variables.teamId }) });
      queryClient.invalidateQueries({ queryKey: queryKeys.teams.lists() });
    },
  });
};
