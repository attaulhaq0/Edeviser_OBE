import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { countWords } from '@/lib/plannerUtils';

interface SaveReflectionInput {
  sessionId: string;
  content: string;
}

interface SaveWeeklyReflectionInput {
  weekStartDate: string;
  content: string;
  courseId: string;
}

export const useSaveSessionReflection = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: SaveReflectionInput) => {
      const wordCount = countWords(input.content);
      if (wordCount < 30) throw new Error('Reflection must be at least 30 words');

      const { error } = await supabase
        .from('session_reflections')
        .insert({
          session_id: input.sessionId,
          student_id: user!.id,
          content: input.content,
          word_count: wordCount,
        });
      if (error) throw error;

      // Award 10 XP for session reflection
      await supabase.functions.invoke('award-xp', {
        body: {
          student_id: user!.id,
          xp_amount: 10,
          source: 'session_reflection',
          reference_id: `session_reflection:${input.sessionId}`,
          note: 'Session reflection completed',
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sessionReflections.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.studentGamification.all });
      toast.success('Reflection saved! +10 XP');
    },
    onError: (err: Error) => toast.error(err.message),
  });
};

export const useSaveWeeklyReflection = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: SaveWeeklyReflectionInput) => {
      const wordCount = countWords(input.content);
      if (wordCount < 50) throw new Error('Weekly reflection must be at least 50 words');

      // Create journal entry (triggers standard journal XP of 20)
      const { error } = await supabase
        .from('journal_entries')
        .insert({
          student_id: user!.id,
          course_id: input.courseId,
          content: input.content,
          is_shared: false,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.journal.all });
      toast.success('Weekly reflection saved');
    },
    onError: (err: Error) => toast.error(err.message),
  });
};
