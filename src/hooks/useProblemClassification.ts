// =============================================================================
// useProblemClassification — 8.9 decision-intelligence engine (client hook)
// =============================================================================
// Calls `classify_problem_cases_v1(course_id)` which deterministically
// classifies each CLO into typed problem cases (student-signal,
// teacher-signal, assessment-signal, prerequisite-signal,
// curriculum-design-signal) with confidence scores and cited evidence.
// Pure SQL — no AI in the classification itself.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface ProblemCase {
  clo_id: string;
  clo_title: string;
  blooms_level: string | null;
  course_avg: number;
  students_assessed: number;
  problem_types: string[];
  dominant_cause: string;
  confidence: number;
  evidence: Array<Record<string, unknown>>;
  struggling_students: Array<{
    student_id: string;
    attainment: number;
  }> | null;
}

export interface ClassificationResult {
  course_id: string;
  course_avg: number;
  section_spread: number;
  cases: ProblemCase[];
  classified_at: string;
}

export const useProblemClassification = (courseId: string | undefined) => {
  return useQuery({
    queryKey: ["problem-classification", courseId],
    queryFn: async (): Promise<ClassificationResult> => {
      if (!courseId) {
        return {
          course_id: "",
          course_avg: 0,
          section_spread: 0,
          cases: [],
          classified_at: "",
        };
      }
      const { data, error } = await supabase.rpc("classify_problem_cases_v1", {
        p_course_id: courseId,
      });
      if (error) throw error;
      return (data ?? {
        course_id: courseId,
        course_avg: 0,
        section_spread: 0,
        cases: [],
        classified_at: "",
      }) as unknown as ClassificationResult;
    },
    enabled: !!courseId,
    staleTime: 60_000,
  });
};
