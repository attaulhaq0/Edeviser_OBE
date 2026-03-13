import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';

// ── Types ────────────────────────────────────────────────────────────

export interface GoalSuggestionRecord {
  id: string;
  student_id: string;
  week_start: string;
  goal_text: string;
  smart_specific: string | null;
  smart_measurable: string | null;
  smart_achievable: string | null;
  smart_relevant: string | null;
  smart_timebound: string | null;
  difficulty: 'easy' | 'moderate' | 'ambitious';
  cohort_completion_rate: number | null;
  status: 'suggested' | 'accepted' | 'modified' | 'dismissed';
  created_at: string;
}

type GoalStatus = GoalSuggestionRecord['status'];

interface GenerateGoalsInput {
  student_id: string;
  week_start: string;
}

interface GenerateGoalsResult {
  success: boolean;
  suggestions: GoalSuggestionRecord[];
}

// ── useGoalSuggestions — fetch suggestions for a week ─────────────────

export const useGoalSuggestions = (studentId: string, weekStart: string) => {
  return useQuery({
    queryKey: queryKeys.onboarding.goalSuggestions(studentId, weekStart),
    queryFn: async (): Promise<GoalSuggestionRecord[]> => {
      const { data, error } = await supabase
        .from('goal_suggestions')
        .select('*')
        .eq('student_id', studentId)
        .eq('week_start', weekStart)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data ?? []) as GoalSuggestionRecord[];
    },
    enabled: !!studentId && !!weekStart,
  });
};

// ── useAcceptGoal — update goal status to accepted ───────────────────

export const useAcceptGoal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id: string;
      studentId: string;
      weekStart: string;
    }): Promise<GoalSuggestionRecord> => {
      const { data, error } = await supabase
        .from('goal_suggestions')
        .update({ status: 'accepted' as GoalStatus })
        .eq('id', params.id)
        .select()
        .single();

      if (error) throw error;
      return data as GoalSuggestionRecord;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.onboarding.goalSuggestions(variables.studentId, variables.weekStart),
      });
    },
  });
};

// ── useDismissGoal — update goal status to dismissed ─────────────────

export const useDismissGoal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id: string;
      studentId: string;
      weekStart: string;
    }): Promise<GoalSuggestionRecord> => {
      const { data, error } = await supabase
        .from('goal_suggestions')
        .update({ status: 'dismissed' as GoalStatus })
        .eq('id', params.id)
        .select()
        .single();

      if (error) throw error;
      return data as GoalSuggestionRecord;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.onboarding.goalSuggestions(variables.studentId, variables.weekStart),
      });
    },
  });
};

// ── useGenerateGoalSuggestions — call Edge Function ───────────────────

export const useGenerateGoalSuggestions = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: GenerateGoalsInput): Promise<GenerateGoalsResult> => {
      const { data, error } = await supabase.functions.invoke('suggest-goals', {
        body: input,
      });

      if (error) throw error;
      return data as GenerateGoalsResult;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.onboarding.goalSuggestions(variables.student_id, variables.week_start),
      });
    },
  });
};
