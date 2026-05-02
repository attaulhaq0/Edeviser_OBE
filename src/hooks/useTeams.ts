// =============================================================================
// useTeams — TanStack Query hooks for team CRUD operations
// Task 3.1: list teams by course, create team, update team, soft-delete team
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { toast } from 'sonner';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Team {
  id: string;
  course_id: string;
  institution_id: string;
  name: string;
  captain_id: string;
  avatar_letter: string;
  xp_total: number;
  streak_count: number;
  streak_last_active_date: string | null;
  cooperation_score: number;
  health_score: number;
  health_status: 'healthy' | 'needs_attention' | 'at_risk';
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  member_count?: number;
}

// ─── useTeams — list teams by course ─────────────────────────────────────────

export const useTeams = (courseId?: string) => {
  return useQuery({
    queryKey: queryKeys.teams.list({ courseId }),
    queryFn: async (): Promise<Team[]> => {
      const { data, error } = await supabase
        .from('teams' as never)
        .select('*')
        .eq('course_id', courseId!)
        .is('deleted_at', null)
        .order('name');
      if (error) throw error;
      return (data ?? []) as Team[];
    },
    enabled: !!courseId,
  });
};

// ─── useCreateTeam ───────────────────────────────────────────────────────────

interface CreateTeamInput {
  name: string;
  course_id: string;
  institution_id?: string;
  captain_id?: string;
  created_by: string;
  avatar_letter?: string;
}

export const useCreateTeam = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateTeamInput) => {
      const { data, error } = await supabase
        .from('teams' as never)
        .insert(input as never)
        .select()
        .single();
      if (error) throw error;
      return data as Team;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.teams.lists() });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create team');
    },
  });
};

// ─── useUpdateTeam ───────────────────────────────────────────────────────────

interface UpdateTeamInput {
  id: string;
  name?: string;
  captain_id?: string;
}

export const useUpdateTeam = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateTeamInput) => {
      const { data, error } = await supabase
        .from('teams' as never)
        .update({ ...updates, updated_at: new Date().toISOString() } as never)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Team;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.teams.lists() });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update team');
    },
  });
};

// ─── useSoftDeleteTeam ───────────────────────────────────────────────────────

// ─── Legacy hooks (preserved for backward compatibility) ─────────────────────

export interface TeamGamification {
  id: string;
  team_id: string;
  xp_total: number;
  xp_this_week: number;
  streak_current: number;
  streak_longest: number;
}

export const useTeamGamification = (teamId?: string) => {
  return useQuery({
    queryKey: queryKeys.teamGamification.list({ teamId }),
    queryFn: async (): Promise<TeamGamification | null> => {
      const { data, error } = await supabase
        .from('team_gamification' as never)
        .select('*')
        .eq('team_id', teamId!)
        .maybeSingle();
      if (error) throw error;
      return data as TeamGamification | null;
    },
    enabled: !!teamId,
  });
};

export const useAutoGenerateTeams = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { course_id: string; team_size: number; created_by: string }) => {
      const { data: enrollments } = await supabase
        .from('student_courses')
        .select('student_id')
        .eq('course_id', params.course_id);

      const studentIds = (enrollments ?? []).map((e) => e.student_id);
      if (studentIds.length === 0) throw new Error('No enrolled students');

      const shuffled = [...studentIds].sort(() => Math.random() - 0.5);
      const teamCount = Math.ceil(shuffled.length / params.team_size);
      const teamBuckets: string[][] = Array.from({ length: teamCount }, () => []);

      shuffled.forEach((id, i) => {
        teamBuckets[i % teamCount]!.push(id);
      });

      let created = 0;
      for (let i = 0; i < teamBuckets.length; i++) {
        const { data: team, error } = await supabase
          .from('teams' as never)
          .insert({
            name: `Team ${i + 1}`,
            course_id: params.course_id,
            created_by: params.created_by,
            avatar_letter: String(i + 1),
          } as never)
          .select()
          .single();
        if (error) throw error;

        const members = teamBuckets[i]!.map((studentId) => ({
          team_id: (team as { id: string }).id,
          student_id: studentId,
        }));
        const { error: memberError } = await supabase
          .from('team_members' as never)
          .insert(members as never);
        if (memberError) throw memberError;
        created++;
      }

      return { teams_created: created, students_assigned: shuffled.length };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.teams.lists() });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to auto-generate teams');
    },
  });
};

// ─── useSoftDeleteTeam ───────────────────────────────────────────────────────

export const useSoftDeleteTeam = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (teamId: string) => {
      const { data, error } = await supabase
        .from('teams' as never)
        .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() } as never)
        .eq('id', teamId)
        .select()
        .single();
      if (error) throw error;
      return data as Team;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.teams.lists() });
      qc.invalidateQueries({ queryKey: queryKeys.teamMembers.lists() });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete team');
    },
  });
};
