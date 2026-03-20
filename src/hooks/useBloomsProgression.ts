import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface BloomsProgressionRecord {
  id: string;
  student_id: string;
  clo_id: string;
  course_id: string;
  highest_bloom_level: number;
  correct_count_at_highest: number;
  bloom_explorer_awarded: boolean;
  bloom_challenger_awarded: boolean;
  bloom_pioneer_awarded: boolean;
  updated_at: string;
}

export interface BloomsClimbState {
  current_level: number;
  consecutive_correct: number;
  transitions: Array<{
    from_level: number;
    to_level: number;
    question_number: number;
  }>;
  highest_level_reached: number;
}

export interface BloomsBadgeRecord {
  id: string;
  student_id: string;
  clo_id: string;
  course_id: string;
  highest_bloom_level: number;
  bloom_explorer_awarded: boolean;
  bloom_challenger_awarded: boolean;
  bloom_pioneer_awarded: boolean;
}

// ─── useBloomsProgression ───────────────────────────────────────────────────
// Fetches all blooms_progression rows for a student in a course.

export const useBloomsProgression = (studentId: string, courseId: string) => {
  return useQuery({
    queryKey: queryKeys.bloomsProgression.progression(studentId, courseId),
    queryFn: async (): Promise<BloomsProgressionRecord[]> => {
      const { data, error } = await supabase
        .from('blooms_progression')
        .select(
          'id, student_id, clo_id, course_id, highest_bloom_level, correct_count_at_highest, bloom_explorer_awarded, bloom_challenger_awarded, bloom_pioneer_awarded, updated_at',
        )
        .eq('student_id', studentId)
        .eq('course_id', courseId)
        .order('highest_bloom_level', { ascending: false });

      if (error) throw error;

      return (data ?? []) as BloomsProgressionRecord[];
    },
    enabled: !!studentId && !!courseId,
  });
};

// ─── useBloomsClimbState ────────────────────────────────────────────────────
// Fetches the blooms_climb_state JSONB from a quiz_attempt record.

export const useBloomsClimbState = (quizAttemptId: string) => {
  return useQuery({
    queryKey: queryKeys.bloomsProgression.climbState(quizAttemptId),
    queryFn: async (): Promise<BloomsClimbState | null> => {
      const { data, error } = await supabase
        .from('quiz_attempts')
        .select('blooms_climb_state')
        .eq('id', quizAttemptId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      const row = data as unknown as Record<string, unknown>;
      const state = row.blooms_climb_state as Record<string, unknown> | null;

      if (!state || Object.keys(state).length === 0) return null;

      return {
        current_level: (state.current_level ?? state.current_bloom_level ?? 1) as number,
        consecutive_correct: (state.consecutive_correct ?? state.consecutive_correct_at_level ?? 0) as number,
        transitions: (state.transitions ?? state.bloom_transitions ?? []) as BloomsClimbState['transitions'],
        highest_level_reached: (state.highest_level_reached ?? 1) as number,
      };
    },
    enabled: !!quizAttemptId,
  });
};

// ─── useBloomsPioneerBadges ─────────────────────────────────────────────────
// Fetches all blooms_progression rows where any badge has been awarded.

export const useBloomsPioneerBadges = (studentId: string) => {
  return useQuery({
    queryKey: queryKeys.bloomsProgression.badges(studentId),
    queryFn: async (): Promise<BloomsBadgeRecord[]> => {
      const { data, error } = await supabase
        .from('blooms_progression')
        .select(
          'id, student_id, clo_id, course_id, highest_bloom_level, bloom_explorer_awarded, bloom_challenger_awarded, bloom_pioneer_awarded',
        )
        .eq('student_id', studentId)
        .or(
          'bloom_explorer_awarded.eq.true,bloom_challenger_awarded.eq.true,bloom_pioneer_awarded.eq.true',
        );

      if (error) throw error;

      return (data ?? []) as BloomsBadgeRecord[];
    },
    enabled: !!studentId,
  });
};
