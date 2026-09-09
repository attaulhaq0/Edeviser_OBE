import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface AssessmentBlueprint {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  assessmentModel: string;
  status: "draft" | "proposed" | "approved" | "active" | "archived";
  createdAt: string;
  updatedAt: string;
}

export interface BlueprintCoverage {
  blueprintId: string;
  totalCLOs: number;
  coveredCLOs: number;
  unassessedCLOs: Array<{ id: string; title: string }>;
  underAssessedCLOs: Array<{ id: string; title: string; weight: number }>;
  overAssessedCLOs: Array<{ id: string; title: string; weight: number }>;
  coverageMatrix: Record<string, { title: string; slots: number; weight: number }>;
  totalWeight: number;
  computedAt: string;
}

/** Lists blueprints for a course (teacher/coordinator scoped). */
export const useCourseBlueprints = (courseId: string | undefined) =>
  useQuery({
    queryKey: ["blueprints", courseId] as const,
    enabled: !!courseId,
    queryFn: async (): Promise<AssessmentBlueprint[]> => {
      const { data, error } = await supabase
        .from("assessment_blueprints")
        .select("id, course_id, title, description, assessment_model, status, created_at, updated_at")
        .eq("course_id", courseId as string)
        .order("created_at", { ascending: false });
      if (error) throw error;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data ?? []).map((b: any) => ({
        id: b.id,
        courseId: b.course_id,
        title: b.title,
        description: b.description,
        assessmentModel: b.assessment_model,
        status: b.status,
        createdAt: b.created_at,
        updatedAt: b.updated_at,
      }));
    },
  });

/** Computes the coverage matrix for a blueprint (deterministic, no AI). */
export const useBlueprintCoverage = (blueprintId: string | undefined) =>
  useQuery({
    queryKey: ["blueprint-coverage", blueprintId] as const,
    enabled: !!blueprintId,
    queryFn: async (): Promise<BlueprintCoverage> => {
      const { data, error } = await supabase.rpc(
        "compute_blueprint_coverage" as never,
        { p_blueprint_id: blueprintId } as never
      );
      if (error) throw error;
      return (data ?? {}) as unknown as BlueprintCoverage;
    },
  });

export default useCourseBlueprints;
