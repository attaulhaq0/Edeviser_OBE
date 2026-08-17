import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/hooks/useAuth";
import { DASHBOARD_STALE_TIME_MS } from "@/lib/queryConfig";
import { queryKeys } from "@/lib/queryKeys";
import { supabase } from "@/lib/supabase";

export interface ContributingSignals {
  login_frequency: "low" | "medium" | "high";
  submission_pattern: "early" | "on_time" | "late" | "missed";
  attainment_trend: "improving" | "declining" | "stagnant";
}

export interface ProactiveContributingEvidence {
  key: string;
  observedValue: string | number;
  threshold: string;
  source: string;
}

export interface AtRiskPredictionData {
  status:
    | "pending_approval"
    | "executing"
    | "approved"
    | "outcome_evaluated"
    | "legacy";
  proposal_audit_id: string | null;
  clo_id: string;
  clo_title: string;
  calculation_version: string;
  trigger_version: string;
  contributing_evidence: ProactiveContributingEvidence[];
  recommended_next_action: string;
  intervention_draft: string;
  triggered_at: string;
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

const objectValue = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const stringValue = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback;

const legacyEvidence = (
  suggestionData: Record<string, unknown>
): ProactiveContributingEvidence[] => {
  const signals = objectValue(suggestionData.contributing_signals);
  if (!signals) return [];

  return Object.entries(signals).map(([key, observedValue]) => ({
    key,
    observedValue:
      typeof observedValue === "number" || typeof observedValue === "string"
        ? observedValue
        : "unavailable",
    threshold: "Legacy record - trigger version was not stored",
    source: "legacy_at_risk_prediction",
  }));
};

const parseEvidence = (value: unknown): ProactiveContributingEvidence[] => {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const row = objectValue(entry);
    if (!row) return [];
    const observedValue = row.observedValue;
    if (
      typeof observedValue !== "string" &&
      typeof observedValue !== "number"
    ) {
      return [];
    }
    return [
      {
        key: stringValue(row.key, "evidence"),
        observedValue,
        threshold: stringValue(row.threshold, "Documented trigger threshold"),
        source: stringValue(row.source, "platform evidence"),
      },
    ];
  });
};

const parseSuggestionData = (
  value: unknown,
  createdAt: string
): AtRiskPredictionData => {
  const row = objectValue(value) ?? {};
  const trigger = objectValue(row.trigger);
  const status = row.status;
  const parsedStatus =
    status === "pending_approval" ||
    status === "executing" ||
    status === "approved" ||
    status === "outcome_evaluated"
      ? status
      : "legacy";
  const evidence = parseEvidence(row.contributing_evidence);

  return {
    status: parsedStatus,
    proposal_audit_id:
      typeof row.proposal_audit_id === "string" ? row.proposal_audit_id : null,
    clo_id: stringValue(row.clo_id, stringValue(row.at_risk_clo_id)),
    clo_title: stringValue(
      row.clo_title,
      stringValue(row.at_risk_clo_title, "Course outcome")
    ),
    calculation_version: stringValue(
      row.calculation_version,
      "legacy/unversioned"
    ),
    trigger_version: stringValue(row.trigger_version, "legacy/unversioned"),
    contributing_evidence: evidence.length > 0 ? evidence : legacyEvidence(row),
    recommended_next_action: stringValue(
      row.recommended_next_action,
      "Review the available course evidence before choosing an intervention."
    ),
    intervention_draft: stringValue(
      row.intervention_draft,
      "Complete a short focused review, then answer one diagnostic question."
    ),
    triggered_at: stringValue(trigger?.triggeredAt, createdAt),
  };
};

export const useAtRiskPredictions = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.atRiskPredictions.list({ teacherId: user?.id }),
    queryFn: async (): Promise<AIAtRiskPrediction[]> => {
      const teacherId = user?.id;
      if (!teacherId) return [];

      const { data: courses, error: coursesError } = await supabase
        .from("courses")
        .select("id")
        .eq("teacher_id", teacherId)
        .eq("is_active", true);
      if (coursesError) throw coursesError;

      const courseIds = (courses ?? []).map((course) => course.id);
      if (courseIds.length === 0) return [];

      const { data: enrollments, error: enrollmentError } = await supabase
        .from("student_courses")
        .select("student_id")
        .in("course_id", courseIds)
        .eq("status", "active");
      if (enrollmentError) throw enrollmentError;

      const studentIds = [
        ...new Set(
          (enrollments ?? []).map((enrollment) => enrollment.student_id)
        ),
      ];
      if (studentIds.length === 0) return [];

      const { data: predictions, error: predictionError } = await supabase
        .from("ai_feedback")
        .select(
          "id,student_id,suggestion_type,suggestion_text,suggestion_data,validated_outcome,created_at"
        )
        .eq("suggestion_type", "at_risk_prediction")
        .in("student_id", studentIds)
        .is("validated_outcome", null)
        .order("created_at", { ascending: false });
      if (predictionError) throw predictionError;
      if (!predictions?.length) return [];

      const predictionStudentIds = [
        ...new Set(predictions.map((prediction) => prediction.student_id)),
      ];
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id,full_name")
        .in("id", predictionStudentIds);
      if (profileError) throw profileError;

      const nameById = new Map(
        (profiles ?? []).map((profile) => [profile.id, profile.full_name])
      );

      return predictions
        .map((prediction) => ({
          id: prediction.id,
          student_id: prediction.student_id,
          student_name:
            nameById.get(prediction.student_id) ?? "Unknown student",
          suggestion_type: prediction.suggestion_type,
          suggestion_text: prediction.suggestion_text ?? "",
          suggestion_data: parseSuggestionData(
            prediction.suggestion_data,
            prediction.created_at
          ),
          validated_outcome: prediction.validated_outcome as
            | "correct"
            | "incorrect"
            | null,
          created_at: prediction.created_at,
        }))
        .filter(
          (prediction) =>
            prediction.suggestion_data.status === "pending_approval" ||
            prediction.suggestion_data.status === "legacy"
        );
    },
    enabled: Boolean(user?.id),
    staleTime: DASHBOARD_STALE_TIME_MS,
  });
};
