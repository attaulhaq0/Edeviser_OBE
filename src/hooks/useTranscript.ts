import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface TranscriptRequest {
  student_id: string;
  semester_id?: string;
}

export interface TranscriptResult {
  download_url: string;
  file_name: string;
}

export const useGenerateTranscript = () => {
  return useMutation<TranscriptResult, Error, TranscriptRequest>({
    mutationKey: ["transcript", "generate"] as const,
    mutationFn: async (req: TranscriptRequest): Promise<TranscriptResult> => {
      const { data, error } = await supabase.functions.invoke(
        "generate-transcript",
        { body: req }
      );
      if (error) throw error;
      return data as TranscriptResult;
    },
  });
};
