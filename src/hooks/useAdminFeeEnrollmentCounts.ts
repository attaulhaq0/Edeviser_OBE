import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/hooks/useAuth";
import { queryKeys } from "@/lib/queryKeys";
import { supabase } from "@/lib/supabase";

export interface AdminFeeEnrollmentCounts {
  byProgram: Record<string, number>;
}

interface EnrollmentRow {
  student_id: string;
  course_id: string;
}

interface CourseRow {
  id: string;
  program_id: string;
}

/**
 * Counts distinct active learners per programme for fee-denominator math.
 * The underlying reads are RLS-scoped to the signed-in admin's institution.
 */
export const useAdminFeeEnrollmentCounts = () => {
  const { institutionId } = useAuth();

  return useQuery({
    queryKey: queryKeys.enrollments.list({
      view: "adminFeeEnrollmentCounts",
      institutionId,
    }),
    enabled: !!institutionId,
    queryFn: async (): Promise<AdminFeeEnrollmentCounts> => {
      const { data: enrollmentData, error: enrollmentError } = await supabase
        .from("student_courses")
        .select("student_id, course_id")
        .neq("status", "dropped");

      if (enrollmentError) throw enrollmentError;

      const enrollments = (enrollmentData ?? []) as unknown as EnrollmentRow[];
      const courseIds = [...new Set(enrollments.map((row) => row.course_id))];
      if (courseIds.length === 0) return { byProgram: {} };

      const { data: courseData, error: courseError } = await supabase
        .from("courses")
        .select("id, program_id")
        .in("id", courseIds);

      if (courseError) throw courseError;

      const courses = (courseData ?? []) as unknown as CourseRow[];
      const programByCourse = new Map(
        courses.map((course) => [course.id, course.program_id])
      );
      const studentsByProgram = new Map<string, Set<string>>();

      for (const enrollment of enrollments) {
        const programId = programByCourse.get(enrollment.course_id);
        if (!programId) continue;
        const students = studentsByProgram.get(programId) ?? new Set<string>();
        students.add(enrollment.student_id);
        studentsByProgram.set(programId, students);
      }

      return {
        byProgram: Object.fromEntries(
          [...studentsByProgram.entries()].map(([programId, students]) => [
            programId,
            students.size,
          ])
        ),
      };
    },
  });
};
