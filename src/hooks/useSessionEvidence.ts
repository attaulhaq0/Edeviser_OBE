// =============================================================================
// useSessionEvidence — Upload files to Supabase Storage + insert evidence records
// =============================================================================

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { SessionEvidence } from "@/types/planner";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface UploadEvidenceInput {
  sessionId: string;
  files: File[];
  notes?: string | null;
}

export interface UploadEvidenceResult {
  uploaded: SessionEvidence[];
  failed: number;
}

// ─── Row → Domain Mapper ────────────────────────────────────────────────────

function mapEvidence(row: Record<string, unknown>): SessionEvidence {
  return {
    id: row.id as string,
    sessionId: row.session_id as string,
    studentId: row.student_id as string,
    fileUrl: row.file_url as string,
    fileName: row.file_name as string,
    fileSizeBytes: row.file_size_bytes as number,
    mimeType: row.mime_type as string,
    notes: (row.notes as string) ?? null,
    createdAt: (row.created_at as string) ?? "",
  };
}

// ─── useSessionEvidenceList — fetch evidence for a session ───────────────────

export const useSessionEvidenceList = (sessionId: string | undefined) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.evidence.list({
      sessionId: sessionId ?? "",
      type: "session_evidence",
    }),
    enabled: !!sessionId && !!user,
    queryFn: async (): Promise<SessionEvidence[]> => {
      if (!sessionId || !user) return [];

      const { data, error } = await supabase
        .from("session_evidence")
        .select(
          "id, session_id, student_id, file_url, file_name, file_size_bytes, mime_type, notes, created_at"
        )
        .eq("session_id", sessionId)
        .eq("student_id", user.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data ?? []).map((row) =>
        mapEvidence(row as Record<string, unknown>)
      );
    },
  });
};

// ─── useUploadEvidence — upload files + insert records ───────────────────────

export const useUploadEvidence = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (
      input: UploadEvidenceInput
    ): Promise<UploadEvidenceResult> => {
      if (!user) throw new Error("Not authenticated");

      const { sessionId, files, notes } = input;
      const uploaded: SessionEvidence[] = [];
      let failed = 0;

      for (const file of files) {
        // Upload to Supabase Storage: session-evidence/{studentId}/{sessionId}/
        const filePath = `${user.id}/${sessionId}/${Date.now()}_${file.name}`;

        const { error: uploadError } = await supabase.storage
          .from("session-evidence")
          .upload(filePath, file);

        if (uploadError) {
          console.error(
            "[useUploadEvidence] upload failed:",
            uploadError.message
          );
          failed++;
          continue;
        }

        // session-evidence is a private bucket. Store the storage path —
        // consumers must call getSignedUrl("session-evidence", file_url)
        // at READ time. See src/lib/storageUrl.ts.

        // Insert evidence record
        const { data, error: insertError } = await supabase
          .from("session_evidence")
          .insert({
            session_id: sessionId,
            student_id: user.id,
            file_url: filePath,
            file_name: file.name,
            file_size_bytes: file.size,
            mime_type: file.type,
            notes: notes ?? null,
          } as never)
          .select()
          .single();

        if (insertError) {
          console.error(
            "[useUploadEvidence] insert failed:",
            insertError.message
          );
          failed++;
          continue;
        }

        uploaded.push(mapEvidence(data as Record<string, unknown>));
      }

      return { uploaded, failed };
    },
    onSuccess: ({ uploaded, failed }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.evidence.lists(),
      });

      if (uploaded.length > 0 && failed === 0) {
        toast.success(
          `${uploaded.length} file${uploaded.length > 1 ? "s" : ""} uploaded`
        );
      } else if (uploaded.length > 0 && failed > 0) {
        toast.success(`${uploaded.length} uploaded, ${failed} failed`);
      } else if (failed > 0) {
        toast.error("All file uploads failed");
      }
    },
    onError: (error: Error) => {
      toast.error(`Upload failed: ${error.message}`);
    },
  });
};
