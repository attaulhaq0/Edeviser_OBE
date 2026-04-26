// =============================================================================
// useChallengeProgress — Task 3.6
// Fetch progress for current participant, fetch challenge detail with progress
// =============================================================================

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';

export interface ChallengeProgressEntry {
  id: string;
  challenge_id: string;
  participant_type: 'team' | 'individual';
  participant_id: string;
  current_progress: number;
  completed_at: string | null;
  reward_granted: boolean;
  updated_at: string;
}

export interface ChallengeDetail {
  id: string;
  title: string;
  description: string | null;
  challenge_type: string;
  participation_mode: string;
  goal_target: number;
  start_date: string;
  end_date: string;
  reward_xp: number;
  reward_badge_id: string | null;
  status: string;
  course_id: string;
}

export const useChallengeProgressForParticipant = (
  challengeId?: string,
  participantId?: string,
) => {
  return useQuery({
    queryKey: queryKeys.challengeProgress.list({ challengeId, participantId }),
    queryFn: async (): Promise<ChallengeProgressEntry | null> => {
      const { data, error } = await supabase
        .from('challenge_progress' as never)
        .select('*')
        .eq('challenge_id', challengeId!)
        .eq('participant_id', participantId!)
        .maybeSingle();
      if (error) throw error;
      return data as ChallengeProgressEntry | null;
    },
    enabled: !!challengeId && !!participantId,
  });
};

export const useChallengeDetail = (challengeId?: string) => {
  return useQuery({
    queryKey: queryKeys.socialChallenges.detail(challengeId ?? ''),
    queryFn: async (): Promise<ChallengeDetail | null> => {
      const { data, error } = await supabase
        .from('social_challenges' as never)
        .select('*')
        .eq('id', challengeId!)
        .maybeSingle();
      if (error) throw error;
      return data as ChallengeDetail | null;
    },
    enabled: !!challengeId,
  });
};

export const useChallengeProgressAll = (challengeId?: string) => {
  return useQuery({
    queryKey: queryKeys.challengeProgress.detail(challengeId ?? ''),
    queryFn: async (): Promise<ChallengeProgressEntry[]> => {
      const { data, error } = await supabase
        .from('challenge_progress' as never)
        .select('*')
        .eq('challenge_id', challengeId!)
        .order('current_progress', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ChallengeProgressEntry[];
    },
    enabled: !!challengeId,
  });
};
