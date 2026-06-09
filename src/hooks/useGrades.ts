import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { logAuditEvent } from "@/lib/auditLogger";
import { useAuth } from "@/hooks/useAuth";
import type { GradeFormData } from "@/lib/schemas/grade";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Grade {
  id: string;
  submission_id: string;
  rubric_selections: Array<{
    criterion_id: string;
    level_index: number;
    points: number;
  }>;
  total_score: number;
  score_percent: number;
  overall_feedback: string | null;
  graded_by: string;
  created_at: string;
  institution_id: string;
}

export interface GradeWithRelations extends Grade {
  profiles: { id: string; full_name: string; email: string } | null;
}

// ─── useGrades — list grades for an assignment ──────────────────────────────

export const useGrades = (assignmentId?: string) => {
  return useQuery({
    queryKey: queryKeys.grades.list({ assignmentId }),
    queryFn: async (): Promise<GradeWithRelations[]> => {
      // grades has no assignment_id; filter via FK relationship through submissions
      let query = supabase
        .from("grades")
        .select(
          "*, submissions!inner(assignment_id), profiles!grades_graded_by_fkey(id, full_name, email)"
        )
        .order("graded_at", { ascending: false });

      if (assignmentId) {
        query = query.eq("submissions.assignment_id", assignmentId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as GradeWithRelations[];
    },
    enabled: !!assignmentId,
  });
};

// ─── useGrade — single grade for a submission (may not exist) ───────────────

export const useGrade = (submissionId?: string) => {
  return useQuery({
    queryKey: queryKeys.grades.detail(submissionId ?? ""),
    queryFn: async (): Promise<Grade | null> => {
      const { data, error } = await supabase
        .from("grades")
        .select("*")
        .eq("submission_id", submissionId!)
        .maybeSingle();

      if (error) throw error;
      return data as unknown as Grade | null;
    },
    enabled: !!submissionId,
  });
};

// ─── useCreateGrade — insert grade for a submission ─────────────────────────

export const useCreateGrade = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (
      data: GradeFormData & { graded_by: string }
    ): Promise<Grade> => {
      const { data: result, error } = await supabase
        .from("grades")
        .insert(data)
        .select()
        .single();

      if (error) throw error;

      const grade = result as unknown as Grade;

      await logAuditEvent({
        action: "create",
        entity_type: "grade",
        entity_id: grade.id,
        changes: data,
        performed_by: user?.id ?? "unknown",
      });

      return grade;
    },
    onSuccess: (grade) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.grades.lists() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.submissions.lists(),
      });
      // Evidence Generator (Task 17) runs via a database trigger on grades INSERT.
      // Invalidate evidence & attainment caches so the UI picks up new records.
      queryClient.invalidateQueries({ queryKey: queryKeys.evidence.lists() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.outcomeAttainment.lists(),
      });
      // Prediction validation (Task 36.4) updates ai_feedback records.
      // Invalidate so teacher dashboard reflects validated predictions.
      queryClient.invalidateQueries({ queryKey: queryKeys.aiFeedback.lists() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.atRiskPredictions.lists(),
      });

      // Grade XP is OWNED by the `trigger_attainment_rollup` DB trigger, which
      // inserts the canonical +15 `grade` xp_transaction (ON CONFLICT DO NOTHING)
      // and updates xp_total. We must NOT call award-xp('grade') here — that would
      // double-award and break the xp_total = SUM(xp_transactions) invariant.
      // Instead, fire the grade badge-check from the client so the grade → badge
      // path runs, then invalidate badge caches. Fire-and-forget: a badge failure
      // must never break the grade mutation.
      void (async () => {
        try {
          const { data: submission, error } = await supabase
            .from("submissions")
            .select("student_id")
            .eq("id", grade.submission_id)
            .maybeSingle();

          if (error) throw error;
          const studentId = submission?.student_id;
          if (!studentId) return;

          await supabase.functions.invoke("check-badges", {
            body: { student_id: studentId, trigger: "grade" },
          });

          queryClient.invalidateQueries({ queryKey: queryKeys.badges.lists() });
        } catch {
          console.error("[useCreateGrade] grade badge-check failed");
        }
      })();
    },
  });
};
