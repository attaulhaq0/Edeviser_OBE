// Task 134.3: Challenge TanStack Query hooks

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { useRealtime } from '@/hooks/useRealtime';
import type { ChallengeInput } from '@/lib/schemas/challenge';

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

export interface ChallengeParticipant {
  id: string;
  challenge_id: string;
  participant_id: string;
  participant_type: 'team' | 'student';
  current_progress: number;
}

export const useChallenges = (courseId?: string, status?: string) => {
  return useQuery({
    queryKey: queryKeys.challenges.list({ courseId, status }),
    queryFn: async (): Promise<Challenge[]> => {
      let query = supabase
        .from('social_challenges' as never)
        .select('*')
        .eq('course_id', courseId!)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as Challenge[];
    },
    enabled: !!courseId,
  });
};

export const useCreateChallenge = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ChallengeInput & { created_by: string }) => {
      const { data, error } = await supabase
        .from('social_challenges' as never)
        .insert(input as never)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.challenges.lists() }),
  });
};

export const useChallengeProgress = (challengeId?: string) => {
  const qc = useQueryClient();

  // Realtime subscription for live progress updates on active challenges
  const handleProgressUpdate = useCallback(() => {
    if (challengeId) {
      qc.invalidateQueries({ queryKey: queryKeys.challengeProgress.detail(challengeId) });
    }
  }, [qc, challengeId]);

  useRealtime({
    table: 'challenge_participants',
    event: '*',
    filter: challengeId ? `challenge_id=eq.${challengeId}` : undefined,
    onPayload: handleProgressUpdate,
    pollingFn: handleProgressUpdate,
  });

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

export const useUpdateChallenge = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<ChallengeInput> & { id: string }) => {
      const { data, error } = await supabase
        .from('social_challenges' as never)
        .update(input as never)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.challenges.lists() }),
  });
};

export const useCancelChallenge = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('social_challenges' as never)
        .update({ status: 'cancelled' } as never)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.challenges.lists() }),
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
  });
};

export const useStudentChallenges = (studentId?: string) => {
  return useQuery({
    queryKey: queryKeys.studentChallenges.detail(studentId ?? ''),
    queryFn: async (): Promise<Challenge[]> => {
      // Get courses the student is enrolled in
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
