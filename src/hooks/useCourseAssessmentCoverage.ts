// =============================================================================
// useCourseAssessmentCoverage — authoring-time coverage guard (task 7.3b)
// =============================================================================
// Per-CLO assessment coverage for one course, across BOTH assessment sources
// (assignments.clo_weights and quizzes.quiz_clos/clo_ids). Server truth lives
// in `get_course_assessment_coverage_v1` (invoker-rights — the caller's RLS
// scopes every row). Consumed by the authoring forms' warning banners,
// coordinator gap analysis, and the blueprint builder (8.12).

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface CourseAssessmentCoverageRow {
  clo_id: string;
  clo_title: string;
  blooms_level: string | null;
  assignment_count: number;
  quiz_count: number;
  covered: boolean;
}

export const selectUncoveredCLOs = (
  rows: CourseAssessmentCoverageRow[] | undefined
): CourseAssessmentCoverageRow[] => (rows ?? []).filter((row) => !row.covered);

export const useCourseAssessmentCoverage = (courseId: string | undefined) => {
  return useQuery({
    // Raw key: this coverage view is new (7.3b) and not yet in the shared
    // queryKeys registry; migrate the key when the registry is next touched.
    queryKey: ["course-assessment-coverage", courseId],
    queryFn: async (): Promise<CourseAssessmentCoverageRow[]> => {
      if (!courseId) return [];
      const { data, error } = await supabase.rpc(
        "get_course_assessment_coverage_v1",
        { p_course_id: courseId }
      );
      if (error) throw error;
      return (data ?? []) as CourseAssessmentCoverageRow[];
    },
    enabled: !!courseId,
    staleTime: 60_000,
  });
};
