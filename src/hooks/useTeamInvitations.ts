// =============================================================================
// useTeamInvitations — TanStack Query hooks for team invitation workflows
// Task 3.3: list pending invitations, send invitation, accept/decline invitation
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { toast } from 'sonner';

// ─── Types ───────────────────────────────────────────────────────────────────

export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired';

export interface TeamInvitation {
  id: string;
  team_id: string;
  invited_student_id: string;
  invited_by: string;
  status: InvitationStatus;
  created_at: string;
  responded_at: string | null;
}

// ─── useTeamInvitations — list pending invitations for a team ────────────────

export const useTeamInvitations = (teamId?: string) => {
  return useQuery({
    queryKey: queryKeys.teamInvitations.list({ teamId }),
    queryFn: async (): Promise<TeamInvitation[]> => {
      const { data, error } = await supabase
        .from('team_invitations' as never)
        .select('*')
        .eq('team_id', teamId!)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as TeamInvitation[];
    },
    enabled: !!teamId,
  });
};

// ─── useMyInvitations — list pending invitations for the current student ─────

export const useMyInvitations = (studentId?: string) => {
  return useQuery({
    queryKey: queryKeys.teamInvitations.list({ studentId, status: 'pending' }),
    queryFn: async (): Promise<TeamInvitation[]> => {
      const { data, error } = await supabase
        .from('team_invitations' as never)
        .select('*')
        .eq('invited_student_id', studentId!)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as TeamInvitation[];
    },
    enabled: !!studentId,
  });
};

// ─── useSendInvitation ───────────────────────────────────────────────────────

interface SendInvitationInput {
  team_id: string;
  invited_student_id: string;
  invited_by: string;
}

export const useSendInvitation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SendInvitationInput) => {
      const { data, error } = await supabase
        .from('team_invitations' as never)
        .insert(input as never)
        .select()
        .single();
      if (error) throw error;
      return data as TeamInvitation;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.teamInvitations.list({ teamId: variables.team_id }) });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to send invitation');
    },
  });
};

// ─── useRespondToInvitation — accept or decline ──────────────────────────────

interface RespondInput {
  invitationId: string;
  status: 'accepted' | 'declined';
  teamId: string;
  studentId: string;
}

export const useRespondToInvitation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ invitationId, status, teamId, studentId }: RespondInput) => {
      // Update invitation status
      const { error: updateError } = await supabase
        .from('team_invitations' as never)
        .update({
          status,
          responded_at: new Date().toISOString(),
        } as never)
        .eq('id', invitationId);
      if (updateError) throw updateError;

      // If accepted, add student as team member
      if (status === 'accepted') {
        const { error: memberError } = await supabase
          .from('team_members' as never)
          .insert({
            team_id: teamId,
            student_id: studentId,
            role: 'member',
          } as never);
        if (memberError) throw memberError;
      }

      return { invitationId, status };
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.teamInvitations.lists() });
      if (variables.status === 'accepted') {
        qc.invalidateQueries({ queryKey: queryKeys.teamMembers.list({ teamId: variables.teamId }) });
        qc.invalidateQueries({ queryKey: queryKeys.teams.lists() });
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to respond to invitation');
    },
  });
};
