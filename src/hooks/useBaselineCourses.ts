// =============================================================================
// useEnrolledCoursesWithBaseline — courses with an active baseline test
//
// Relocated from the in-page `useQuery` hook in `BaselineSelectStep.tsx`. For
// the student's active enrollments it resolves which courses have an active
// baseline-test config plus the per-course question count, returning only the
// courses that actually have baseline questions available.
//
// Keeps all Supabase access in `src/hooks/` and uses the project's standard
// TanStack Query conventions (query keys + typed responses).
//
// _Requirements: 25.1, 25.2, 25.3, 25.3a, 25.4_
// =============================================================================

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";

export interface CourseWithBaseline {
  course_id: string;
  course_name: string;
  time_limit_minutes: number;
  question_count: number;
}

export const useEnrolledCoursesWithBaseline = (studentId: string) => {
  return useQuery({
    queryKey: [...queryKeys.onboarding.baselineTests("enrolled"), studentId],
    queryFn: async (): Promise<CourseWithBaseline[]> => {
      // Student's enrolled courses (with course identity for labels).
      const { data: enrollments, error: enrollError } = await supabase
        .from("student_courses")
        .select("course_id, courses(id, name)")
        .eq("student_id", studentId)
        .eq("status", "active");

      if (enrollError) throw enrollError;
      const enrollmentRows = enrollments ?? [];
      if (enrollmentRows.length === 0) return [];

      const courseIds = enrollmentRows.map((e) => e.course_id);

      // Active baseline configs for those courses.
      const { data: configs, error: configError } = await supabase
        .from("baseline_test_config")
        .select("course_id, time_limit_minutes")
        .in("course_id", courseIds)
        .eq("is_active", true);

      if (configError) throw configError;
      if (!configs?.length) return [];

      // Question counts per course (active baseline questions only).
      const activeCourseIds = configs.map((c) => c.course_id);
      const { data: questions, error: qError } = await supabase
        .from("onboarding_questions")
        .select("course_id")
        .eq("assessment_type", "baseline")
        .eq("is_active", true)
        .in("course_id", activeCourseIds);

      if (qError) throw qError;

      const questionCounts = new Map<string, number>();
      for (const q of questions ?? []) {
        const cid = q.course_id;
        if (!cid) continue;
        questionCounts.set(cid, (questionCounts.get(cid) ?? 0) + 1);
      }

      // Course id → name map for labels.
      const courseMap = new Map<string, string>();
      for (const e of enrollmentRows) {
        if (e.courses) {
          courseMap.set(e.course_id, e.courses.name ?? "Unknown Course");
        }
      }

      return configs
        .filter((c) => questionCounts.has(c.course_id))
        .map((c) => ({
          course_id: c.course_id,
          course_name: courseMap.get(c.course_id) ?? "Unknown Course",
          time_limit_minutes: c.time_limit_minutes ?? 15,
          question_count: questionCounts.get(c.course_id) ?? 0,
        }));
    },
    enabled: !!studentId,
  });
};
