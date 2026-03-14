import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';

// ── Types ────────────────────────────────────────────────────────────

export interface StarterWeekSession {
  id: string;
  student_id: string;
  course_id: string | null;
  session_type: 'reading' | 'practice' | 'review' | 'exploration';
  suggested_date: string;
  suggested_time_slot: 'morning' | 'afternoon' | 'evening';
  duration_minutes: number;
  description: string;
  status: 'suggested' | 'accepted' | 'modified' | 'dismissed' | 'completed';
  planner_entry_id: string | null;
  created_at: string;
  updated_at: string;
}

export type SessionStatus = StarterWeekSession['status'];

interface GenerateStarterWeekInput {
  student_id: string;
  self_efficacy_score: number;
  enrolled_course_ids: string[];
}

interface GenerateStarterWeekResult {
  success: boolean;
  sessions: StarterWeekSession[];
}

// ── useStarterWeekSessions — fetch all sessions ──────────────────────

export const useStarterWeekSessions = (studentId: string) => {
  return useQuery({
    queryKey: queryKeys.onboarding.starterWeekSessions(studentId),
    queryFn: async (): Promise<StarterWeekSession[]> => {
      const { data, error } = await supabase
        .from('starter_week_sessions')
        .select('*')
        .eq('student_id', studentId)
        .order('suggested_date', { ascending: true });

      if (error) throw error;
      return (data ?? []) as StarterWeekSession[];
    },
    enabled: !!studentId,
  });
};

// ── useUpdateSessionStatus — update a session's status ───────────────

export const useUpdateSessionStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id: string;
      studentId: string;
      status: SessionStatus;
    }): Promise<StarterWeekSession> => {
      const { data, error } = await supabase
        .from('starter_week_sessions')
        .update({ status: params.status, updated_at: new Date().toISOString() })
        .eq('id', params.id)
        .select()
        .single();

      if (error) throw error;
      return data as StarterWeekSession;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.onboarding.starterWeekSessions(variables.studentId),
      });
    },
  });
};

// ── useGenerateStarterWeek — call Edge Function ──────────────────────

export const useGenerateStarterWeek = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: GenerateStarterWeekInput): Promise<GenerateStarterWeekResult> => {
      const { data, error } = await supabase.functions.invoke('generate-starter-week', {
        body: input,
      });

      if (error) throw error;
      return data as GenerateStarterWeekResult;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.onboarding.starterWeekSessions(variables.student_id),
      });
    },
  });
};
