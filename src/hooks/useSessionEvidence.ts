import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface UploadEvidenceInput {
  sessionId: string;
  files: File[];
  notes?: string;
}

export const useUploadEvidence = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: UploadEvidenceInput) => {
      const { sessionId, files, notes } = input;
      const studentId = user!.id;
      const evidenceRecords: Array<Record<string, unknown>> = [];

      for (const file of files) {
        const filePath = `${studentId}/${sessionId}/${Date.now()}_${file.name}`;
        const { error: uploadErr } = await supabase.storage
          .from('session-evidence')
          .upload(filePath, file);
        if (uploadErr) throw uploadErr;

        const { data: urlData } = supabase.storage
          .from('session-evidence')
          .getPublicUrl(filePath);

        evidenceRecords.push({
          session_id: sessionId,
          student_id: studentId,
          file_url: urlData.publicUrl,
          file_name: file.name,
          file_size_bytes: file.size,
          mime_type: file.type,
          notes: notes ?? null,
        });
      }

      if (evidenceRecords.length > 0) {
        const { error: insertErr } = await supabase
          .from('session_evidence')
          .insert(evidenceRecords);
        if (insertErr) throw insertErr;
      }

      return evidenceRecords.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sessionEvidence.all });
      if (count > 0) toast.success(`${count} file(s) uploaded`);
    },
    onError: (err: Error) => toast.error(err.message),
  });
};
