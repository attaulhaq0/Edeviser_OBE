import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { SessionIntent, SuggestedIntent } from '@/types/planner';
import type { SessionIntentInput } from '@/lib/schemas/planner';

export const useSaveSessionIntent = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: SessionIntentInput) => {
      const { error } = await supabase
        .from('session_intents')
        .insert({
          session_id: input.sessionId,
          student_id: user!.id,
          concept: input.concept,
          success_criterion: input.successCriterion,
          is_auto_suggested: input.isAutoSuggested,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessionIntents'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
};

export const useSessionIntentForSession = (sessionId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['sessionIntents', sessionId],
    queryFn: async (): Promise<SessionIntent | null> => {
      const { data, error } = await supabase
        .from('session_intents')
        .select('*')
        .eq('session_id', sessionId)
        .eq('student_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        id: data.id as string,
        sessionId: data.session_id as string,
        studentId: data.student_id as string,
        concept: data.concept as string,
        successCriterion: data.success_criterion as string,
        isAutoSuggested: data.is_auto_suggested as boolean,
        createdAt: data.created_at as string,
      };
    },
    enabled: !!user?.id && !!sessionId,
  });
};

export const useSuggestedIntents = (sessionId: string, courseId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['suggestedIntents', sessionId, courseId],
    queryFn: async (): Promise<SuggestedIntent[]> => {
      const suggestions: SuggestedIntent[] = [];

      // Fetch low-attainment CLOs (< 70%)
      const { data: attainments } = await supabase
        .from('outcome_attainment')
        .select('outcome_id, score, outcomes(title)')
        .eq('student_id', user!.id)
        .eq('scope', 'clo')
        .lt('score', 70);

      if (attainments) {
        for (const a of attainments.slice(0, 3)) {
          const record = a as Record<string, unknown>;
          const outcomes = record.outcomes as Record<string, unknown> | null;
          suggestions.push({
            concept: `Review: ${outcomes?.title ?? 'CLO'}`,
            successCriterion: 'Improve understanding and reach 70% attainment',
            source: 'low_attainment',
            cloId: record.outcome_id as string,
          });
        }
      }

      // Fetch upcoming deadlines (next 3 days)
      const today = new Date();
      const threeDaysLater = new Date(today);
      threeDaysLater.setDate(threeDaysLater.getDate() + 3);

      const { data: assignments } = await supabase
        .from('assignments')
        .select('id, title, due_date')
        .eq('course_id', courseId)
        .gte('due_date', today.toISOString().split('T')[0])
        .lte('due_date', threeDaysLater.toISOString().split('T')[0])
        .order('due_date')
        .limit(3);

      if (assignments) {
        for (const a of assignments) {
          const record = a as Record<string, unknown>;
          suggestions.push({
            concept: `Prepare for: ${record.title as string}`,
            successCriterion: 'Complete preparation for upcoming assignment',
            source: 'upcoming_deadline',
            assignmentId: record.id as string,
          });
        }
      }

      return suggestions;
    },
    enabled: !!user?.id && !!courseId,
  });
};
