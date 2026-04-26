/**
 * Hooks for student content creation, listing, and teacher review. Task 20.6
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { toast } from 'sonner';
import type { CreateStudentContentInput, ReviewStudentContentInput } from '@/lib/marketplaceSchemas';

export interface StudentContent {
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

export const useStudentContentList = (studentId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.studentContent.list(studentId ?? ''),
    queryFn: async () => {
      if (!studentId) return [];
      const { data, error } = await supabase
        .from('student_content')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as StudentContent[];
    },
    enabled: !!studentId,
  });
};

export const useCreateStudentContent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateStudentContentInput & { student_id: string }) => {
      const { data, error } = await supabase
        .from('student_content')
        .insert({ ...input, status: 'pending' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.studentContent.all });
      toast.success('Content submitted for review');
    },
  });
};

export const useContentReviewQueue = (courseId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.studentContent.reviewQueue(courseId ?? ''),
    queryFn: async () => {
      if (!courseId) return [];
      const { data, error } = await supabase
        .from('student_content')
        .select('*, clo:clos!clo_id(course_id)')
        .eq('status', 'pending')
        .eq('clos.course_id', courseId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as unknown as StudentContent[];
    },
    enabled: !!courseId,
  });
};

export const useReviewStudentContent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ReviewStudentContentInput & { reviewer_id: string }) => {
      const { data, error } = await supabase
        .from('student_content')
        .update({ status: input.status, feedback: input.feedback, reviewer_id: input.reviewer_id })
        .eq('id', input.content_id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.studentContent.all });
      toast.success('Content reviewed');
    },
  });
};
