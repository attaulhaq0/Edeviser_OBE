import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface GenerateCourseFileInput {
  course_id: string;
  semester_id: string;
}

export interface GenerateCourseFileResult {
  success: boolean;
  download_url: string;
  file_type: 'pdf';
  course_name: string;
  course_code: string;
  semester: string;
  generated_at: string;
}

// ─── useGenerateCourseFile — invoke Edge Function ───────────────────────────

export const useGenerateCourseFile = () => {
  return useMutation({
    mutationFn: async (input: GenerateCourseFileInput): Promise<GenerateCourseFileResult> => {
      const { data, error } = await supabase.functions.invoke(
        'generate-course-file',
        { body: input },
      );

      if (error) throw error;

      const result = data as GenerateCourseFileResult;
      if (!result?.success) {
        throw new Error((data as { error?: string })?.error ?? 'Course file generation failed');
      }

      return result;
    },
  });
};
