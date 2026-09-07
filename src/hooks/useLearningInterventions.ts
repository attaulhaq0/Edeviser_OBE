// =============================================================================
// useLearningInterventions — 7.4(d) intervention lifecycle surface (coordinator)
// =============================================================================
// Reads `learning_interventions` directly through the caller's RLS (the table's
// SELECT policy already scopes subject/teacher/coordinator/admin). Read-only:
// lifecycle transitions are owned by the intervention generation/evaluation
// machinery — this surface never writes.
// Course-scoped when a courseId is provided (the Unit-Close view), otherwise
// the coordinator sees every intervention their RLS grants.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export type InterventionStatus =
  | "draft"
  | "proposed"
  | "approved"
  | "active"
  | "completed"
  | "cancelled";

export interface LearningInterventionRow {
  id: string;
  student_id: string;
  course_id: string | null;
  intervention_type: string;
  payload: Record<string, unknown>;
  source: string;
  status: InterventionStatus;
  proposal_id: string | null;
  created_by: string | null;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
  /** Joined student display name (profiles via the student_id FK). */
  student_name: string | null;
}

const STATUSES: readonly InterventionStatus[] = [
  "draft",
  "proposed",
  "approved",
  "active",
  "completed",
  "cancelled",
];

const isKnownStatus = (value: unknown): value is InterventionStatus =>
  typeof value === "string" && (STATUSES as readonly string[]).includes(value);

// Prototype-chain-safe row mapper: every field is guarded before it reaches
// the UI (the table rows come from PostgREST, but the mapper stays defensive).
const mapRow = (
  row: Record<string, unknown>
): LearningInterventionRow | null => {
  if (typeof row.id !== "string" || typeof row.student_id !== "string") {
    return null;
  }
  const profiles = row.profiles;
  const studentName =
    profiles !== null &&
    typeof profiles === "object" &&
    !Array.isArray(profiles) &&
    typeof (profiles as Record<string, unknown>).full_name === "string"
      ? ((profiles as Record<string, unknown>).full_name as string)
      : null;
  return {
    id: row.id,
    student_id: row.student_id,
    course_id: typeof row.course_id === "string" ? row.course_id : null,
    intervention_type:
      typeof row.intervention_type === "string" ? row.intervention_type : "",
    payload:
      row.payload !== null &&
      typeof row.payload === "object" &&
      !Array.isArray(row.payload)
        ? (row.payload as Record<string, unknown>)
        : {},
    source: typeof row.source === "string" ? row.source : "agent",
    status: isKnownStatus(row.status) ? row.status : "proposed",
    proposal_id: typeof row.proposal_id === "string" ? row.proposal_id : null,
    created_by: typeof row.created_by === "string" ? row.created_by : null,
    approved_by: typeof row.approved_by === "string" ? row.approved_by : null,
    created_at: typeof row.created_at === "string" ? row.created_at : "",
    updated_at: typeof row.updated_at === "string" ? row.updated_at : "",
    student_name: studentName,
  };
};

export const useLearningInterventions = (courseId?: string) => {
  return useQuery({
    queryKey: ["learning-interventions", courseId ?? "all"],
    queryFn: async (): Promise<LearningInterventionRow[]> => {
      let query = supabase
        .from("learning_interventions")
        .select("*, profiles!learning_interventions_student_id_fkey(full_name)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (courseId) {
        query = query.eq("course_id", courseId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? [])
        .map((row) => mapRow(row as Record<string, unknown>))
        .filter((row): row is LearningInterventionRow => row !== null);
    },
    staleTime: 30_000,
  });
};
