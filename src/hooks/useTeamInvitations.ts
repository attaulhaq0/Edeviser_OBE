// =============================================================================
// useTeamInvitations — Task 3.3
// List pending invitations, send invitation, accept/decline invitation
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';

export interface TeamInvitation {
  id: string;
  team_id: string;
  invited_student_id: string;
  invited_by: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  created_at: string;
  responded_at: string | null;
  team_name?: string;
  inviter_name?: string;
}

export const useTeamInvitations = (studentId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.teamInvitations.list({ studentId }),
    queryFn: async (): Promise<TeamInvitation[]> => {
      const { data, error } = await supabase
        .from('team_invitations' as never)
        .select('*, teams!inner(name)')
        .eq('invited_student_id', studentId!)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return ((data ?? []) as Array<Record<string, unknown>>).map((inv) => ({
        ...inv,
        team_name: (inv.teams as Record<string, unknown>)?.name as string,
      })) as TeamInvitation[];
    },
    enabled: !!studentId,
  });
};

export const useSendInvitation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      team_id: string;
      invited_student_id: string;
      invited_by: string;
    }) => {
      const { data, error } = await supabase
        .from('team_invitations' as never)
        .insert(input as never)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.teamInvitations.lists() });
    },
  });
};

export const useRespondInvitation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      invitationId,
      response,
    }: {
      invitationId: string;
      response: 'accepted' | 'declined';
    }) => {
      const { data, error } = await supabase
        .from('team_invitations' as never)
        .update({
          status: response,
          responded_at: new Date().toISOString(),
        } as never)
        .eq('id', invitationId)
        .select()
        .single();
      if (error) throw error;

      // If accepted, add the student as a team member
      if (response === 'accepted' && data) {
        const inv = data as Record<string, unknown>;
        const { error: memberErr } = await supabase
          .from('team_members' as never)
          .insert({
            team_id: inv.team_id,
            student_id: inv.invited_student_id,
            role: 'member',
          } as never);
        if (memberErr) throw memberErr;
      }

      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.teamInvitations.lists() });
      qc.invalidateQueries({ queryKey: queryKeys.teamMembers.lists() });
      qc.invalidateQueries({ queryKey: queryKeys.teams.lists() });
    },
  });
};
