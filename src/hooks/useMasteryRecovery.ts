import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { logAuditEvent } from "@/lib/auditLogger";
import { queryKeys } from "@/lib/queryKeys";
import type { Database } from "@/types/database";

// ─── Types ──────────────────────────────────────────────────────────────────

type MasteryRecoveryRow =
  Database["public"]["Tables"]["mastery_recovery_pathways"]["Row"];
type MasteryRecoveryInsert =
  Database["public"]["Tables"]["mastery_recovery_pathways"]["Insert"];

export interface ActivateRecoveryInput {
  institution_id: string;
  student_id: string;
  clo_id: string;
  course_id: string;
  failure_count?: number;
}

export interface CompleteRecoveryStepInput {
  recovery_id: string;
  step: "ai_tutor" | "practice";
}

export interface RecoveryMetrics {
  total_activations: number;
  completion_rate: number;
  avg_completion_time_hours: number;
  retry_success_rate: number;
}

// ─── useMasteryRecoveryStatus — active recovery for a student-CLO pair ──────

export const useMasteryRecoveryStatus = (studentId: string, cloId: string) => {
  return useQuery({
    queryKey: queryKeys.masteryRecovery.status(studentId, cloId),
    queryFn: async (): Promise<MasteryRecoveryRow | null> => {
      const { data, error } = await supabase
        .from("mastery_recovery_pathways")
        .select("*")
        .eq("student_id", studentId)
        .eq("clo_id", cloId)
        .eq("status", "active")
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!studentId && !!cloId,
  });
};

// ─── useRecoveryPathway — fetch a specific recovery session by id ───────────

export const useRecoveryPathway = (recoverySessionId: string) => {
  return useQuery({
    queryKey: queryKeys.masteryRecovery.detail(recoverySessionId),
    queryFn: async (): Promise<MasteryRecoveryRow | null> => {
      const { data, error } = await supabase
        .from("mastery_recovery_pathways")
        .select("*")
        .eq("id", recoverySessionId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!recoverySessionId,
  });
};

// ─── useActivateRecovery — insert a new recovery pathway ────────────────────

export const useActivateRecovery = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: ActivateRecoveryInput
    ): Promise<MasteryRecoveryRow> => {
      const insertData: MasteryRecoveryInsert = {
        institution_id: input.institution_id,
        student_id: input.student_id,
        clo_id: input.clo_id,
        course_id: input.course_id,
        failure_count: input.failure_count ?? 2,
        status: "active",
      };

      const { data, error } = await supabase
        .from("mastery_recovery_pathways")
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.masteryRecovery.status(
          variables.student_id,
          variables.clo_id
        ),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.masteryRecovery.metrics(variables.institution_id),
      });
    },
  });
};

// ─── useCompleteRecoveryStep — mark ai_tutor or practice as completed ───────

export const useCompleteRecoveryStep = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: CompleteRecoveryStepInput
    ): Promise<MasteryRecoveryRow> => {
      const now = new Date().toISOString();

      const updateFields =
        input.step === "ai_tutor"
          ? { ai_tutor_completed: true, ai_tutor_completed_at: now }
          : { practice_completed: true, practice_completed_at: now };

      const { data, error } = await supabase
        .from("mastery_recovery_pathways")
        .update({ ...updateFields, updated_at: now })
        .eq("id", input.recovery_id)
        .select()
        .single();

      if (error) throw error;

      // If both steps are now complete, mark the pathway as completed
      if (data.ai_tutor_completed && data.practice_completed) {
        const { data: completed, error: completeError } = await supabase
          .from("mastery_recovery_pathways")
          .update({ status: "completed", completed_at: now, updated_at: now })
          .eq("id", input.recovery_id)
          .select()
          .single();

        if (completeError) throw completeError;

        // Audit log: recovery pathway completion (non-blocking)
        try {
          await logAuditEvent({
            action: "recovery_completed",
            entity_type: "mastery_recovery_pathway",
            entity_id: input.recovery_id,
            changes: {
              student_id: completed.student_id,
              clo_id: completed.clo_id,
              course_id: completed.course_id,
              failure_count: completed.failure_count,
            },
            performed_by: completed.student_id,
          });
        } catch (auditErr) {
          console.error(
            "[AuditLog] Failed to log recovery completion:",
            auditErr
          );
        }

        return completed;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.masteryRecovery.all,
      });
    },
  });
};

// ─── useRecoveryMetrics — coordinator dashboard metrics ─────────────────────

export const useRecoveryMetrics = (institutionId: string) => {
  return useQuery({
    queryKey: queryKeys.masteryRecovery.metrics(institutionId),
    queryFn: async (): Promise<RecoveryMetrics> => {
      const { data, error } = await supabase
        .from("mastery_recovery_pathways")
        .select("id, status, activated_at, completed_at, retry_outcome")
        .eq("institution_id", institutionId);

      if (error) throw error;

      const rows = data ?? [];
      const totalActivations = rows.length;

      if (totalActivations === 0) {
        return {
          total_activations: 0,
          completion_rate: 0,
          avg_completion_time_hours: 0,
          retry_success_rate: 0,
        };
      }

      // Completion rate: completed / total
      const completedRows = rows.filter((r) => r.status === "completed");
      const completionRate = completedRows.length / totalActivations;

      // Average completion time in hours
      const completionTimes = completedRows
        .filter((r) => r.completed_at && r.activated_at)
        .map((r) => {
          const activated = new Date(r.activated_at).getTime();
          const completed = new Date(r.completed_at!).getTime();
          return (completed - activated) / (1000 * 60 * 60); // ms → hours
        });

      const avgCompletionTimeHours =
        completionTimes.length > 0
          ? completionTimes.reduce((sum, t) => sum + t, 0) /
            completionTimes.length
          : 0;

      // Retry success rate: pass / (pass + fail) among those who retried
      const retriedRows = rows.filter((r) => r.retry_outcome !== null);
      const retrySuccessCount = retriedRows.filter(
        (r) => r.retry_outcome === "pass"
      ).length;
      const retrySuccessRate =
        retriedRows.length > 0 ? retrySuccessCount / retriedRows.length : 0;

      return {
        total_activations: totalActivations,
        completion_rate: completionRate,
        avg_completion_time_hours: avgCompletionTimeHours,
        retry_success_rate: retrySuccessRate,
      };
    },
    enabled: !!institutionId,
  });
};
