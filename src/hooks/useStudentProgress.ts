// =============================================================================
// useStudentProgress — per-course attainment summary for the My Progress page
//
// Relocated from the in-page `useStudentProgress` hook in
// `StudentProgressPage.tsx`. Aggregates the student's active enrollments,
// per-course `outcome_attainment`, and per-course CLO counts into a single
// `ProgressSummary`, batching the underlying queries (no per-course N+1).
//
// Keeps all Supabase access in `src/hooks/` and uses the project's standard
// TanStack Query conventions (query keys + typed responses).
//
// _Requirements: 25.1, 25.2, 25.3, 25.3a, 25.4_
// =============================================================================

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CourseProgress {
  course_id: string;
  course_name: string;
  course_code: string;
  attainment_percent: number;
  clo_count: number;
  evidence_count: number;
}

export interface ProgressSummary {
  totalCourses: number;
  averageAttainment: number;
  excellentCount: number;
  satisfactoryCount: number;
  developingCount: number;
  notYetCount: number;
  perCourse: CourseProgress[];
}

const emptySummary = (): ProgressSummary => ({
  totalCourses: 0,
  averageAttainment: 0,
  excellentCount: 0,
  satisfactoryCount: 0,
  developingCount: 0,
  notYetCount: 0,
  perCourse: [],
});

// ─── useStudentProgress ───────────────────────────────────────────────────────

export const useStudentProgress = (studentId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.outcomeAttainment.list({ studentId, view: "progress" }),
    queryFn: async (): Promise<ProgressSummary> => {
      if (!studentId) return emptySummary();

      // Enrolled courses with course details.
      const { data: enrollments, error: enrollErr } = await supabase
        .from("student_courses")
        .select(`course_id, courses!inner(id, name, code)`)
        .eq("student_id", studentId)
        .eq("status", "active");

      if (enrollErr) throw enrollErr;
      const enrollmentRows = enrollments ?? [];
      if (enrollmentRows.length === 0) return emptySummary();

      const courseIds = enrollmentRows.map((e) => e.course_id);

      // Per-course attainment in one query.
      const { data: attainment } = await supabase
        .from("outcome_attainment")
        .select("course_id, attainment_percent, sample_count")
        .eq("student_id", studentId)
        .in("course_id", courseIds)
        .eq("scope", "student_course");

      const courseAttainmentMap = new Map<
        string,
        { sum: number; count: number; samples: number }
      >();
      for (const row of attainment ?? []) {
        if (!row.course_id) continue;
        const cur = courseAttainmentMap.get(row.course_id) ?? {
          sum: 0,
          count: 0,
          samples: 0,
        };
        cur.sum += row.attainment_percent;
        cur.count += 1;
        cur.samples += row.sample_count ?? 0;
        courseAttainmentMap.set(row.course_id, cur);
      }

      // Count CLOs per course.
      const { data: clos } = await supabase
        .from("learning_outcomes")
        .select("course_id")
        .in("course_id", courseIds)
        .eq("type", "CLO");

      const cloCountMap = new Map<string, number>();
      for (const row of clos ?? []) {
        if (!row.course_id) continue;
        cloCountMap.set(
          row.course_id,
          (cloCountMap.get(row.course_id) ?? 0) + 1
        );
      }

      const perCourse: CourseProgress[] = enrollmentRows.map((e) => {
        const course = e.courses;
        const att = courseAttainmentMap.get(course.id);
        const avg = att && att.count > 0 ? Math.round(att.sum / att.count) : 0;
        return {
          course_id: course.id,
          course_name: course.name,
          course_code: course.code,
          attainment_percent: avg,
          clo_count: cloCountMap.get(course.id) ?? 0,
          evidence_count: att?.samples ?? 0,
        };
      });

      const totalCourses = perCourse.length;
      const averageAttainment =
        totalCourses > 0
          ? Math.round(
              perCourse.reduce((s, c) => s + c.attainment_percent, 0) /
                totalCourses
            )
          : 0;
      const excellentCount = perCourse.filter(
        (c) => c.attainment_percent >= 85
      ).length;
      const satisfactoryCount = perCourse.filter(
        (c) => c.attainment_percent >= 70 && c.attainment_percent < 85
      ).length;
      const developingCount = perCourse.filter(
        (c) => c.attainment_percent >= 50 && c.attainment_percent < 70
      ).length;
      const notYetCount = perCourse.filter(
        (c) => c.attainment_percent < 50
      ).length;

      return {
        totalCourses,
        averageAttainment,
        excellentCount,
        satisfactoryCount,
        developingCount,
        notYetCount,
        perCourse,
      };
    },
    enabled: !!studentId,
    staleTime: 60_000,
  });
};
