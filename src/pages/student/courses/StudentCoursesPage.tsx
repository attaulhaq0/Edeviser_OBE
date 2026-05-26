import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Shimmer from "@/components/shared/Shimmer";
import { NoCourses } from "@/components/shared/EmptyState";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";

interface EnrolledCourse {
  id: string;
  name: string;
  code: string;
  teacher_name: string | null;
  attainment_percent: number | null;
  assignments_count: number;
}

const useStudentEnrolledCourses = (studentId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.enrollments.list({ studentId, view: "list" }),
    queryFn: async (): Promise<EnrolledCourse[]> => {
      if (!studentId) return [];

      // 1. Fetch enrollments with course data and teacher name
      const { data: enrollments, error } = await supabase
        .from("student_courses")
        .select(
          `course_id,
           courses!inner(
             id,
             name,
             code,
             teacher:profiles!courses_teacher_id_fkey(full_name)
           )`
        )
        .eq("student_id", studentId)
        .eq("status", "active");

      if (error) throw error;
      if (!enrollments || enrollments.length === 0) return [];

      const courseIds = enrollments.map((e) => e.course_id);

      // 2. Fetch attainment per course (course-scoped average) in one query
      const { data: attainmentRows } = await supabase
        .from("outcome_attainment")
        .select("course_id, attainment_percent")
        .eq("student_id", studentId)
        .in("course_id", courseIds)
        .eq("scope", "student_course");

      // 3. Count assignments per course in one query
      const { data: assignmentRows } = await supabase
        .from("assignments")
        .select("course_id")
        .in("course_id", courseIds);

      // Aggregate
      const attainmentMap = new Map<string, number[]>();
      for (const row of attainmentRows ?? []) {
        if (!row.course_id) continue;
        const arr = attainmentMap.get(row.course_id) ?? [];
        arr.push(row.attainment_percent);
        attainmentMap.set(row.course_id, arr);
      }

      const assignmentCountMap = new Map<string, number>();
      for (const row of assignmentRows ?? []) {
        if (!row.course_id) continue;
        assignmentCountMap.set(
          row.course_id,
          (assignmentCountMap.get(row.course_id) ?? 0) + 1
        );
      }

      return enrollments.map((e) => {
        const course = e.courses as unknown as {
          id: string;
          name: string;
          code: string;
          teacher: { full_name: string | null } | null;
        };
        const attainmentVals = attainmentMap.get(course.id) ?? [];
        const avgAttainment =
          attainmentVals.length > 0
            ? Math.round(
                attainmentVals.reduce((s, v) => s + v, 0) /
                  attainmentVals.length
              )
            : null;
        return {
          id: course.id,
          name: course.name,
          code: course.code,
          teacher_name: course.teacher?.full_name ?? null,
          attainment_percent: avgAttainment,
          assignments_count: assignmentCountMap.get(course.id) ?? 0,
        };
      });
    },
    enabled: !!studentId,
    staleTime: 60_000,
  });
};

const attainmentBadgeColor = (percent: number | null) => {
  if (percent === null) return "bg-gray-100 text-gray-600";
  if (percent >= 85) return "bg-green-50 text-green-700";
  if (percent >= 70) return "bg-blue-50 text-blue-700";
  if (percent >= 50) return "bg-yellow-50 text-yellow-700";
  return "bg-red-50 text-red-700";
};

const StudentCoursesPage = () => {
  const { t } = useTranslation("student");
  const { user } = useAuth();
  const { data: courses, isLoading } = useStudentEnrolledCourses(user?.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t("courses.title", "My Courses")}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {t(
            "courses.subtitle",
            "View your enrolled courses, progress, and assignments."
          )}
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Shimmer className="h-40 rounded-xl" />
          <Shimmer className="h-40 rounded-xl" />
          <Shimmer className="h-40 rounded-xl" />
        </div>
      ) : !courses || courses.length === 0 ? (
        <NoCourses />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((course) => (
            <Link
              key={course.id}
              to={`/student/courses/${course.id}`}
              className="group focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-xl"
            >
              <Card className="bg-white border-0 shadow-md rounded-xl p-5 h-full hover:shadow-lg transition-shadow group-hover:border-blue-200">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge
                        variant="outline"
                        className="text-[10px] font-bold tracking-wider uppercase"
                      >
                        {course.code}
                      </Badge>
                    </div>
                    <h2 className="text-base font-semibold tracking-tight text-gray-900 dark:text-foreground line-clamp-2">
                      {course.name}
                    </h2>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-500 transition-colors flex-shrink-0 rtl:rotate-180" />
                </div>

                {course.teacher_name && (
                  <p className="text-xs text-gray-500 mb-4">
                    {t("courses.taughtBy", "Taught by")} {course.teacher_name}
                  </p>
                )}

                <div className="flex items-center justify-between gap-4 pt-3 border-t border-gray-100">
                  <div>
                    <p className="text-[10px] font-bold tracking-widest uppercase text-gray-500 mb-1">
                      {t("courses.attainment", "Attainment")}
                    </p>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-sm font-semibold ${attainmentBadgeColor(
                        course.attainment_percent
                      )}`}
                    >
                      {course.attainment_percent !== null
                        ? `${course.attainment_percent}%`
                        : "—"}
                    </span>
                  </div>
                  <div className="text-end">
                    <p className="text-[10px] font-bold tracking-widest uppercase text-gray-500 mb-1">
                      {t("courses.assignments", "Assignments")}
                    </p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-foreground">
                      {course.assignments_count}
                    </p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentCoursesPage;
