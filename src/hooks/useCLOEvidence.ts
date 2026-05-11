// =============================================================================
// useCLOEvidence — Fetch contributing evidence records for a CLO + student
// Requirements: 44.5
// =============================================================================

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CLOEvidenceRecord {
  id: string;
  assignment_title: string;
  score_percent: number;
  created_at: string;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export const useCLOEvidence = (cloId?: string, studentId?: string) => {
  return useQuery({
    queryKey: queryKeys.evidence.list({ cloId, studentId }),
    queryFn: async (): Promise<CLOEvidenceRecord[]> => {
      if (!cloId || !studentId) return [];

      // Fetch evidence records for this CLO + student, joining through
      // submissions to get assignment titles
      const { data: evidenceRows, error: evidenceError } = await supabase
        .from("evidence")
        .select("id, score_percent, created_at, submission_id")
        .eq("clo_id", cloId)
        .eq("student_id", studentId)
        .order("created_at", { ascending: false });

      if (evidenceError) throw evidenceError;
      if (!evidenceRows || evidenceRows.length === 0) return [];

      // Get submission IDs to look up assignment info
      const submissionIds = [
        ...new Set(evidenceRows.map((e) => e.submission_id)),
      ];

      const { data: submissions, error: subError } = await supabase
        .from("submissions")
        .select("id, assignment_id")
        .in("id", submissionIds);

      if (subError) throw subError;

      const assignmentIds = [
        ...new Set((submissions ?? []).map((s) => s.assignment_id)),
      ];

      const { data: assignments, error: assignError } = await supabase
        .from("assignments")
        .select("id, title")
        .in("id", assignmentIds);

      if (assignError) throw assignError;

      // Build lookup maps
      const assignmentMap = new Map<string, string>();
      for (const a of assignments ?? []) {
        assignmentMap.set(a.id, a.title);
      }

      const submissionAssignmentMap = new Map<string, string>();
      for (const s of submissions ?? []) {
        submissionAssignmentMap.set(s.id, s.assignment_id);
      }

      // Map evidence rows to display records
      return evidenceRows.map((e) => {
        const assignmentId = submissionAssignmentMap.get(e.submission_id) ?? "";
        return {
          id: e.id,
          assignment_title:
            assignmentMap.get(assignmentId) ?? "Unknown Assignment",
          score_percent: e.score_percent,
          created_at: e.created_at,
        };
      });
    },
    enabled: !!cloId && !!studentId,
  });
};
