import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FlaskConical, ChevronRight, Settings } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Shimmer from "@/components/shared/Shimmer";
import { NoCourses } from "@/components/shared/EmptyState";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";

interface CourseWithBaseline {
  id: string;
  name: string;
  code: string;
  has_baseline_config: boolean;
  attainment_count: number;
}

const useTeacherCoursesWithBaseline = (teacherId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.courses.list({ teacherId, view: "baseline" }),
    queryFn: async (): Promise<CourseWithBaseline[]> => {
      if (!teacherId) return [];

      const { data: courses } = await supabase
        .from("courses")
        .select("id, name, code")
        .eq("teacher_id", teacherId)
        .eq("is_active", true);

      if (!courses || courses.length === 0) return [];

      const courseIds = courses.map((c) => c.id);

      // Check which courses have baseline_test_config rows
      const { data: configs } = await supabase
        .from("baseline_test_config")
        .select("course_id")
        .in("course_id", courseIds);

      const configSet = new Set(
        (configs ?? []).map((c) => c.course_id as string)
      );

      // Count baseline attainment records per course (proxy for student attempts)
      const { data: attainments } = await supabase
        .from("baseline_attainment")
        .select("course_id")
        .in("course_id", courseIds);

      const attainmentCount = new Map<string, number>();
      for (const a of attainments ?? []) {
        const cid = a.course_id as string | null;
        if (!cid) continue;
        attainmentCount.set(cid, (attainmentCount.get(cid) ?? 0) + 1);
      }

      return courses.map((c) => ({
        id: c.id,
        name: c.name,
        code: c.code,
        has_baseline_config: configSet.has(c.id),
        attainment_count: attainmentCount.get(c.id) ?? 0,
      }));
    },
    enabled: !!teacherId,
    staleTime: 60_000,
  });
};

const BaselineCoursesListPage = () => {
  const { t } = useTranslation("teacher");
  const { user } = useAuth();
  const { data: courses, isLoading } = useTeacherCoursesWithBaseline(user?.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t("baseline.title", "Baseline Tests")}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {t(
            "baseline.subtitle",
            "Configure baseline assessments and review student attempts for each of your courses."
          )}
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Shimmer className="h-32 rounded-xl" />
          <Shimmer className="h-32 rounded-xl" />
        </div>
      ) : !courses || courses.length === 0 ? (
        <NoCourses />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {courses.map((course) => (
            <Card
              key={course.id}
              className="bg-white border-0 shadow-md rounded-xl p-5 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge variant="outline" className="text-[10px] font-bold">
                      {course.code}
                    </Badge>
                    {course.has_baseline_config ? (
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-[10px] font-bold">
                        {t("baseline.configured", "Configured")}
                      </Badge>
                    ) : (
                      <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 text-[10px] font-bold">
                        {t("baseline.notConfigured", "Not configured")}
                      </Badge>
                    )}
                  </div>
                  <h2 className="text-base font-semibold tracking-tight text-gray-900 dark:text-foreground">
                    {course.name}
                  </h2>
                </div>
                <FlaskConical className="h-5 w-5 text-blue-500 flex-shrink-0" />
              </div>

              <div className="pt-3 border-t border-gray-100 mb-4">
                <p className="text-[10px] font-bold tracking-widest uppercase text-gray-500">
                  {t("baseline.studentResults", "Student results")}
                </p>
                <p className="text-lg font-black text-gray-900 dark:text-foreground">
                  {course.attainment_count}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  to={`/teacher/baseline/${course.id}/config`}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-slate-50 transition-colors"
                >
                  <Settings className="h-3.5 w-3.5" />
                  {t("baseline.configure", "Configure")}
                </Link>
                <Link
                  to={`/teacher/baseline/${course.id}`}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-teal-500 to-blue-600 px-3 py-2 text-xs font-semibold text-white active:scale-95 transition-transform"
                >
                  {t("baseline.viewResults", "Results")}
                  <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" />
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default BaselineCoursesListPage;
