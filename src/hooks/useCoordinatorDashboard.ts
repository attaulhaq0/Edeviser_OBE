import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { DASHBOARD_STALE_TIME_MS } from "@/lib/queryConfig";

export interface CoordinatorKPIData {
  totalPLOs: number;
  totalCourses: number;
  cloCoveragePercent: number;
  /**
   * Mean attainment across all `student_course`-scope `outcome_attainment` rows
   * (C-2 — real attainment, replaces the prior active-student placeholder).
   * 0 when no attainment evidence exists yet.
   */
  avgAttainmentPercent: number;
  /**
   * Distinct students whose mean attainment falls below the at-risk threshold
   * (<50%, the "Not Yet" band). Derived from real `outcome_attainment` rows
   * (C-2 — replaces the active-student count placeholder).
   */
  atRiskStudents: number;
  teacherCompliancePercent: number;
}

export interface CoordinatorWorkspaceData {
  assignedPrograms: number;
  courseCount: number;
  ploCount: number;
  targetAttainment: number;
  belowTargetCount: number;
  ploAttainment: Array<{
    id: string;
    title: string;
    program: string;
    attainment: number | null;
    evidenceCount: number;
    belowTarget: boolean;
  }>;
  coverage: {
    totalClos: number;
    mappedClos: number;
    coveragePercent: number;
    status: "complete" | "gaps" | "insufficientEvidence";
  };
  cqi: {
    planned: number;
    inProgress: number;
    evaluated: number;
    total: number;
    closed: number;
  };
  accreditation: {
    configurations: number;
    approvedStages: number;
    pendingStages: number;
    reportJobs: number;
    generatedReports: number;
  };
  teacherCompliance: {
    courses: number;
    coursesWithClo: number;
    percent: number;
  };
  calculatedAt: string;
}

/** At-risk threshold: students whose mean attainment is below this are flagged. */
const AT_RISK_THRESHOLD = 50;

const mean = (values: number[]): number =>
  values.length === 0
    ? 0
    : values.reduce((sum, v) => sum + v, 0) / values.length;

export const useCoordinatorKPIs = (options?: {
  enabled?: boolean;
  institutionId?: string | null;
}) => {
  const institutionId = options?.institutionId ?? null;

  return useQuery({
    queryKey: queryKeys.coordinatorDashboard.list({ institutionId }),
    queryFn: async (): Promise<CoordinatorKPIData> => {
      // 1. Total PLOs
      let ploCountQuery = supabase
        .from("learning_outcomes")
        .select("*", { count: "exact", head: true })
        .eq("type", "PLO");
      if (institutionId) {
        ploCountQuery = ploCountQuery.eq("institution_id", institutionId);
      }
      const { count: totalPLOs } = await ploCountQuery;

      // 2. Total Courses
      let courseCountQuery = supabase
        .from("courses")
        .select("*", { count: "exact", head: true });
      if (institutionId) {
        const { data: scopedPrograms, error: programsError } = await supabase
          .from("programs")
          .select("id")
          .eq("institution_id", institutionId);
        if (programsError) throw programsError;
        const programIds = (scopedPrograms ?? []).map((program) => program.id);
        courseCountQuery = programIds.length
          ? courseCountQuery.in("program_id", programIds)
          : courseCountQuery.eq(
              "program_id",
              "00000000-0000-0000-0000-000000000000"
            );
      }
      const { count: totalCourses } = await courseCountQuery;

      // 3. CLO Coverage: % of PLOs that have at least one CLO mapped via outcome_mappings
      let cloCoveragePercent = 0;
      const ploCount = totalPLOs ?? 0;

      if (ploCount > 0) {
        let ploIdsQuery = supabase
          .from("learning_outcomes")
          .select("id")
          .eq("type", "PLO");
        if (institutionId) {
          ploIdsQuery = ploIdsQuery.eq("institution_id", institutionId);
        }

        const { data: scopedPloIds, error: ploIdsError } = await ploIdsQuery;
        if (ploIdsError) throw ploIdsError;
        const typedPloIds = scopedPloIds ?? [];

        if (typedPloIds.length > 0) {
          const { data: mappings, error: mappingsError } = await supabase
            .from("outcome_mappings")
            .select("source_outcome_id")
            .in(
              "source_outcome_id",
              typedPloIds.map((p) => p.id)
            );

          if (mappingsError) throw mappingsError;
          const typedMappings = mappings ?? [];
          const coveredPLOs = new Set(
            typedMappings.map((m) => m.source_outcome_id)
          );
          cloCoveragePercent = Math.round((coveredPLOs.size / ploCount) * 100);
        }
      }

      // 4. Real attainment metrics (C-2): mean attainment + at-risk student count
      //    derived from `outcome_attainment` at `student_course` scope, mirroring
      //    the `useDepartmentAnalytics` aggregation over `attainment_percent`.
      let attainmentQuery = supabase
        .from("outcome_attainment")
        .select("student_id, attainment_percent")
        .eq("scope", "student_course");
      if (institutionId) {
        const { data: scopedOutcomeIds, error: outcomeIdsError } =
          await supabase
            .from("learning_outcomes")
            .select("id")
            .in("type", ["PLO", "CLO"])
            .eq("institution_id", institutionId);
        if (outcomeIdsError) throw outcomeIdsError;
        const outcomeIds = (scopedOutcomeIds ?? []).map((row) => row.id);
        attainmentQuery = outcomeIds.length
          ? attainmentQuery.in("outcome_id", outcomeIds)
          : attainmentQuery.eq(
              "outcome_id",
              "00000000-0000-0000-0000-000000000000"
            );
      }
      const { data: attainmentRows, error: attainmentError } =
        await attainmentQuery;

      if (attainmentError) throw attainmentError;

      const allScores: number[] = [];
      const scoresByStudent = new Map<string, number[]>();
      for (const row of attainmentRows ?? []) {
        if (row.attainment_percent == null) continue;
        allScores.push(row.attainment_percent);
        if (row.student_id) {
          const list = scoresByStudent.get(row.student_id) ?? [];
          list.push(row.attainment_percent);
          scoresByStudent.set(row.student_id, list);
        }
      }

      const avgAttainmentPercent =
        allScores.length > 0 ? Math.round(mean(allScores)) : 0;

      let atRiskStudents = 0;
      for (const scores of scoresByStudent.values()) {
        if (mean(scores) < AT_RISK_THRESHOLD) atRiskStudents += 1;
      }

      // 5. Teacher Compliance Rate: % of courses with at least one CLO defined
      let teacherCompliancePercent = 0;
      const courseCount = totalCourses ?? 0;

      if (courseCount > 0) {
        let coursesWithCLOsQuery = supabase
          .from("learning_outcomes")
          .select("course_id")
          .eq("type", "CLO");
        if (institutionId) {
          coursesWithCLOsQuery = coursesWithCLOsQuery.eq(
            "institution_id",
            institutionId
          );
        }
        const { data: coursesWithCLOs, error: coursesWithCLOsError } =
          await coursesWithCLOsQuery;
        if (coursesWithCLOsError) throw coursesWithCLOsError;

        const typedCourseCLOs = coursesWithCLOs ?? [];
        const uniqueCourses = new Set(
          typedCourseCLOs.map((c) => c.course_id).filter(Boolean)
        );
        teacherCompliancePercent = Math.round(
          (uniqueCourses.size / courseCount) * 100
        );
      }

      return {
        totalPLOs: ploCount,
        totalCourses: courseCount,
        cloCoveragePercent,
        avgAttainmentPercent,
        atRiskStudents,
        teacherCompliancePercent,
      };
    },
    enabled: options?.enabled ?? true,
    staleTime: DASHBOARD_STALE_TIME_MS,
  });
};
