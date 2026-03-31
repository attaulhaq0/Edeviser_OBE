// Task 89.6: Bulk operations hooks — grade export, enrollment import/export, semester transition

import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

interface BulkGradeExportResult {
  download_url: string;
  file_name: string;
}

export const useBulkGradeExport = () => {
  return useMutation({
    mutationFn: async (params: { course_id: string; section_id?: string }): Promise<BulkGradeExportResult> => {
      const { data, error } = await supabase.functions.invoke('bulk-grade-export', { body: params });
      if (error) throw error;
      return data as BulkGradeExportResult;
    },
  });
};

export const useBulkEnrollmentImport = () => {
  return useMutation({
    mutationFn: async (params: { file: File }): Promise<{ imported: number; skipped: number; errors: string[] }> => {
      const text = await params.file.text();
      const { data, error } = await supabase.functions.invoke('bulk-data-import', {
        body: { import_type: 'enrollments', csv_content: text },
      });
      if (error) throw error;
      return data as { imported: number; skipped: number; errors: string[] };
    },
  });
};

export const useSemesterTransition = () => {
  return useMutation({
    mutationFn: async (params: { source_semester_id: string; target_semester_id: string; program_id: string }): Promise<{ copied_courses: number; copied_clos: number }> => {
      const { data, error } = await supabase.functions.invoke('semester-transition', { body: params });
      if (error) throw error;
      return data as { copied_courses: number; copied_clos: number };
    },
  });
};
