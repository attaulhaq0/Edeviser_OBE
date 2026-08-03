import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { supabase } from "@/lib/supabase";

export interface ParentCourseProgress {
  course_id: string;
  course_name: string;
  course_code: string;
  attainment_percent: number;
}

export const useParentChildProgress = (studentId: string | undefined) =>
  useQuery({
    queryKey: queryKeys.outcomeAttainment.list({
      studentId,
      view: "parent-progress",
    }),
    queryFn: async (): Promise<ParentCourseProgress[]> => {
      if (!studentId) return [];

      const { data: enrollments, error: enrollmentError } = await supabase
        .from("student_courses")
        .select("course_id, courses!inner(id, name, code)")
        .eq("student_id", studentId)
        .eq("status", "active");

      if (enrollmentError) throw enrollmentError;
      if (!enrollments || enrollments.length === 0) return [];

      const courseIds = enrollments.map((enrollment) => enrollment.course_id);
      const { data: attainment, error: attainmentError } = await supabase
        .from("outcome_attainment")
        .select("course_id, attainment_percent")
        .eq("student_id", studentId)
        .in("course_id", courseIds)
        .eq("scope", "student_course");

      if (attainmentError) throw attainmentError;

      const totals = new Map<string, { sum: number; count: number }>();
      for (const row of attainment ?? []) {
        if (!row.course_id) continue;
        const current = totals.get(row.course_id) ?? { sum: 0, count: 0 };
        current.sum += row.attainment_percent;
        current.count += 1;
        totals.set(row.course_id, current);
      }

      return enrollments.map((enrollment) => {
        const course = enrollment.courses as unknown as {
          id: string;
          name: string;
          code: string;
        };
        const aggregate = totals.get(course.id);
        return {
          course_id: course.id,
          course_name: course.name,
          course_code: course.code,
          attainment_percent:
            aggregate && aggregate.count > 0
              ? Math.round(aggregate.sum / aggregate.count)
              : 0,
        };
      });
    },
    enabled: !!studentId,
    staleTime: 60_000,
  });
