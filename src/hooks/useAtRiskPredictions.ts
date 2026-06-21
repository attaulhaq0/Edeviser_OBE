// =============================================================================
// useAtRiskPredictions — TanStack Query hooks for AI at-risk predictions
// Validates: Requirements 47.3, 47.4
// =============================================================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { useAuth } from "@/hooks/useAuth";
import { DASHBOARD_STALE_TIME_MS } from "@/lib/queryConfig";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ContributingSignals {
  login_frequency: "low" | "medium" | "high";
  submission_pattern: "early" | "on_time" | "late" | "missed";
  attainment_trend: "improving" | "declining" | "stagnant";
}

export interface AtRiskPredictionData {
  at_risk_clo_id: string;
  at_risk_clo_title: string;
  probability_score: number;
  contributing_signals: ContributingSignals;
  prediction_date: string;
  current_attainment?: number;
}

export interface AIAtRiskPrediction {
  id: string;
  student_id: string;
  student_name: string;
  suggestion_type: string;
  suggestion_text: string;
  suggestion_data: AtRiskPredictionData;
  validated_outcome: "correct" | "incorrect" | null;
  created_at: string;
}

// ─── useAtRiskPredictions ────────────────────────────────────────────────────

export const useAtRiskPredictions = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.atRiskPredictions.list({ teacherId: user?.id }),
    queryFn: async (): Promise<AIAtRiskPrediction[]> => {
      const teacherId = user?.id;
      if (!teacherId) return [];

      // Get teacher's active course IDs
      const { data: courses, error: coursesError } = await supabase
        .from("courses")
        .select("id")
        .eq("teacher_id", teacherId)
        .eq("is_active", true);

      if (coursesError) throw coursesError;
      const courseIds = (courses ?? []).map((c) => c.id);
      if (courseIds.length === 0) return [];

      // Get enrolled student IDs for teacher's courses
      const { data: enrollments, error: enrollError } = await supabase
        .from("student_courses")
        .select("student_id")
        .in("course_id", courseIds);

      if (enrollError) throw enrollError;
      const studentIds = [
        ...new Set((enrollments ?? []).map((e) => e.student_id)),
      ];
      if (studentIds.length === 0) return [];

      // Fetch at-risk predictions from ai_feedback
      const { data: predictions, error: predError } = await supabase
        .from("ai_feedback")
        .select(
          "id, student_id, suggestion_type, suggestion_text, suggestion_data, validated_outcome, created_at"
        )
        .eq("suggestion_type", "at_risk_prediction")
        .in("student_id", studentIds)
        .is("validated_outcome", null)
        .order("created_at", { ascending: false });

      if (predError) throw predError;
      if (!predictions || predictions.length === 0) return [];

      // Fetch student names
      const predStudentIds = [...new Set(predictions.map((p) => p.student_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", predStudentIds);

      const nameMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

      return predictions.map((p) => ({
        id: p.id,
        student_id: p.student_id,
        student_name: nameMap.get(p.student_id) ?? "Unknown",
        suggestion_type: p.suggestion_type,
        suggestion_text: p.suggestion_text ?? "",
        suggestion_data: p.suggestion_data as unknown as AtRiskPredictionData,
        validated_outcome: p.validated_outcome as
          | "correct"
          | "incorrect"
          | null,
        created_at: p.created_at,
      }));
    },
    enabled: !!user?.id,
    staleTime: DASHBOARD_STALE_TIME_MS,
  });
};

// ─── useSendAtRiskNudge ──────────────────────────────────────────────────────

export const useSendAtRiskNudge = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      studentId,
      message,
    }: {
      studentId: string;
      message: string;
    }) => {
      const { error } = await supabase.from("notifications").insert({
        user_id: studentId,
        type: "nudge",
        title: "At-Risk Alert: Your teacher wants to help",
        body: message,
        is_read: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.atRiskPredictions.lists(),
      });
    },
  });
};
