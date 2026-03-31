// Task 128.3: Team TanStack Query hooks

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface Team {
  id: string;
  name: string;
  course_id: string;
  created_by: string;
  avatar_letter: string;
  created_at: string;
  member_count?: number;
}

export interface TeamMember {
  id: string;
  team_id: string;
  student_id: string;
  joined_at: string;
  student_name?: string;
}

export interface TeamGamification {
  id: string;
  team_id: string;
  xp_total: number;
  xp_this_week: number;
  streak_current: number;
  streak_longest: number;
}

export const useTeams = (courseId?: string) => {
  return useQuery({
    queryKey: ['teams', courseId],
    queryFn: async (): Promise<Team[]> => {
      const { data, error } = await supabase
        .from('teams' as never)
        .select('*')
        .eq('course_id', courseId!)
        .order('name');
      if (error) throw error;
      return (data ?? []) as Team[];
    },
    enabled: !!courseId,
  });
};

export const useTeamMembers = (teamId?: string) => {
  return useQuery({
    queryKey: ['teamMembers', teamId],
    queryFn: async (): Promise<TeamMember[]> => {
      const { data, error } = await supabase
        .from('team_members' as never)
        .select('*')
        .eq('team_id', teamId!);
      if (error) throw error;
      return (data ?? []) as TeamMember[];
    },
    enabled: !!teamId,
  });
};

export const useCreateTeam = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; course_id: string; created_by: string }) => {
      const { data, error } = await supabase
        .from('teams' as never)
        .insert({ ...input, avatar_letter: input.name.charAt(0).toUpperCase() } as never)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teams'] }),
  });
};

export const useAddTeamMember = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { team_id: string; student_id: string }) => {
      const { data, error } = await supabase.from('team_members' as never).insert(input as never).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teams'] });
      qc.invalidateQueries({ queryKey: ['teamMembers'] });
    },
  });
};

export const useRemoveTeamMember = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('team_members' as never).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teams'] });
      qc.invalidateQueries({ queryKey: ['teamMembers'] });
    },
  });
};

export const useAutoGenerateTeams = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { course_id: string; team_size: number; created_by: string }) => {
      // Fetch enrolled students
      const { data: enrollments } = await supabase
        .from('student_courses')
        .select('student_id')
        .eq('course_id', params.course_id);

      const studentIds = (enrollments ?? []).map((e) => e.student_id);
      if (studentIds.length === 0) throw new Error('No enrolled students');

      // Shuffle students
      const shuffled = [...studentIds].sort(() => Math.random() - 0.5);
      const teamCount = Math.ceil(shuffled.length / params.team_size);
      const teamBuckets: string[][] = Array.from({ length: teamCount }, () => []);

      shuffled.forEach((id, i) => {
        teamBuckets[i % teamCount]!.push(id);
      });

      // Create teams and add members
      let created = 0;
      for (let i = 0; i < teamBuckets.length; i++) {
        const { data: team, error } = await supabase
          .from('teams' as never)
          .insert({ name: `Team ${i + 1}`, course_id: params.course_id, created_by: params.created_by, avatar_letter: String(i + 1) } as never)
          .select()
          .single();
        if (error) throw error;

        const members = teamBuckets[i]!.map((studentId) => ({ team_id: (team as { id: string }).id, student_id: studentId }));
        const { error: memberError } = await supabase.from('team_members' as never).insert(members as never);
        if (memberError) throw memberError;
        created++;
      }

      return { teams_created: created, students_assigned: shuffled.length };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teams'] }),
  });
};

export const useTeamGamification = (teamId?: string) => {
  return useQuery({
    queryKey: ['teamGamification', teamId],
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
