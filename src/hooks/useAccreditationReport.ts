import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

// ─── Types ──────────────────────────────────────────────────────────────────

export type ReportTemplate = 'ABET' | 'HEC' | 'Generic';

export interface GenerateReportInput {
  program_id: string;
  semester_id?: string;
  template: ReportTemplate;
  chart_images?: Record<string, string>;
  email_to?: string;
}

export interface GenerateReportResult {
  success: boolean;
  download_url: string;
  file_name: string;
  program_name: string;
  template: ReportTemplate;
  semester: string | null;
  plo_count: number;
  ilo_count: number;
}

// ─── useGenerateReport — invoke Edge Function ───────────────────────────────

export const useGenerateReport = () => {
  return useMutation({
    mutationFn: async (input: GenerateReportInput): Promise<GenerateReportResult> => {
      const { data, error } = await supabase.functions.invoke(
        'generate-accreditation-report',
        { body: input },
      );

      if (error) throw error;

      const result = data as GenerateReportResult;
      if (!result?.success) {
        throw new Error((data as { error?: string })?.error ?? 'Report generation failed');
      }

      return result;
    },
  });
};
