// =============================================================================
// useStudentContent — Student content creation, listing, teacher review
// Task 20.6
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { toast } from 'sonner';
import type { CreateStudentContentInput, ReviewStudentContentInput } from '@/lib/marketplaceSchemas';

export interface StudentContentItem {
  id: string;
  student_id: string;
  content_type: 'study_plan' | 'quiz_question' | 'explanation_video';
  clo_id: string | null;
  title: string;
  content_data: Record<string, unknown>;
  status: 'pending' | 'approved' | 'rejected';
  reviewer_id: string | null;
  feedback: string | null;
  created_at: string;
}

export const useStudentContent = (studentId?: string) => {
  return useQuery({
    queryKey: queryKeys.studentContent.list({ studentId }),
    queryFn: async (): Promise<StudentContentItem[]> => {
      let query = supabase
        .from('student_content')
        .select('*')
        .order('created_at', { ascending: false });

      if (studentId) {
        query = query.eq('student_id', studentId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as StudentContentItem[];
    },
  });
};

export const useCreateStudentContent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateStudentContentInput & { studentId: string }) => {
      const { studentId, ...contentData } = input;
      const { data, error } = await supabase
        .from('student_content')
        .insert({
          student_id: studentId,
          content_type: contentData.content_type,
          title: contentData.title,
          clo_id: contentData.clo_id ?? null,
          content_data: contentData.content_data as unknown as Record<string, unknown>,
          status: 'pending',
        } as never)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.studentContent.all });
      toast.success('Content submitted for review');
    },
    onError: (err) => toast.error((err as Error).message),
  });
};

export const useReviewStudentContent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ReviewStudentContentInput & { reviewerId: string }) => {
      const { content_id, status, feedback, reviewerId } = input;
      const { data, error } = await supabase
        .from('student_content')
        .update({
          status,
          reviewer_feedback: feedback ?? null,
          reviewer_id: reviewerId,
          reviewed_at: new Date().toISOString(),
        } as never)
        .eq('id', content_id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.studentContent.all });
      toast.success('Content reviewed');
    },
    onError: (err) => toast.error((err as Error).message),
  });
};
