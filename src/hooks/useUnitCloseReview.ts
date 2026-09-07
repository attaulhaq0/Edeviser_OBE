// =============================================================================
// useUnitCloseReview — coordinator Unit-Close attainment review (task 7.7)
// =============================================================================
// Section × CLO attainment matrix + coverage flags + weakest-CLO ordering.
// Server truth: `get_unit_close_review_v1(course_id)` (invoker-rights — the
// caller's RLS scopes every row). One call returns the full journey payload.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface UnitCloseCLO {
  clo_id: string;
  clo_title: string;
  blooms_level: string | null;
  course_avg: number | null;
  total_below_target: number | null;
  sections_with_data: number | null;
  has_assessment: boolean;
}

export interface UnitCloseSection {
  section_id: string;
  section_code: string;
  teacher_name: string | null;
}

export interface UnitCloseMatrixEntry {
  clo_id: string;
  section_id: string;
  avg_attainment: number;
  student_count: number;
  below_target: number;
}

export interface UnitCloseReviewPayload {
  course_id: string;
  clos: UnitCloseCLO[];
  sections: UnitCloseSection[];
  matrix: UnitCloseMatrixEntry[];
}

export const useUnitCloseReview = (courseId: string | undefined) => {
  return useQuery({
    queryKey: ["unit-close-review", courseId],
    queryFn: async (): Promise<UnitCloseReviewPayload> => {
      if (!courseId) {
        return { course_id: "", clos: [], sections: [], matrix: [] };
      }
      const { data, error } = await supabase.rpc("get_unit_close_review_v1", {
        p_course_id: courseId,
      });
      if (error) throw error;
      return (data ?? {
        course_id: courseId,
        clos: [],
        sections: [],
        matrix: [],
      }) as unknown as UnitCloseReviewPayload;
    },
    enabled: !!courseId,
    staleTime: 60_000,
  });
};
