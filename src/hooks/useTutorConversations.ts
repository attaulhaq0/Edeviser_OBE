import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { useAuth } from '@/hooks/useAuth';
import type { TutorConversation, TutorPersona, PlanUpdateResponseInput } from '@/lib/tutorSchemas';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CreateConversationInput {
  course_id: string;
  persona?: TutorPersona;
  clo_scope?: string[];
}

// ─── useTutorConversations — list conversations for the current student ─────

export const useTutorConversations = (courseId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.tutorConversations.list(
      courseId ? { courseId } : {},
    ),
    queryFn: async (): Promise<TutorConversation[]> => {
      if (!user) throw new Error('Not authenticated');

      let query = supabase
        .from('tutor_conversations')
        .select('id, student_id, institution_id, course_id, persona, title, clo_scope, message_count, xp_awarded, autonomy_override, created_at, updated_at')
        .eq('student_id', user.id)
        .order('updated_at', { ascending: false });

      if (courseId) {
        query = query.eq('course_id', courseId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as TutorConversation[];
    },
    enabled: !!user,
  });
};

// ─── useTutorConversation — single conversation by id ───────────────────────

export const useTutorConversation = (conversationId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.tutorConversations.detail(conversationId ?? ''),
    queryFn: async (): Promise<TutorConversation | null> => {
      if (!user || !conversationId) throw new Error('Not authenticated or missing conversation ID');

      const { data, error } = await supabase
        .from('tutor_conversations')
        .select('id, student_id, institution_id, course_id, persona, title, clo_scope, message_count, xp_awarded, autonomy_override, created_at, updated_at')
        .eq('id', conversationId)
        .eq('student_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data as TutorConversation | null;
    },
    enabled: !!user && !!conversationId,
  });
};

// ─── useCreateConversation ──────────────────────────────────────────────────

export const useCreateConversation = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateConversationInput): Promise<TutorConversation> => {
      if (!user) throw new Error('Not authenticated');

      // Fetch institution_id from user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('institution_id')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError || !profile) throw new Error('Failed to fetch user profile');

      const { data, error } = await supabase
        .from('tutor_conversations')
        .insert({
          student_id: user.id,
          institution_id: profile.institution_id,
          course_id: input.course_id,
          persona: input.persona ?? 'socratic_guide',
          clo_scope: input.clo_scope ?? [],
        })
        .select()
        .single();

      if (error) throw error;
      return data as TutorConversation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tutorConversations.lists() });
    },
  });
};

// ─── useDeleteConversation ──────────────────────────────────────────────────

export const useDeleteConversation = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (conversationId: string): Promise<void> => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('tutor_conversations')
        .delete()
        .eq('id', conversationId)
        .eq('student_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tutorConversations.lists() });
    },
  });
};

// ─── useUpdateConversationPersona ───────────────────────────────────────────

export const useUpdateConversationPersona = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      conversationId,
      persona,
    }: {
      conversationId: string;
      persona: TutorPersona;
    }): Promise<void> => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('tutor_conversations')
        .update({ persona })
        .eq('id', conversationId)
        .eq('student_id', user.id);

      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.tutorConversations.detail(variables.conversationId),
      });
    },
  });
};

// ─── useRespondToPlanUpdate — accept/modify/dismiss a learning plan update ──

export const useRespondToPlanUpdate = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: PlanUpdateResponseInput): Promise<void> => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('tutor_plan_updates')
        .update({
          response: input.response,
          modifications: input.modifications ?? null,
          responded_at: new Date().toISOString(),
        })
        .eq('id', input.plan_update_id)
        .eq('student_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tutorPlanUpdates.lists() });
    },
  });
};

// ─── useRecommendedPersona — auto-select persona from Big Five profile ──────

export const useRecommendedPersona = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['tutorPersonaRecommendation', user?.id ?? ''],
    queryFn: async (): Promise<TutorPersona | null> => {
      if (!user) return null;

      const { data: studentProfile } = await supabase
        .from('student_profiles')
        .select('personality_traits')
        .eq('student_id', user.id)
        .maybeSingle();

      if (!studentProfile?.personality_traits) return null;

      // Dynamic import to keep the hook lightweight
      const { autoSelectPersona } = await import('@/lib/tutorPersonaAutoSelect');
      const traits = studentProfile.personality_traits as Record<string, number>;

      const result = autoSelectPersona({
        openness: traits.openness ?? 50,
        conscientiousness: traits.conscientiousness ?? 50,
        extraversion: traits.extraversion ?? 50,
        agreeableness: traits.agreeableness ?? 50,
        neuroticism: traits.neuroticism ?? 50,
      });

      return result?.persona ?? null;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
};
