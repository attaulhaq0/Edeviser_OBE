// =============================================================================
// useChallenges — TanStack Query hooks for social challenge CRUD
// Task 3.5: list challenges by course (active/upcoming/ended), create challenge
//           (with cooperative default and XP Race limit check), update challenge
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { toast } from 'sonner';

// ─── Types ───────────────────────────────────────────────────────────────────

export type ChallengeType = 'academic' | 'habit' | 'xp_race' | 'blooms_climb' | 'cooperative';
export type ChallengeStatus = 'draft' | 'active' | 'ended' | 'cancelled';
export type ParticipationMode = 'team' | 'individual';

export interface SocialChallenge {
  id: string;
  course_id: string;
  institution_id: string;
  title: string;
  description: string;
  challenge_type: ChallengeType;
  participation_mode: ParticipationMode;
  goal_target: number;
  start_date: string;
  end_date: string;
  reward_xp: number;
  reward_badge_id: string | null;
  status: ChallengeStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ─── useChallenges — list challenges by course with optional status filter ───

export const useChallenges = (courseId?: string, status?: ChallengeStatus) => {
  return useQuery({
    queryKey: queryKeys.challenges.list({ courseId, status }),
    queryFn: async (): Promise<SocialChallenge[]> => {
      let query = supabase
        .from('social_challenges' as never)
        .select('*')
        .eq('course_id', courseId!)
        .order('start_date', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as SocialChallenge[];
    },
    enabled: !!courseId,
  });
};

// ─── useActiveXpRaceCount — check XP Race limit (max 2 concurrent per course)

export const useActiveXpRaceCount = (courseId?: string) => {
  return useQuery({
    queryKey: queryKeys.challenges.list({ courseId, type: 'xp_race', status: 'active' }),
    queryFn: async (): Promise<number> => {
      const { count, error } = await supabase
        .from('social_challenges' as never)
        .select('id', { count: 'exact', head: true })
        .eq('course_id', courseId!)
        .eq('challenge_type', 'xp_race')
        .eq('status', 'active');
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!courseId,
  });
};

// ─── useCreateChallenge ──────────────────────────────────────────────────────

interface CreateChallengePayload {
  course_id: string;
  institution_id?: string;
  created_by: string;
  title?: string;
  description?: string;
  challenge_type?: string;
  participation_mode?: string;
  goal_target?: number;
  start_date?: string;
  end_date?: string;
  reward_xp?: number;
  reward_badge_id?: string | null;
  xp_race_acknowledged?: boolean;
  [key: string]: unknown;
}

export const useCreateChallenge = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateChallengePayload) => {
      // XP Race limit check: max 2 concurrent per course
      if (input.challenge_type === 'xp_race') {
        const { count, error: countError } = await supabase
          .from('social_challenges' as never)
          .select('id', { count: 'exact', head: true })
          .eq('course_id', input.course_id)
          .eq('challenge_type', 'xp_race')
          .eq('status', 'active');
        if (countError) throw countError;
        if ((count ?? 0) >= 2) {
          throw new Error('Maximum of 2 concurrent XP Race challenges per course');
        }
      }

      const { data, error } = await supabase
        .from('social_challenges' as never)
        .insert(input as never)
        .select()
        .single();
      if (error) throw error;
      return data as SocialChallenge;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.challenges.lists() });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create challenge');
    },
  });
};

// ─── useUpdateChallenge ──────────────────────────────────────────────────────

interface UpdateChallengeInput {
  id: string;
  title?: string;
  description?: string;
  goal_target?: number;
  start_date?: string;
  end_date?: string;
  reward_xp?: number;
  reward_badge_id?: string | null;
  status?: ChallengeStatus;
}

export const useUpdateChallenge = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateChallengeInput) => {
      const { data, error } = await supabase
        .from('social_challenges' as never)
        .update({ ...updates, updated_at: new Date().toISOString() } as never)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as SocialChallenge;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.challenges.lists() });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update challenge');
    },
  });
};

// ─── Legacy types & hooks (preserved for backward compatibility) ─────────────

/** @deprecated Use SocialChallenge instead */
export interface Challenge {
  id: string;
  title: string;
  description: string | null;
  challenge_type: 'team' | 'course_wide';
  course_id: string;
  start_date: string;
  end_date: string;
  goal_metric: string;
  goal_target: number;
  reward_type: string;
  reward_value: number;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  notification_sent_90: boolean;
  created_by: string;
  created_at: string;
}

/** @deprecated Use ChallengeProgressRecord from useChallengeProgress instead */
export interface ChallengeParticipant {
  id: string;
  challenge_id: string;
  participant_id: string;
  participant_type: 'team' | 'student';
  current_progress: number;
}

/** @deprecated Use useChallengeAllProgress from useChallengeProgress instead */
export const useChallengeProgress = (challengeId?: string) => {
  return useQuery({
    queryKey: queryKeys.challengeProgress.detail(challengeId ?? ''),
    queryFn: async (): Promise<ChallengeParticipant[]> => {
      const { data, error } = await supabase
        .from('challenge_participants' as never)
        .select('*')
        .eq('challenge_id', challengeId!);
      if (error) throw error;
      return (data ?? []) as ChallengeParticipant[];
    },
    enabled: !!challengeId,
  });
};

export const useStudentChallenges = (studentId?: string) => {
  return useQuery({
    queryKey: queryKeys.studentChallenges.detail(studentId ?? ''),
    queryFn: async (): Promise<Challenge[]> => {
      const { data: enrollments } = await supabase
        .from('student_courses')
        .select('course_id')
        .eq('student_id', studentId!);

      if (!enrollments || enrollments.length === 0) return [];

      const courseIds = enrollments.map((e) => e.course_id);

      const { data, error } = await supabase
        .from('social_challenges' as never)
        .select('*')
        .in('course_id', courseIds)
        .in('status', ['active', 'completed'])
        .order('start_date', { ascending: false });

      if (error) throw error;
      return (data ?? []) as Challenge[];
    },
    enabled: !!studentId,
  });
};

export const useCancelChallenge = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('social_challenges' as never)
        .update({ status: 'cancelled', updated_at: new Date().toISOString() } as never)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.challenges.lists() });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to cancel challenge');
    },
  });
};

export const useAssignTeamsToChallenge = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ challengeId, teamIds }: { challengeId: string; teamIds: string[] }) => {
      const rows = teamIds.map((teamId) => ({
        challenge_id: challengeId,
        participant_id: teamId,
        participant_type: 'team',
        current_progress: 0,
      }));
      const { error } = await supabase
        .from('challenge_participants' as never)
        .insert(rows as never);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.challenges.lists() });
      qc.invalidateQueries({ queryKey: queryKeys.challengeProgress.lists() });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to assign teams');
    },
  });
};
