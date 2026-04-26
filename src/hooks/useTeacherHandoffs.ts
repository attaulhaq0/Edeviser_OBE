import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { useAuth } from '@/hooks/useAuth';
import type { CreateHandoffInput, RespondToHandoffInput } from '@/lib/tutorSchemas';

export interface TeacherHandoffRequest {
  id: string;
  conversation_id: string;
  student_id: string;
  teacher_id: string;
  institution_id: string;
  course_id: string;
  clo_id: string | null;
  conversation_summary: string;
  suggested_intervention: string;
  trigger_reason: 'low_rag_confidence' | 'repeated_question' | 'low_satisfaction';
  student_consent: boolean;
  status: 'pending' | 'resolved' | 'dismissed';
  teacher_response: string | null;
  created_at: string;
  resolved_at: string | null;
}

/**
 * Hook for teachers to fetch handoff requests for their courses.
 * Requirement 31: Teacher Handoff Dashboard
 */
export const useTeacherHandoffs = (courseId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.teacherHandoffs.list(courseId ? { courseId } : {}),
    queryFn: async (): Promise<TeacherHandoffRequest[]> => {
      if (!user) throw new Error('Not authenticated');

      let query = supabase
        .from('teacher_handoff_requests')
        .select('id, conversation_id, student_id, teacher_id, institution_id, course_id, clo_id, conversation_summary, suggested_intervention, trigger_reason, student_consent, status, teacher_response, created_at, resolved_at')
        .eq('teacher_id', user.id)
        .eq('student_consent', true)
        .order('created_at', { ascending: false });

      if (courseId) {
        query = query.eq('course_id', courseId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as TeacherHandoffRequest[];
    },
    enabled: !!user,
  });
};

/**
 * Hook for teachers to fetch pending handoff requests.
 */
export const usePendingHandoffs = (courseId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.teacherHandoffs.list({ courseId, status: 'pending' }),
    queryFn: async (): Promise<TeacherHandoffRequest[]> => {
      if (!user) throw new Error('Not authenticated');

      let query = supabase
        .from('teacher_handoff_requests')
        .select('id, conversation_id, student_id, teacher_id, institution_id, course_id, clo_id, conversation_summary, suggested_intervention, trigger_reason, student_consent, status, teacher_response, created_at, resolved_at')
        .eq('teacher_id', user.id)
        .eq('student_consent', true)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (courseId) {
        query = query.eq('course_id', courseId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as TeacherHandoffRequest[];
    },
    enabled: !!user,
  });
};

/**
 * Hook for students to create a handoff request.
 * Requirement 30.3: Student accepts handoff
 */
export const useCreateHandoff = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateHandoffInput & {
      course_id: string;
      clo_id?: string;
      conversation_summary: string;
      suggested_intervention: string;
      trigger_reason: 'low_rag_confidence' | 'repeated_question' | 'low_satisfaction';
    }): Promise<TeacherHandoffRequest> => {
      if (!user) throw new Error('Not authenticated');

      // Get the teacher for this course
      const { data: course } = await supabase
        .from('courses')
        .select('teacher_id')
        .eq('id', input.course_id)
        .maybeSingle();

      if (!course?.teacher_id) throw new Error('Course teacher not found');

      // Get student's institution
      const { data: profile } = await supabase
        .from('profiles')
        .select('institution_id')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile?.institution_id) throw new Error('Student profile not found');

      const { data, error } = await supabase
        .from('teacher_handoff_requests')
        .insert({
          conversation_id: input.conversation_id,
          student_id: user.id,
          teacher_id: course.teacher_id,
          institution_id: profile.institution_id,
          course_id: input.course_id,
          clo_id: input.clo_id ?? null,
          conversation_summary: input.conversation_summary,
          suggested_intervention: input.suggested_intervention,
          trigger_reason: input.trigger_reason,
          student_consent: input.student_consent,
        })
        .select()
        .single();

      if (error) throw error;
      return data as TeacherHandoffRequest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teacherHandoffs.lists() });
    },
  });
};

/**
 * Hook for teachers to respond to a handoff request.
 * Requirement 31.3: Teacher responds
 */
export const useRespondToHandoff = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: RespondToHandoffInput): Promise<void> => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('teacher_handoff_requests')
        .update({
          teacher_response: input.response_message,
          status: 'resolved',
          resolved_at: new Date().toISOString(),
        })
        .eq('id', input.handoff_id)
        .eq('teacher_id', user.id);

      if (error) throw error;

      // Send notification to student
      const { data: handoff } = await supabase
        .from('teacher_handoff_requests')
        .select('student_id')
        .eq('id', input.handoff_id)
        .maybeSingle();

      if (handoff?.student_id) {
        await supabase.from('notifications').insert({
          user_id: handoff.student_id,
          type: 'teacher_handoff_response',
          title: 'Teacher Response',
          message: 'Your teacher has responded to your help request.',
          is_read: false,
          metadata: { handoff_id: input.handoff_id },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teacherHandoffs.lists() });
    },
  });
};
