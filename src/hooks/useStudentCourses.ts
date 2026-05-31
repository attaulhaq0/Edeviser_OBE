import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import {
  buildCourseCards,
  type CourseCardAssignmentRow,
  type CourseCardAttainmentRow,
  type CourseCardEnrollment,
  type EnrolledCourseCard,
} from "@/lib/studentCourseCards";

export type { EnrolledCourseCard } from "@/lib/studentCourseCards";

/** Shape of the embedded `courses` row returned by the enrollment select. */
interface EnrollmentCourseJoin {
  id: string;
  name: string;
  code: string;
  color: string | null;
  teacher: { full_name: string | null } | null;
}

/**
 * Single-batch data-access hook for the student "My Courses" surface.
 *
 * Relocated from the in-page `useStudentEnrolledCourses` in
 * `StudentCoursesPage.tsx`. Returns everything a course card needs — progress,
 * next assignment + due date, course color, attainment, and assignment count —
 * using a fixed number of batched queries regardless of how many courses the
 * student is enrolled in (no per-card N+1). Rows are merged in memory by the
 * pure {@link buildCourseCards} helper.
 *
 * Satisfies Requirements 9.1, 9.2, 9.2a, 9.4, 9.5.
 */
export const useStudentCourses = (studentId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.enrollments.list({ studentId, view: "cards" }),
    queryFn: async (): Promise<EnrolledCourseCard[]> => {
      if (!studentId) return [];

      // Phase 1: enrollments with course identity (color, teacher) in one query.
      const { data: enrollmentRows, error: enrollmentError } = await supabase
        .from("student_courses")
        .select(
          `course_id,
           courses!inner(
             id,
             name,
             code,
             color,
             teacher:profiles!courses_teacher_id_fkey(full_name)
           )`
        )
        .eq("student_id", studentId)
        .eq("status", "active");

      if (enrollmentError) throw enrollmentError;
      if (!enrollmentRows || enrollmentRows.length === 0) return [];

      const enrollments: CourseCardEnrollment[] = enrollmentRows.map((row) => {
        const course = row.courses as unknown as EnrollmentCourseJoin;
        return {
          course_id: row.course_id,
          course: {
            id: course.id,
            name: course.name,
            code: course.code,
            color: course.color,
            teacher_name: course.teacher?.full_name ?? null,
          },
        };
      });

      const courseIds = enrollments.map((e) => e.course_id);

      // Phase 2: attainment and assignments for all courses, batched in parallel.
      const [attainmentResult, assignmentResult] = await Promise.all([
        supabase
          .from("outcome_attainment")
          .select("course_id, attainment_percent")
          .eq("student_id", studentId)
          .in("course_id", courseIds)
          .eq("scope", "student_course"),
        supabase
          .from("assignments")
          .select("id, course_id, title, due_date")
          .in("course_id", courseIds),
      ]);

      if (attainmentResult.error) throw attainmentResult.error;
      if (assignmentResult.error) throw assignmentResult.error;

      const attainmentRows: CourseCardAttainmentRow[] =
        attainmentResult.data ?? [];
      const assignmentRows: CourseCardAssignmentRow[] =
        assignmentResult.data ?? [];

      // Phase 3: completed (graded) submissions scoped to these assignments only,
      // so progress reflects real completion without an unbounded fetch.
      const assignmentIds = assignmentRows.map((a) => a.id);
      const completedAssignmentIds = new Set<string>();

      if (assignmentIds.length > 0) {
        const { data: submissionRows, error: submissionError } = await supabase
          .from("submissions")
          .select("assignment_id")
          .eq("student_id", studentId)
          .eq("status", "graded")
          .in("assignment_id", assignmentIds);

        if (submissionError) throw submissionError;
        for (const row of submissionRows ?? []) {
          completedAssignmentIds.add(row.assignment_id);
        }
      }

      return buildCourseCards({
        enrollments,
        attainmentRows,
        assignmentRows,
        completedAssignmentIds,
        now: new Date(),
      });
    },
    enabled: !!studentId,
    staleTime: 60_000,
  });
};
